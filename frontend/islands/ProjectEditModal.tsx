import { useState } from "preact/hooks";
import { patch } from "../lib/api.ts";
import { toast } from "../lib/toast.ts";
import { Button, Icon } from "../components/ui.tsx";
import {
  validateProjectDates,
  validateProjectName,
} from "../lib/validation.ts";
import type { Project, ProjectStatus } from "../lib/types.ts";

type FormErrors = Partial<
  Record<"name" | "description" | "startDate" | "deadline", string>
>;

function inputStyle(hasError: boolean) {
  return hasError ? "border:1px solid var(--danger);outline:none" : undefined;
}

function toDateInput(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function toIsoStart(value: string): string {
  return new Date(`${value}T00:00:00.000Z`).toISOString();
}
function toIsoEnd(value: string): string {
  return new Date(`${value}T23:59:59.000Z`).toISOString();
}

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: "ACTIVE", label: "Active" },
  { value: "COMPLETED", label: "Completed" },
  { value: "ON_HOLD", label: "On Hold" },
];

export default function ProjectEditModal(
  { project, onClose, onSaved }: {
    project: Project;
    onClose: () => void;
    onSaved: (next: Project) => void;
  },
) {
  const [name, setName] = useState(project.name ?? "");
  const [description, setDescription] = useState(project.description ?? "");
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [startDate, setStartDate] = useState(toDateInput(project.startDate));
  const [deadline, setDeadline] = useState(toDateInput(project.deadline));
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});

  function clearError(field: keyof FormErrors) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _drop, ...rest } = prev;
      return rest;
    });
  }

  function validate(): FormErrors {
    const next: FormErrors = {};
    const nameCheck = validateProjectName(name);
    if (!nameCheck.ok) next.name = nameCheck.message;
    if (!description.trim()) {
      next.description = "Description is required.";
    } else if (description.trim().length > 2000) {
      next.description = "Description must be 2000 characters or fewer.";
    }
    if (!startDate) next.startDate = "Start date is required.";
    if (!deadline) {
      next.deadline = "Deadline is required.";
    } else if (startDate) {
      const dateCheck = validateProjectDates(startDate, deadline);
      if (!dateCheck.ok) next.deadline = dateCheck.message;
    }
    return next;
  }

  async function submit(e: Event) {
    e.preventDefault();
    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast("Please fix the highlighted fields.", "warning");
      return;
    }
    setLoading(true);
    setErrors({});
    try {
      const updated = await patch<Project>(`/projects/${project.id}`, {
        name: name.trim(),
        description: description.trim(),
        status,
        startDate: toIsoStart(startDate),
        deadline: toIsoEnd(deadline),
      }, { loaderMessage: "Saving project changes…" });
      toast("Project updated.", "success");
      onSaved(updated);
      onClose();
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Project could not be updated.";
      toast(msg, "danger");
      setErrors({ name: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form
        class="modal"
        onSubmit={submit}
        noValidate
        style={{ maxWidth: "560px", padding: "20px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 class="headline" style={{ margin: 0 }}>Edit Project</h2>
          <button
            type="button"
            class="btn icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <label class="label" for="pf-edit-name">
          Project name <span style="color:var(--danger)">*</span>
        </label>
        <input
          id="pf-edit-name"
          class="input"
          value={name}
          onInput={(e) => {
            setName(e.currentTarget.value);
            clearError("name");
          }}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "pf-edit-name-err" : undefined}
          style={inputStyle(Boolean(errors.name))}
        />
        {errors.name && (
          <p
            id="pf-edit-name-err"
            style="color:var(--danger);font-size:12px;margin:4px 0 0"
          >
            {errors.name}
          </p>
        )}

        <label class="label" for="pf-edit-desc" style={{ marginTop: "14px" }}>
          Description <span style="color:var(--danger)">*</span>
        </label>
        <textarea
          id="pf-edit-desc"
          class="textarea"
          value={description}
          onInput={(e) => {
            setDescription(e.currentTarget.value);
            clearError("description");
          }}
          rows={3}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description ? "pf-edit-desc-err" : undefined}
          style={inputStyle(Boolean(errors.description))}
        />
        {errors.description && (
          <p
            id="pf-edit-desc-err"
            style="color:var(--danger);font-size:12px;margin:4px 0 0"
          >
            {errors.description}
          </p>
        )}

        <label class="label" for="pf-edit-status" style={{ marginTop: "14px" }}>
          Status
        </label>
        <select
          id="pf-edit-status"
          class="select"
          value={status}
          onChange={(e) =>
            setStatus(
              (e.currentTarget as HTMLSelectElement).value as ProjectStatus,
            )}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "14px",
          }}
        >
          <div>
            <label class="label" for="pf-edit-start">
              Start date <span style="color:var(--danger)">*</span>
            </label>
            <input
              id="pf-edit-start"
              class="input"
              type="date"
              value={startDate}
              onInput={(e) => {
                setStartDate(e.currentTarget.value);
                clearError("startDate");
              }}
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={errors.startDate
                ? "pf-edit-start-err"
                : undefined}
              style={inputStyle(Boolean(errors.startDate))}
            />
            {errors.startDate && (
              <p
                id="pf-edit-start-err"
                style="color:var(--danger);font-size:12px;margin:4px 0 0"
              >
                {errors.startDate}
              </p>
            )}
          </div>
          <div>
            <label class="label" for="pf-edit-deadline">
              Deadline <span style="color:var(--danger)">*</span>
            </label>
            <input
              id="pf-edit-deadline"
              class="input"
              type="date"
              value={deadline}
              onInput={(e) => {
                setDeadline(e.currentTarget.value);
                clearError("deadline");
              }}
              aria-invalid={Boolean(errors.deadline)}
              aria-describedby={errors.deadline
                ? "pf-edit-deadline-err"
                : undefined}
              style={inputStyle(Boolean(errors.deadline))}
            />
            {errors.deadline && (
              <p
                id="pf-edit-deadline-err"
                style="color:var(--danger);font-size:12px;margin:4px 0 0"
              >
                {errors.deadline}
              </p>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "18px",
          }}
        >
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </form>
    </div>
  );
}
