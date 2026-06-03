// Small ID/format helpers.

export const isValidObjectId = (id: string): boolean => {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
};

export const slugifyUsername = (input: string): string => {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 30);
};

export const randomToken = (length = 32): string => {
  const arr = new Uint8Array(length);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
};

export const sha256 = async (input: string): Promise<string> => {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
};

// Extract @username mentions from a string. Username must be 3-30 chars [a-z0-9_].
export const extractMentions = (text: string): string[] => {
  const matches = text.match(/@([a-z0-9_]{3,30})/gi) ?? [];
  const set = new Set<string>();
  for (const m of matches) {
    set.add(m.slice(1).toLowerCase());
  }
  return Array.from(set);
};
