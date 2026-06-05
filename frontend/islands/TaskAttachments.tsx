import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { del, getList, uploadFile } from "../lib/api.ts";
import { getAccessToken, getCurrentUser } from "../lib/auth.ts";
import { BACKEND_ORIGIN } from "../lib/constants.ts";
import { toast } from "../lib/toast.ts";
import { Icon, Skeleton } from "../components/ui.tsx";
import type { Attachment, Role } from "../lib/types.ts";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED =
  ".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,application/zip";
const ACCEPTED_LABEL = "PDF, DOC, DOCX, PNG, JPG, JPEG, ZIP";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (iso: string) => {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
};

const fileIcon = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "picture_as_pdf";
  if (ext === "doc" || ext === "docx") return "description";
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return "image";
  if (ext === "zip") return "folder_zip";
  return "insert_drive_file";
};

const fileAccent = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf") return "#ef4444";
  if (ext === "doc" || ext === "docx") return "#3b82f6";
  if (ext === "png" || ext === "jpg" || ext === "jpeg") return "#a855f7";
  if (ext === "zip") return "#f59e0b";
  return "var(--muted)";
};

type Props = {
  taskId: string;
  currentUserRole?: Role | null;
  currentUserId?: string | null;
  projectOwnerId?: string | null;
};

type ValidationResult = { ok: true; ext: string } | {
  ok: false;
  error: string;
};

const validate = (file: File): ValidationResult => {
  if (file.size <= 0) return { ok: false, error: "File is empty" };
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "Maximum file size exceeded" };
  }
  const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
  const allowed = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".zip"];
  if (!allowed.includes(ext)) {
    return { ok: false, error: "Unsupported file type" };
  }
  return { ok: true, ext };
};

