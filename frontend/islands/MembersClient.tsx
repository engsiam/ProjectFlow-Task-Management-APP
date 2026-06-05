import { useEffect, useMemo, useState } from "preact/hooks";
import { getList, patch } from "../lib/api.ts";
import { getCurrentUser } from "../lib/auth.ts";
import { Icon } from "../components/ui.tsx";
import { toast } from "../lib/toast.ts";
import type { Project, ProjectMember, Role } from "../lib/types.ts";

type MemberRow = ProjectMember & { projectName?: string };
type SortKey = "name" | "role" | "project" | "status";

const GLOBAL_ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "PROJECT_MANAGER", label: "Project Manager" },
  { value: "TEAM_MEMBER", label: "Team Member" },
  { value: "VIEWER", label: "Viewer" },
];

export default function MembersClient() {
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(
    getCurrentUser()?.id ?? null,
  );
  const [isAdmin, setIsAdmin] = useState(
    getCurrentUser()?.role === "ADMIN",
  );
  const [savingRoleFor, setSavingRoleFor] = useState<string | null>(null);

  useEffect(() => {
    getList<Project>("/projects").then((projects) => {
      const safe = Array.isArray(projects) ? projects : [];
      const all: MemberRow[] = [];
      for (const p of safe) {
        const pm = Array.isArray(p.members) ? p.members : [];
        for (const m of pm) {
          if (!all.some((x) => x.user.id === m.user.id)) {
            all.push({ ...m, projectName: p.name });
          }
        }
      }
      setMembers(all);
    }).catch((err) => {
      const msg = err instanceof Error ? err.message : "Failed to load members";
      setError(msg);
    }).finally(() => setLoading(false));
  }, []);

  async function changeAccountRole(userId: string, role: Role) {
    setSavingRoleFor(userId);
    const prev = members;
    setMembers((rows) =>
      rows.map((m) =>
        m.user.id === userId ? { ...m, user: { ...m.user, role } } : m
      )
    );
    try {
      await patch<{ id: string; role: Role }>(
        `/users/${userId}/role`,
        { role },
        {
          loaderMessage: "Updating role…",
        },
      );
      toast(
        `Role updated to ${role.replace("_", " ").toLowerCase()}.`,
        "success",
      );
    } catch (err) {
      setMembers(prev);
      const msg = err instanceof Error ? err.message : "Could not update role.";
      toast(msg, "danger");
    } finally {
      setSavingRoleFor(null);
    }
  }

  const filtered = useMemo(() => {
    let list = [...members];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((m) =>
        m.user.name.toLowerCase().includes(q) ||
        m.user.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "all") {
      list = list.filter((m) => m.role === roleFilter);
    }
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name") cmp = a.user.name.localeCompare(b.user.name);
      else if (sortKey === "role") cmp = a.role.localeCompare(b.role);
      else if (sortKey === "project") {
        cmp = (a.projectName ?? "").localeCompare(b.projectName ?? "");
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [members, search, roleFilter, sortKey, sortAsc]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const m of members) {
      counts[m.role] = (counts[m.role] ?? 0) + 1;
    }
    return counts;
  }, [members]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <Icon name="unfold_more" size={14} />;
    return (
      <Icon
        name={sortAsc ? "arrow_upward" : "arrow_downward"}
        size={14}
      />
    );
  }

  if (loading) {
    return (
      <div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
          {Array.from({ length: 4 }).map(() => (
            <div class="card" style="padding:16px;height:88px">
              <div style="width:60%;height:10px;background:var(--border);border-radius:4px;margin-bottom:10px" />
              <div style="width:40%;height:22px;background:var(--border);border-radius:4px;margin-bottom:4px" />
              <div style="width:50%;height:10px;background:var(--border);border-radius:4px" />
            </div>
          ))}
        </div>
        <div class="card" style="padding:24px">
          <div style="display:grid;gap:10px">
            {Array.from({ length: 5 }).map(() => (
              <div style="display:flex;gap:10px;align-items:center">
                <div style="width:32px;height:32px;border-radius:999px;background:var(--border)" />
                <div style="flex:1">
                  <div style="width:40%;height:12px;background:var(--border);border-radius:4px;margin-bottom:6px" />
                  <div style="width:60%;height:10px;background:var(--border);border-radius:4px" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div class="card" style="padding:32px;text-align:center">
        <div style="font-size:40px;margin-bottom:12px;color:var(--danger)">
          !
        </div>
        <h3 class="headline" style="margin:0 0 6px">Failed to load members</h3>
        <p style="margin:0 0 16px;color:var(--muted);font-size:14px">
          We could not retrieve your team. The backend may be offline.
        </p>
        <button class="btn btn-primary" onClick={() => location.reload()}>
          <Icon name="refresh" size={16} /> Retry
        </button>
      </div>
    );
  }

  return (
    <div style="display:grid;gap:20px">
      {/* ── KPI Row ── */}
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px">
        <div class="card" style="padding:14px 16px">
          <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">
            Total Members
          </div>
          <div style="font-family:'Hanken Grotesk',Inter,sans-serif;font-size:28px;font-weight:700;margin-top:4px">
            {members.length}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">
            Across {new Set(members.map((m) => m.projectName)).size} projects
          </div>
        </div>
        <div class="card" style="padding:14px 16px">
          <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">
            Admins
          </div>
          <div style="font-family:'Hanken Grotesk',Inter,sans-serif;font-size:28px;font-weight:700;margin-top:4px;color:var(--warning)">
            {roleCounts.OWNER ?? 0}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">
            Project owners
          </div>
        </div>
        <div class="card" style="padding:14px 16px">
          <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">
            Managers
          </div>
          <div style="font-family:'Hanken Grotesk',Inter,sans-serif;font-size:28px;font-weight:700;margin-top:4px;color:var(--info)">
            {roleCounts.MANAGER ?? 0}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">
            Can manage projects
          </div>
        </div>
        <div class="card" style="padding:14px 16px">
          <div style="font-size:11px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:0.04em">
            Members
          </div>
          <div style="font-family:'Hanken Grotesk',Inter,sans-serif;font-size:28px;font-weight:700;margin-top:4px">
            {(roleCounts.MEMBER ?? 0) + (roleCounts.VIEWER ?? 0)}
          </div>
          <div style="font-size:12px;color:var(--muted);margin-top:2px">
            {roleCounts.VIEWER ?? 0} viewers
          </div>
        </div>
      </div>

      {/* ── Toolbar ── */}
      <div class="card" style="padding:14px 16px">
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">
          <div style="position:relative;flex:1;min-width:200px">
            <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--muted);display:flex">
              <Icon name="search" size={16} />
            </span>
            <input
              class="input"
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onInput={(e) => setSearch(e.currentTarget.value)}
              style="padding-left:32px"
            />
          </div>
          <select
            class="select"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.currentTarget.value)}
            style="width:140px"
          >
            <option value="all">All Roles</option>
            <option value="OWNER">Owner</option>
            <option value="MANAGER">Manager</option>
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <span style="font-size:12px;color:var(--muted);white-space:nowrap">
            {filtered.length} of {members.length}
          </span>
        </div>
      </div>

      {/* ── Table ── */}
      <div class="card" style="overflow:hidden;padding:0">
        {filtered.length === 0
          ? (
            <div style="padding:48px 24px;text-align:center">
              <div style="font-size:40px;margin-bottom:12px;color:var(--muted)">
                <Icon name="group_off" size={40} />
              </div>
              <h3 class="headline" style="margin:0 0 6px;font-size:16px">
                {members.length === 0
                  ? "No team members yet"
                  : "No results found"}
              </h3>
              <p style="margin:0;color:var(--muted);font-size:13px">
                {members.length === 0
                  ? "Create a project and invite teammates to get started."
                  : "Try adjusting your search or filter."}
              </p>
            </div>
          )
          : (
            <table class="task-table">
              <thead>
                <tr>
                  <th style="cursor:pointer" onClick={() => toggleSort("name")}>
                    <span style="display:inline-flex;align-items:center;gap:4px">
                      Member <SortIcon col="name" />
                    </span>
                  </th>
                  <th style="cursor:pointer" onClick={() => toggleSort("role")}>
                    <span style="display:inline-flex;align-items:center;gap:4px">
                      Project Role <SortIcon col="role" />
                    </span>
                  </th>
                  <th>Account Role</th>
                  <th
                    style="cursor:pointer"
                    onClick={() => toggleSort("project")}
                  >
                    <span style="display:inline-flex;align-items:center;gap:4px">
                      Project <SortIcon col="project" />
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id}>
                    <td>
                      <div style="display:flex;align-items:center;gap:10px">
                        <div style="width:34px;height:34px;border-radius:999px;background:var(--primary);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:600;font-size:13px;flex-shrink:0;text-transform:uppercase">
                          {m.user.name.charAt(0)}
                          {m.user.name.split(" ")[1]?.charAt(0) ?? ""}
                        </div>
                        <div>
                          <div style="font-size:13px;font-weight:600">
                            {m.user.name}
                          </div>
                          <div style="font-size:11px;color:var(--muted)">
                            {m.user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        style={`display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;${
                          m.role === "ADMIN"
                            ? "background:color-mix(in srgb,var(--warning),transparent 85%);color:var(--warning)"
                            : m.role === "PROJECT_MANAGER"
                            ? "background:color-mix(in srgb,var(--info),transparent 85%);color:var(--info)"
                            : m.role === "VIEWER"
                            ? "background:color-mix(in srgb,var(--muted),transparent 85%);color:var(--muted)"
                            : "background:color-mix(in srgb,var(--success),transparent 85%);color:var(--success)"
                        }`}
                      >
                        <span
                          style={`width:5px;height:5px;border-radius:999px;background:currentColor`}
                        />
                        {m.role === "ADMIN"
                          ? "Admin"
                          : m.role === "PROJECT_MANAGER"
                          ? "Project Manager"
                          : m.role === "VIEWER"
                          ? "Viewer"
                          : "Team Member"}
                      </span>
                    </td>
                    <td>
                      {isAdmin && m.user.id !== currentUserId &&
                          m.user.role !== "ADMIN"
                        ? (
                          <select
                            class="select"
                            style="padding:4px 8px;font-size:12px;min-width:150px"
                            value={m.user.role ?? "TEAM_MEMBER"}
                            disabled={savingRoleFor === m.user.id}
                            onChange={(e) =>
                              changeAccountRole(
                                m.user.id,
                                e.currentTarget.value as Role,
                              )}
                          >
                            {GLOBAL_ROLE_OPTIONS.map((opt) => (
                              <option value={opt.value}>{opt.label}</option>
                            ))}
                          </select>
                        )
                        : (
                          <span
                            style={`display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:600;${
                              m.user.role === "ADMIN"
                                ? "background:color-mix(in srgb,var(--warning),transparent 85%);color:var(--warning)"
                                : m.user.role === "PROJECT_MANAGER"
                                ? "background:color-mix(in srgb,var(--info),transparent 85%);color:var(--info)"
                                : m.user.role === "VIEWER"
                                ? "background:color-mix(in srgb,var(--muted),transparent 85%);color:var(--muted)"
                                : "background:color-mix(in srgb,var(--success),transparent 85%);color:var(--success)"
                            }`}
                          >
                            <span style="width:5px;height:5px;border-radius:999px;background:currentColor" />
                            {m.user.role === "ADMIN"
                              ? "Admin (locked)"
                              : m.user.role === "PROJECT_MANAGER"
                              ? "Project Manager"
                              : m.user.role === "VIEWER"
                              ? "Viewer"
                              : "Team Member"}
                          </span>
                        )}
                    </td>
                    <td style="font-size:13px;color:var(--muted)">
                      {m.projectName || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
      </div>
    </div>
  );
}
