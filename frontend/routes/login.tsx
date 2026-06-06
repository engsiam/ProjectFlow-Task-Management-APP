import { Head } from "$fresh/runtime.ts";
import LoginForm from "../islands/LoginForm.tsx";
import { Icon } from "../components/ui.tsx";

export default function Login() {
  return (
    <>
      <Head>
        <title>Sign in — ProjectFlow</title>
        <meta
          name="description"
          content="Sign in to ProjectFlow. Real-time kanban boards, project analytics, and team collaboration for modern teams."
        />
        <meta name="robots" content="noindex, follow" />
        <meta property="og:title" content="Sign in — ProjectFlow" />
        <meta property="og:url" content="https://projectflow-frontend.engsiam.deno.net/login" />
        <link rel="canonical" href="https://projectflow-frontend.engsiam.deno.net/login" />
      </Head>

    <main class="auth-page">
      <section class="auth-showcase">
        <div class="auth-showcase-bg">
          <div class="auth-orb auth-orb-1" />
          <div class="auth-orb auth-orb-2" />
          <div class="auth-orb auth-orb-3" />
        </div>
        <div class="auth-showcase-content">
          <div class="auth-showcase-header">
            <span class="brand-mark brand-mark-lg">
              <Icon name="rocket_launch" />
            </span>
            <span
              class="headline"
              style="font-size:22px;font-weight:700;color:#fff"
            >
              ProjectFlow
            </span>
          </div>

          <div class="auth-showcase-cards">
            <div class="auth-floating-card" style="animation-delay:0s">
              <div
                class="auth-stat-icon"
                style="background:rgba(99,102,241,0.2);color:#818cf8"
              >
                <Icon name="checklist" size={18} />
              </div>
              <div class="auth-stat-body">
                <span class="auth-stat-value">142</span>
                <span class="auth-stat-label">Tasks completed today</span>
              </div>
              <span class="auth-stat-trend up">+12%</span>
            </div>

            <div class="auth-floating-card" style="animation-delay:1.5s">
              <div
                class="auth-stat-icon"
                style="background:rgba(52,211,153,0.2);color:#34d399"
              >
                <Icon name="folder" size={18} />
              </div>
              <div class="auth-stat-body">
                <span class="auth-stat-value">12</span>
                <span class="auth-stat-label">Active projects</span>
              </div>
              <span class="auth-stat-trend up">+3</span>
            </div>

            <div class="auth-floating-card" style="animation-delay:3s">
              <div
                class="auth-stat-icon"
                style="background:rgba(251,191,36,0.2);color:#fbbf24"
              >
                <Icon name="group" size={18} />
              </div>
              <div class="auth-stat-body">
                <span class="auth-stat-value">8</span>
                <span class="auth-stat-label">Team members</span>
              </div>
              <span class="auth-stat-trend up">+2</span>
            </div>
          </div>

          <div class="auth-analytics">
            <div class="auth-analytics-header">
              <span class="auth-analytics-title">Sprint Velocity</span>
              <span class="auth-analytics-badge">+23%</span>
            </div>
            <div class="auth-analytics-chart">
              <div class="auth-bar" style="height:36%">
              </div>
              <div class="auth-bar" style="height:58%">
              </div>
              <div class="auth-bar" style="height:42%">
              </div>
              <div class="auth-bar" style="height:76%">
              </div>
              <div class="auth-bar" style="height:52%">
              </div>
              <div class="auth-bar" style="height:88%">
              </div>
              <div class="auth-bar" style="height:65%">
              </div>
            </div>
          </div>

          <div class="auth-activity">
            <div class="auth-activity-item">
              <div class="auth-activity-dot" style="background:#818cf8" />
              <div class="auth-activity-body">
                <span class="auth-activity-text">
                  <strong>Alex</strong> merged PR #142
                </span>
                <span class="auth-activity-time">2m ago</span>
              </div>
            </div>
            <div class="auth-activity-item">
              <div class="auth-activity-dot" style="background:#34d399" />
              <div class="auth-activity-body">
                <span class="auth-activity-text">
                  <strong>Sarah</strong> added task "Design system"
                </span>
                <span class="auth-activity-time">8m ago</span>
              </div>
            </div>
            <div class="auth-activity-item">
              <div class="auth-activity-dot" style="background:#fbbf24" />
              <div class="auth-activity-body">
                <span class="auth-activity-text">
                  <strong>Mike</strong> commented on "API docs"
                </span>
                <span class="auth-activity-time">15m ago</span>
              </div>
            </div>
          </div>

          <div class="auth-testimonial-modern">
            <div class="auth-testimonial-avatars">
              <span class="auth-avatar">JD</span>
              <span class="auth-avatar" style="margin-left:-8px">SK</span>
              <span class="auth-avatar" style="margin-left:-8px">ML</span>
            </div>
            <div>
              <p class="auth-testimonial-text-modern">
                "The best project management tool we've ever used."
              </p>
              <p class="auth-testimonial-author-modern">
                — 2,000+ teams trust ProjectFlow
              </p>
            </div>
          </div>
        </div>
      </section>

      <section class="auth-panel">
        <div class="auth-panel-inner">
          <div class="auth-glass">
            <div class="auth-header">
              <div class="auth-header-brand">
                <span class="brand-mark">
                  <Icon name="rocket_launch" />
                </span>
                <span
                  class="headline"
                  style="font-size:18px;font-weight:700;color:var(--primary)"
                >
                  ProjectFlow
                </span>
              </div>
              <h2 class="auth-title">Welcome back</h2>
              <p class="auth-subtitle">
                Manage projects, collaborate with teams, and deliver faster.
              </p>
            </div>

            <LoginForm />

            <p class="auth-footer">
              New to ProjectFlow?{" "}
              <a href="/signup" class="auth-link">Create an account</a>
            </p>
          </div>
        </div>
      </section>
    </main>
    </>
  );
}
