const schemaPath = "prisma/schema.prisma";
const generatedClientPath = "src/generated/prisma/index.js";
const schemaHashPath = "src/generated/prisma/.schema.hash";

const readText = (path: string) => Deno.readTextFile(path).catch(() => "");
const hashText = async (text: string) => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const [schema, generatedHash] = await Promise.all([
  readText(schemaPath),
  readText(schemaHashPath),
]);
const schemaHash = schema ? await hashText(schema) : "";
const hasClient = await Deno.stat(generatedClientPath).then((stat) => stat.isFile).catch(() =>
  false
);

if (hasClient && schemaHash && generatedHash.trim() === schemaHash) {
  console.log("Prisma client is up to date.");
  Deno.exit(0);
}

const command = new Deno.Command(Deno.execPath(), {
  args: ["run", "-A", "npm:prisma@5.22.0", "generate"],
  stdout: "inherit",
  stderr: "inherit",
});
const result = await command.output();
if (result.code === 0 && schemaHash) {
  await Deno.writeTextFile(schemaHashPath, `${schemaHash}\n`);
}
Deno.exit(result.code);
