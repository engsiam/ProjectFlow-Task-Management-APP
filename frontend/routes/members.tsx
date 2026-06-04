import { AppShell } from "../components/AppShell.tsx";
import MembersClient from "../islands/MembersClient.tsx";

export default function Members() {
  return (
    <AppShell active="Members" title="Team Members">
      <MembersClient />
    </AppShell>
  );
}
