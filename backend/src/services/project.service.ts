// Project service.

import { prisma } from "../prisma/client.ts";
import { isRoleAtLeast, type RoleType } from "../types/domain.ts";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from "../utils/errors.ts";
import { PUBLIC_USER_SAFE } from "../utils/serialize.ts";
import type {
  CreateProjectInput,
  InviteInput,
  ListProjectsQuery,
  UpdateProjectInput,
} from "../validators/project.validator.ts";
import { randomToken } from "../utils/id.ts";
import { logActivity } from "./activity.service.ts";
import { notifyUser } from "./notification.service.ts";

const PROGRESS_STATUSES = ["TODO", "IN_PROGRESS", "REVIEW", "DONE"] as const;

const computeProgress = (tasks: { status: string }[]) => {
  if (tasks.length === 0) return 0;
  const done = tasks.filter((t) => t.status === "DONE").length;
  return Math.round((done / tasks.length) * 100);
};

export const create = async (userId: string, input: CreateProjectInput) => {
  const project = await prisma.project.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#6366f1",
      ownerId: userId,
      members: {
        create: { userId, role: "ADMIN" },
      },
    },
  });
  await logActivity({
    actorId: userId,
    action: "PROJECT_CREATED",
    entityType: "PROJECT",
    entityId: project.id,
    projectId: project.id,
    metadata: { name: project.name },
  });
  return project;
};

export const listMine = async (userId: string, query: ListProjectsQuery) => {
  const where: Record<string, unknown> = {
    OR: [
      { ownerId: userId },
      { members: { some: { userId } } },
    ],
  };
  if (query.status) where.status = query.status;
  if (query.search) {
    where.AND = [
      {
        OR: [
          { name: { contains: query.search, mode: "insensitive" } },
          { description: { contains: query.search, mode: "insensitive" } },
        ],
      },
    ];
  }

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        owner: { select: { id: true, name: true, username: true, avatar: true } },
      },
      orderBy: { updatedAt: "desc" },
      skip,
      take: query.limit,
    }),
    prisma.project.count({ where }),
  ]);

  // compute progress for each
  const projectIds = items.map((p) => p.id);
  const taskGroups = projectIds.length
    ? await prisma.task.groupBy({
      by: ["projectId", "status"],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
    })
    : [];
  const myMemberships = projectIds.length
    ? await prisma.projectMember.findMany({
      where: { projectId: { in: projectIds }, userId },
      select: { projectId: true, role: true },
    })
    : [];
  const progressMap = new Map<string, { total: number; done: number }>();
  for (const g of taskGroups) {
    const entry = progressMap.get(g.projectId) ?? { total: 0, done: 0 };
    entry.total += g._count._all;
    if (g.status === "DONE") entry.done += g._count._all;
    progressMap.set(g.projectId, entry);
  }
  const roleMap = new Map<string, RoleType>(
    myMemberships.map((membership) => [membership.projectId, membership.role as RoleType]),
  );

  const enriched = items.map((p) => {
    const grp = progressMap.get(p.id) ?? { total: 0, done: 0 };
    return {
      ...p,
      progress: grp.total ? Math.round((grp.done / grp.total) * 100) : 0,
      taskCount: grp.total,
      currentRole: p.ownerId === userId ? "ADMIN" : roleMap.get(p.id) ?? null,
    };
  });

  return {
    items: enriched,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / query.limit)),
      hasNext: query.page * query.limit < total,
      hasPrev: query.page > 1,
    },
  };
};

