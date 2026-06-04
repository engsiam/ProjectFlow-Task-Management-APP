import { useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import { toast } from "../lib/toast.ts";
import { Button, Icon } from "../components/ui.tsx";
import type { Role } from "../lib/types.ts";

export default function InviteMemberModal(
  { projectId, onClose, onInvited }: {
    projectId: string;
    onClose: () => void;
    onInvited: () => void;
  },
) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("TEAM_MEMBER");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: Event) {
    e.preventDefault();
    if (!email.includes("@")) return setError("Enter a valid email.");
    setLoading(true);
    setError("");
    try {
      await post(`/projects/${projectId}/invitations`, { email, role });
      toast(`Invitation sent to ${email}.`, "success");
      onInvited();
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invite could not be sent.";
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
        style={{ maxWidth: "520px", padding: "20px" }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "16px",
          }}
        >
          <h2 class="headline" style={{ margin: 0 }}>Invite Member</h2>
          <button type="button" class="btn icon-btn" onClick={onClose}>
            <Icon name="close" />
          </button>
        </div>
        <label class="label">Email</label>
        <input
          class="input"
          type="email"
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
        />
        <label class="label" style={{ marginTop: "14px" }}>Role</label>
        <select
          class="select"
          value={role}
          onChange={(e) => setRole(e.currentTarget.value as Role)}
        >
          <option value="PROJECT_MANAGER">Project Manager</option>
          <option value="TEAM_MEMBER">Team Member</option>
          <option value="VIEWER">Viewer</option>
        </select>
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
            {loading ? "Sending..." : "Send invite"}
          </Button>
        </div>
      </form>
    </div>
  );
}
