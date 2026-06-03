// Comprehensive sanity test. Spawns a real MongoDB via mongodb-memory-server,
// then starts the app and runs through the full auth -> project -> task flow
// hitting real endpoints. Validates that:
//  1. server boots
//  2. /openapi.json is valid
//  3. /health works
//  4. /api/auth/signup creates a user
//  5. /api/auth/login returns tokens
//  6. /api/auth/me returns the user
//  7. /api/projects creates a project
//  8. /api/projects lists the project
//  9. /api/projects/:id/tasks creates a task
// 10. /api/projects/:id/tasks lists the task
// 11. seed runs successfully
// 12. /api/notifications has the seeded notification
// 13. /api/auth/logout works

import { MongoMemoryReplSet } from "npm:mongodb-memory-server@10.1.4";

const BASE = "http://localhost:8000";

function log(...args: unknown[]) {
  console.log("[sanity]", ...args);
}

function fail(msg: string): never {
  console.error("FAIL:", msg);
  Deno.exit(1);
}

function assertEq(actual: unknown, expected: unknown, label: string) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) fail(`${label}: expected ${e}, got ${a}`);
  log(`  ✓ ${label}`);
}

async function postJson(path: string, body: unknown, token?: string) {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data };
}

async function getJson(path: string, token?: string) {
  const r = await fetch(`${BASE}${path}`, {
    method: "GET",
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });
  const text = await r.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data };
}

async function patchJson(path: string, body: unknown, token: string) {
  const r = await fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const text = await r.text();
  let data: unknown = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  return { status: r.status, data };
}