export const getById = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { id: true, name: true, username: true, avatar: true, email: true } },
      members: {
        include: {
          user: { select: { id: true, name: true, username: true, email: true, avatar: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
      _count: { select: { tasks: true, invitations: true } },
    },
  });
  if (!project) throw new NotFoundError("Project not found");
  const isMember = project.ownerId === userId ||
    project.members.some((m) => m.userId === userId);
  if (!isMember) throw new ForbiddenError("You are not a member of this project");

  const taskStatusGroups = await prisma.task.groupBy({
    by: ["status"],
    where: { projectId },
    _count: { _all: true },
  });
  const totalTasks = taskStatusGroups.reduce((sum, g) => sum + g._count._all, 0);
  const doneTasks = taskStatusGroups.find((g) => g.status === "DONE")?._count._all ?? 0;
  const progress = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
  const currentRole = project.ownerId === userId
    ? "ADMIN"
    : project.members.find((member) => member.userId === userId)?.role ?? null;

  return {
    ...project,
    progress,
    currentRole,
    taskStats: {
      total: totalTasks,
      todo: taskStatusGroups.find((g) => g.status === "TODO")?._count._all ?? 0,
      inProgress: taskStatusGroups.find((g) => g.status === "IN_PROGRESS")?._count._all ?? 0,
      review: taskStatusGroups.find((g) => g.status === "REVIEW")?._count._all ?? 0,
      done: doneTasks,
    },
  };
};

export const update = async (
  userId: string,
  projectId: string,
  input: UpdateProjectInput,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId }, select: { role: true }, take: 1 } },
  });
  if (!project) throw new NotFoundError("Project not found");
  if (project.ownerId !== userId) {
    const member = project.members[0];
    if (!member || !isRoleAtLeast(member.role as RoleType, "PROJECT_MANAGER")) {
      throw new ForbiddenError("Only ADMIN or Project Manager can update project");
    }
  }
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.description !== undefined ? { description: input.description } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    },
  });
  await logActivity({
    actorId: userId,
    action: input.status === "ARCHIVED" ? "PROJECT_ARCHIVED" : "PROJECT_UPDATED",
    entityType: "PROJECT",
    entityId: projectId,
    projectId,
    metadata: { changes: input },
  });
  return updated;
};

export const archive = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError("Project not found");
  const updated = await prisma.project.update({
    where: { id: projectId },
    data: { status: "ARCHIVED", archivedAt: new Date() },
  });
  await logActivity({
    actorId: userId,
    action: "PROJECT_ARCHIVED",
    entityType: "PROJECT",
    entityId: projectId,
    projectId,
  });
  return updated;
};

export const remove = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({ where: { id: projectId } });
  if (!project) throw new NotFoundError("Project not found");
  await prisma.activityLog.deleteMany({ where: { projectId } });
  await prisma.project.delete({ where: { id: projectId } });
};

// =====================================================
// MEMBERS
// =====================================================

export const listMembers = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: {
          user: { select: { id: true, name: true, username: true, email: true, avatar: true } },
        },
        orderBy: { joinedAt: "asc" },
      },
    },
  });
  if (!project) throw new NotFoundError("Project not found");
  const isMember = project.ownerId === userId ||
    project.members.some((m) => m.userId === userId);
  if (!isMember) throw new ForbiddenError("You are not a member of this project");
  // Ensure owner appears as OWNER even if not in members table
  const ownerMember = project.members.find((m) => m.userId === project.ownerId);
  if (!ownerMember) {
    const owner = await prisma.user.findUnique({
      where: { id: project.ownerId },
      select: { id: true, name: true, username: true, email: true, avatar: true },
    });
    if (owner) {
      project.members.unshift({
        id: "owner",
        projectId,
        userId: owner.id,
        role: "ADMIN",
        joinedAt: project.createdAt,
        user: owner,
      } as never);
    }
  }
  return project.members;
};

