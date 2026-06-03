import SignupForm from "../islands/SignupForm.tsx";
import { Icon } from "../components/ui.tsx";

export default function Signup() {
  return (
    <main class="auth-page">
      <section class="auth-panel">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <span class="brand-mark"><Icon name="rocket_launch" /></span>
          <div>
            <h1 class="headline" style={{ margin: 0, fontSize: "28px", color: "var(--primary)" }}>ProjectFlow</h1>
            <p class="mono" style={{ margin: 0, color: "var(--muted)", fontSize: "10px" }}>TEAM COLLABORATION</p>
          </div>
        </div>
        <h2 class="headline" style={{ margin: "0 0 6px", fontSize: "24px" }}>Create account</h2>
        <p style={{ margin: "0 0 18px", color: "var(--muted)" }}>Start with the real product dashboard after signup.</p>
        <SignupForm />
        <p style={{ textAlign: "center", color: "var(--muted)", margin: "18px 0 0" }}>
          Already have an account? <a href="/login" style={{ color: "var(--primary)", fontWeight: 800 }}>Sign in</a>
        </p>
      </section>
    </main>
  );
}
