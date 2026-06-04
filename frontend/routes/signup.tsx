import SignupForm from "../islands/SignupForm.tsx";
import { Icon } from "../components/ui.tsx";

export default function Signup() {
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
          <h1 class="auth-hero-title">Start shipping<br />today.</h1>
          <p class="auth-hero-sub">
            Join thousands of teams already using ProjectFlow.
          </p>
          <div class="auth-features">
            <div class="auth-feature">
              <span class="auth-feature-icon"><Icon name="check_circle" /></span>
              <span>Free 14-day trial, no credit card</span>
            </div>
            <div class="auth-feature">
              <span class="auth-feature-icon"><Icon name="check_circle" /></span>
              <span>Unlimited projects &amp; tasks</span>
            </div>
            <div class="auth-feature">
              <span class="auth-feature-icon"><Icon name="check_circle" /></span>
              <span>99.9% uptime SLA</span>
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
                "We doubled our delivery speed within the first month."
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
            <h2 class="auth-form-title">Get started</h2>
            <p class="auth-form-desc">
              Create your workspace in seconds.
            </p>
          </div>
          <SignupForm />
          <p class="auth-form-footer">
            Already have an account?{" "}
            <a href="/login" class="auth-link">Sign in</a>
          </p>
        </div>
      </section>
    </main>
  );
}
