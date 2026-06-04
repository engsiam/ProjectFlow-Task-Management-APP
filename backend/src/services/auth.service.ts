// Auth service: signup, login, refresh, logout, me.

import { prisma } from "../prisma/client.ts";
import { hashPassword, verifyPassword } from "../utils/hashing.ts";
import {
  refreshTokenExpiresInSeconds,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/token.ts";
import { randomToken, sha256 } from "../utils/id.ts";
import { BadRequestError, ConflictError, UnauthorizedError } from "../utils/errors.ts";
import { PUBLIC_USER_FIELDS, PUBLIC_USER_SAFE } from "../utils/serialize.ts";
import type { LoginInput, RefreshInput, SignupInput } from "../validators/auth.validator.ts";
import { slugifyUsername } from "../utils/id.ts";
import { cacheGet, cacheSet } from "../utils/cache.ts";

const genUsername = async (name: string, email: string): Promise<string> => {
  const base = slugifyUsername(name) || slugifyUsername(email.split("@")[0]) || "user";
  let candidate = base;
  let i = 0;
  // Make unique if needed
  while (await prisma.user.findUnique({ where: { username: candidate } })) {
    i += 1;
    candidate = `${base}${i}`;
    if (i > 50) {
      candidate = `${base}_${randomToken(4)}`;
      break;
    }
  }
  return candidate;
};

const issueTokens = async (user: {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
}, meta?: { userAgent?: string; ipAddress?: string }) => {
  // JWT signing and SHA256 are synchronous CPU work; run them in sequence (microseconds)
  // then do the DB write asynchronously.
  const jti = randomToken(16);
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
  });
  const refreshToken = signRefreshToken({ sub: user.id, jti });
  const tokenHash = await sha256(refreshToken);
  const expiresAt = new Date(Date.now() + refreshTokenExpiresInSeconds() * 1000);
  await prisma.refreshToken.create({
    data: {
      tokenHash,
      userId: user.id,
      expiresAt,
      userAgent: meta?.userAgent,
      ipAddress: meta?.ipAddress,
    },
  });
  return { accessToken, refreshToken, refreshExpiresIn: refreshTokenExpiresInSeconds() };
};

export const signup = async (
  input: { email: string; password: string; name: string; username?: string },
  meta?: { userAgent?: string; ipAddress?: string },
) => {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new ConflictError("Email is already registered");

  const password = await hashPassword(input.password);
  const username = input.username || (await genUsername(input.name, input.email));

  const user = await prisma.user.create({
    data: {
      email: input.email,
      password,
      name: input.name,
      username,
    },
  });

  const tokens = await issueTokens(user, meta);
  return { user: PUBLIC_USER_SAFE(user), ...tokens };
};

export const login = async (
  input: LoginInput,
  meta?: { userAgent?: string; ipAddress?: string },
) => {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) {
    throw new UnauthorizedError("Invalid email or password");
  }

  if (user.status === "DISABLED") {
    throw new UnauthorizedError("Account is disabled");
  }

  const ok = await verifyPassword(input.password, user.password);
  if (!ok) {
    throw new UnauthorizedError("Invalid email or password");
  }

  const tokens = await issueTokens(user, meta);
  return { user: PUBLIC_USER_SAFE(user), ...tokens };
};

export const refresh = async (input: RefreshInput) => {
  let payload;
  try {
    payload = verifyRefreshToken(input.refreshToken);
  } catch {
    throw new UnauthorizedError("Invalid or expired refresh token");
  }
  const tokenHash = await sha256(input.refreshToken);
  const stored = await prisma.refreshToken.findUnique({ where: { tokenHash } });
  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    throw new UnauthorizedError("Refresh token not recognized");
  }
  // Issue new tokens in parallel. Keep the old token valid so concurrent
  // refreshes from multiple tabs don't race and invalidate each other.
  const jti = randomToken(16);
  const newRefreshToken = signRefreshToken({ sub: payload.sub, jti });
  const newHash = await sha256(newRefreshToken);
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, email: true, username: true, name: true, role: true, status: true },
  });
  if (!user) throw new UnauthorizedError("User no longer exists");
  if (user.status === "DISABLED") throw new UnauthorizedError("Account is disabled");
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    username: user.username,
    name: user.name,
    role: user.role,
  });
  await prisma.refreshToken.create({
    data: {
      tokenHash: newHash,
      userId: user.id,
      expiresAt: new Date(Date.now() + refreshTokenExpiresInSeconds() * 1000),
    },
  });
  return {
    accessToken,
    refreshToken: newRefreshToken,
    refreshExpiresIn: refreshTokenExpiresInSeconds(),
  };
};

export const logout = async (userId: string, refreshToken?: string) => {
  if (refreshToken) {
    const tokenHash = await sha256(refreshToken);
    await prisma.refreshToken.updateMany({
      where: { tokenHash, userId, revoked: false },
      data: { revoked: true },
    });
    return;
  }
  // Logout everywhere: revoke all
  await prisma.refreshToken.updateMany({
    where: { userId, revoked: false },
    data: { revoked: true },
  });
};

export const me = async (userId: string) => {
  const cacheKey = `user:${userId}`;
  const cached = cacheGet<ReturnType<typeof PUBLIC_USER_SAFE>>(cacheKey);
  if (cached) return cached;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: PUBLIC_USER_FIELDS,
  });
  if (!user) throw new BadRequestError("User not found");
  const result = PUBLIC_USER_SAFE(user as Parameters<typeof PUBLIC_USER_SAFE>[0]);
  cacheSet(cacheKey, result, 10_000);
  return result;
};
