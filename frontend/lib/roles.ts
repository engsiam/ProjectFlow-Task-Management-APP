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

export const isAdmin = (role?: Role | null) => role === "ADMIN";
export const isManager = (role?: Role | null) =>
  role === "PROJECT_MANAGER" || role === "ADMIN";
export const isMember = (role?: Role | null) =>
  role === "TEAM_MEMBER" || role === "PROJECT_MANAGER" || role === "ADMIN";
export const isViewer = (role?: Role | null) => role === "VIEWER";

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

export const isProjectOwner = (
  project?: Partial<Project> | null,
  userId?: string | null,
) =>
  Boolean(
    project && userId &&
      (project.ownerId === userId || project.owner?.id === userId),
  );

export const isAssignee = (task: Task, userId?: string | null) =>
  Boolean(
    userId &&
      (task.assignee?.id === userId),
  );

export const canCreateProject = (role?: Role | null) => isManager(role);

export const canEditProject = (
  role?: Role | null,
  project?: Partial<Project> | null,
  userId?: string | null,
) => {
  if (isAdmin(role)) return true;
  if (isProjectOwner(project, userId)) return true;
  return false;
};

export const canArchiveProject = (
  role?: Role | null,
  _project?: Partial<Project> | null,
  _userId?: string | null,
) => isAdmin(role);

export const canDeleteProject = (
  role?: Role | null,
  _project?: Partial<Project> | null,
  _userId?: string | null,
) => isAdmin(role);

export const canInviteMembers = (
  role?: Role | null,
  project?: Partial<Project> | null,
  userId?: string | null,
) => {
  if (isAdmin(role)) return true;
  if (isManager(role) && isProjectOwner(project, userId)) return true;
  if (isManager(role) && project?.currentRole === "PROJECT_MANAGER") {
    return true;
  }
  return false;
};

export const canCreateTasks = (
  role?: Role | null,
  project?: Partial<Project> | null,
  userId?: string | null,
) => {
  if (isAdmin(role)) return true;
  if (isManager(role)) return true;
  // Team members can create tasks in projects they own, or in projects where
  // they are explicitly listed as a TEAM_MEMBER collaborator.
  if (
    isMember(role) &&
    (isProjectOwner(project, userId) || project?.currentRole === "TEAM_MEMBER")
  ) {
    return true;
  }
  return false;
};

export const canAssignTasks = (
  role?: Role | null,
  project?: Partial<Project> | null,
  userId?: string | null,
) => {
  if (isAdmin(role)) return true;
  if (isManager(role)) return true;
  return false;
};

export const canComment = (
  role?: Role | null,
  _project?: Partial<Project> | null,
  _userId?: string | null,
) => isMember(role);

export const canEditTask = (
  role?: Role | null,
  task?: Task | null,
  userId?: string | null,
) => {
  if (!task) return isMember(role);
  if (isAdmin(role)) return true;
  if (isManager(role)) return true;
  if (isMember(role) && isAssignee(task, userId)) return true;
  return false;
};

export const canChangeTaskStatus = (
  role?: Role | null,
  task?: Task | null,
  userId?: string | null,
) => canEditTask(role, task, userId);

export const canDeleteTask = (
  role: Role | null | undefined,
  _task: Task,
  _userId?: string | null,
) => isAdmin(role);

export const canManageRoles = (role?: Role | null) => isAdmin(role);

export const canViewAnalytics = (role?: Role | null) => isMember(role);

export const canManageMembers = (
  role?: Role | null,
  project?: Partial<Project> | null,
  userId?: string | null,
) => {
  if (isAdmin(role)) return true;
  if (isManager(role)) return true;
  return false;
};

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
  _targetRole?: Role | null,
  _actorUserId?: string | null,
  _targetUserId?: string | null,
) => isAdmin(actorRole);
