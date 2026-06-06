// Hono application factory. Builds the OpenAPIHono app, applies middleware,
// and mounts all routes. Used by server.ts and by tests.
//
// Platform-agnostic:
//   - No local-FS file serving (Deno Deploy has no read-write project FS).
//   - OpenAPI `servers` list reflects the actual request origin.
//   - `/readyz` exposes a 200/503 readiness signal for Deno Deploy warmup.

import { OpenAPIHono } from "@hono/zod-openapi";
import type { Context } from "hono";
import { env, isDeploy } from "./config/env.ts";
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
import { attachmentRouteEntries } from "./routes/attachment.routes.ts";
import { healthRouteEntries } from "./routes/project-health.routes.ts";
import { portfolioRouteEntries } from "./routes/portfolio-dashboard.routes.ts";
import { analyticsRouteEntries } from "./routes/analytics.routes.ts";

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
        runtime: isDeploy ? "deno-deploy" : "deno-local",
        docs: "/docs",
        openapi: "/openapi.json",
        health: "/health",
        readyz: "/readyz",
      },
    }));

  // NOTE: A previous version served uploaded files via `Deno.readFile` from
  // the project filesystem. Deno Deploy's project FS is read-only, so that
  // route always 404'd in production. Local users now get files through the
  // upload/attachment controllers' signed URLs (or the API). On Deploy,
  // upload endpoints return 503 via `storageDisabled` and users should
  // configure R2/S3 — see `src/config/env.ts` `STORAGE_BACKEND`.

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
    ...attachmentRouteEntries,
    ...healthRouteEntries,
    ...portfolioRouteEntries,
    ...analyticsRouteEntries,
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

  // OpenAPI JSON — build a servers list that reflects the request origin so
  // the generated client URLs match the deployment host.
  app.doc("/openapi.json", {
    openapi: "3.0.0",
    info: {
      title: "ProjectFlow API",
      version: env.API_VERSION,
      description:
        "Backend for the Smart Project & Task Collaboration System. All endpoints are testable via Swagger UI at /docs.",
    },
    servers: [
      isDeploy
        ? { url: env.API_PUBLIC_URL, description: "Production" }
        : { url: `http://localhost:${env.PORT}`, description: "Local" },
    ],
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
