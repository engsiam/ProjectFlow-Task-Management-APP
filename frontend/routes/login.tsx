import LoginForm from "../islands/LoginForm.tsx";
import { Icon } from "../components/ui.tsx";

export default function Login() {
  return (
    <main class="auth-split">
      <section class="auth-hero">
        <div class="auth-hero-content">
          <div class="auth-hero-brand">
            <span class="brand-mark brand-mark-lg">
              <Icon name="rocket_launch" />
            </span>
            <span class="headline" style="font-size:24px;font-weight:700;color:#fff">
              ProjectFlow
            </span>
          </div>
          <h1 class="auth-hero-title">Manage projects<br />with precision.</h1>
          <p class="auth-hero-sub">
            Plan, track, and deliver great work — together.
          </p>
          <div class="auth-features">
            <div class="auth-feature">
              <span class="auth-feature-icon"><Icon name="check_circle" /></span>
              <span>Drag-and-drop Kanban boards</span>
            </div>
            <div class="auth-feature">
              <span class="auth-feature-icon"><Icon name="check_circle" /></span>
              <span>Real-time team collaboration</span>
            </div>
            <div class="auth-feature">
              <span class="auth-feature-icon"><Icon name="check_circle" /></span>
              <span>Advanced analytics &amp; reporting</span>
            </div>
          </div>
          <div class="auth-testimonial">
            <div class="auth-testimonial-avatars">
              <span class="auth-avatar">JD</span>
              <span class="auth-avatar" style="margin-left:-8px">SK</span>
              <span class="auth-avatar" style="margin-left:-8px">ML</span>
            </div>
            <div>
              <p class="auth-testimonial-text">
                "ProjectFlow transformed how our team ships features."
              </p>
              <p class="auth-testimonial-author">— 2,000+ teams trust us</p>
            </div>
          </div>
        </div>
      </section>
      <section class="auth-form-section">
        <div class="auth-form-container">
          <div class="auth-form-header">
            <div class="auth-form-brand-row">
              <span class="brand-mark">
                <Icon name="rocket_launch" />
              </span>
              <span class="headline" style="font-size:20px;font-weight:700;color:var(--primary)">
                ProjectFlow
              </span>
            </div>
            <h2 class="auth-form-title">Welcome back</h2>
            <p class="auth-form-desc">
              Sign in to your account to continue.
            </p>
          </div>
          <LoginForm />
          <p class="auth-form-footer">
            New to ProjectFlow?{" "}
            <a href="/signup" class="auth-link">Create an account</a>
          </p>
        </div>
      </section>
    </main>
  );
}
