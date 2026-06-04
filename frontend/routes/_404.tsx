import type { PageProps } from "$fresh/server.ts";
import { Icon } from "../components/ui.tsx";

export default function NotFound({ url }: PageProps) {
  return (
    <main class="auth-page">
      <section class="auth-panel" style={{ textAlign: "center" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px", marginBottom: "20px" }}>
          <span class="brand-mark"><Icon name="rocket_launch" /></span>
          <div>
            <h1 class="headline" style={{ margin: 0, fontSize: "28px", color: "var(--primary)" }}>ProjectFlow</h1>
            <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "10px" }}>MISSION CONTROL</p>
          </div>
        </div>
        <span style={{ fontSize: "72px", fontWeight: 800, lineHeight: 1, color: "var(--primary)" }}>404</span>
        <h2 class="headline" style={{ margin: "8px 0 6px", fontSize: "24px" }}>Lost in orbit</h2>
        <p style={{ margin: "0 0 24px", color: "var(--muted)", maxWidth: "380px" }}>
          The page you're looking for doesn't exist or has been moved.
          Let's get you back to safe ground.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "10px", flexWrap: "wrap" }}>
          <a href="/dashboard" class="btn btn-primary">
            <Icon name="dashboard" size={18} /> Dashboard
          </a>
          <a href="/projects" class="btn btn-secondary">
            <Icon name="folder_open" size={18} /> Projects
          </a>
        </div>
        <p style={{ marginTop: "24px", fontSize: "12px", color: "var(--muted)" }}>
          <code style={{ background: "var(--surface-2)", padding: "2px 6px", borderRadius: "4px" }}>
            {url.pathname}
          </code>
        </p>
      </section>
    </main>
  );
}
