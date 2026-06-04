// Hono application factory. Builds the OpenAPIHono app, applies middleware,
// and mounts all routes. Used by server.ts and by tests.

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { env } from "./config/env.ts";
import { applyCors } from "./config/cors.ts";
import { onErrorHandler } from "./middleware/error.ts";
import { requestId } from "./middleware/request-id.ts";
import { logger } from "./middleware/logger.ts";

import { authRouteEntries } from "./routes/auth.routes.ts";
import { userRouteEntries } from "./routes/user.routes.ts";
import { projectRouteEntries } from "./routes/project.routes.ts";
import { taskRouteEntries } from "./routes/task.routes.ts";
import { commentRouteEntries } from "./routes/comment.routes.ts";
import { notificationRouteEntries } from "./routes/notification.routes.ts";
import { systemRouteEntries } from "./routes/system.routes.ts";
import { uploadRouteEntries } from "./routes/upload.routes.ts";

export const createApp = () => {
  const app = new OpenAPIHono();

  // CORS first
  applyCors(app);

  // Core middleware
  app.use("*", requestId());
  app.use("*", logger());

  // Global error handler
  app.onError(onErrorHandler);

  // 404 for unknown api routes
  app.notFound((c: Context) =>
    c.json(
      {
        success: false,
        message: `Route not found: ${c.req.method} ${c.req.path}`,
        error: { code: "NOT_FOUND" },
      },
      404,
    )
  );

  // Root
  app.get("/", (c: Context) =>
    c.json({
      success: true,
      message: "Smart Project & Task Collaboration API",
      data: {
        name: "ProjectFlow API",
        version: env.API_VERSION,
        docs: "/docs",
        openapi: "/openapi.json",
        health: "/health",
      },
    }));

  // Serve uploaded files
  app.get("/uploads/*", async (c: Context) => {
    try {
      const file = await Deno.readFile(`.${c.req.path}`);
      const ext = c.req.path.split(".").pop() ?? "";
      const mime: Record<string, string> = {
        png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg",
        webp: "image/webp", gif: "image/gif",
      };
      return c.newResponse(file.buffer as ArrayBuffer, 200, { "Content-Type": mime[ext] ?? "application/octet-stream" });
    } catch {
      return c.json({ success: false, message: "File not found", error: { code: "NOT_FOUND" } }, 404);
    }
  });

  // Register all routes
  const allEntries = [
    ...systemRouteEntries,
    ...authRouteEntries,
    ...userRouteEntries,
    ...projectRouteEntries,
    ...taskRouteEntries,
    ...commentRouteEntries,
    ...notificationRouteEntries,
    ...uploadRouteEntries,
  ];

  for (const entry of allEntries) {
    // openapi() signature is (route, handler). Per-route middleware (auth, RBAC,
    // rate limit) must be attached to the route's own `middleware` array so
    // they run before the handler. The validator middleware (zValidator) is
    // already wired up automatically by openapi() from route.request.{body,query,...}.
    const route = {
      ...entry.route,
      middleware: [
        ...((entry.route as { middleware?: typeof entry.middleware }).middleware ?? []),
        ...entry.middleware,
      ],
    } as typeof entry.route;
    app.openapi(route, entry.handler);
  }

  // OpenAPI JSON
  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "ProjectFlow API",
      version: env.API_VERSION,
      description:
        "Backend for the Smart Project & Task Collaboration System. All endpoints are testable via Swagger UI at /docs.",
    },
    servers: [{ url: `http://localhost:${env.PORT}`, description: "Local" }],
  });

  // Swagger UI
  app.get("/docs", (c: Context) => {
    return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="SwaggerUI" />
  <title>ProjectFlow API - Swagger UI</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js" crossorigin="anonymous"></script>
  <script>
    window.onload = () => {
      SwaggerUIBundle({
        dom_id: "#swagger-ui",
        url: "/openapi.json",
        deepLinking: true,
        defaultModelsExpandDepth: -1,
        docExpansion: "list",
        showCommonExtensions: true,
        showExtensions: true,
        persistAuthorization: true,
      });
    };
  </script>
</body>
</html>`);
  });

  // Convenience redirect from /swagger to /docs
  app.get("/swagger", (c: Context) => c.redirect("/docs", 301));

  return app;
};