export const invite = async (
  userId: string,
  projectId: string,
  input: InviteInput,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId }, select: { role: true }, take: 1 } },
  });
  if (!project) throw new NotFoundError("Project not found");

  // Permission: ADMIN/Project Manager only
  if (project.ownerId !== userId) {
    const member = project.members[0];
    if (!member || !isRoleAtLeast(member.role as RoleType, "PROJECT_MANAGER")) {
      throw new ForbiddenError("Only ADMIN or Project Manager can invite members");
    }
  }
  if (input.role === "ADMIN") {
    throw new BadRequestError("Cannot invite as ADMIN");
  }
  // Check existing member
  const existingUser = await prisma.user.findUnique({ where: { email: input.email } });
  if (existingUser) {
    const alreadyMember = existingUser.id === project.ownerId ||
      await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: existingUser.id } },
      });
    if (alreadyMember) throw new ConflictError("User is already a member of this project");
  }
  // Cancel previous pending invitations for same email/project
  await prisma.invitation.updateMany({
    where: { projectId, email: input.email, status: "PENDING" },
    data: { status: "CANCELLED" },
  });

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  const invitation = await prisma.invitation.create({
    data: {
      projectId,
      email: input.email,
      role: input.role,
      token,
      invitedById: userId,
      invitedUserId: existingUser?.id ?? null,
      expiresAt,
      message: input.message ?? null,
    },
    include: {
      project: { select: { id: true, name: true, color: true } },
      invitedBy: { select: { id: true, name: true, username: true } },
    },
  });

  await logActivity({
    actorId: userId,
    action: "MEMBER_INVITED",
    entityType: "INVITATION",
    entityId: invitation.id,
    projectId,
    metadata: { email: input.email, role: input.role },
  });

  // If user exists, notify them
  if (existingUser) {
    await notifyUser({
      userId: existingUser.id,
      type: "INVITATION",
      title: `Invitation to ${project.name}`,
      message:
        `${invitation.invitedBy.name} invited you to join "${project.name}" as ${input.role}`,
      data: { projectId, invitationId: invitation.id, role: input.role },
    });
  }

  return invitation;
};

export const acceptInvitation = async (userId: string, invitationId: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { project: true, invitedBy: { select: { id: true, name: true } } },
  });
  if (!invitation) throw new NotFoundError("Invitation not found");
  if (invitation.status !== "PENDING") {
    throw new BadRequestError(`Invitation is ${invitation.status.toLowerCase()}`);
  }
  if (invitation.expiresAt < new Date()) {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "EXPIRED" },
    });
    throw new BadRequestError("Invitation has expired");
  }
  // Verify the invitation belongs to this user (by email or invitedUserId)
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new NotFoundError("User not found");
  if (
    invitation.email.toLowerCase() !== me.email.toLowerCase() && invitation.invitedUserId !== userId
  ) {
    throw new ForbiddenError("This invitation is not for you");
  }

  const updated = await prisma.$transaction(async (tx) => {
    await tx.invitation.update({
      where: { id: invitationId },
      data: { status: "ACCEPTED", invitedUserId: userId },
    });
    await tx.projectMember.upsert({
      where: { projectId_userId: { projectId: invitation.projectId, userId } },
      update: { role: invitation.role },
      create: {
        projectId: invitation.projectId,
        userId,
        role: invitation.role,
      },
    });
    return tx.invitation.findUnique({
      where: { id: invitationId },
      include: {
        project: { select: { id: true, name: true, color: true, description: true } },
      },
    });
  });

  await logActivity({
    actorId: userId,
    action: "MEMBER_ACCEPTED",
    entityType: "MEMBER",
    entityId: userId,
    projectId: invitation.projectId,
    metadata: { role: invitation.role },
  });

  await notifyUser({
    userId: invitation.invitedById,
    type: "INVITATION_ACCEPTED",
    title: "Invitation accepted",
    message: `${me.name} accepted your invitation to "${invitation.project.name}"`,
    data: { projectId: invitation.projectId, memberId: userId },
  });

  return updated;
};

export const rejectInvitation = async (userId: string, invitationId: string) => {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { project: { select: { id: true, name: true } } },
  });
  if (!invitation) throw new NotFoundError("Invitation not found");
  if (invitation.status !== "PENDING") {
    throw new BadRequestError(`Invitation is ${invitation.status.toLowerCase()}`);
  }
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) throw new NotFoundError("User not found");
  if (
    invitation.email.toLowerCase() !== me.email.toLowerCase() && invitation.invitedUserId !== userId
  ) {
    throw new ForbiddenError("This invitation is not for you");
  }
  const updated = await prisma.invitation.update({
    where: { id: invitationId },
    data: { status: "REJECTED", invitedUserId: userId },
  });

  await notifyUser({
    userId: invitation.invitedById,
    type: "INVITATION_REJECTED",
    title: "Invitation rejected",
    message: `${me.name} declined your invitation to "${invitation.project.name}"`,
    data: { projectId: invitation.projectId, memberId: userId },
  });

  return updated;
};

