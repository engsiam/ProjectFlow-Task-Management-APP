// Export service: produces CSV strings.

import { prisma } from "../prisma/client.ts";
import { ForbiddenError, NotFoundError } from "../utils/errors.ts";
import { toCSV } from "../utils/csv.ts";
import { isRoleAtLeast, type RoleType } from "../types/domain.ts";

export const exportProjectTasksCSV = async (userId: string, projectId: string) => {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { members: true },
  });
  if (!project) throw new NotFoundError("Project not found");
  if (project.ownerId !== userId) {
    const m = project.members.find((x) => x.userId === userId);
    if (!m || !isRoleAtLeast(m.role as RoleType, "MANAGER")) {
      throw new ForbiddenError("Only OWNER or MANAGER can export");
    }
  }
  const tasks = await prisma.task.findMany({
    where: { projectId },
    include: {
      assignee: { select: { name: true, email: true, username: true } },
    },
    orderBy: [{ status: "asc" }, { order: "asc" }],
  });
  const rows = tasks.map((t) => ({
    id: t.id,
    title: t.title,
    description: t.description ?? "",
    status: t.status,
    priority: t.priority,
    assignee: t.assignee ? `${t.assignee.name} <${t.assignee.email}>` : "",
    assigneeUsername: t.assignee?.username ?? "",
    dueDate: t.dueDate ? t.dueDate.toISOString() : "",
    labels: t.labels.join("|"),
    order: t.order,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    completedAt: t.completedAt ? t.completedAt.toISOString() : "",
  }));
  const csv = toCSV(rows, [
    { key: "id", header: "Task ID" },
    { key: "title", header: "Title" },
    { key: "description", header: "Description" },
    { key: "status", header: "Status" },
    { key: "priority", header: "Priority" },
    { key: "assignee", header: "Assignee" },
    { key: "assigneeUsername", header: "Assignee Username" },
    { key: "dueDate", header: "Due Date" },
    { key: "labels", header: "Labels" },
    { key: "order", header: "Kanban Order" },
    { key: "createdAt", header: "Created At" },
    { key: "updatedAt", header: "Updated At" },
    { key: "completedAt", header: "Completed At" },
  ]);
  return {
    csv,
    filename: `tasks-${project.name.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${
      new Date().toISOString().slice(0, 10)
    }.csv`,
  };
};
