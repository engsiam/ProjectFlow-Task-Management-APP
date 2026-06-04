import { useEffect, useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import { getAccessToken, saveSession } from "../lib/auth.ts";
import { DEMO_USERS } from "../lib/constants.ts";
import { toast } from "../lib/toast.ts";
import { Button, Icon } from "../components/ui.tsx";
import type { User } from "../lib/types.ts";

type LoginResponse = {
  accessToken: string;
  refreshToken?: string;
  user: User;
};

export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (getAccessToken()) location.href = "/dashboard";
  }, []);

  async function submit(e: Event, demo?: { email: string; password: string }) {
    e.preventDefault();
    const nextEmail = demo?.email ?? email;
    const nextPassword = demo?.password ?? password;
    if (demo) {
      setEmail(nextEmail);
      setPassword(nextPassword);
    }
    if (!nextEmail || !nextPassword) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await post<LoginResponse>("/auth/login", {
        email: nextEmail,
        password: nextPassword,
      });
      saveSession(data);
      toast("Signed in.", "success");
      location.href = "/dashboard";
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unable to sign in.";
      setError(msg);
      toast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => submit(e)} style={{ display: "grid", gap: "14px" }}>
      <div>
        <label class="label" htmlFor="email">Email</label>
        <input
          id="email"
          class="input"
          type="email"
          value={email}
          onInput={(e) =>
            setEmail(e.currentTarget.value)}
          placeholder="owner@example.com"
        />
      </div>
      <div>
        <label class="label" htmlFor="password">Password</label>
        <div style={{ position: "relative" }}>
          <input
            id="password"
            class="input"
            type={show ? "text" : "password"}
            value={password}
            onInput={(e) =>
              setPassword(e.currentTarget.value)}
            placeholder="Password123!"
            style={{ paddingRight: "44px" }}
          />
          <button
            type="button"
            class="btn icon-btn"
            style={{ position: "absolute", right: "2px", top: "2px" }}
            onClick={() => setShow(!show)}
            aria-label="Toggle password visibility"
          >
            <Icon name={show ? "visibility_off" : "visibility"} size={18} />
          </button>
        </div>
      </div>
      {error && <div class="badge badge-danger" role="alert">{error}</div>}
      <Button variant="primary" type="submit" disabled={loading}>
        {loading ? "Signing in..." : "Sign in"}
      </Button>
      <div class="panel" style={{ padding: "12px" }}>
        <p
          class="mono"
          style={{
            margin: "0 0 10px",
            color: "var(--muted)",
            fontSize: "11px",
          }}
        >
          DEMO ACCESS
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "8px",
          }}
        >
          {DEMO_USERS.map((user) => (
            <button
              class="btn btn-secondary"
              type="button"
              disabled={loading}
              onClick={(e) => submit(e, user)}
            >
              {user.role}
            </button>
          ))}
        </div>
      </div>
    </form>
  );
}
