import { useEffect } from "preact/hooks";
import { saveSession } from "../lib/auth.ts";

export default function OAuthCallbackHandler() {
  useEffect(() => {
    const hash = location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (accessToken) {
      saveSession({ accessToken, refreshToken: refreshToken || undefined });
      location.href = "/dashboard";
    } else {
      location.href = "/login?error=oauth_failed";
    }
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        background: "var(--bg)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div class="spinner spinner-lg" />
        <p style={{ marginTop: "16px", color: "var(--muted)" }}>
          Completing sign in...
        </p>
      </div>
    </div>
  );
}
