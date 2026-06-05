// Prisma seed: 5 users, 3 projects, members with mixed roles, invitations,
// tasks across all Kanban columns, comments with mentions, notifications,
// activity logs, and demo file attachments on multiple tasks.
// Idempotent: re-runs upsert by email.
// Run with: deno task seed  (after `deno task prisma:push`)

import { createRequire } from "node:module";
import type { PrismaClient as PrismaClientType } from "npm:@prisma/client@5.22.0";
import bcrypt from "npm:bcryptjs@2.4.3";

const require = createRequire(import.meta.url);
const { PrismaClient: PrismaClientCtor } = require("../src/generated/prisma/index.js") as {
  PrismaClient: new () => PrismaClientType;
};
const prisma: PrismaClientType = new PrismaClientCtor();

const PASSWORD = "Password123!";
const STORAGE_DIR = "uploads/attachments";

const b64ToBytes = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// Minimal but valid sample files so the demo attachments open in viewers.
const DEMO_PNG = b64ToBytes(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
);
const DEMO_JPG = b64ToBytes(
  "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AL+AB//Z",
);
const DEMO_PDF_1PAGE = (title: string) =>
  new TextEncoder().encode(
    `%PDF-1.4\n` +
      `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n` +
      `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n` +
      `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R ` +
      `/Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n` +
      `4 0 obj\n<< /Length 70 >>\nstream\nBT /F1 18 Tf 72 720 Td ` +
      `(${title.replace(/[()\\]/g, "_")}) Tj 0 -28 Td ` +
      `/F1 11 Tf (ProjectFlow demo attachment) Tj ET\nendstream\nendobj\n` +
      `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n` +
      `xref\n0 6\n0000000000 65535 f \n` +
      `0000000010 00000 n \n0000000053 00000 n \n0000000098 00000 n \n` +
      `0000000185 00000 n \n0000000295 00000 n \n` +
      `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n360\n%%EOF\n`,
  );
// Empty zip archive (single "readme.txt" entry) — base64 of a 124-byte zip blob.
const DEMO_ZIP = b64ToBytes(
  "UEsDBAoAAAAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAdGVzdC50eHRoZWxsbwo=",
);
const DEMO_DOCX_BLOB = (heading: string, body: string) =>
  // Minimal Office Open XML (.docx) — a zip with a single document.xml.
  // We assemble a real PKZIP container with one entry.
  (() => {
    const xml =
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">` +
      `<w:body><w:p><w:r><w:t>${heading}</w:t></w:r></w:p>` +
      `<w:p><w:r><w:t>${body}</w:t></w:r></w:p></w:body></w:document>`;
    const xmlBytes = new TextEncoder().encode(xml);
    const nameBytes = new TextEncoder().encode("word/document.xml");
    const filenameField = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(filenameField.buffer);
    dv.setUint32(0, 0x04034b50, true); // local file header
    dv.setUint16(4, 20, true); // version
    dv.setUint16(6, 0, true); // flags
    dv.setUint16(8, 0, true); // compression = stored
    dv.setUint16(10, 0, true); // mod time
    dv.setUint16(12, 0, true); // mod date
    dv.setUint32(14, crc32(xmlBytes), true);
    dv.setUint32(18, xmlBytes.length, true);
    dv.setUint32(22, xmlBytes.length, true);
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true); // extra length
    filenameField.set(nameBytes, 30);
    // Central directory
    const cd = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(cd.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, 0, true);
    cdv.setUint16(14, 0, true);
    cdv.setUint32(16, crc32(xmlBytes), true);
    cdv.setUint32(20, xmlBytes.length, true);
    cdv.setUint32(24, xmlBytes.length, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cd.set(nameBytes, 42);
    const localOffset = 0;
    const cdOffset = filenameField.length + xmlBytes.length;
    cdv.setUint32(42, localOffset, true);
    const eocd = new Uint8Array(22);
    const ev = new DataView(eocd.buffer);
    ev.setUint32(0, 0x06054b50, true);
    ev.setUint16(4, 0, true);
    ev.setUint16(6, 0, true);
    ev.setUint16(8, 1, true);
    ev.setUint16(10, 1, true);
    ev.setUint32(12, cd.length, true);
    ev.setUint32(16, cdOffset, true);
    ev.setUint16(20, 0, true);
    return concatBytes(filenameField, xmlBytes, cd, eocd);
  })();

