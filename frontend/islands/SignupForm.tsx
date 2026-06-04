import { useState } from "preact/hooks";
import { post } from "../lib/api.ts";
import { saveSession } from "../lib/auth.ts";
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
      const msg = err instanceof Error ? err.message : "Unable to create account.";
      setError(msg);
      toast(msg, "danger");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: "14px" }}>
      <div>
        <label class="label" htmlFor="name">Name</label>
        <input
          id="name"
          class="input"
          value={name}
          onInput={(e) => setName(e.currentTarget.value)}
          placeholder="Ada Lovelace"
        />
      </div>
      <div>
        <label class="label" htmlFor="email">Email</label>
        <input
          id="email"
          class="input"
          type="email"
          value={email}
          onInput={(e) => setEmail(e.currentTarget.value)}
          placeholder="you@company.com"
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
            onInput={(e) => setPassword(e.currentTarget.value)}
            style={{ paddingRight: "44px" }}
          />
          <button
            type="button"
            class="btn icon-btn"
            style={{ position: "absolute", right: "2px", top: "2px" }}
            onClick={() => setShow(!show)}
          >
            <Icon name={show ? "visibility_off" : "visibility"} size={18} />
          </button>
        </div>
      </div>
      {error && <div class="badge badge-danger" role="alert">{error}</div>}
      <Button variant="primary" type="submit" disabled={loading}>
        {loading ? "Creating..." : "Create account"}
      </Button>
    </form>
  );
}
