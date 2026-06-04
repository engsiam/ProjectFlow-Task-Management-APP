import { useEffect, useState } from "preact/hooks";
import { getList } from "../lib/api.ts";
import { getCurrentUser, requireClientAuth } from "../lib/auth.ts";
import type { Project } from "../lib/types.ts";
import { Button, EmptyState, Icon, Skeleton } from "../components/ui.tsx";
import ProjectCard from "../components/ProjectCard.tsx";
import ProjectCreateModal from "./ProjectCreateModal.tsx";

export default function ProjectsClient() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  async function load() {
    requireClientAuth();
    setLoading(true);
    try {
      const data = await getList<Project>("/projects", { limit: 100 });
      setProjects(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load projects.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setCurrentUserId(getCurrentUser()?.id ?? null); }, []);

  if (loading) {
    return (
      <div class="pc-skeleton-grid">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={220} />)}
      </div>
    );
  }

  const activeCount = projects.filter((p) => p.status === "ACTIVE").length;
  const completedCount = projects.filter((p) => p.status === "COMPLETED").length;

  return (
    <div class="pc-page">
      {/* Page header */}
      <header class="pc-page-header">
        <div>
          <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "11px", letterSpacing: "0.06em" }}>
            PROJECT PORTFOLIO
          </p>
          <h1 class="headline" style={{ margin: "2px 0 0", fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em" }}>
            Projects
          </h1>
        </div>
        <div class="pc-page-actions">
          {projects.length > 0 && (
            <div class="pc-page-counts">
              <span class="pc-count-badge">{activeCount} Active</span>
              {completedCount > 0 && <span class="pc-count-badge pc-count-badge--done">{completedCount} Completed</span>}
            </div>
          )}
          <Button variant="primary" onClick={() => setOpen(true)}>
            <Icon name="add" size={18} /> New Project
          </Button>
        </div>
      </header>

      {error && <div class="badge badge-danger">{error}</div>}

      {projects.length === 0
        ? (
          <div class="pc-empty">
            <EmptyState
              icon="folder_open"
              title="No projects yet"
              body="Create your first project to organize tasks, invite members, and track progress."
            />
            <Button variant="primary" onClick={() => setOpen(true)}>
              <Icon name="add" size={18} /> Create Project
            </Button>
          </div>
        )
        : (
          <div class="pc-grid">
            {projects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                currentUserId={currentUserId}
                onChanged={load}
              />
            ))}
          </div>
        )}

      {open && (
        <ProjectCreateModal onClose={() => setOpen(false)} onCreated={load} />
      )}
    </div>
  );
}
