import { Icon } from "../components/ui.tsx";

export default function OfflinePage() {
  return (
    <main class="error-page">
      <div class="error-bg" />
      <section class="error-card">
        <div class="error-brand">
          <span class="brand-mark">
            <Icon name="rocket_launch" />
          </span>
          <div>
            <h1
              class="headline"
              style={{ margin: 0, fontSize: "28px", color: "var(--primary)" }}
            >
              ProjectFlow
            </h1>
            <p
              class="mono"
              style={{ margin: 0, color: "var(--muted)", fontSize: "10px" }}
            >
              MISSION CONTROL
            </p>
          </div>
        </div>

        <div class="error-icon-wrap">
          <span class="error-icon">📡</span>
        </div>
        <span class="error-code">OFFLINE</span>
        <h2 class="headline error-title">No connection</h2>
        <p class="error-desc">
          You've lost contact with Mission Control. Don't panic — your data is
          safe. We'll automatically reconnect when the signal returns.
        </p>

        <div class="error-actions">
          <a href="." class="btn btn-primary">
            <Icon name="refresh" size={18} /> Try again
          </a>
          <a href="/dashboard" class="btn btn-secondary">
            <Icon name="dashboard" size={18} /> Dashboard
          </a>
        </div>
      </section>

      <script
        dangerouslySetInnerHTML={{
          __html:
            `(function(){function n(){navigator.onLine&&location.reload()}window.addEventListener("online",n)})();`,
        }}
      />
    </main>
  );
}
