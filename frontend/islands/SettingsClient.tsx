import { useEffect, useState } from "preact/hooks";
import { get, patch, post } from "../lib/api.ts";
import { clearSession, getCurrentUser, saveSession } from "../lib/auth.ts";
import { SWAGGER_URL } from "../lib/constants.ts";
import type { User } from "../lib/types.ts";
import { Avatar, Button, Icon, Skeleton } from "../components/ui.tsx";
import ThemeToggle from "./ThemeToggle.tsx";

export default function SettingsClient() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl ?? "");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    get<User>("/auth/me").then((data) => {
      setUser(data);
      setName(data.name ?? "");
      setAvatarUrl(data.avatarUrl ?? "");
      saveSession({ user: data });
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function save() {
    const data = await patch<User>("/users/me", { name, avatarUrl });
    setUser(data);
    saveSession({ user: data });
    setMessage("Profile updated.");
  }

  async function logout() {
    await post("/auth/logout").catch(() => null);
    clearSession();
    location.href = "/login";
  }

  if (loading) return <Skeleton height={360} />;

  return (
    <div style={{ display: "grid", gap: "18px", maxWidth: "860px" }}>
      <section>
        <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>ACCOUNT</p>
        <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "32px" }}>Settings</h2>
      </section>
      <section class="card" style={{ padding: "20px", display: "grid", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Avatar user={{ ...user, name, avatarUrl }} size={48} />
          <div><strong>{user?.email}</strong><p style={{ margin: 0, color: "var(--muted)" }}>Update profile and theme preference</p></div>
        </div>
        <div>
          <label class="label">Name</label>
          <input class="input" value={name} onInput={(e) => setName(e.currentTarget.value)} />
        </div>
        <div>
          <label class="label">Avatar URL</label>
          <input class="input" value={avatarUrl} onInput={(e) => setAvatarUrl(e.currentTarget.value)} />
        </div>
        <div class="panel" style={{ padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><strong>Theme</strong><p style={{ margin: "2px 0 0", color: "var(--muted)" }}>Light and premium dark workspace modes.</p></div>
          <ThemeToggle />
        </div>
        {message && <span class="badge badge-success">{message}</span>}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button variant="primary" onClick={save}><Icon name="save" size={18} /> Save profile</Button>
          <a class="btn btn-secondary" href={SWAGGER_URL} target="_blank" rel="noreferrer"><Icon name="code" size={18} /> Swagger docs</a>
          <Button variant="danger" onClick={logout}><Icon name="logout" size={18} /> Logout</Button>
        </div>
      </section>
    </div>
  );
}
