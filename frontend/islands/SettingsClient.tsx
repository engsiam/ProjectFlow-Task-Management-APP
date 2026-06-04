import { useEffect, useRef, useState } from "preact/hooks";
import { get, patch, post } from "../lib/api.ts";
import { clearSession, getAccessToken, getCurrentUser, saveSession } from "../lib/auth.ts";
import { API_BASE_URL, SWAGGER_URL } from "../lib/constants.ts";
import { toast } from "../lib/toast.ts";
import type { User } from "../lib/types.ts";
import { Avatar, Button, Icon, Skeleton } from "../components/ui.tsx";
import ThemeToggle from "./ThemeToggle.tsx";
import ApiMetricsTable from "./ApiMetricsTable.tsx";

const AVATAR_UPLOAD_URL = `${API_BASE_URL}/upload/avatar`;
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2 MB
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"];

export default function SettingsClient() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [name, setName] = useState(user?.name ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    user?.avatarUrl ?? user?.avatar ?? "",
  );
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    get<User>("/auth/me").then((data) => {
      setUser(data);
      setName(data.name ?? "");
      setAvatarUrl(data.avatarUrl ?? data.avatar ?? "");
      saveSession({ user: data });
    }).catch(() => null).finally(() => setLoading(false));
  }, []);

  async function handleFile(file: File) {
    setUploadError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError("Only PNG, JPEG, WebP, and GIF images are allowed.");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setUploadError("File size must be under 2 MB.");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const token = getAccessToken();
      const res = await fetch(AVATAR_UPLOAD_URL, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: form,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(text || `Upload failed (${res.status})`);
      }
      const body = await res.json();
      const url = body?.url ?? body?.data?.url ?? body?.avatarUrl ?? "";
      if (!url) throw new Error("Upload did not return a URL");
      setAvatarUrl(url);
      toast("Avatar uploaded.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
    } finally {
      setUploading(false);
    }
  }

  function onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) handleFile(file);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer?.files?.[0];
    if (file) handleFile(file);
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }

  async function save() {
    try {
      const data = await patch<User>("/users/me", {
        name,
        avatar: avatarUrl || null,
      });
      setUser(data);
      saveSession({ user: data });
      setMessage("Profile updated.");
      toast("Profile updated.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to save profile.";
      toast(msg, "danger");
    }
  }

  async function logout() {
    toast("Logged out.", "success");
    clearSession();
    post("/auth/logout").catch(() => null);
    location.href = "/login";
  }

  if (loading) return <Skeleton height={360} />;

  return (
    <div style={{ display: "grid", gap: "18px", maxWidth: "860px" }}>
      <section>
        <p
          class="mono"
          style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}
        >
          ACCOUNT
        </p>
        <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "32px" }}>
          Settings
        </h2>
      </section>
      <section
        class="card"
        style={{ padding: "20px", display: "grid", gap: "16px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <Avatar user={{ ...user, name, avatarUrl }} size={48} />
          <div>
            <strong>{user?.email}</strong>
            <p style={{ margin: 0, color: "var(--muted)" }}>
              Update profile and theme preference
            </p>
          </div>
        </div>
        <div>
          <label class="label">Name</label>
          <input
            class="input"
            value={name}
            onInput={(e) => setName(e.currentTarget.value)}
          />
        </div>
        <div>
          <label class="label">Avatar</label>
          <div
            class="avatar-upload"
            onDrop={onDrop}
            onDragOver={onDragOver}
            onClick={() => inputRef.current?.click()}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              class="avatar-upload-input"
              onChange={onFileChange}
            />
            {uploading
              ? (
                <div class="avatar-upload-preview">
                  <div class="spinner" />
                  <p>Uploading…</p>
                </div>
              )
              : avatarUrl
              ? (
                <div class="avatar-upload-preview">
                  <img src={avatarUrl} alt="Avatar preview" class="avatar-upload-img" />
                  <p class="avatar-upload-hint">Click or drag to replace</p>
                </div>
              )
              : (
                <div class="avatar-upload-preview">
                  <Icon name="add_photo_alternate" size={28} />
                  <p>Click or drag an image</p>
                  <p class="avatar-upload-hint">PNG, JPEG, WebP, GIF · max 2 MB</p>
                </div>
              )}
          </div>
          {uploadError && <p class="badge badge-danger" style="margin-top:8px">{uploadError}</p>}
        </div>
        <div
          class="panel"
          style={{
            padding: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <strong>Theme</strong>
            <p style={{ margin: "2px 0 0", color: "var(--muted)" }}>
              Light and premium dark workspace modes.
            </p>
          </div>
          <ThemeToggle />
        </div>
        {message && <span class="badge badge-success">{message}</span>}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Button variant="primary" onClick={save}>
            <Icon name="save" size={18} /> Save profile
          </Button>
          <a
            class="btn btn-secondary"
            href={SWAGGER_URL}
            target="_blank"
            rel="noreferrer"
          >
            <Icon name="code" size={18} /> Swagger docs
          </a>
          <Button variant="danger" onClick={logout}>
            <Icon name="logout" size={18} /> Logout
          </Button>
        </div>
      </section>

      <hr style={{ border: "none", borderTop: "1px solid var(--border)", margin: "12px 0" }} />

      <section>
        <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>
          DEBUG
        </p>
        <h2 class="headline" style={{ margin: "4px 0 16px", fontSize: "24px" }}>
          API Response Times
        </h2>
        <div class="card" style={{ padding: "20px" }}>
          <ApiMetricsTable />
        </div>
      </section>
    </div>
  );
}
