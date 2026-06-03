import { AppShell } from "../components/AppShell.tsx";
import SettingsClient from "../islands/SettingsClient.tsx";

export default function Settings() {
  return (
    <AppShell active="Settings" title="Settings">
      <SettingsClient />
    </AppShell>
  );
}
