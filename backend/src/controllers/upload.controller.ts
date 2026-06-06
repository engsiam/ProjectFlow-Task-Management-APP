// Upload controller. Handles multipart file upload for avatars.
//
// Storage is platform-aware via STORAGE_BACKEND:
//   - "local"    : writes to UPLOAD_DIR/avatars on the local FS. The
//                  returned URL is served by the /uploads/* static route
//                  when one is mounted (Deno Deploy never serves FS).
//   - "db"       : stores bytes in User.avatarData + User.avatarMime and
//                  returns "/api/users/{id}/avatar" — served by the
//                  user-routes GET handler. Works on Deno Deploy with
//                  no FS access.
//   - "disabled" : returns 503.

import type { Context } from "hono";
import { prisma } from "../prisma/client.ts";
import { env, storageDisabled } from "../config/env.ts";
import { BadRequestError, ServiceUnavailableError } from "../utils/errors.ts";
import { respondOk } from "../utils/response.ts";
import { getUser } from "./_helpers.ts";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

const extForType = (type: string) => {
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return ".jpg";
};

export const uploadAvatar = async (c: Context) => {
  const user = getUser(c); // Ensure authenticated

  if (storageDisabled) {
    throw new ServiceUnavailableError(
      "Avatar uploads are disabled. Set STORAGE_BACKEND to a supported driver (local, db) to enable uploads.",
    );
  }

  const body = await c.req.parseBody();
  const file = body["file"] as File | undefined;
  if (!file) throw new BadRequestError("No file provided");

  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new BadRequestError("Only PNG, JPEG, WebP, and GIF images are allowed.");
  }
  if (file.size > MAX_SIZE) {
    throw new BadRequestError("File size must be under 2 MB.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());

  if (env.STORAGE_BACKEND === "db") {
    // Persist bytes + mime on the user row. The relative URL is resolved
    // by the browser against the current origin, so the same string
    // works in dev (localhost:8001) and in prod (projectflow-frontend…net).
    const url = `/api/users/${user.id}/avatar`;
    await prisma.user.update({
      where: { id: user.id },
      data: {
        avatarData: bytes,
        avatarMime: file.type,
        avatar: url,
      },
    });
    return respondOk(c, { url }, "Avatar uploaded");
  }

  // Local FS path — writes under UPLOAD_DIR/avatars and returns a URL
  // pointing at the static /uploads/* mount.
  const uploadDir = `${env.UPLOAD_DIR}/avatars`;
  const ext = extForType(file.type);
  const name = `${crypto.randomUUID()}${ext}`;
  const path = `${uploadDir}/${name}`;

  await Deno.mkdir(uploadDir, { recursive: true });
  await Deno.writeFile(path, bytes);

  const url = new URL(c.req.url);
  url.pathname = `/uploads/${path}`;
  return respondOk(c, { url: url.toString() }, "Avatar uploaded");
};
