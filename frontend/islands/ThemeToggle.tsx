import { useEffect, useState } from "preact/hooks";
import { applyTheme, getInitialTheme, type Theme } from "../lib/theme.ts";
import { Icon } from "../components/ui.tsx";

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const next = getInitialTheme();
    setTheme(next);
    applyTheme(next);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button class="btn btn-secondary icon-btn" onClick={toggle} aria-label="Toggle theme">
      <Icon name={theme === "dark" ? "light_mode" : "dark_mode"} size={19} />
    </button>
  );
}
