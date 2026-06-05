// User service.

import { prisma } from "../prisma/client.ts";
import { ConflictError, ForbiddenError, NotFoundError } from "../utils/errors.ts";
import { PUBLIC_USER_FIELDS, PUBLIC_USER_SAFE } from "../utils/serialize.ts";
import type {
  SearchUsersQuery,
  UpdateMeInput,
  UpdateUserRoleInput,
} from "../validators/user.validator.ts";

export const updateMe = async (userId: string, input: UpdateMeInput) => {
  if (input.username) {
    const exists = await prisma.user.findFirst({
      where: { username: input.username, NOT: { id: userId } },
    });
    if (exists) throw new ConflictError("Username already taken");
  }
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.username !== undefined ? { username: input.username } : {}),
      ...(input.avatar !== undefined ? { avatar: input.avatar } : {}),
      ...(input.bio !== undefined ? { bio: input.bio } : {}),
    },
    select: PUBLIC_USER_FIELDS,
  });
  return PUBLIC_USER_SAFE(user);
};

export const searchUsers = async (query: SearchUsersQuery, currentUserId: string) => {
  const q = query.q?.trim();
  const users = await prisma.user.findMany({
    where: {
      AND: [
        { id: { not: currentUserId } },
        { status: "ACTIVE" },
        q
          ? {
            OR: [
              { email: { contains: q, mode: "insensitive" } },
              { name: { contains: q, mode: "insensitive" } },
              { username: { contains: q, mode: "insensitive" } },
            ],
          }
          : {},
      ],
    },
    select: PUBLIC_USER_FIELDS,
    take: query.limit,
    orderBy: { name: "asc" },
  });
  return users.map(PUBLIC_USER_SAFE);
};

export const getById = async (id: string) => {
  const user = await prisma.user.findUnique({ where: { id }, select: PUBLIC_USER_FIELDS });
  if (!user) throw new NotFoundError("User not found");
  return PUBLIC_USER_SAFE(user);
};

// Admin-only: change a user's global account role. Cannot promote anyone to
// ADMIN through this endpoint (that would require an out-of-band elevation),
// and admins cannot demote themselves (prevents accidental lockout).
export const updateUserRole = async (
  actorId: string,
  actorRole: string,
  targetId: string,
  input: UpdateUserRoleInput,
) => {
  if (actorRole !== "ADMIN") {
    throw new ForbiddenError("Only admins can change account roles");
  }
  if (actorId === targetId) {
    throw new ForbiddenError("You cannot change your own role");
  }
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target) throw new NotFoundError("User not found");
  if (target.role === "ADMIN") {
    throw new ForbiddenError("Admin accounts cannot be demoted through this endpoint");
  }
  if (target.role === input.role) {
    return PUBLIC_USER_SAFE(target);
  }
  const updated = await prisma.user.update({
    where: { id: targetId },
    data: { role: input.role },
    select: PUBLIC_USER_FIELDS,
  });
  return PUBLIC_USER_SAFE(updated);
};
