import { AppShell } from "../components/AppShell.tsx";
import NotificationsClient from "../islands/NotificationsClient.tsx";

export default function Notifications() {
  return (
    <AppShell active="Notifications" title="Notifications">
      <NotificationsClient />
    </AppShell>
  );
}
