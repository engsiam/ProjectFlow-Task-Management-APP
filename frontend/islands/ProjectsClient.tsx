import { useEffect, useState } from "preact/hooks";
import { del, get, post } from "../lib/api.ts";
import { requireClientAuth } from "../lib/auth.ts";
import type { Project } from "../lib/types.ts";
import { Avatar, Badge, Button, EmptyState, Icon, ProgressBar, Skeleton, statusTone } from "../components/ui.tsx";
import ProjectCreateModal from "./ProjectCreateModal.tsx";

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<"cards" | "table">("cards");
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    requireClientAuth();
    setLoading(true);
    try {
      const data = await get<Project[]>("/projects");
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function archive(project: Project) {
    if (!confirm(`Archive ${project.name}?`)) return;
    await post(`/projects/${project.id}/archive`);
    await load();
  }

  async function remove(project: Project) {
    if (!confirm(`Delete ${project.name}? This cannot be undone.`)) return;
    await del(`/projects/${project.id}`);
    await load();
  }

  if (loading) return <div style={{ display: "grid", gap: "16px" }}><Skeleton height={104} /><Skeleton height={360} /></div>;

  return (
    <div style={{ display: "grid", gap: "20px" }}>
      <section style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px" }}>PROJECT PORTFOLIO</p>
          <h2 class="headline" style={{ margin: "4px 0 0", fontSize: "32px" }}>Projects</h2>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button class={`btn ${mode === "cards" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("cards")}><Icon name="grid_view" size={18} /> Cards</button>
          <button class={`btn ${mode === "table" ? "btn-primary" : "btn-secondary"}`} onClick={() => setMode("table")}><Icon name="table_rows" size={18} /> Table</button>
          <Button variant="primary" onClick={() => setOpen(true)}><Icon name="add" size={18} /> New Project</Button>
        </div>
      </section>
      {error && <div class="badge badge-danger">{error}</div>}
      {projects.length === 0
        ? <EmptyState icon="folder_off" title="No projects found" body="Create a project to invite members and organize tasks." />
        : mode === "cards"
        ? (
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
            {projects.map((project) => (
              <article class="card" style={{ padding: "18px", display: "grid", gap: "14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <a href={`/projects/${project.id}`}><h3 class="headline" style={{ margin: 0, fontSize: "22px" }}>{project.name}</h3></a>
                  <Badge tone={statusTone(project.status)}>{project.status}</Badge>
                </div>
                <p style={{ margin: 0, color: "var(--muted)", minHeight: "42px" }}>{project.description ?? "No description."}</p>
                <ProgressBar value={project.progress} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "var(--muted)", fontSize: "13px" }}>{Math.round(project.progress ?? 0)}% complete</span>
                  <div style={{ display: "flex" }}>{project.members?.slice(0, 4).map((member) => <Avatar user={member.user} />)}</div>
                </div>
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <a class="btn btn-secondary" href={`/projects/${project.id}`}>Open</a>
                  <button class="btn btn-secondary" onClick={() => archive(project)}>Archive</button>
                  <button class="btn btn-danger" onClick={() => remove(project)}>Delete</button>
                </div>
              </article>
            ))}
          </section>
        )
        : (
          <div class="card" style={{ overflow: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ color: "var(--muted)", textAlign: "left" }}>
                  <th style={{ padding: "14px" }}>Project</th>
                  <th>Status</th>
                  <th>Progress</th>
                  <th>Members</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((project) => (
                  <tr style={{ borderTop: "1px solid var(--border)" }}>
                    <td style={{ padding: "14px" }}><a href={`/projects/${project.id}`}><strong>{project.name}</strong></a></td>
                    <td><Badge tone={statusTone(project.status)}>{project.status}</Badge></td>
                    <td style={{ minWidth: "180px" }}><ProgressBar value={project.progress} /></td>
                    <td>{project.members?.length ?? 0}</td>
                    <td>
                      <div style={{ display: "flex", gap: "6px" }}>
                        <button class="btn" onClick={() => archive(project)}>Archive</button>
                        <button class="btn btn-danger" onClick={() => remove(project)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      {open && <ProjectCreateModal onClose={() => setOpen(false)} onCreated={load} />}
    </div>
  );
}
