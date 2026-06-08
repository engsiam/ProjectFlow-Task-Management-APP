import { useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import { saveSession } from "../lib/auth.ts";
import { API_BASE_URL } from "../lib/constants.ts";
import { toast } from "../lib/toast.ts";
import { Button, Icon } from "../components/ui.tsx";
import type { User } from "../lib/types.ts";

type SignupResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export default function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: Event) {
    e.preventDefault();
    if (name.trim().length < 2) {
      return setError("Name must be at least 2 characters.");
    }
    if (!email.includes("@")) return setError("Enter a valid email.");
    if (password.length < 8) {
      return setError("Password must be at least 8 characters.");
    }
    if (!agreeToTerms) {
      return setError("You must agree to the Terms & Conditions.");
    }
    setLoading(true);
    setError("");
    try {
      const data = await post<SignupResponse>("/auth/signup", {
        name,
        email,
        password,
      });
      saveSession(data);
      toast("Account created!", "success");
      location.href = "/dashboard";
    } catch (err) {
      const msg = err instanceof Error
        ? err.message
        : "Unable to create account.";
      setError(msg);
      toast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} class="auth-form-body">
      <div class="auth-field">
        <label class="auth-label" htmlFor="name">Full name</label>
        <input
          id="name"
          class="auth-input"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="Ada Lovelace"
          autoComplete="name"
          autoFocus
        />
      </div>

      <div class="auth-field">
        <label class="auth-label" htmlFor="email">Email address</label>
        <input
          id="email"
          class="auth-input"
          type="email"
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@company.com"
          autoComplete="email"
        />
      </div>

      <div class="auth-field">
        <label class="auth-label" htmlFor="password">Password</label>
        <div class="auth-password-wrap">
          <input
            id="password"
            class="auth-input"
            type={show ? "text" : "password"}
            value={password}
            onInput={(e) => setPassword(e.currentTarget.value)}
            placeholder="Create a strong password"
            autoComplete="new-password"
            style={{ paddingRight: "44px" }}
          />
          <button
            type="button"
            class="auth-password-toggle"
            onClick={() => setShow(!show)}
            aria-label={show ? "Hide password" : "Show password"}
            tabIndex={-1}
          >
            <Icon name={show ? "visibility_off" : "visibility"} size={18} />
          </button>
        </div>
      </div>

      {error && <div class="auth-error" role="alert">{error}</div>}

      <div class="auth-role-notice" role="note">
        <Icon name="info" size={14} />
        <span>
          New accounts start as <strong>Viewer</strong>{" "}
          for safety. An admin can promote you to Team Member or Project Manager
          anytime from the members page.
        </span>
      </div>

      <label class="auth-checkbox" style="margin-top: 4px;">
        <input
          type="checkbox"
          checked={agreeToTerms}
          onChange={(e) => setAgreeToTerms(e.currentTarget.checked)}
        />
        <span class="auth-checkbox-mark" />
        <span class="auth-checkbox-label">
          I agree to the{" "}
          <a href="/terms" class="auth-link" style="font-weight:600;">
            Terms & Conditions
          </a>
        </span>
      </label>

      <Button
        variant="primary"
        type="submit"
        disabled={loading || !agreeToTerms}
        class="auth-submit"
      >
        {loading
          ? (
            <>
              <span class="auth-spinner" />
              Creating account...
            </>
          )
          : (
            "Create account"
          )}
      </Button>

      <div class="auth-divider">
        <span>or continue with</span>
      </div>

      <div class="auth-social-buttons">
        <a
          href={`${API_BASE_URL}/auth/google`}
          class="auth-social-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="#ea4335"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
            />
            <path
              fill="#4285f4"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#fbbc05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#34a853"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Google
        </a>
        <a
          href={`${API_BASE_URL}/auth/github`}
          class="auth-social-btn"
        >
          <svg width="18" height="18" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
            />
          </svg>
          GitHub
        </a>
      </div>
    </form>
  );
}