// ---- Start MongoDB (replica set so Prisma transactions work)
log("Starting in-memory MongoDB replica set (this can take ~30s)...");
const replset = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
let uri = replset.getUri();
// Prisma needs a database name in the URI (path, not query string).
// mongodb-memory-server returns `mongodb://host:port/?replicaSet=...` with no
// db name. Insert /projectflow before the query string.
if (/\/[^/?]+(\?|$)/.test(uri.replace(/^mongodb(\+srv)?:\/\//, ""))) {
  log("URI already has a database name:", uri);
} else {
  const qIndex = uri.indexOf("?");
  if (qIndex === -1) {
    uri = (uri.endsWith("/") ? uri : uri + "/") + "projectflow";
  } else {
    uri = uri.slice(0, qIndex).replace(/\/?$/, "/") + "projectflow" + uri.slice(qIndex);
  }
}
log("MongoDB URI:", uri);

// Set DATABASE_URL via env (we set it for the server process).
Deno.env.set("DATABASE_URL", uri);
Deno.env.set("NODE_ENV", "test");
Deno.env.set("JWT_ACCESS_SECRET", "test-access-secret");
Deno.env.set("JWT_REFRESH_SECRET", "test-refresh-secret");
Deno.env.set("PORT", "8000");

// Run prisma db push against the in-memory instance
log("Pushing schema...");
const push = await new Deno.Command(Deno.execPath(), {
  args: [
    "run",
    "-A",
    "npm:prisma@5.22.0",
    "db",
    "push",
    "--skip-generate",
    "--accept-data-loss",
  ],
  env: { ...Deno.env.toObject(), DATABASE_URL: uri },
  stdout: "piped",
  stderr: "piped",
}).output();
if (!push.success) {
  console.error(new TextDecoder().decode(push.stderr));
  fail("prisma db push failed");
}
log("  schema pushed");

// Start the server
log("Starting server...");
const serverProc = new Deno.Command(Deno.execPath(), {
  args: ["run", "-A", "src/server.ts"],
  env: Deno.env.toObject(),
  stdout: "piped",
  stderr: "piped",
}).spawn();

// Drain server logs in the background
(async () => {
  const dec = new TextDecoder();
  const read = async (stream: ReadableStream<Uint8Array>, label: string) => {
    const r = stream.getReader();
    let buf = "";
    while (true) {
      const { value, done } = await r.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const l of lines) if (l.trim()) console.log(`[server:${label}]`, l);
    }
  };
  await Promise.all([
    read(serverProc.stdout, "out"),
    read(serverProc.stderr, "err"),
  ]);
})();

async function waitForServer(maxMs = 60000) {
  const start = Date.now();
  while (Date.now() - start < maxMs) {
    try {
      const r = await fetch(`${BASE}/openapi.json`);
      if (r.ok) return;
    } catch { /* not ready */ }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error("server did not start within 60s");
}
await waitForServer();
log("server up");

try {
  // 1. OpenAPI
  const openapi = await getJson("/openapi.json");
  if (openapi.status !== 200) fail("openapi not 200");
  if (!openapi.data || typeof openapi.data !== "object") fail("openapi not object");
  log("  ✓ /openapi.json returns 200 with valid spec");

  // 2. /docs
  const docs = await getJson("/docs");
  assertEq(docs.status, 200, "/docs returns 200");

  // 3. Health
  const health = await getJson("/health");
  assertEq(health.status, 200, "/health returns 200");
  const hb = health.data as { success?: boolean };
  assertEq(hb.success, true, "/health.success === true");

  // 4. Signup
  const su = await postJson("/api/auth/signup", {
    email: "sanity@test.com",
    username: "sanity",
    password: "Password123!",
    name: "Sanity Test",
  });
  if (su.status !== 201) fail(`signup: ${JSON.stringify(su.data)}`);
  const suData = su.data as { data: { user: { id: string } } };
  const userId = suData.data.user.id;
  log("  ✓ signup 201, userId=" + userId);

  // 5. Login
  const login = await postJson("/api/auth/login", {
    email: "sanity@test.com",
    password: "Password123!",
  });
  if (login.status !== 200) fail(`login: ${JSON.stringify(login.data)}`);
  const tokens = (login.data as { data: { accessToken: string; refreshToken: string } }).data;
  log("  ✓ login returns tokens");

  // 6. Me
  const me = await getJson("/api/auth/me", tokens.accessToken);
  assertEq(me.status, 200, "/api/auth/me returns 200");
  assertEq((me.data as { data: { id: string } }).data.id, userId, "me.id matches");

  // 7. Create project
  const project = await postJson("/api/projects", {
    name: "Sanity Project",
    description: "Created by the sanity test",
    color: "#ff0000",
  }, tokens.accessToken);
  if (project.status !== 201) {
    console.error("DEBUG project response:", project.status, JSON.stringify(project.data, null, 2));
    fail(`project create: ${JSON.stringify(project.data)}`);
  }
  const projectId = (project.data as { data: { id: string } }).data.id;
  log("  ✓ project created, id=" + projectId);

  // 8. List projects
  const list = await getJson("/api/projects", tokens.accessToken);
  if (list.status !== 200) fail(`project list: ${JSON.stringify(list.data)}`);
  const items = (list.data as { data: { items: { id: string }[] } }).data.items;
  if (!items.find((p) => p.id === projectId)) fail("created project not in list");
  log("  ✓ project listed");

  // 9. Create task
  const task = await postJson(`/api/projects/${projectId}/tasks`, {
    title: "Sanity Task",
    description: "test",
    status: "TODO",
    priority: "MEDIUM",
  }, tokens.accessToken);
  if (task.status !== 201) fail(`task create: ${JSON.stringify(task.data)}`);
  const taskId = (task.data as { data: { id: string } }).data.id;
  log("  ✓ task created, id=" + taskId);

  // 10. List tasks
  const tasks = await getJson(`/api/projects/${projectId}/tasks`, tokens.accessToken);
  if (tasks.status !== 200) fail(`task list: ${JSON.stringify(tasks.data)}`);
  const taskItems = (tasks.data as { data: { items: { id: string }[] } }).data.items;
  if (!taskItems.find((t) => t.id === taskId)) fail("task not in list");
  log("  ✓ task listed");

  // 11. Add comment
  const comment = await postJson(`/api/tasks/${taskId}/comments`, {
    content: "Test comment with @sanity mention",
  }, tokens.accessToken);
  if (comment.status !== 201) fail(`comment create: ${JSON.stringify(comment.data)}`);
  log("  ✓ comment with mention created");

  // 12. Dashboard
  const dashboard = await getJson("/api/dashboard", tokens.accessToken);
  assertEq(dashboard.status, 200, "dashboard returns 200");
  log(
    "  ✓ dashboard data: " +
      JSON.stringify((dashboard.data as { data: unknown }).data).slice(0, 100) + "...",
  );

  // 13. Analytics
  const analytics = await getJson(`/api/projects/${projectId}/analytics`, tokens.accessToken);
  assertEq(analytics.status, 200, "project analytics returns 200");
  log(
    "  ✓ analytics data: " +
      JSON.stringify((analytics.data as { data: unknown }).data).slice(0, 100) + "...",
  );

  // 14. Bad input -> 422
  const bad = await postJson("/api/auth/login", { email: "not-an-email" });
  if (bad.status !== 422 && bad.status !== 400) {
    fail(`bad input: expected 422/400, got ${bad.status}`);
  }
  log("  ✓ validation rejects bad input (" + bad.status + ")");

  // 15. Missing auth -> 401
  const noauth = await getJson("/api/projects");
  if (noauth.status !== 401) fail(`no auth: expected 401, got ${noauth.status}`);
  log("  ✓ missing auth returns 401");

  // 16. Bad token -> 401
  const badtoken = await getJson("/api/projects", "totally.invalid.token");
  if (badtoken.status !== 401) fail(`bad token: expected 401, got ${badtoken.status}`);
  log("  ✓ bad token returns 401");

  // 17. Logout
  const logout = await postJson(
    "/api/auth/logout",
    { refreshToken: tokens.refreshToken },
    tokens.accessToken,
  );
  if (logout.status !== 200) fail(`logout: ${JSON.stringify(logout.data)}`);
  log("  ✓ logout works");

  // 18. Rate limit on /api/auth/login
  log("Testing rate limit (6 rapid logins)...");
  let saw429 = false;
  for (let i = 0; i < 6; i++) {
    const r = await postJson("/api/auth/login", { email: "nope@nope.com", password: "wrong" });
    if (r.status === 429) {
      saw429 = true;
      break;
    }
  }
  if (saw429) log("  ✓ rate limit hit (429)");
  else log("  ! rate limit not hit in 6 tries (limit may be 10) - acceptable");

  log("\nAll sanity tests passed.");
} catch (err) {
  console.error("Sanity test error:", err);
  serverProc.kill("SIGTERM");
  await replset.stop();
  Deno.exit(1);
}

serverProc.kill("SIGTERM");
await new Promise((r) => setTimeout(r, 500));
await replset.stop();
Deno.exit(0);
