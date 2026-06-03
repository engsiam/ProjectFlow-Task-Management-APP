import type { PageProps } from "$fresh/server.ts";
import { AppShell } from "../../components/AppShell.tsx";
import ProjectDetailClient from "../../islands/ProjectDetailClient.tsx";

export default function ProjectDetail(props: PageProps) {
  return (
    <AppShell active="Projects" title="Project Detail">
      <ProjectDetailClient projectId={props.params.id} />
    </AppShell>
  );
}
