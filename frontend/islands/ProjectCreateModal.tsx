import { useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import { toast } from "../lib/toast.ts";
import { Button, Icon } from "../components/ui.tsx";
import {
  validateProjectDates,
  validateProjectName,
} from "../lib/validation.ts";

type FormErrors = Partial<
  Record<"name" | "description" | "startDate" | "deadline", string>
>;

function inputStyle(hasError: boolean) {
  return hasError ? "border:1px solid var(--danger);outline:none" : undefined;
}

export default function ProjectCreateModal(
  { onClose, onCreated }: { onClose: () => void; onCreated: () => void },
) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
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
    if (!startDate) {
      next.startDate = "Start date is required.";
    }
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
      await post("/projects", {
        name: name.trim(),
        description: description.trim(),
        status: "ACTIVE",
        startDate: new Date(`${startDate}T00:00:00.000Z`).toISOString(),
        deadline: new Date(`${deadline}T23:59:59.000Z`).toISOString(),
      }, { loaderMessage: "Creating project…" });
      toast(`"${name.trim()}" created!`, "success");
      onCreated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Project could not be created.";
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
          <h2 class="headline" style={{ margin: 0 }}>Create Project</h2>
          <button
            type="button"
            class="btn icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="close" />
          </button>
        </div>

        <label class="label" for="pf-project-name">
          Project name <span style="color:var(--danger)">*</span>
        </label>
        <input
          id="pf-project-name"
          class="input"
          value={name}
          onInput={(e) => {
            setName(e.currentTarget.value);
            clearError("name");
          }}
          placeholder="e.g. Q4 Marketing Launch"
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "pf-project-name-err" : undefined}
          style={inputStyle(Boolean(errors.name))}
        />
        {errors.name && (
          <p
            id="pf-project-name-err"
            class="field-error"
            style="color:var(--danger);font-size:12px;margin:4px 0 0"
          >
            {errors.name}
          </p>
        )}

        <label
          class="label"
          for="pf-project-desc"
          style={{ marginTop: "14px" }}
        >
          Description <span style="color:var(--danger)">*</span>
        </label>
        <textarea
          id="pf-project-desc"
          class="textarea"
          value={description}
          onInput={(e) => {
            setDescription(e.currentTarget.value);
            clearError("description");
          }}
          placeholder="What is this project about?"
          rows={3}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={errors.description
            ? "pf-project-desc-err"
            : undefined}
          style={inputStyle(Boolean(errors.description))}
        />
        {errors.description && (
          <p
            id="pf-project-desc-err"
            class="field-error"
            style="color:var(--danger);font-size:12px;margin:4px 0 0"
          >
            {errors.description}
          </p>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "14px",
          }}
        >
          <div>
            <label class="label" for="pf-project-start">
              Start date <span style="color:var(--danger)">*</span>
            </label>
            <input
              id="pf-project-start"
              class="input"
              type="date"
              value={startDate}
              onInput={(e) => {
                setStartDate(e.currentTarget.value);
                clearError("startDate");
              }}
              aria-invalid={Boolean(errors.startDate)}
              aria-describedby={errors.startDate
                ? "pf-project-start-err"
                : undefined}
              style={inputStyle(Boolean(errors.startDate))}
            />
            {errors.startDate && (
              <p
                id="pf-project-start-err"
                class="field-error"
                style="color:var(--danger);font-size:12px;margin:4px 0 0"
              >
                {errors.startDate}
              </p>
            )}
          </div>
          <div>
            <label class="label" for="pf-project-deadline">
              Deadline <span style="color:var(--danger)">*</span>
            </label>
            <input
              id="pf-project-deadline"
              class="input"
              type="date"
              value={deadline}
              onInput={(e) => {
                setDeadline(e.currentTarget.value);
                clearError("deadline");
              }}
              aria-invalid={Boolean(errors.deadline)}
              aria-describedby={errors.deadline
                ? "pf-project-deadline-err"
                : undefined}
              style={inputStyle(Boolean(errors.deadline))}
            />
            {errors.deadline && (
              <p
                id="pf-project-deadline-err"
                class="field-error"
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
            {loading ? "Creating..." : "Create project"}
          </Button>
        </div>
      </form>
    </div>
  );
}
