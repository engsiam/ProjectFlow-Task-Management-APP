import { useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import { toast } from "../lib/toast.ts";
import { Button, Icon } from "../components/ui.tsx";

export default function ProjectCreateModal(
  { onClose, onCreated }: { onClose: () => void; onCreated: () => void },
) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [deadline, setDeadline] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: Event) {
    e.preventDefault();
    if (!name.trim()) return setError("Project name is required.");
    if (startDate && deadline && new Date(deadline) < new Date(startDate)) {
      return setError("Deadline must be on or after the start date.");
    }
    setLoading(true);
    setError("");
    try {
      await post("/projects", {
        name,
        description,
        status: "ACTIVE",
        startDate: startDate ? new Date(startDate).toISOString() : undefined,
        deadline: deadline ? new Date(deadline).toISOString() : undefined,
      });
      toast(`"${name}" created!`, "success");
      onCreated();
      onClose();
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Project could not be created.";
      setError(msg);
      toast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div class="modal-backdrop" role="dialog" aria-modal="true">
      <form
        class="modal"
        onSubmit={submit}
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
          <button type="button" class="btn icon-btn" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <label class="label">Project name</label>
        <input
          class="input"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="e.g. Q4 Marketing Launch"
          required
        />
        <label class="label" style={{ marginTop: "14px" }}>Description</label>
        <textarea
          class="textarea"
          value={description}
          onInput={(e) => setDescription(e.currentTarget.value)}
          placeholder="What is this project about?"
        />
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: "14px",
          }}
        >
          <div>
            <label class="label">Start date</label>
            <input
              class="input"
              type="date"
              value={startDate}
              onInput={(e) => setStartDate(e.currentTarget.value)}
            />
          </div>
          <div>
            <label class="label">Deadline</label>
            <input
              class="input"
              type="date"
              value={deadline}
              onInput={(e) => setDeadline(e.currentTarget.value)}
            />
          </div>
        </div>
        {error && (
          <p class="badge badge-danger" style={{ marginTop: "12px" }}>
            {error}
          </p>
        )}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "10px",
            marginTop: "16px",
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