export const changeRole = async (
  actorId: string,
  projectId: string,
  memberId: string,
  role: RoleType,
) => {
  if (!isRoleAtLeast(role, "VIEWER")) {
    throw new BadRequestError("Invalid role");
  }
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId: actorId }, select: { role: true }, take: 1 } },
  });
  if (!project) throw new NotFoundError("Project not found");
  if (project.ownerId === memberId) {
    throw new BadRequestError("Cannot change OWNER's role");
  }
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: memberId } },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!member) throw new NotFoundError("Member not found");

  // Permission: ADMIN can set any role except ADMIN. Project Manager cannot promote to ADMIN/Project Manager.
  if (project.ownerId !== actorId) {
    const actorMember = project.members[0];
    if (!actorMember) throw new ForbiddenError("Not a project member");
    if (!isRoleAtLeast(actorMember.role as RoleType, "PROJECT_MANAGER")) {
      throw new ForbiddenError("Only ADMIN or Project Manager can change roles");
    }
    if (role === "ADMIN") {
      throw new ForbiddenError("Only ADMIN can promote to ADMIN");
    }
    if (actorMember.role === "PROJECT_MANAGER" && member.role === "ADMIN") {
      throw new ForbiddenError("Cannot change ADMIN's role");
    }
  }

  if (role === "ADMIN") {
    throw new BadRequestError("Use a separate endpoint to transfer ownership");
  }

  const updated = await prisma.projectMember.update({
    where: { projectId_userId: { projectId, userId: memberId } },
    data: { role },
    include: {
      user: { select: { id: true, name: true, username: true, email: true, avatar: true } },
    },
  });
  await logActivity({
    actorId,
    action: "ROLE_CHANGED",
    entityType: "MEMBER",
    entityId: memberId,
    projectId,
    metadata: { from: member.role, to: role, memberName: member.user.name },
  });
  await notifyUser({
    userId: memberId,
    type: "ROLE_CHANGED",
    title: "Your role was updated",
    message: `Your role in this project is now ${role}`,
    data: { projectId, role },
  });
  return updated;
};

export const removeMember = async (
  actorId: string,
  projectId: string,
  memberId: string,
) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: { where: { userId: actorId }, select: { role: true }, take: 1 } },
  });
  if (!project) throw new NotFoundError("Project not found");
  if (project.ownerId === memberId) {
    throw new BadRequestError("Cannot remove the OWNER");
  }
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: memberId } },
    include: { user: { select: { id: true, name: true } } },
  });
  if (!member) throw new NotFoundError("Member not found");

  if (project.ownerId !== actorId) {
    const actorMember = project.members[0];
    if (!actorMember || !isRoleAtLeast(actorMember.role as RoleType, "PROJECT_MANAGER")) {
      throw new ForbiddenError("Only ADMIN or Project Manager can remove members");
    }
    if (member.role === "ADMIN" || member.role === "PROJECT_MANAGER") {
      throw new ForbiddenError("Cannot remove a higher-ranked member");
    }
  }

  await prisma.projectMember.delete({
    where: { projectId_userId: { projectId, userId: memberId } },
  });
  // Unassign their tasks
  await prisma.task.updateMany({
    where: { projectId, assigneeId: memberId },
    data: { assigneeId: null },
  });
  await logActivity({
    actorId,
    action: "MEMBER_REMOVED",
    entityType: "MEMBER",
    entityId: memberId,
    projectId,
    metadata: { memberName: member.user.name },
  });
  await notifyUser({
    userId: memberId,
    type: "MEMBER_REMOVED",
    title: "Removed from project",
    message: `You have been removed from the project`,
    data: { projectId },
  });
};