const concatBytes = (...parts: Uint8Array[]) => {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
};

// CRC-32 (polynomial 0xEDB88320) — required for a valid zip local file header.
const crc32 = (bytes: Uint8Array) => {
  let c: number;
  const table: number[] = [];
  for (let n = 0; n < 256; n++) {
    c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
};

const usersSeed = [
  {
    email: "admin@example.com",
    username: "olivia",
    name: "Olivia Admin",
    role: "ADMIN",
    bio: "Founder. Owns the platform roadmap.",
    avatar: "https://i.pravatar.cc/150?img=47",
  },
  {
    email: "pm@example.com",
    username: "maya",
    name: "Maya PM",
    role: "PROJECT_MANAGER",
    bio: "Engineering manager. Loves Kanban.",
    avatar: "https://i.pravatar.cc/150?img=32",
  },
  {
    email: "member@example.com",
    username: "milo",
    name: "Milo Member",
    role: "TEAM_MEMBER",
    bio: "Frontend engineer. React + Deno fan.",
    avatar: "https://i.pravatar.cc/150?img=12",
  },
  {
    email: "viewer@example.com",
    username: "vera",
    name: "Vera Viewer",
    role: "VIEWER",
    bio: "PMO. Read-only observer.",
    avatar: "https://i.pravatar.cc/150?img=49",
  },
  {
    email: "alex@example.com",
    username: "alex",
    name: "Alex Engineer",
    role: "TEAM_MEMBER",
    bio: "Backend engineer, MongoDB & Prisma.",
    avatar: "https://i.pravatar.cc/150?img=15",
  },
];

const projectsSeed = [
  {
    key: "launch",
    name: "Q4 Product Launch",
    description: "Cross-functional launch plan for our biggest release of the year.",
    color: "#10b981",
    members: [
      { username: "olivia", role: "ADMIN" },
      { username: "maya", role: "PROJECT_MANAGER" },
      { username: "milo", role: "TEAM_MEMBER" },
      { username: "alex", role: "TEAM_MEMBER" },
      { username: "vera", role: "VIEWER" },
    ],
  },
  {
    key: "redesign",
    name: "Marketing Website Redesign",
    description: "Modernize the public-facing site. Brand refresh and CMS migration.",
    color: "#6366f1",
    members: [
      { username: "maya", role: "ADMIN" },
      { username: "milo", role: "PROJECT_MANAGER" },
      { username: "olivia", role: "VIEWER" },
    ],
  },
  {
    key: "platform",
    name: "Platform Reliability",
    description: "Backend reliability, observability, and performance initiatives.",
    color: "#f59e0b",
    members: [
      { username: "alex", role: "ADMIN" },
      { username: "maya", role: "PROJECT_MANAGER" },
      { username: "milo", role: "TEAM_MEMBER" },
    ],
  },
];

async function main() {
  console.log("Seeding database...");

  // Clear existing data (order matters for FK constraints)
  console.log("  Clearing existing data...");
  await prisma.activityLog.deleteMany({});
  await prisma.mention.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.attachment.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
  // Wipe seeded attachment files from disk so the demo stays idempotent.
  try {
    await Deno.remove(STORAGE_DIR, { recursive: true });
  } catch (_err) {
    // dir may not exist on first run — ignore
  }
  console.log("  Done clearing.");

  // ---- Users
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const userByUsername = new Map<string, string>();
  for (const u of usersSeed) {
    const user = await prisma.user.create({
      data: {
        email: u.email,
        password: passwordHash,
        name: u.name,
        username: u.username,
        role: u.role,
        avatar: u.avatar,
        bio: u.bio,
        status: "ACTIVE",
      },
    });
    userByUsername.set(u.username, user.id);
    console.log(`  user: ${user.email} (${user.id})`);
  }

  // ---- Projects + members
  for (const p of projectsSeed) {
    const ownerId = userByUsername.get(p.members.find((m) => m.role === "ADMIN")!.username)!;
    const existing = await prisma.project.findFirst({ where: { name: p.name }, select: { id: true } });
    const project = existing
      ? await prisma.project.update({
        where: { id: existing.id },
        data: { name: p.name, description: p.description, color: p.color, status: "ACTIVE", ownerId },
      })
      : await prisma.project.create({
        data: { name: p.name, description: p.description, color: p.color, status: "ACTIVE", ownerId },
      });
    // Clear existing members to make seed idempotent for members
    await prisma.projectMember.deleteMany({ where: { projectId: project.id } });
    for (const m of p.members) {
      const userId = userByUsername.get(m.username)!;
      await prisma.projectMember.create({
        data: { projectId: project.id, userId, role: m.role },
      });
    }
    console.log(`  project: ${project.name} (${project.id})`);
  }

  // ---- Tasks across all Kanban columns
  // Delete and recreate tasks to make seeding deterministic
  const projectLaunch = await prisma.project.findFirst({ where: { name: "Q4 Product Launch" } });
  const projectRedesign = await prisma.project.findFirst({
    where: { name: "Marketing Website Redesign" },
  });
  const projectPlatform = await prisma.project.findFirst({
    where: { name: "Platform Reliability" },
  });

  if (!projectLaunch || !projectRedesign || !projectPlatform) {
    throw new Error("Projects not found after seed");
  }

  await prisma.task.deleteMany({
    where: { projectId: { in: [projectLaunch.id, projectRedesign.id, projectPlatform.id] } },
  });

  const miloId = userByUsername.get("milo")!;
  const mayaId = userByUsername.get("maya")!;
  const oliviaId = userByUsername.get("olivia")!;
  const alexId = userByUsername.get("alex")!;
  const veraId = userByUsername.get("vera")!;

  const taskSeeds = [
    // Q4 Product Launch
    {
      projectId: projectLaunch.id,
      title: "Finalize launch landing page",
      description: "Hero, features, pricing, FAQ sections.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: miloId,
      creator: mayaId,
      dueInDays: 3,
      labels: ["frontend", "design"],
      order: 1000,
    },
    {
      projectId: projectLaunch.id,
      title: "Set up analytics dashboards",
      description: "Funnel + retention dashboards in Mixpanel.",
      status: "TODO",
      priority: "MEDIUM",
      assignee: alexId,
      creator: mayaId,
      dueInDays: 7,
      labels: ["analytics"],
      order: 2000,
    },
    {
      projectId: projectLaunch.id,
      title: "Write launch announcement blog post",
      description: "1200 words, includes screenshots and customer quotes.",
      status: "REVIEW",
      priority: "MEDIUM",
      assignee: oliviaId,
      creator: oliviaId,
      dueInDays: 1,
      labels: ["marketing", "content"],
      order: 1000,
    },
    {
      projectId: projectLaunch.id,
      title: "Press kit and media assets",
      description: "Logos, screenshots, founder bios.",
      status: "DONE",
      priority: "LOW",
      assignee: oliviaId,
      creator: oliviaId,
      dueInDays: -2,
      labels: ["marketing"],
      order: 1000,
    },
    {
      projectId: projectLaunch.id,
      title: "Onboarding email sequence",
      description: "5 emails over 14 days.",
      status: "TODO",
      priority: "URGENT",
      assignee: miloId,
      creator: mayaId,
      dueInDays: -1,
      labels: ["growth", "email"],
      order: 3000,
    },
    {
      projectId: projectLaunch.id,
      title: "QA pass on signup flow",
      description: "Manual + automated regression.",
      status: "DONE",
      priority: "HIGH",
      assignee: alexId,
      creator: mayaId,
      dueInDays: -5,
      labels: ["qa"],
      order: 2000,
    },
    {
      projectId: projectLaunch.id,
      title: "Pre-launch stress test",
      description: "Load test at 5x expected peak.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: alexId,
      creator: alexId,
      dueInDays: 2,
      labels: ["reliability"],
      order: 2000,
    },
    {
      projectId: projectLaunch.id,
      title: "Update pricing page",
      description: "Add the new Enterprise tier.",
      status: "TODO",
      priority: "MEDIUM",
      assignee: miloId,
      creator: mayaId,
      dueInDays: 5,
      labels: ["frontend", "pricing"],
      order: 1000,
    },

    // Marketing Website Redesign
    {
      projectId: projectRedesign.id,
      title: "Design system v2 in Figma",
      description: "Tokens, components, variants.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: miloId,
      creator: mayaId,
      dueInDays: 4,
      labels: ["design", "system"],
      order: 1000,
    },
    {
      projectId: projectRedesign.id,
      title: "Migrate blog to MDX",
      description: "Keep URLs, add syntax highlighting.",
      status: "TODO",
      priority: "MEDIUM",
      assignee: miloId,
      creator: mayaId,
      dueInDays: 10,
      labels: ["frontend", "content"],
      order: 2000,
    },
    {
      projectId: projectRedesign.id,
      title: "New case studies layout",
      description: "Tiled grid with filters.",
      status: "REVIEW",
      priority: "LOW",
      assignee: mayaId,
      creator: mayaId,
      dueInDays: 2,
      labels: ["design"],
      order: 1000,
    },
    {
      projectId: projectRedesign.id,
      title: "Image optimization pipeline",
      description: "AVIF + responsive srcset.",
      status: "DONE",
      priority: "MEDIUM",
      assignee: miloId,
      creator: mayaId,
      dueInDays: -3,
      labels: ["performance"],
      order: 1000,
    },

    // Platform Reliability
    {
      projectId: projectPlatform.id,
      title: "Add tracing to billing service",
      description: "OpenTelemetry spans + dashboards.",
      status: "IN_PROGRESS",
      priority: "URGENT",
      assignee: alexId,
      creator: alexId,
      dueInDays: 1,
      labels: ["observability"],
      order: 1000,
    },
    {
      projectId: projectPlatform.id,
      title: "Tighten MongoDB connection pool",
      description: "Investigate slow queries on hot collection.",
      status: "TODO",
      priority: "HIGH",
      assignee: alexId,
      creator: alexId,
      dueInDays: 6,
      labels: ["database", "performance"],
      order: 2000,
    },
    {
      projectId: projectPlatform.id,
      title: "Document the incident playbook",
      description: "Runbooks for top 5 alert types.",
      status: "DONE",
      priority: "MEDIUM",
      assignee: alexId,
      creator: mayaId,
      dueInDays: -7,
      labels: ["docs"],
      order: 1000,
    },

    // ---- Admin (Olivia) CRUD tasks ----
    // These tasks exercise every CRUD operation an admin can perform on a task:
    // create, edit, move across columns, complete, and reassign.
    {
      projectId: projectLaunch.id,
      title: "Admin: Approve launch readiness checklist",
      description: "Final go/no-go decision sign-off before the public release.",
      status: "TODO",
      priority: "URGENT",
      assignee: oliviaId,
      creator: oliviaId,
      dueInDays: 2,
      labels: ["admin", "launch"],
      order: 4000,
    },
    {
      projectId: projectLaunch.id,
      title: "Admin: Coordinate cross-team launch sync",
      description: "Bring together marketing, support, and engineering for the final sync.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      assignee: mayaId,
      creator: oliviaId,
      dueInDays: 1,
      labels: ["admin", "coordination"],
      order: 5000,
    },
    {
      projectId: projectRedesign.id,
      title: "Admin: Sign off on new brand guidelines",
      description: "Review and approve the v2 brand guide draft.",
      status: "REVIEW",
      priority: "HIGH",
      assignee: mayaId,
      creator: oliviaId,
      dueInDays: 3,
      labels: ["admin", "branding"],
      order: 3000,
    },
    {
      projectId: projectRedesign.id,
      title: "Admin: Reassign blog migration to backend track",
      description: "Move the MDX blog migration to the platform team for tooling support.",
      status: "IN_PROGRESS",
      priority: "MEDIUM",
      assignee: alexId,
      creator: oliviaId,
      dueInDays: 4,
      labels: ["admin", "reassignment"],
      order: 4000,
    },
    {
      projectId: projectPlatform.id,
      title: "Admin: Approve incident postmortem template",
      description: "Roll out the new postmortem template org-wide.",
      status: "DONE",
      priority: "MEDIUM",
      assignee: alexId,
      creator: oliviaId,
      dueInDays: -4,
      labels: ["admin", "process"],
      order: 3000,
    },
  ];

  const createdTasks: { id: string; title: string; projectId: string; assignee: string | null }[] =
    [];
  for (const t of taskSeeds) {
    const due = t.dueInDays >= 0
      ? new Date(Date.now() + t.dueInDays * 86400_000)
      : new Date(Date.now() + t.dueInDays * 86400_000);
    const task = await prisma.task.create({
      data: {
        projectId: t.projectId,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assigneeId: t.assignee,
        creatorId: t.creator,
        dueDate: due,
        labels: t.labels,
        order: t.order,
        completedAt: t.status === "DONE" ? new Date(Date.now() - 86400_000) : null,
      },
    });
    createdTasks.push({
      id: task.id,
      title: task.title,
      projectId: task.projectId,
      assignee: task.assigneeId,
    });
  }
  console.log(`  tasks: ${createdTasks.length}`);

  // ---- Demo file attachments (on-disk + DB records) ----
  // The records reference real bytes on disk so the upload/download UI works
  // end-to-end after a fresh seed.
  const taskByIndex = (idx: number) => createdTasks[idx];
  const attachmentSeeds: Array<{
    taskIdx: number;
    fileName: string;
    ext: string;
    mime: string;
    uploader: string;
    bytes: Uint8Array;
  }> = [
    // Q4 launch — analytics setup
    {
      taskIdx: 1,
      fileName: "analytics-funnel-spec.pdf",
      ext: ".pdf",
      mime: "application/pdf",
      uploader: mayaId,
      bytes: DEMO_PDF_1PAGE("Q4 Launch Funnel Spec"),
    },
    {
      taskIdx: 1,
      fileName: "retention-dashboard.png",
      ext: ".png",
      mime: "image/png",
      uploader: alexId,
      bytes: DEMO_PNG,
    },
    // Q4 launch — landing page
    {
      taskIdx: 0,
      fileName: "hero-mockup-v2.png",
      ext: ".png",
      mime: "image/png",
      uploader: miloId,
      bytes: DEMO_PNG,
    },
    {
      taskIdx: 0,
      fileName: "landing-copy.docx",
      ext: ".docx",
      mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      uploader: oliviaId,
      bytes: DEMO_DOCX_BLOB("Landing Page Copy", "Hero, features, pricing, FAQ."),
    },
    // Q4 launch — press kit
    {
      taskIdx: 3,
      fileName: "press-kit.zip",
      ext: ".zip",
      mime: "application/zip",
      uploader: oliviaId,
      bytes: DEMO_ZIP,
    },
    // Q4 launch — stress test
    {
      taskIdx: 6,
      fileName: "load-test-report.pdf",
      ext: ".pdf",
      mime: "application/pdf",
      uploader: alexId,
      bytes: DEMO_PDF_1PAGE("Load Test Report 2x"),
    },
    // Redesign — case studies
    {
      taskIdx: 10,
      fileName: "case-study-mockup.jpg",
      ext: ".jpg",
      mime: "image/jpeg",
      uploader: miloId,
      bytes: DEMO_JPG,
    },
    {
      taskIdx: 10,
      fileName: "filter-ux-notes.doc",
      ext: ".doc",
      mime: "application/msword",
      uploader: mayaId,
      bytes: new TextEncoder().encode("Filter UX notes\r\n\r\n- Move active filters above the grid.\r\n"),
    },
    // Platform reliability — billing tracing
    {
      taskIdx: 13,
      fileName: "otel-spans.png",
      ext: ".png",
      mime: "image/png",
      uploader: alexId,
      bytes: DEMO_PNG,
    },
    {
      taskIdx: 13,
      fileName: "billing-trace-architecture.pdf",
      ext: ".pdf",
      mime: "application/pdf",
      uploader: mayaId,
      bytes: DEMO_PDF_1PAGE("Billing Trace Architecture"),
    },
    // Admin tasks
    {
      taskIdx: 16,
      fileName: "launch-readiness-checklist.pdf",
      ext: ".pdf",
      mime: "application/pdf",
      uploader: oliviaId,
      bytes: DEMO_PDF_1PAGE("Launch Readiness Checklist"),
    },
    {
      taskIdx: 18,
      fileName: "brand-guidelines-v2.zip",
      ext: ".zip",
      mime: "application/zip",
      uploader: oliviaId,
      bytes: DEMO_ZIP,
    },
  ];

  let attachmentsCreated = 0;
  for (const seed of attachmentSeeds) {
    const task = taskByIndex(seed.taskIdx);
    if (!task) continue;
    const taskDir = `${STORAGE_DIR}/${task.id}`;
    await Deno.mkdir(taskDir, { recursive: true });
    const storedName = `${crypto.randomUUID()}${seed.ext}`;
    const fullPath = `${taskDir}/${storedName}`;
    await Deno.writeFile(fullPath, seed.bytes);
    await prisma.attachment.create({
      data: {
        taskId: task.id,
        uploadedById: seed.uploader,
        fileName: seed.fileName,
        storedName,
        mimeType: seed.mime,
        fileSize: seed.bytes.length,
        storagePath: fullPath,
      },
    });
    attachmentsCreated += 1;
  }
  console.log(`  attachments: ${attachmentsCreated}`);

  // ---- Comments with mentions
  await prisma.comment.deleteMany({ where: { taskId: { in: createdTasks.map((t) => t.id) } } });
  const commentSeeds = [
    {
      taskIdx: 0,
      author: mayaId,
      content:
        "Hey @milo, can you push a draft of the hero by EOD? @olivia needs to review tonight.",
    },
    { taskIdx: 0, author: miloId, content: "On it. I'll have something by 5pm. cc @maya" },
    {
      taskIdx: 2,
      author: mayaId,
      content: "Draft is up. Please review and leave comments directly in the doc.",
    },
    {
      taskIdx: 4,
      author: miloId,
      content: "This is overdue. @maya can we sync on copy tomorrow morning?",
    },
    { taskIdx: 6, author: alexId, content: "Initial 2x load test passed. Pushing to 5x tonight." },
    {
      taskIdx: 8,
      author: mayaId,
      content: "Figma file is ready. @milo can you audit the spacing tokens?",
    },
    { taskIdx: 10, author: miloId, content: "Loving the new layout. Filter UX needs a tweak." },
  ];
  for (const c of commentSeeds) {
    const t = createdTasks[c.taskIdx];
    if (!t) continue;
    await prisma.comment.create({
      data: { taskId: t.id, authorId: c.author, content: c.content },
    });
  }
  console.log(`  comments: ${commentSeeds.length}`);

  // ---- Activity log entries
  await prisma.activityLog.deleteMany({
    where: { projectId: { in: [projectLaunch.id, projectRedesign.id, projectPlatform.id] } },
  });
  const activitySeeds = [
    {
      projectId: projectLaunch.id,
      actor: oliviaId,
      action: "PROJECT_CREATED",
      entityType: "PROJECT",
      entityId: projectLaunch.id,
      meta: { name: projectLaunch.name },
    },
    {
      projectId: projectLaunch.id,
      actor: mayaId,
      action: "TASK_CREATED",
      entityType: "TASK",
      entityId: createdTasks[0].id,
      meta: { title: createdTasks[0].title },
    },
    {
      projectId: projectLaunch.id,
      actor: mayaId,
      action: "TASK_CREATED",
      entityType: "TASK",
      entityId: createdTasks[1].id,
      meta: { title: createdTasks[1].title },
    },
    {
      projectId: projectLaunch.id,
      actor: oliviaId,
      action: "TASK_MOVED",
      entityType: "TASK",
      entityId: createdTasks[3].id,
      meta: { from: "IN_PROGRESS", to: "DONE" },
    },
    {
      projectId: projectLaunch.id,
      actor: mayaId,
      action: "TASK_COMPLETED",
      entityType: "TASK",
      entityId: createdTasks[3].id,
    },
    {
      projectId: projectLaunch.id,
      actor: mayaId,
      action: "MEMBER_INVITED",
      entityType: "INVITATION",
      entityId: projectLaunch.id,
      meta: { email: "alex@example.com" },
    },
    {
      projectId: projectRedesign.id,
      actor: mayaId,
      action: "PROJECT_CREATED",
      entityType: "PROJECT",
      entityId: projectRedesign.id,
      meta: { name: projectRedesign.name },
    },
    {
      projectId: projectPlatform.id,
      actor: alexId,
      action: "PROJECT_CREATED",
      entityType: "PROJECT",
      entityId: projectPlatform.id,
      meta: { name: projectPlatform.name },
    },
    // Admin (Olivia) demonstrating full task CRUD lifecycle.
    {
      projectId: projectLaunch.id,
      actor: oliviaId,
      action: "TASK_CREATED",
      entityType: "TASK",
      entityId: createdTasks[15].id,
      meta: { title: createdTasks[15].title },
    },
    {
      projectId: projectLaunch.id,
      actor: oliviaId,
      action: "TASK_MOVED",
      entityType: "TASK",
      entityId: createdTasks[16].id,
      meta: { from: "TODO", to: "IN_PROGRESS" },
    },
    {
      projectId: projectRedesign.id,
      actor: oliviaId,
      action: "TASK_UPDATED",
      entityType: "TASK",
      entityId: createdTasks[18].id,
      meta: { fields: ["assigneeId", "labels"] },
    },
    {
      projectId: projectPlatform.id,
      actor: oliviaId,
      action: "TASK_MOVED",
      entityType: "TASK",
      entityId: createdTasks[19].id,
      meta: { from: "REVIEW", to: "DONE" },
    },
    {
      projectId: projectPlatform.id,
      actor: oliviaId,
      action: "TASK_COMPLETED",
      entityType: "TASK",
      entityId: createdTasks[19].id,
    },
  ];
  for (const a of activitySeeds) {
    await prisma.activityLog.create({
      data: {
        actorId: a.actor,
        action: a.action,
        entityType: a.entityType,
        entityId: a.entityId,
        projectId: a.projectId,
        metadata: a.meta,
      },
    });
  }

  // Add ATTACHMENT_UPLOADED entries for every demo attachment created above.
  const allAttachments = await prisma.attachment.findMany({
    select: { id: true, taskId: true, uploadedById: true, fileName: true, fileSize: true, mimeType: true },
  });
  for (const att of allAttachments) {
    const task = await prisma.task.findUnique({
      where: { id: att.taskId },
      select: { projectId: true },
    });
    if (!task) continue;
    await prisma.activityLog.create({
      data: {
        actorId: att.uploadedById,
        action: "ATTACHMENT_UPLOADED",
        entityType: "attachment",
        entityId: att.id,
        taskId: att.taskId,
        projectId: task.projectId,
        metadata: { fileName: att.fileName, fileSize: att.fileSize, mimeType: att.mimeType },
      },
    });
  }
  console.log(`  activity: ${activitySeeds.length + allAttachments.length}`);

  // ---- Notifications
  await prisma.notification.deleteMany({});
  const notifSeeds = [
    {
      userId: miloId,
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      message: 'You have been assigned to "Finalize launch landing page"',
      data: { taskId: createdTasks[0].id, projectId: projectLaunch.id },
    },
    {
      userId: miloId,
      type: "TASK_MENTIONED",
      title: "You were mentioned",
      message: "Maya mentioned you in a comment",
      data: { taskId: createdTasks[0].id, projectId: projectLaunch.id },
    },
    {
      userId: mayaId,
      type: "TASK_MENTIONED",
      title: "You were mentioned",
      message: "Milo mentioned you in a comment",
      data: { taskId: createdTasks[0].id, projectId: projectLaunch.id },
    },
    {
      userId: alexId,
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      message: 'You have been assigned to "Pre-launch stress test"',
      data: { taskId: createdTasks[6].id, projectId: projectLaunch.id },
    },
    {
      userId: oliviaId,
      type: "TASK_ASSIGNED",
      title: "You were assigned a task",
      message: 'You have been assigned to "Write launch announcement blog post"',
      data: { taskId: createdTasks[2].id, projectId: projectLaunch.id },
    },
    {
      userId: veraId,
      type: "MEMBER_ADDED",
      title: "Added to project",
      message: `You were added to ${projectLaunch.name}`,
      data: { projectId: projectLaunch.id },
    },
  ];
  for (const n of notifSeeds) {
    await prisma.notification.create({
      data: {
        userId: n.userId,
        type: n.type,
        title: n.title,
        message: n.message,
        data: n.data as never,
        read: false,
      },
    });
  }
  console.log(`  notifications: ${notifSeeds.length}`);

  // ---- A pending invitation example (so the accept/reject endpoints are testable)
  const existingInvite = await prisma.invitation.findFirst({
    where: { email: "newcomer@example.com", status: "PENDING" },
  });
  if (!existingInvite) {
    await prisma.invitation.create({
      data: {
        projectId: projectLaunch.id,
        email: "newcomer@example.com",
        role: "TEAM_MEMBER",
        token: "demo-invitation-token-please-rotate",
        status: "PENDING",
        invitedById: oliviaId,
        expiresAt: new Date(Date.now() + 7 * 86400_000),
        message: "Would love to have you on the launch!",
      },
    });
  }

  console.log("Seed complete.");
  console.log("\nDemo credentials (password is the same for all):");
  console.log("  Admin:         admin@example.com / Password123!");
  console.log("  Project Mgr:   pm@example.com / Password123!");
  console.log("  Team Member:   member@example.com / Password123!");
  console.log("  Viewer:        viewer@example.com / Password123!");
  console.log("  Extra:         alex@example.com / Password123!");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    Deno.exit(1);
  });
