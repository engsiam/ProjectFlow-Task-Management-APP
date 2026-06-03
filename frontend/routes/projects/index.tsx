import { AppShell } from "../../components/AppShell.tsx";
import ProjectsClient from "../../islands/ProjectsClient.tsx";

export default function Projects() {
  return (
    <AppShell active="Projects" title="Projects">
      <ProjectsClient />
    </AppShell>
  );
}
