import { useEffect } from "preact/hooks";
import { getAccessToken } from "../lib/auth.ts";

export default function GlobalErrorHandler() {
  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      console.error("[GlobalErrorHandler]", event.error ?? event.message);
    };
    const onRejection = (event: PromiseRejectionEvent) => {
      console.error("[GlobalErrorHandler:unhandled]", event.reason);
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    // Sync auth state across tabs: when another tab saves/clears tokens,
    // redirect to login if session was cleared.
    const onStorage = (event: StorageEvent) => {
      if (event.key?.includes("projectflow.")) {
        if (!getAccessToken() && !location.pathname.startsWith("/login")) {
          location.href = "/login";
        }
      }
    };
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
      window.removeEventListener("storage", onStorage);
    };
  }, []);
  return null;
}
