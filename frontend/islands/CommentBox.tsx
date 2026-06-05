import { useEffect, useState } from "preact/hooks";
import { getList, post } from "../lib/api.ts";
import { getCurrentUser } from "../lib/auth.ts";
import { canComment } from "../lib/roles.ts";
import { toast } from "../lib/toast.ts";
import type { Comment, Role } from "../lib/types.ts";
import { Avatar, Button, Icon } from "../components/ui.tsx";

export default function CommentBox({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");
  const [currentRole, setCurrentRole] = useState<Role | undefined>(
    getCurrentUser()?.role,
  );

  async function load() {
    try {
      const data = await getList<Comment>(`/tasks/${taskId}/comments`, {
        limit: 100,
      });
      setComments(data);
    } catch {
      setComments([]);
    }
  }

  useEffect(() => {
    load();
  }, [taskId]);

  async function submit(e: Event) {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await post(`/tasks/${taskId}/comments`, { content: body });
      toast("Comment posted.", "success");
      setBody("");
      await load();
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Unable to post comment.";
      toast(msg, "danger");
    }
  }

  const mayComment = canComment(currentRole);

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      {mayComment
        ? (
          <form onSubmit={submit}>
            <label class="label">@mention teammates</label>
            <textarea
              class="textarea"
              value={body}
              onInput={(e) => setBody(e.currentTarget.value)}
              placeholder="Add a comment. Use @name to mention someone."
            />
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: "8px",
              }}
            >
              <Button variant="primary" type="submit">
                <Icon name="send" size={18} /> Comment
              </Button>
            </div>
          </form>
        )
        : (
          <div
            style={{
              padding: "12px 14px",
              border: "1px dashed var(--border)",
              borderRadius: "8px",
              color: "var(--muted)",
              fontSize: "13px",
            }}
          >
            You have read-only access to this project. Switch to a project
            member role to add comments.
          </div>
        )}
      {comments.map((comment) => (
        <div
          class="panel"
          style={{
            padding: "12px",
            display: "grid",
            gridTemplateColumns: "32px 1fr",
            gap: "10px",
          }}
        >
          <Avatar user={comment.author} />
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: "10px",
              }}
            >
              <strong>{comment.author?.name ?? "User"}</strong>
              <span
                class="mono"
                style={{ color: "var(--muted)", fontSize: "10px" }}
              >
                {new Date(comment.createdAt).toLocaleString()}
              </span>
            </div>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>
              {comment.body}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
