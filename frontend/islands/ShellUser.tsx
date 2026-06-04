import { useEffect, useRef, useState } from "preact/hooks";
import { clearSession, getCurrentUser } from "../lib/auth.ts";
import { post } from "../lib/api.ts";
import { toast } from "../lib/toast.ts";
import { Avatar, Icon } from "../components/ui.tsx";
import { roleLabel } from "../lib/roles.ts";
import type { User } from "../lib/types.ts";

export default function ShellUser() {
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getCurrentUser());
  }, []);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function logout() {
    toast("Logged out.", "success");
    clearSession();
    // Fire-and-forget: don't wait for server response
    post("/auth/logout").catch(() => null);
    location.href = "/login";
  }

  return (
    <div class="shell-user" ref={rootRef}>
      <button
        type="button"
        class="shell-user-trigger"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <div class="shell-user-meta">
          <p class="shell-user-name">{user?.name ?? "ProjectFlow User"}</p>
          <p class="shell-user-role">
            {user?.role ? roleLabel(user.role) : "Signed in"}
          </p>
        </div>
        <Avatar user={user} size={32} />
        <Icon name={open ? "expand_less" : "expand_more"} size={18} />
      </button>
      {open && (
        <div class="shell-user-menu" role="menu">
          <div class="shell-user-menu-header">
            <strong>{user?.name ?? "ProjectFlow User"}</strong>
            <p>{user?.email ?? "Signed in"}</p>
          </div>
          <a class="shell-user-menu-link" href="/dashboard" role="menuitem">
            <Icon name="dashboard" size={18} /> Dashboard
          </a>
          <a class="shell-user-menu-link" href="/projects" role="menuitem">
            <Icon name="folder_open" size={18} /> Projects
          </a>
          <a class="shell-user-menu-link" href="/tasks" role="menuitem">
            <Icon name="assignment" size={18} /> Tasks
          </a>
          <a class="shell-user-menu-link" href="/notifications" role="menuitem">
            <Icon name="notifications" size={18} /> Notifications
          </a>
          <a class="shell-user-menu-link" href="/settings" role="menuitem">
            <Icon name="settings" size={18} /> Profile & Settings
          </a>
          <button
            type="button"
            class="shell-user-menu-link shell-user-menu-logout"
            role="menuitem"
            onClick={logout}
          >
            <Icon name="logout" size={18} /> Logout
          </button>
        </div>
      )}
    </div>
  );
}
