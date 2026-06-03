// Password hashing helpers (bcryptjs - pure JS, works in Deno without native bindings).

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

export const hashPassword = async (plain: string): Promise<string> => {
  if (plain.length < 8) {
    throw new Error("Password must be at least 8 characters long");
  }
  return await bcrypt.hash(plain, SALT_ROUNDS);
};

export const verifyPassword = async (plain: string, hash: string): Promise<boolean> => {
  if (!plain || !hash) return false;
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
};
