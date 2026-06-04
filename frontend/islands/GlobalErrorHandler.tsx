import { useEffect } from "preact/hooks";

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
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);
  return null;
}
