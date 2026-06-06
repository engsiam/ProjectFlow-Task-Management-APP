// Upload route — file upload for avatars and attachments.

import { createRoute } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as uploadCtrl from "../controllers/upload.controller.ts";
import { auth } from "../middleware/auth.ts";
import { bearerAuth, jsonErrorResponses, jsonOkResponse } from "../docs/openapi.ts";
import { env } from "../config/env.ts";

import { z } from "@hono/zod-openapi";

const tag = ["Uploads"];
const security = [{ bearerAuth: [] }];

// In "db" mode the upload returns "/api/users/{id}/avatar" (relative,
// resolved by the browser against the current origin). In "local" mode
// it returns an absolute file URL under /uploads/avatars/. Use a stable
// relative example so the OpenAPI docs are correct in both modes.
const exampleAvatarUrl = `/api/users/000000000000000000000000/avatar`;

const uploadAvatarResponse = z.object({
  url: z.string().openapi({ example: exampleAvatarUrl }),
});

export const uploadAvatarRoute = createRoute({
  method: "post",
  path: "/api/upload/avatar",
  tags: tag,
  summary: "Upload avatar image",
  description: "Upload an avatar image (PNG, JPEG, WebP, GIF, max 2 MB). Returns the public URL.",
  security,
  request: {},
  responses: {
    200: jsonOkResponse("Avatar uploaded", uploadAvatarResponse),
    ...jsonErrorResponses([
      { status: 400, description: "Invalid file or size" },
      { status: 401, description: "Unauthorized" },
    ]),
  },
});

export type RouteEntry = {
  route: ReturnType<typeof createRoute>;
  handler: Handler;
  middleware: MiddlewareHandler[];
};

export const uploadRouteEntries: RouteEntry[] = [
  { route: uploadAvatarRoute, handler: uploadCtrl.uploadAvatar as Handler, middleware: [auth()] },
];