export default function TaskAttachments(
  { taskId, currentUserRole, currentUserId, projectOwnerId }: Props,
) {
  const [items, setItems] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState<
    { name: string; progress: number } | null
  >(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const canUpload = currentUserRole !== "VIEWER" &&
    currentUserRole !== undefined;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getList<Attachment>(`/tasks/${taskId}/attachments`);
      setItems(data);
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Failed to load attachments";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    load();
  }, [load]);

  const upload = useCallback(async (file: File) => {
    const result = validate(file);
    if (!result.ok) {
      toast(result.error, "danger");
      return;
    }
    setUploading({ name: file.name, progress: 0 });
    try {
      const created = await uploadFile<Attachment>(
        `/tasks/${taskId}/attachments`,
        file,
      );
      setItems((prev) => [created, ...prev]);
      toast(`"${file.name}" uploaded.`, "success");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      toast(msg, "danger");
    } finally {
      setUploading(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [taskId]);

  const onFileSelect = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    const file = target.files?.[0];
    if (file) upload(file);
  };

  const onDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer?.items?.length) setIsDragging(true);
  };
  const onDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  };
  const onDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);
    if (!canUpload) {
      toast("Viewers cannot upload attachments", "warning");
      return;
    }
    const file = e.dataTransfer?.files?.[0];
    if (file) upload(file);
  };

  const remove = async (a: Attachment) => {
    setDeletingId(a.id);
    try {
      await del(`/tasks/${taskId}/attachments/${a.id}`);
      setItems((prev) => prev.filter((x) => x.id !== a.id));
      toast(`"${a.fileName}" removed.`, "warning");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Delete failed";
      toast(msg, "danger");
    } finally {
      setDeletingId(null);
    }
  };

  const canDelete = (a: Attachment) => {
    if (!currentUserId) return false;
    if (getCurrentUser()?.role === "ADMIN") return true;
    if (currentUserRole === "ADMIN" || currentUserRole === "PROJECT_MANAGER") {
      return true;
    }
    if (projectOwnerId && projectOwnerId === currentUserId) return true;
    return a.uploadedBy?.id === currentUserId;
  };

  const download = async (a: Attachment) => {
    try {
      const token = getAccessToken();
      // The backend's downloadUrl already includes `/api/...`, so prefix
      // with the bare backend origin (NOT API_BASE_URL which has `/api`).
      const res = await fetch(`${BACKEND_ORIGIN}${a.downloadUrl}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) {
        toast("Download failed", "danger");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = a.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Download failed";
      toast(msg, "danger");
    }
  };

  return (
    <section class="att-section">
      <header class="att-header">
        <div class="att-header-left">
          <Icon name="attach_file" size={18} />
          <h3 class="att-title">Attachments</h3>
          <span class="att-count">{items.length}</span>
        </div>
        <p class="att-subtitle">
          PDF, DOC, DOCX, PNG, JPG, JPEG, ZIP · up to 10 MB
        </p>
      </header>

      {canUpload && (
        <div
          class={`att-dropzone ${isDragging ? "is-dragging" : ""}`}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDragOver={onDragOver}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            style={{ display: "none" }}
            onChange={onFileSelect}
          />
          <div class="att-dropzone-icon">
            <Icon name="cloud_upload" size={28} />
          </div>
          <div class="att-dropzone-content">
            <p class="att-dropzone-title">
              {isDragging ? "Drop to upload" : "Drag & drop a file here"}
            </p>
            <p class="att-dropzone-hint">
              or <span class="att-dropzone-browse">browse</span>{" "}
              from your device
            </p>
            <p class="att-dropzone-formats">{ACCEPTED_LABEL} · max 10 MB</p>
          </div>
        </div>
      )}

      {uploading && (
        <div class="att-uploading">
          <Icon name="upload" size={16} />
          <span class="att-uploading-name">{uploading.name}</span>
          <div class="att-uploading-track">
            <div class="att-uploading-fill" style={{ width: `60%` }} />
          </div>
        </div>
      )}

      {error && (
        <div class="att-error">
          <Icon name="error" size={16} />
          <span>{error}</span>
        </div>
      )}

      <div class="att-list" role="list">
        {loading
          ? (
            <div class="att-list-skel">
              <Skeleton height={64} />
              <Skeleton height={64} />
            </div>
          )
          : items.length === 0
          ? (
            <div class="att-empty">
              <Icon name="folder_off" size={22} />
              <p>No attachments yet</p>
              {canUpload && <span>Drop a file above to get started</span>}
            </div>
          )
          : items.map((a) => {
            const icon = fileIcon(a.fileName);
            const accent = fileAccent(a.fileName);
            const initials = a.uploadedBy?.name
              ? a.uploadedBy.name.split(" ").map((p) => p[0]).join("").slice(
                0,
                2,
              ).toUpperCase()
              : "?";
            return (
              <div class="att-item" key={a.id} role="listitem">
                <div
                  class="att-item-icon"
                  style={{
                    background:
                      `color-mix(in srgb, ${accent}, transparent 85%)`,
                    color: accent,
                  }}
                >
                  <Icon name={icon} size={20} />
                </div>
                <div class="att-item-body">
                  <p class="att-item-name" title={a.fileName}>{a.fileName}</p>
                  <div class="att-item-meta">
                    <span class="att-item-size">{formatBytes(a.fileSize)}</span>
                    <span class="att-item-dot" aria-hidden="true">·</span>
                    <span class="att-item-date">{formatDate(a.createdAt)}</span>
                    <span class="att-item-dot" aria-hidden="true">·</span>
                    <span class="att-item-uploader">
                      <span class="att-item-avatar" aria-hidden="true">
                        {initials}
                      </span>
                      {a.uploadedBy?.name ?? "Unknown"}
                    </span>
                  </div>
                </div>
                <div class="att-item-actions">
                  <button
                    type="button"
                    class="att-icon-btn att-icon-btn--download"
                    title="Download"
                    aria-label={`Download ${a.fileName}`}
                    onClick={() => download(a)}
                  >
                    <Icon name="download" size={16} />
                  </button>
                  {canDelete(a) && (
                    <button
                      type="button"
                      class="att-icon-btn att-icon-btn--delete"
                      title="Delete"
                      aria-label={`Delete ${a.fileName}`}
                      disabled={deletingId === a.id}
                      onClick={() => remove(a)}
                    >
                      <Icon name="delete" size={16} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
