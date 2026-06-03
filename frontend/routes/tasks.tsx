import { AppShell } from "../components/AppShell.tsx";
import TasksClient from "../islands/TasksClient.tsx";

export default function Tasks() {
  return (
    <AppShell active="Tasks" title="Tasks">
      <TasksClient />
    </AppShell>
  );
}
