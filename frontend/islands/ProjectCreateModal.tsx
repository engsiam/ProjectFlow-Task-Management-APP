import { useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import { toast } from "../lib/toast.ts";
import { Button, Icon } from "../components/ui.tsx";

export default function ProjectCreateModal(
  { onClose, onCreated }: { onClose: () => void; onCreated: () => void },
) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: Event) {
    e.preventDefault();
    if (!name.trim()) return setError("Project name is required.");
    setLoading(true);
    setError("");
    try {
      await post("/projects", { name, description, status: "ACTIVE" });
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
        />
        <label class="label" style={{ marginTop: "14px" }}>Description</label>
        <textarea
          class="textarea"
          value={description}
          onInput={(e) => setDescription(e.currentTarget.value)}
        />
        {error && <p class="badge badge-danger">{error}</p>}
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
