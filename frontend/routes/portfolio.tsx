import { AppShell } from "../components/AppShell.tsx";
import PortfolioClient from "../islands/PortfolioClient.tsx";

export default function Portfolio() {
  return (
    <AppShell active="Portfolio" title="Project Portfolio">
      <PortfolioClient />
    </AppShell>
  );
}
