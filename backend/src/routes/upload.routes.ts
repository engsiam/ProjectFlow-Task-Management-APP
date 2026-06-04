// Upload route — file upload for avatars and attachments.

import { createRoute } from "@hono/zod-openapi";
import type { Handler, MiddlewareHandler } from "hono";
import * as uploadCtrl from "../controllers/upload.controller.ts";
import { auth } from "../middleware/auth.ts";
import { bearerAuth, jsonOkResponse, jsonErrorResponses } from "../docs/openapi.ts";

import { z } from "@hono/zod-openapi";

const tag = ["Uploads"];
const security = [{ bearerAuth: [] }];

const uploadAvatarResponse = z.object({
  url: z.string().openapi({ example: "http://localhost:8000/uploads/avatars/uuid.jpg" }),
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
