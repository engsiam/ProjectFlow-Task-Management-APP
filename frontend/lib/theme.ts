export type Theme = "light" | "dark";

export function getInitialTheme(): Theme {
  if (typeof localStorage === "undefined") return "dark";
  return (localStorage.getItem("projectflow.theme") as Theme | null) ?? "dark";
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem("projectflow.theme", theme);
}
