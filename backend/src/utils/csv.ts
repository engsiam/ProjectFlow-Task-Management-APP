// CSV serialization helper.

const escapeCell = (val: unknown): string => {
  if (val === null || val === undefined) return "";
  let s: string;
  if (val instanceof Date) {
    s = val.toISOString();
  } else if (typeof val === "object") {
    s = JSON.stringify(val);
  } else {
    s = String(val);
  }
  if (/[",\n\r]/.test(s)) {
    s = '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
};

export const toCSV = <T extends Record<string, unknown>>(
  rows: T[],
  columns: { key: keyof T; header: string }[],
): string => {
  const header = columns.map((c) => escapeCell(c.header as string)).join(",");
  const body = rows
    .map((row) => columns.map((c) => escapeCell(row[c.key])).join(","))
    .join("\n");
  return header + "\n" + body + (body ? "\n" : "");
};
