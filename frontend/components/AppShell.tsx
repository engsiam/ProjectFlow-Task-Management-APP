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
import OnlineBanner from "../islands/OnlineBanner.tsx";
import FullLoader from "../islands/FullLoader.tsx";
import NavigationGuard from "../islands/NavigationGuard.tsx";
import { getCurrentUser } from "../lib/auth.ts";
import { canCreateProject } from "../lib/roles.ts";
import { prefetchOnHover } from "../lib/prefetch.ts";
import ErrorBoundary from "./ErrorBoundary.tsx";

// No global signal needed for vanilla JS toggle

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
    label: "Insights",
    items: [
      { href: "/analytics", label: "Analytics", icon: "monitoring" },
      { href: "/portfolio", label: "Portfolio", icon: "dashboard_customize" },
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

// For a compact mobile design, only show the 5 most essential links
const mobileNavLabels = ["Dashboard", "Projects", "Tasks", "Notifications", "Settings"];
const mobileNavItems = flatNav.filter(item => mobileNavLabels.includes(item.label));

export function AppShell(
  { active, title, children }: {
    active: string;
    title: string;
    children: ComponentChildren;
  },
) {
  const user = typeof localStorage !== "undefined" ? getCurrentUser() : null;
  const canCreate = canCreateProject(user?.role);

  return (
    <div class="app-shell">
      <aside class="sidebar">
        <div class="sidebar-inner">
          <div class="sidebar-header">
            <a href="/dashboard" class="sb-brand">
              <span class="sb-brand-icon">
                <Icon name="rocket_launch" />
              </span>
              <div class="sb-brand-text">
                <div class="sb-brand-name">ProjectFlow</div>
                <div class="sb-brand-tier">Enterprise</div>
              </div>
            </a>
            <button
              class="sb-collapse-btn"
              id="sidebar-toggle"
              aria-label="Toggle sidebar"
            >
              <span class="sb-collapse-icon" style={{ display: "inline-flex", transition: "transform 0.2s ease" }}>
                <Icon name="chevron_left" size={16} />
              </span>
            </button>
          </div>

          <nav class="sb-nav">
            {sections.map((section) => (
              <div class="sb-section" key={section.label}>
                <div class="sb-section-label">{section.label}</div>
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
                    <span class="sb-link-text">{item.label}</span>
                  </a>
                ))}
              </div>
            ))}
          </nav>

          <div class="sb-footer">
            <div class="sb-footer-expanded">
              <div class="sb-api-row">
                <SystemStatus />
              </div>
              {canCreate && (
                <button
                  class="sb-cta"
                  onClick={() => location.href = "/projects"}
                >
                  <Icon name="add" size={16} />
                  <span>New Project</span>
                </button>
              )}
            </div>
            <div class="sb-footer-collapsed">
              <div class="sb-api-dot-collapsed">
                <SystemStatus compact />
              </div>
              {canCreate && (
                <button
                  class="sb-fab"
                  onClick={() => location.href = "/projects"}
                >
                  <Icon name="add" size={20} />
                </button>
              )}
            </div>
          </div>
          <script
            dangerouslySetInnerHTML={{
              __html: `
                (function() {
                  const state = localStorage.getItem('sidebar-collapsed');
                  const shell = document.querySelector('.app-shell');
                  if (state === 'true' && shell) shell.classList.add('sidebar-collapsed');
                  
                  // Setup click handler after DOM load to ensure button exists
                  window.addEventListener('DOMContentLoaded', () => {
                    const btn = document.getElementById('sidebar-toggle');
                    if (btn) {
                      btn.addEventListener('click', () => {
                        const appShell = document.querySelector('.app-shell');
                        appShell.classList.toggle('sidebar-collapsed');
                        const isCollapsed = appShell.classList.contains('sidebar-collapsed');
                        localStorage.setItem('sidebar-collapsed', isCollapsed ? 'true' : 'false');
                      });
                    }
                  });
                })();
              `,
            }}
          />
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
        <main class="content">
          <OnlineBanner />
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>

      <ToastProvider />
      <GlobalErrorHandler />
      <FullLoader />
      <NavigationGuard />

      <nav class="mobile-nav" aria-label="Mobile navigation">
        {mobileNavItems.map((item) => (
          <a
            key={item.label}
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
