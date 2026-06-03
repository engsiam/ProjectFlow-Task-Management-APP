import type { ComponentChildren } from "preact";
import { SWAGGER_URL } from "../lib/constants.ts";
import { Icon } from "./ui.tsx";
import ThemeToggle from "../islands/ThemeToggle.tsx";
import SystemStatus from "../islands/SystemStatus.tsx";
import NotificationDropdown from "../islands/NotificationDropdown.tsx";
import ToastProvider from "../islands/ToastProvider.tsx";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
  { href: "/projects", label: "Projects", icon: "folder_open" },
  { href: "/tasks", label: "Tasks", icon: "assignment" },
  { href: "/notifications", label: "Notifications", icon: "notifications" },
  { href: "/settings", label: "Settings", icon: "settings" }
];

export function AppShell(
  { active, title, children }: { active: string; title: string; children: ComponentChildren }
) {
  return (
    <div class="app-shell">
      <aside class="sidebar">
        <a href="/dashboard" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span class="brand-mark"><Icon name="rocket_launch" /></span>
          <div>
            <div class="headline" style={{ fontSize: "24px", fontWeight: 800, color: "var(--primary)" }}>ProjectFlow</div>
            <div class="mono" style={{ fontSize: "10px", color: "var(--muted)" }}>SMART WORKSPACE</div>
          </div>
        </a>
        <nav style={{ display: "grid", gap: "6px" }}>
          {nav.map((item) => (
            <a class={`nav-link ${active === item.label ? "active" : ""}`} href={item.href}>
              <Icon name={item.icon} size={20} />
              <span>{item.label}</span>
            </a>
          ))}
        </nav>
        <div style={{ marginTop: "auto", display: "grid", gap: "10px" }}>
          <a class="nav-link" href={SWAGGER_URL} target="_blank" rel="noreferrer">
            <Icon name="code" size={20} />
            <span>Swagger Docs</span>
          </a>
          <div class="panel" style={{ padding: "12px" }}>
            <SystemStatus />
          </div>
        </div>
      </aside>
      <div class="main-region">
        <header class="topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "12px", width: "100%" }}>
            <h1 class="headline" style={{ margin: 0, fontSize: "22px" }}>{title}</h1>
            <div style={{ position: "relative", flex: 1, maxWidth: "560px", marginLeft: "auto" }}>
              <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                <Icon name="search" size={18} />
              </span>
              <input
                class="input"
                aria-label="Global search"
                placeholder="Search tasks, projects, or members..."
                style={{ paddingLeft: "38px" }}
              />
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <SystemStatus />
            <NotificationDropdown />
            <ThemeToggle />
          </div>
        </header>
        <main class="content">{children}</main>
      </div>
      <ToastProvider />
      <nav class="mobile-nav" aria-label="Mobile navigation">
        {nav.map((item) => (
          <a href={item.href}>
            <Icon name={item.icon} size={20} />
            <span>{item.label.replace("Notifications", "Alerts")}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
