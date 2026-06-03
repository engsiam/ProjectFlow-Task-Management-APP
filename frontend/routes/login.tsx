import LoginForm from "../islands/LoginForm.tsx";
import { Icon } from "../components/ui.tsx";

export default function Login() {
  return (
    <main class="auth-page">
      <section class="auth-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span class="brand-mark"><Icon name="rocket_launch" /></span>
          <div>
            <h1 class="headline" style={{ margin: 0, fontSize: "28px", color: "var(--primary)" }}>ProjectFlow</h1>
            <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "10px" }}>LOGGED-IN SAAS DASHBOARD</p>
          </div>
        </div>
        <h2 class="headline" style={{ margin: "0 0 6px", fontSize: "24px" }}>Sign in</h2>
        <p style={{ margin: "0 0 18px", color: "var(--muted)" }}>Use demo access or your team account to continue.</p>
        <LoginForm />
        <p style={{ textAlign: "center", color: "var(--muted)", margin: "18px 0 0" }}>
          New workspace? <a href="/signup" style={{ color: "var(--primary)", fontWeight: 800 }}>Create account</a>
        </p>
      </section>
    </main>
  );
}
