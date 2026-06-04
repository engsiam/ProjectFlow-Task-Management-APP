// Prisma seed: 5 users, 3 projects, members with mixed roles, invitations,
// tasks across all Kanban columns, comments with mentions, notifications,
// and activity logs. Idempotent: re-runs upsert by email.
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
  await prisma.notification.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.invitation.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.user.deleteMany({});
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
  console.log(`  activity: ${activitySeeds.length}`);

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
