import { useEffect, useRef, useState } from "preact/hooks";
import { get, getList } from "../lib/api.ts";
import type { Project, SearchGroup, Task, User } from "../lib/types.ts";

const RECENT_KEY = "pf_recent_searches";
const MAX_RECENT = 5;
const DEBOUNCE_MS = 300;

function getRecent(): string[] {
  try {
    const raw = globalThis.localStorage?.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveRecent(query: string) {
  try {
    const items = getRecent().filter((s) => s !== query);
    items.unshift(query);
    globalThis.localStorage?.setItem(
      RECENT_KEY,
      JSON.stringify(items.slice(0, MAX_RECENT)),
    );
  } catch {
    /* noop */
  }
}

export default function SearchCommand() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<SearchGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flatItems = groups.flatMap((g) => g.items);
  const showRecent = !query && open && !hasSearched;

  function resetIndex() {
    setActiveIdx(0);
  }

  function scrollIntoView(idx: number) {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-idx="${idx}"]`,
    );
    el?.scrollIntoView({ block: "nearest" });
  }

  function loadResults(q: string) {
    setLoading(true);
    setHasSearched(true);

    if (controllerRef.current) controllerRef.current.abort();
    const ctrl = new AbortController();
    controllerRef.current = ctrl;

    const trimmed = q.trim().toLowerCase();

    Promise.all([
      getList<Project>("/projects", { search: trimmed, limit: 5 }).catch(
        () => [],
      ),
      getList<Task>("/tasks", { search: trimmed, limit: 5 }).catch(() => []),
      get<{ items: User[] }>("/users/search", { q: trimmed, limit: 5 }).catch(
        () => null,
      ),
    ])
      .then(([projects, tasks, userRes]) => {
        if (ctrl.signal.aborted) return;

        const next: SearchGroup[] = [];

        if (projects.length) {
          next.push({
            label: "Projects",
            icon: "folder_open",
            items: projects.map((p) => ({
              id: p.id,
              title: p.name,
              subtitle: `${p.status?.toLowerCase() ?? "active"} · ${
                p.taskCount ?? 0
              } tasks`,
              icon: "folder",
              href: `/projects/${p.id}`,
              iconColor: "var(--primary)",
            })),
          });
        }

        if (tasks.length) {
          next.push({
            label: "Tasks",
            icon: "assignment",
            items: tasks.map((t) => ({
              id: t.id,
              title: t.title,
              subtitle: `${t.status?.replace("_", " ") ?? "todo"} · ${
                t.project?.name ?? "No project"
              }`,
              icon: t.priority === "URGENT" || t.priority === "HIGH"
                ? "priority_high"
                : "task_alt",
              href: `/tasks`,
              iconColor: t.priority === "URGENT" || t.priority === "HIGH"
                ? "var(--danger)"
                : "var(--accent)",
            })),
          });
        }

        const members = userRes?.items ?? [];
        if (members.length) {
          next.push({
            label: "Members",
            icon: "group",
            items: members.map((m) => ({
              id: m.id,
              title: m.name,
              subtitle: m.email,
              icon: "person",
              href: `/members`,
              iconColor: "var(--info)",
            })),
          });
        }

        setGroups(next);
        resetIndex();
        setLoading(false);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setGroups([]);
          setLoading(false);
        }
      });
  }

  function handleInput(value: string) {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setGroups([]);
      setHasSearched(false);
      setLoading(false);
      if (controllerRef.current) controllerRef.current.abort();
      return;
    }
    timerRef.current = setTimeout(() => loadResults(value), DEBOUNCE_MS);
  }

  function openDropdown() {
    setOpen(true);
    setRecent(getRecent());
    if (!query.trim()) {
      setHasSearched(false);
    }
  }

  function closeDropdown() {
    setOpen(false);
    setQuery("");
    setGroups([]);
    setLoading(false);
    setHasSearched(false);
    if (controllerRef.current) controllerRef.current.abort();
    if (timerRef.current) clearTimeout(timerRef.current);
  }

  function selectItem(item: SearchGroup["items"][number]) {
    saveRecent(item.title);
    closeDropdown();
    globalThis.location.href = item.href;
  }

  function selectRecent(value: string) {
    setQuery(value);
    loadResults(value);
  }

  function removeRecent(value: string) {
    const updated = getRecent().filter((s) => s !== value);
    globalThis.localStorage?.setItem(RECENT_KEY, JSON.stringify(updated));
    setRecent(updated);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      inputRef.current?.blur();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((prev) => {
        const next = Math.min(prev + 1, flatItems.length - 1);
        scrollIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((prev) => {
        const next = Math.max(prev - 1, 0);
        scrollIntoView(next);
        return next;
      });
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (showRecent && recent[activeIdx]) {
        selectRecent(recent[activeIdx]);
        return;
      }
      const item = flatItems[activeIdx];
      if (item) selectItem(item);
      return;
    }
  }

  // Global keyboard shortcut: Cmd/Ctrl + K
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) {
          closeDropdown();
        } else {
          setOpen(true);
          setRecent(getRecent());
          requestAnimationFrame(() => inputRef.current?.focus());
        }
      }
    }
    globalThis.addEventListener("keydown", handler);
    return () => globalThis.removeEventListener("keydown", handler);
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest(".search-command")) closeDropdown();
    }
    globalThis.addEventListener("mousedown", handler);
    return () => globalThis.removeEventListener("mousedown", handler);
  }, [open]);

  // Reset index when items change
  useEffect(() => {
    resetIndex();
  }, [flatItems.length]);

  return (
    <div
      class="search-command"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
    >
      <div class="search-command-input-wrap">
        <span class="search-command-icon" aria-hidden="true">
          <span class="material-symbols-outlined" style="font-size: 20px">
            search
          </span>
        </span>
        <input
          ref={inputRef}
          class="search-command-input"
          aria-label="Global search"
          aria-autocomplete="list"
          aria-controls="search-results"
          placeholder="Search projects, tasks, members..."
          value={query}
          onInput={(e) => handleInput(e.currentTarget.value)}
          onFocus={openDropdown}
          onKeyDown={handleKeyDown}
        />
        <kbd class="search-command-kbd">
          <span class="search-kbd-mac">
            <span class="material-symbols-outlined" style="font-size: 14px">
              keyboard_command_key
            </span>
          </span>
          <span class="search-kbd-text">K</span>
        </kbd>
      </div>

      {open && (
        <div class="search-command-dropdown" id="search-results" role="listbox">
          {/* Recent searches */}
          {showRecent && recent.length > 0 && (
            <div class="search-section">
              <div class="search-section-label">
                <span class="material-symbols-outlined" style="font-size: 14px">
                  history
                </span>
                Recent Searches
              </div>
              <div class="search-recent-list">
                {recent.map((term, idx) => (
                  <button
                    type="button"
                    class={`search-item ${idx === activeIdx ? "active" : ""}`}
                    data-idx={idx}
                    role="option"
                    aria-selected={idx === activeIdx}
                    onClick={() => selectRecent(term)}
                  >
                    <span class="search-item-icon" style="color: var(--muted)">
                      <span
                        class="material-symbols-outlined"
                        style="font-size: 18px"
                      >
                        history
                      </span>
                    </span>
                    <div class="search-item-body">
                      <div class="search-item-title">{term}</div>
                      <div class="search-item-sub">Recent search</div>
                    </div>
                    <button
                      type="button"
                      class="search-item-action"
                      aria-label={`Remove ${term}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(term);
                      }}
                    >
                      <span
                        class="material-symbols-outlined"
                        style="font-size: 14px"
                      >
                        close
                      </span>
                    </button>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div class="search-section">
              <div class="search-loading-list">
                {[1, 2, 3].map((i) => (
                  <div key={i} class="search-skeleton-row">
                    <div class="search-skeleton-icon" />
                    <div class="search-skeleton-lines">
                      <div class="search-skeleton-line" style="width: 55%" />
                      <div class="search-skeleton-line" style="width: 35%" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Result groups */}
          {!loading && groups.length > 0 && (
            <>
              {groups.map((group, gi) => {
                const groupOffset = groups.slice(0, gi).reduce(
                  (sum, g) => sum + g.items.length,
                  0,
                );
                return (
                  <div class="search-section" key={group.label}>
                    <div class="search-section-label">
                      <span
                        class="material-symbols-outlined"
                        style="font-size: 14px"
                      >
                        {group.icon}
                      </span>
                      {group.label}
                    </div>
                    <div class="search-group-list">
                      {group.items.map((item, ii) => {
                        const idx = groupOffset + ii;
                        return (
                          <button
                            type="button"
                            class={`search-item ${
                              idx === activeIdx ? "active" : ""
                            }`}
                            data-idx={idx}
                            role="option"
                            aria-selected={idx === activeIdx}
                            onClick={() => selectItem(item)}
                          >
                            <span
                              class="search-item-icon"
                              style={{
                                color: item.iconColor ?? "var(--muted)",
                              }}
                            >
                              <span
                                class="material-symbols-outlined"
                                style="font-size: 18px"
                              >
                                {item.icon}
                              </span>
                            </span>
                            <div class="search-item-body">
                              <div class="search-item-title">{item.title}</div>
                              <div class="search-item-sub">{item.subtitle}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Hint */}
              <div class="search-footer-hint">
                <span>
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 12px"
                  >
                    keyboard_arrow_up
                  </span>
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 12px"
                  >
                    keyboard_arrow_down
                  </span>{" "}
                  navigate{"  "}
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 12px"
                  >
                    keyboard_return
                  </span>{" "}
                  select{"  "}
                  <span
                    class="material-symbols-outlined"
                    style="font-size: 12px"
                  >
                    close
                  </span>{" "}
                  close
                </span>
              </div>
            </>
          )}

          {/* Empty state */}
          {!loading && hasSearched && groups.length === 0 && (
            <div class="search-empty">
              <span
                class="material-symbols-outlined"
                style="font-size: 28px; color: var(--muted)"
              >
                search_off
              </span>
              <p class="search-empty-title">No results found</p>
              <p class="search-empty-sub">Try another keyword</p>
            </div>
          )}

          {/* Empty focused state (no recent, no query) */}
          {!loading && !hasSearched && recent.length === 0 && !query.trim() && (
            <div class="search-empty">
              <span
                class="material-symbols-outlined"
                style="font-size: 28px; color: var(--muted)"
              >
                search
              </span>
              <p class="search-empty-title">Type to search</p>
              <p class="search-empty-sub">
                Search across projects, tasks, and members
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
