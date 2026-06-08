import { useEffect, useRef, useState } from "preact/hooks";
import { get, patch } from "../lib/api.ts";
import {
  getAccessToken,
  getCurrentUser,
  logout,
  saveSession,
} from "../lib/auth.ts";
import { API_BASE_URL, BACKEND_ORIGIN, SWAGGER_URL } from "../lib/constants.ts";
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

  // Resolve relative backend paths so the preview <img> doesn't 404
  // against the frontend origin. Absolute URLs pass through unchanged.
  const resolvedAvatarSrc = avatarUrl.startsWith("/")
    ? `${BACKEND_ORIGIN}${avatarUrl}`
    : avatarUrl;

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

      // Update preview immediately
      setAvatarUrl(url);

      // Auto-save to profile so the header avatar updates without a page reload
      const updated = await patch<User>("/users/me", {
        name,
        avatar: url,
      });
      setUser(updated);
      saveSession({ user: updated });
      setMessage("Profile updated.");
      toast("Avatar saved to profile.", "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed.";
      setUploadError(msg);
      toast(msg, "danger");
    } finally {
      setUploading(false);
      // Reset input so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
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
      const msg = err instanceof Error
        ? err.message
        : "Unable to save profile.";
      toast(msg, "danger");
    }
  }

  async function handleLogout() {
    await logout("/login");
  }

  if (loading) return <Skeleton height={360} />;

  return (
    <div class="settings-page">
      <div class="settings-head-section">
        <p class="mono" style="margin:0;color:var(--muted);font-size:11px;">ACCOUNT</p>
        <h2 class="headline" style="margin:4px 0 0;font-size:clamp(22px,5vw,32px);">Settings</h2>
      </div>

      <div class="card" style="padding:clamp(12px,3vw,20px);">
        <div class="settings-row">
          <Avatar user={{ ...user, name, avatarUrl }} size={48} />
          <div class="settings-row-text">
            <strong style="word-break:break-all;overflow-wrap:break-word;">{user?.email}</strong>
            <p style="margin:0;color:var(--muted);font-size:13px;">Update profile and theme preference</p>
          </div>
        </div>

        <div style="margin-top:16px;">
          <label class="label">Name</label>
          <input class="input" value={name} onInput={(e) => setName(e.currentTarget.value)} />
        </div>

        <div style="margin-top:16px;">
          <label class="label">Avatar</label>
          <div class="avatar-upload" onDrop={onDrop} onDragOver={onDragOver} onClick={() => inputRef.current?.click()}>
            <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="avatar-upload-input" onChange={onFileChange} />
            {uploading ? (
              <div class="avatar-upload-preview">
                <div class="spinner" />
                <p>Uploading…</p>
              </div>
            ) : avatarUrl ? (
              <div class="avatar-upload-preview">
                <img src={resolvedAvatarSrc} alt="Avatar preview" class="avatar-upload-img" />
                <p class="avatar-upload-hint">Click or drag to replace</p>
              </div>
            ) : (
              <div class="avatar-upload-preview">
                <Icon name="add_photo_alternate" size={28} />
                <p>Click or drag an image</p>
                <p class="avatar-upload-hint">PNG, JPEG, WebP, GIF · max 2 MB</p>
              </div>
            )}
          </div>
          {uploadError && <p class="badge badge-danger" style="margin-top:8px;word-break:break-word;">{uploadError}</p>}
        </div>

        <div style="margin-top:16px;padding:14px;background:var(--surface);border:1px solid var(--border);border-radius:8px;">
          <div style="display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:12px;">
            <div>
              <strong>Theme</strong>
              <p style="margin:2px 0 0;color:var(--muted);font-size:13px;">Light and premium dark workspace modes.</p>
            </div>
            <ThemeToggle />
          </div>
        </div>

        {message && <span class="badge badge-success" style="margin-top:8px;">{message}</span>}

        <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:10px;">
          <Button variant="primary" onClick={save}><Icon name="save" size={18} /> Save profile</Button>
          <a class="btn btn-secondary" href={SWAGGER_URL} target="_blank" rel="noreferrer"><Icon name="code" size={18} /> Swagger docs</a>
          <Button variant="danger" onClick={handleLogout}><Icon name="logout" size={18} /> Logout</Button>
        </div>
      </div>

      <hr style="border:none;border-top:1px solid var(--border);margin:8px 0;" />

      <div class="settings-head-section">
        <p class="mono" style="margin:0;color:var(--muted);font-size:11px;">DEBUG</p>
        <h2 class="headline" style="margin:4px 0 16px;font-size:clamp(18px,4vw,24px);">API Response Times</h2>
      </div>

      <div class="card" style="padding:clamp(10px,2vw,20px);overflow-x:auto;">
        <ApiMetricsTable />
      </div>
    </div>
  );
}
