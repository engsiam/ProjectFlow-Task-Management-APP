// Root redirect — runs entirely client-side so the user never sees
// the dashboard skeleton before being sent to /login. Checks the JWT in
// localStorage and redirects to the right page on the next paint.
import { useEffect, useState } from "preact/hooks";
import { getAccessToken } from "../lib/auth.ts";

export default function RootRedirect() {
  const [status, setStatus] = useState<"checking" | "redirecting">("checking");

  useEffect(() => {
    // Microtask delay so the loading state paints at least once
    // (prevents a blank flash on instant redirects).
    const target = getAccessToken() ? "/dashboard" : "/login";
    setStatus("redirecting");
    // Use replace so the back button doesn't bounce back to "/".
    globalThis.location.replace(target);
  }, []);

  return (
    <main class="root-redirect">
      <div class="root-redirect-card" role="status" aria-live="polite">
        <div class="root-redirect-spinner" aria-hidden="true">
          {/* <span class="material-symbols-outlined">progress_activity</span> */}
        </div>
        <p class="root-redirect-text">
          {status === "checking" ? "Loading ProjectFlow…" : "Redirecting…"}
        </p>
      </div>
    </main>
  );
}
