import { signal } from "@preact/signals-core";
import type { ComponentChildren } from "preact";
import { Icon } from "./ui.tsx";
import ThemeToggle from "../islands/ThemeToggle.tsx";
import SystemStatus from "../islands/SystemStatus.tsx";
import NotificationDropdown from "../islands/NotificationDropdown.tsx";
import SearchCommand from "../islands/SearchCommand.tsx";
import ToastProvider from "../islands/ToastProvider.tsx";
import ShellUser from "../islands/ShellUser.tsx";
import GlobalErrorHandler from "../islands/GlobalErrorHandler.tsx";
import { getCurrentUser } from "../lib/auth.ts";
import { canCreateProject } from "../lib/roles.ts";
import { prefetchOnHover } from "../lib/prefetch.ts";
import ErrorBoundary from "./ErrorBoundary.tsx";

const sidebarCollapsed = signal(false);

type NavSection = {
  label: string;
  items: { href: string; label: string; icon: string }[];
};

const sections: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { href: "/projects", label: "Projects", icon: "folder_open" },
      { href: "/tasks", label: "Tasks", icon: "assignment" },
    ],
  },
  {
    label: "Collaboration",
    items: [
      { href: "/members", label: "Members", icon: "group" },
      { href: "/notifications", label: "Notifications", icon: "notifications" },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/settings", label: "Settings", icon: "settings" },
    ],
  },
];

const flatNav = sections.flatMap((s) => s.items);

const mobileNavIcons: Record<string, string> = {
  Dashboard: "dashboard",
  Projects: "folder_open",
  Tasks: "assignment",
  Members: "group",
  Notifications: "notifications",
  Settings: "settings",
};

export function AppShell(
  { active, title, children }: { active: string; title: string; children: ComponentChildren },
) {
  const collapsed = sidebarCollapsed.value;
  const user = typeof localStorage !== "undefined" ? getCurrentUser() : null;
  const canCreate = canCreateProject(user?.role);

  return (
    <div class={`app-shell${collapsed ? " sidebar-collapsed" : ""}`}>
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-header">
            <a href="/dashboard" class="sb-brand">
              <span class="sb-brand-icon">
                <Icon name="rocket_launch" />
              </span>
              {!collapsed && (
                <div class="sb-brand-text">
                  <div class="sb-brand-name">ProjectFlow</div>
                  <div class="sb-brand-tier">Enterprise</div>
                </div>
              )}
            </a>
            <button
              class="sb-collapse-btn"
              onClick={() => sidebarCollapsed.value = !collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <Icon name={collapsed ? "chevron_right" : "chevron_left"} size={16} />
            </button>
          </div>

          <nav class="sb-nav">
            {sections.map((section) => (
              <div class="sb-section" key={section.label}>
                {!collapsed && <div class="sb-section-label">{section.label}</div>}
                {section.items.map((item) => (
                  <a
                    key={item.label}
                    class={`sb-link ${active === item.label ? "active" : ""}`}
                    href={item.href}
                    data-label={item.label}
                    ref={(el) => el && prefetchOnHover(el, item.href)}
                  >
                    <span class="sb-link-icon">
                      <Icon name={item.icon} size={18} />
                    </span>
                    {!collapsed && <span class="sb-link-text">{item.label}</span>}
                  </a>
                ))}
              </div>
            ))}
          </nav>

          <div class="sb-footer">
            {!collapsed
              ? (
                <>
                  <div class="sb-api-row">
                    <SystemStatus />
                  </div>
                  {canCreate && (
                    <button class="sb-cta" onClick={() => location.href = "/projects"}>
                      <Icon name="add" size={16} />
                      <span>New Project</span>
                    </button>
                  )}
                </>
              )
              : (
                <>
                  <div class="sb-api-dot-collapsed">
                    <SystemStatus compact />
                  </div>
                  {canCreate && (
                    <button class="sb-fab" onClick={() => location.href = "/projects"}>
                      <Icon name="add" size={20} />
                    </button>
                  )}
                </>
              )}
          </div>
        </div>
      </aside>

      <div class="main-region">
        <header class="topbar">
          <div class="topbar-main">
            <h1 class="headline topbar-title">{title}</h1>
            <SearchCommand />
          </div>
          <div class="topbar-actions">
            <NotificationDropdown />
            <ThemeToggle />
            <div class="topbar-divider" />
            <ShellUser />
          </div>
        </header>
        <main class="content"><ErrorBoundary>{children}</ErrorBoundary></main>
      </div>

      <ToastProvider />
      <GlobalErrorHandler />

      <nav class="mobile-nav" aria-label="Mobile navigation">
        {flatNav.map((item) => (
          <a
            href={item.href}
            class={active === item.label ? "active" : ""}
            ref={(el) => el && prefetchOnHover(el, item.href)}
          >
            <Icon name={item.icon} size={20} />
            <span>{item.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
