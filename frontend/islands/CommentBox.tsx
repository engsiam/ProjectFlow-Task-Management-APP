import { useEffect, useState } from "preact/hooks";
import { get, post } from "../lib/api.ts";
import type { Comment } from "../lib/types.ts";
import { Avatar, Button, Icon } from "../components/ui.tsx";

export default function CommentBox({ taskId }: { taskId: string }) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [body, setBody] = useState("");

  async function load() {
    try {
      const data = await get<Comment[]>(`/tasks/${taskId}/comments`);
      setComments(Array.isArray(data) ? data : []);
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
    await post(`/tasks/${taskId}/comments`, { body });
    setBody("");
    await load();
  }

  return (
    <div style={{ display: "grid", gap: "12px" }}>
      <form onSubmit={submit}>
        <label class="label">@mention teammates</label>
        <textarea class="textarea" value={body} onInput={(e) => setBody(e.currentTarget.value)} placeholder="Add a comment. Use @name to mention someone." />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
          <Button variant="primary" type="submit"><Icon name="send" size={18} /> Comment</Button>
        </div>
      </form>
      {comments.map((comment) => (
        <div class="panel" style={{ padding: "12px", display: "grid", gridTemplateColumns: "32px 1fr", gap: "10px" }}>
          <Avatar user={comment.author} />
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
              <strong>{comment.author?.name ?? "User"}</strong>
              <span class="mono" style={{ color: "var(--muted)", fontSize: "10px" }}>{new Date(comment.createdAt).toLocaleString()}</span>
            </div>
            <p style={{ margin: "6px 0 0", color: "var(--muted)" }}>{comment.body}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
