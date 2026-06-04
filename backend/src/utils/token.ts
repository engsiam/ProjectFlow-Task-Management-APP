// JWT helpers (access + refresh) and crypto utilities for refresh-token storage.

import jwt from "jsonwebtoken";
import { env } from "../config/env.ts";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  username: string;
  name: string;
  role: string;
  type: "access";
};

export type RefreshTokenPayload = {
  sub: string;
  type: "refresh";
  jti: string;
};

const parseExpires = (raw: string): number | string => {
  // Accept things like "15m", "7d", "3600"
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  return raw;
};

export const signAccessToken = (payload: Omit<AccessTokenPayload, "type">): string => {
  return jwt.sign({ ...payload, type: "access" }, env.JWT_ACCESS_SECRET, {
    expiresIn: parseExpires(env.ACCESS_TOKEN_EXPIRES_IN) as jwt.SignOptions["expiresIn"],
  });
};

export const signRefreshToken = (
  payload: Omit<RefreshTokenPayload, "type">,
): string => {
  return jwt.sign({ ...payload, type: "refresh" }, env.JWT_REFRESH_SECRET, {
    expiresIn: parseExpires(env.REFRESH_TOKEN_EXPIRES_IN) as jwt.SignOptions["expiresIn"],
  });
};

export const verifyAccessToken = (token: string): AccessTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
  if (decoded.type !== "access") {
    throw new Error("Invalid token type");
  }
  return decoded;
};

export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  const decoded = jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
  if (decoded.type !== "refresh") {
    throw new Error("Invalid token type");
  }
  return decoded;
};

export const accessTokenExpiresInSeconds = (): number => {
  return expiresToSeconds(env.ACCESS_TOKEN_EXPIRES_IN);
};

export const refreshTokenExpiresInSeconds = (): number => {
  return expiresToSeconds(env.REFRESH_TOKEN_EXPIRES_IN);
};

const expiresToSeconds = (raw: string): number => {
  if (/^\d+$/.test(raw)) return Number.parseInt(raw, 10);
  const m = raw.match(/^(\d+)([smhd])$/);
  if (!m) return 60 * 60 * 24 * 7;
  const n = Number.parseInt(m[1], 10);
  const unit = m[2];
  const mult = unit === "s" ? 1 : unit === "m" ? 60 : unit === "h" ? 3600 : 86400;
  return n * mult;
};
