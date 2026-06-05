// Domain constants and shared enums (MongoDB does not support Prisma enums).

export const ProjectStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  ARCHIVED: "ARCHIVED",
} as const;
export type ProjectStatusType = typeof ProjectStatus[keyof typeof ProjectStatus];
export const PROJECT_STATUSES: ProjectStatusType[] = Object.values(ProjectStatus);

export const Role = {
  ADMIN: "ADMIN",
  PROJECT_MANAGER: "PROJECT_MANAGER",
  TEAM_MEMBER: "TEAM_MEMBER",
  VIEWER: "VIEWER",
} as const;
export type RoleType = typeof Role[keyof typeof Role];
export const ROLES: RoleType[] = Object.values(Role);

export const TaskStatus = {
  TODO: "TODO",
  IN_PROGRESS: "IN_PROGRESS",
  REVIEW: "REVIEW",
  DONE: "DONE",
} as const;
export type TaskStatusType = typeof TaskStatus[keyof typeof TaskStatus];
export const TASK_STATUSES: TaskStatusType[] = Object.values(TaskStatus);

export const Priority = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  URGENT: "URGENT",
} as const;
export type PriorityType = typeof Priority[keyof typeof Priority];
export const PRIORITIES: PriorityType[] = Object.values(Priority);

export const InvitationStatus = {
  PENDING: "PENDING",
  ACCEPTED: "ACCEPTED",
  REJECTED: "REJECTED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;
export type InvitationStatusType = typeof InvitationStatus[keyof typeof InvitationStatus];

export const NotificationType = {
  TASK_ASSIGNED: "TASK_ASSIGNED",
  TASK_MENTIONED: "TASK_MENTIONED",
  TASK_STATUS: "TASK_STATUS",
  TASK_DUE_SOON: "TASK_DUE_SOON",
  INVITATION: "INVITATION",
  INVITATION_ACCEPTED: "INVITATION_ACCEPTED",
  INVITATION_REJECTED: "INVITATION_REJECTED",
  COMMENT: "COMMENT",
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  ROLE_CHANGED: "ROLE_CHANGED",
  PROJECT_UPDATED: "PROJECT_UPDATED",
} as const;
export type NotificationTypeType = typeof NotificationType[keyof typeof NotificationType];

export const ActivityAction = {
  PROJECT_CREATED: "PROJECT_CREATED",
  PROJECT_UPDATED: "PROJECT_UPDATED",
  PROJECT_ARCHIVED: "PROJECT_ARCHIVED",
  PROJECT_COMPLETED: "PROJECT_COMPLETED",
  TASK_CREATED: "TASK_CREATED",
  TASK_UPDATED: "TASK_UPDATED",
  TASK_MOVED: "TASK_MOVED",
  TASK_COMPLETED: "TASK_COMPLETED",
  TASK_DELETED: "TASK_DELETED",
  MEMBER_INVITED: "MEMBER_INVITED",
  MEMBER_ACCEPTED: "MEMBER_ACCEPTED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
  ROLE_CHANGED: "ROLE_CHANGED",
  COMMENT_ADDED: "COMMENT_ADDED",
  COMMENT_UPDATED: "COMMENT_UPDATED",
  COMMENT_DELETED: "COMMENT_DELETED",
  ATTACHMENT_UPLOADED: "ATTACHMENT_UPLOADED",
  ATTACHMENT_DELETED: "ATTACHMENT_DELETED",
} as const;
export type ActivityActionType = typeof ActivityAction[keyof typeof ActivityAction];

// Permission matrix
export const ROLE_RANK: Record<RoleType, number> = {
  VIEWER: 1,
  TEAM_MEMBER: 2,
  PROJECT_MANAGER: 3,
  ADMIN: 4,
};

export const isRoleAtLeast = (role: RoleType, min: RoleType): boolean => {
  return ROLE_RANK[role] >= ROLE_RANK[min];
};
