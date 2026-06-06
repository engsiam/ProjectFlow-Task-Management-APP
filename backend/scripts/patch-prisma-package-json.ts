#!/usr/bin/env -S deno run -A --no-lock
// Post-generate: patch the Prisma-generated `package.json` to add
// `"type": "commonjs"` so Deno treats the generated `.js` files as CommonJS
// without needing the `--unstable-detect-cjs` CLI flag (which Deno Deploy
// does not propagate from `deno task` invocations).
//
// This is a no-op if the field is already present.

import { walk } from "jsr:@std/fs@1.0.0/walk";

const GENERATED_DIR = "src/generated/prisma";

async function patchPackageJson(path: string): Promise<void> {
  const raw = await Deno.readTextFile(path);
  const pkg = JSON.parse(raw) as Record<string, unknown>;
  if (pkg.type === "commonjs") {
    console.log(`[post-generate] ${path}: type=commonjs already set`);
    return;
  }
  pkg.type = "commonjs";
  await Deno.writeTextFile(path, JSON.stringify(pkg, null, 2) + "\n");
  console.log(`[post-generate] ${path}: added type=commonjs`);
}

async function main(): Promise<void> {
  let patched = 0;
  for await (const entry of walk(GENERATED_DIR, { exts: [".json"] })) {
    if (!entry.path.endsWith("package.json")) continue;
    if (!entry.isFile) continue;
    await patchPackageJson(entry.path);
    patched += 1;
  }
  if (patched === 0) {
    console.warn(
      `[post-generate] No package.json found under ${GENERATED_DIR} \u2014 ` +
        `did prisma generate run?`,
    );
  }
}

if (import.meta.main) {
  await main();
}
