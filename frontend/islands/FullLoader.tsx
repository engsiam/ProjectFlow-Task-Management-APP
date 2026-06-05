import { useEffect, useState } from "preact/hooks";
import {
  getLoaderState,
  LOADER_EVENT_NAME,
  type LoaderState,
  type LoaderTone,
} from "../lib/loader.ts";

const TONE_CONFIG: Record<
  LoaderTone,
  { icon: string; label: string; accent: string }
> = {
  default: {
    icon: "hourglass_top",
    label: "Working",
    accent: "var(--primary)",
  },
  save: {
    icon: "cloud_upload",
    label: "Saving",
    accent: "var(--primary)",
  },
  load: {
    icon: "progress_activity",
    label: "Loading",
    accent: "var(--accent)",
  },
};

export default function FullLoader() {
  const [state, setState] = useState<LoaderState>(() => getLoaderState());

  useEffect(() => {
    function onLoader(event: Event) {
      const detail = (event as CustomEvent<LoaderState>).detail;
      setState({
        count: detail.count,
        visible: detail.visible,
        message: detail.message,
        tone: detail.tone,
      });
    }
    addEventListener(LOADER_EVENT_NAME, onLoader);
    return () => removeEventListener(LOADER_EVENT_NAME, onLoader);
  }, []);

  if (!state.visible) return null;

  const cfg = TONE_CONFIG[state.tone] ?? TONE_CONFIG.default;

  return (
    <div
      class="full-loader"
      role="alert"
      aria-busy="true"
      aria-live="assertive"
      data-tone={state.tone}
    >
      <div class="full-loader-backdrop" aria-hidden="true" />
      <div class="full-loader-card" role="status">
        <div
          class="full-loader-spinner"
          style={{
            "--loader-accent": cfg.accent,
          } as Record<string, string>}
        >
          <div class="full-loader-ring full-loader-ring-1" />
          <div class="full-loader-ring full-loader-ring-2" />
          <div class="full-loader-ring full-loader-ring-3" />
          <span class="material-symbols-outlined full-loader-icon">
            {cfg.icon}
          </span>
        </div>
        <div class="full-loader-label">{cfg.label}</div>
        <div class="full-loader-message">{state.message}</div>
        <div class="full-loader-progress" aria-hidden="true">
          <span />
          <span />
          <span />
          <span />
          <span />
        </div>
        <div class="full-loader-hint">
          Please wait, do not navigate away…
        </div>
        {state.count > 1 && (
          <div class="full-loader-count">
            {state.count} active {state.count === 1 ? "task" : "tasks"}
          </div>
        )}
      </div>
    </div>
  );
}
