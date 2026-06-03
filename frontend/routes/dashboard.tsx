import { AppShell } from "../components/AppShell.tsx";
import DashboardClient from "../islands/DashboardClient.tsx";

export default function Dashboard() {
  return (
    <AppShell active="Dashboard" title="Dashboard">
      <DashboardClient />
    </AppShell>
  );
}
