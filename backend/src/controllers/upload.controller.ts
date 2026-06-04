// Upload controller. Handles multipart file upload for avatars.

import type { Context } from "hono";
import { env } from "../config/env.ts";
import { BadRequestError } from "../utils/errors.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB
const UPLOAD_DIR = "uploads/avatars";

export const uploadAvatar = async (c: Context) => {
  getUser(c); // Ensure authenticated

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) throw new BadRequestError("No file provided");

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new BadRequestError("Only PNG, JPEG, WebP, and GIF images are allowed.");
  }
  if (file.size > MAX_SIZE) {
    throw new BadRequestError("File size must be under 2 MB.");
  }

  const ext = file.type === "image/png" ? ".png"
    : file.type === "image/webp" ? ".webp"
    : file.type === "image/gif" ? ".gif"
    : ".jpg";
  const name = `${crypto.randomUUID()}${ext}`;
  const path = `${UPLOAD_DIR}/${name}`;

  await Deno.mkdir(UPLOAD_DIR, { recursive: true });
  await Deno.writeFile(path, new Uint8Array(await file.arrayBuffer()));

  const url = `http://localhost:${env.PORT}/${path}`;
  return respondOk(c, { url }, "Avatar uploaded");
};
