import type { Project, Role, Task } from "./types.ts";

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 1,
  TEAM_MEMBER: 2,
  PROJECT_MANAGER: 3,
  ADMIN: 4,
};

const LABELS: Record<Role, string> = {
  ADMIN: "Admin",
  PROJECT_MANAGER: "Project Manager",
  TEAM_MEMBER: "Team Member",
  VIEWER: "Viewer",
};

export const roleLabel = (role?: Role | null) =>
  role ? LABELS[role] : "Account";

export const isRoleAtLeast = (role: Role | null | undefined, minimum: Role) =>
  Boolean(role) && ROLE_RANK[role as Role] >= ROLE_RANK[minimum];

export const getProjectRole = (
  project?: Partial<Project> | null,
  userId?: string | null,
): Role | null => {
  if (!project || !userId) return project?.currentRole ?? null;
  if (project.currentRole) return project.currentRole;
  if (project.ownerId === userId || project.owner?.id === userId) {
    return "ADMIN";
  }
  return project.members?.find((member) => member.user.id === userId)?.role ??
    null;
};

export const canCreateProject = (role?: Role | null) =>
  isRoleAtLeast(role, "PROJECT_MANAGER");

export const canInviteMembers = (role?: Role | null) =>
  isRoleAtLeast(role, "PROJECT_MANAGER");

export const canCreateTasks = (role?: Role | null) =>
  isRoleAtLeast(role, "TEAM_MEMBER");

export const canComment = (role?: Role | null) =>
  isRoleAtLeast(role, "TEAM_MEMBER");

export const canArchiveProject = (role?: Role | null) => role === "ADMIN";

export const canDeleteProject = (role?: Role | null) => role === "ADMIN";

export const getAssignableRoles = (
  actorRole?: Role | null,
  targetRole?: Role | null,
) => {
  if (actorRole === "ADMIN") {
    return targetRole === "ADMIN"
      ? []
      : (["PROJECT_MANAGER", "TEAM_MEMBER", "VIEWER"] as Role[]);
  }
  if (actorRole === "PROJECT_MANAGER") {
    return targetRole === "TEAM_MEMBER" || targetRole === "VIEWER"
      ? (["TEAM_MEMBER", "VIEWER"] as Role[])
      : [];
  }
  return [] as Role[];
};

export const canRemoveMember = (
  actorRole?: Role | null,
  targetRole?: Role | null,
  actorUserId?: string | null,
  targetUserId?: string | null,
) => {
  if (!actorRole || !targetRole) return false;
  if (actorUserId && targetUserId && actorUserId === targetUserId) return false;
  if (actorRole === "ADMIN") return targetRole !== "ADMIN";
  if (actorRole === "PROJECT_MANAGER") {
    return targetRole === "TEAM_MEMBER" || targetRole === "VIEWER";
  }
  return false;
};

export const canEditTask = (role?: Role | null) =>
  isRoleAtLeast(role, "TEAM_MEMBER");

export const canDeleteTask = (
  role: Role | null | undefined,
  task: Task,
  userId?: string | null,
) =>
  isRoleAtLeast(role, "PROJECT_MANAGER") ||
  (Boolean(userId) && task.creatorId === userId);
