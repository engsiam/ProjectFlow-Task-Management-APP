import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import { Icon } from "./ui.tsx";

const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ACCEPTED_EXT = [".pdf", ".doc", ".docx", ".png", ".jpg", ".jpeg", ".zip"];
const ACCEPTED = ACCEPTED_EXT.join(",") +
  ",application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg,application/zip";

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

export type FileValidationResult =
  | { ok: true }
  | { ok: false; error: string };

export const validateAttachment = (file: File): FileValidationResult => {
  if (file.size <= 0) return { ok: false, error: "File is empty" };
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "Maximum file size exceeded" };
  }
  const ext = (file.name.match(/\.[^.]+$/)?.[0] ?? "").toLowerCase();
  if (!ACCEPTED_EXT.includes(ext)) {
    return { ok: false, error: "Unsupported file type" };
  }
  return { ok: true };
};

export type FilePickerProps = {
  files: File[];
  onChange: (files: File[]) => void;
  /** Maximum number of files allowed. */
  maxFiles?: number;
  /** Show a compact layout (for inline forms). */
  compact?: boolean;
};

export default function FilePicker(
  { files, onChange, maxFiles = 10, compact = false }: FilePickerProps,
) {
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const list = Array.from(incoming);
    const valid: File[] = [];
    const errs: string[] = [];
    for (const f of list) {
      const r = validateAttachment(f);
      if (r.ok) valid.push(f);
      else errs.push(`${f.name}: ${r.error}`);
    }
    if (errs.length) setErrors((prev) => [...prev, ...errs]);
    if (valid.length === 0) return;
    const remaining = Math.max(0, maxFiles - files.length);
    const accepted = valid.slice(0, remaining);
    if (valid.length > remaining) {
      setErrors((prev) => [...prev, `Maximum ${maxFiles} files allowed`]);
    }
    if (accepted.length) onChange([...files, ...accepted]);
  }, [files, maxFiles, onChange]);

  const remove = (index: number) => {
    const next = files.slice();
    next.splice(index, 1);
    onChange(next);
  };

  const onSelect = (e: Event) => {
    const target = e.currentTarget as HTMLInputElement;
    if (target.files && target.files.length) addFiles(target.files);
    if (inputRef.current) inputRef.current.value = "";
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
    if (e.dataTransfer?.files?.length) addFiles(e.dataTransfer.files);
  };

  useEffect(() => {
    if (!errors.length) return;
    const t = setTimeout(() => setErrors([]), 5000);
    return () => clearTimeout(t);
  }, [errors]);

  return (
    <div class={`fp-wrap ${compact ? "is-compact" : ""}`}>
      <div
        class={`fp-dropzone ${isDragging ? "is-dragging" : ""}`}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex={0}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          style={{ display: "none" }}
          onChange={onSelect}
        />
        <div class="fp-dropzone-icon">
          <Icon name="cloud_upload" size={compact ? 22 : 28} />
        </div>
        <div class="fp-dropzone-content">
          <p class="fp-dropzone-title">
            {isDragging ? "Drop to upload" : "Drop files or click to browse"}
          </p>
          <p class="fp-dropzone-hint">
            PDF, DOC, DOCX, PNG, JPG, JPEG, ZIP &middot; up to 10 MB each
          </p>
        </div>
      </div>

      {errors.length > 0 && (
        <div class="fp-errors">
          {errors.slice(-3).map((e, i) => (
            <div class="fp-error-row" key={i}>
              <Icon name="error" size={14} />
              <span>{e}</span>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <ul class="fp-list" role="list">
          {files.map((f, i) => {
            const icon = fileIcon(f.name);
            const accent = fileAccent(f.name);
            return (
              <li class="fp-item" key={`${f.name}-${i}`}>
                <div
                  class="fp-item-icon"
                  style={{
                    background:
                      `color-mix(in srgb, ${accent}, transparent 85%)`,
                    color: accent,
                  }}
                >
                  <Icon name={icon} size={18} />
                </div>
                <div class="fp-item-body">
                  <p class="fp-item-name" title={f.name}>{f.name}</p>
                  <p class="fp-item-meta">{formatBytes(f.size)}</p>
                </div>
                <button
                  type="button"
                  class="fp-remove"
                  onClick={() => remove(i)}
                  aria-label={`Remove ${f.name}`}
                  title="Remove"
                >
                  <Icon name="close" size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
