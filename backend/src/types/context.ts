// Shared Hono context types
import type { RoleType } from "./domain.ts";

export type AuthUser = {
  id: string;
  email: string;
  username: string;
  name: string;
  role: string;
};

export type AppVariables = {
  user: AuthUser;
  requestId: string;
};

export type AppBindings = {};

export type ProjectRoleContext = {
  projectId: string;
  userId: string;
  role: RoleType;
};
