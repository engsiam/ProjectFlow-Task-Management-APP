export type ValidationResult =
  | { ok: true }
  | { ok: false; field: string; message: string };

export function validateTaskTitle(
  title: string,
  existingTitles: string[],
  currentTitle?: string,
): ValidationResult {
  const trimmed = (title ?? "").trim();
  if (!trimmed) {
    return { ok: false, field: "title", message: "Title is required." };
  }
  if (trimmed.length > 200) {
    return {
      ok: false,
      field: "title",
      message: "Title must be 200 characters or fewer.",
    };
  }
  const dupe = existingTitles.find((t) =>
    t.trim().toLowerCase() === trimmed.toLowerCase() &&
    t.trim().toLowerCase() !== (currentTitle ?? "").trim().toLowerCase()
  );
  if (dupe) {
    return {
      ok: false,
      field: "title",
      message: "A task with this title already exists in this project.",
    };
  }
  return { ok: true };
}

export function validateDeadline(
  dueDate: string | null | undefined,
  allowPast: boolean,
): ValidationResult {
  if (!dueDate) return { ok: true };
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) {
    return { ok: false, field: "dueDate", message: "Invalid date." };
  }
  if (!allowPast) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (d.getTime() < today.getTime()) {
      return {
        ok: false,
        field: "dueDate",
        message: "Deadline cannot be in the past.",
      };
    }
  }
  return { ok: true };
}

export function validateProjectName(name: string): ValidationResult {
  const trimmed = (name ?? "").trim();
  if (!trimmed) {
    return { ok: false, field: "name", message: "Project name is required." };
  }
  if (trimmed.length > 100) {
    return {
      ok: false,
      field: "name",
      message: "Project name must be 100 characters or fewer.",
    };
  }
  return { ok: true };
}

export function validateProjectDates(
  startDate: string | null | undefined,
  deadline: string | null | undefined,
): ValidationResult {
  if (!startDate || !deadline) return { ok: true };
  const s = new Date(startDate);
  const d = new Date(deadline);
  if (Number.isNaN(s.getTime()) || Number.isNaN(d.getTime())) {
    return { ok: false, field: "deadline", message: "Invalid date." };
  }
  if (d.getTime() < s.getTime()) {
    return {
      ok: false,
      field: "deadline",
      message: "Deadline must be on or after the start date.",
    };
  }
  return { ok: true };
}
