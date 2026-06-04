import type { Project, Task } from "../lib/types.ts";
import TaskDetailModal from "./TaskDetailModal.tsx";

export default function TaskEditModal(
  { task, projects, onClose, onSaved }: {
    task: Task;
    projects: Project[];
    onClose: () => void;
    onSaved: () => void;
  },
) {
  return (
    <TaskDetailModal
      task={task}
      projects={projects}
      onClose={onClose}
      onSaved={onSaved}
    />
  );
}
