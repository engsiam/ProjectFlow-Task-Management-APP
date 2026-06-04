import { AppShell } from "../components/AppShell.tsx";
import AnalyticsClient from "../islands/AnalyticsClient.tsx";

export default function Analytics() {
  return (
    <AppShell active="Analytics" title="Analytics">
      <AnalyticsClient />
    </AppShell>
  );
}
