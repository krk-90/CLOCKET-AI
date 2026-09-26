import React from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext, apiFetch } from "../main.jsx";
import { Code2, ShieldCheck } from "lucide-react";

export default function LoginPage() {
  const { login } = React.useContext(AuthContext);
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [error, setError] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [mode, setMode] = React.useState("login");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");

    if (mode === "signup" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        const data = await apiFetch("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        login(data.access_token, data.user);
        navigate("/dashboard");
      } else {
        await apiFetch("/auth/signup", {
          method: "POST",
          body: JSON.stringify({ email, password }),
        });
        setSuccessMsg("Account created! Please check your email to confirm, then sign in.");
        setMode("login");
        setPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function switchMode(m) {
    setMode(m);
    setError("");
    setSuccessMsg("");
  }

  return (
    <div className="auth-page">
      {/* Left hero panel */}
      <div className="auth-hero">
        <div className="auth-hero-content">
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 28 }}>
            <Code2 size={28} style={{ color: "#58a6ff" }} />
            <span style={{ fontSize: 20, fontWeight: 800, color: "#f0f6fc", letterSpacing: "-0.02em" }}>CLOCKET AI</span>
          </div>

          <h1>
            Understand any codebase.<br />
            <span>Start contributing</span> faster.
          </h1>
          <p className="auth-hero-tagline">
            CLOCKET AI analyzes repositories and turns complex codebases into clear architecture
            insights, setup guidance, starter tasks, and AI-powered codebase conversations.
          </p>

          <div className="auth-feature-list">
            {[
              { title: "Repository Analysis", desc: "Deep scan of languages, frameworks, and APIs" },
              { title: "Architecture Insights", desc: "Visual component and data flow breakdown" },
              { title: "Setup Guide", desc: "Step-by-step from actual config files" },
              { title: "Starter Tasks", desc: "Beginner tasks grounded in real files" },
              { title: "Codebase Q&A", desc: "RAG-grounded answers with source citations" },
              { title: "Progress Tracking", desc: "Personal onboarding journey per repository" },
            ].map((f) => (
              <div key={f.title} className="auth-feature-item">
                <div className="auth-feature-icon">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7L5.5 10L11.5 4" stroke="#58a6ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="auth-feature-text">
                  <div className="auth-feature-title">{f.title}</div>
                  <div className="auth-feature-desc">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="auth-trust">
            <ShieldCheck size={13} />
            <span>Secured with Supabase auth · All data user-isolated</span>
          </div>
        </div>
      </div>

      {/* Right form panel */}
      <div className="auth-panel">
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 28 }}>
          <Code2 size={22} style={{ color: "var(--accent)" }} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>CLOCKET AI</div>
            <div style={{ fontSize: 11, color: "var(--muted)" }}>AI-Powered Developer Onboarding</div>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === "login" ? "active" : ""}`}
            onClick={() => switchMode("login")}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === "signup" ? "active" : ""}`}
            onClick={() => switchMode("signup")}
          >
            Create Account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="form">
          <div className="field">
            <label className="field-label" htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              autoComplete="email"
            />
          </div>

          <div className="field">
            <label className="field-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              minLength={mode === "signup" ? 8 : 1}
              required
              autoComplete={mode === "login" ? "current-password" : "new-password"}
            />
          </div>

          {mode === "signup" && (
            <div className="field">
              <label className="field-label" htmlFor="confirm-password">Confirm password</label>
              <input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat your password"
                minLength={8}
                required
                autoComplete="new-password"
              />
            </div>
          )}

          {error && (
            <div className="form-message form-error-msg">
              <span>⚠</span> {error}
            </div>
          )}

          {successMsg && (
            <div className="form-message form-success-msg">
              <span>✓</span> {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={busy || !email || !password}
            className="btn btn-primary btn-full btn-lg"
            style={{ marginTop: 4 }}
          >
            {busy ? (
              <><span className="spinner-sm" /> {mode === "login" ? "Signing in…" : "Creating account…"}</>
            ) : (
              mode === "login" ? "Sign In" : "Create Account"
            )}
          </button>
        </form>

        <p style={{ fontSize: 12, color: "var(--muted)", textAlign: "center", marginTop: 20 }}>
          {mode === "login" ? (
            <>Don&apos;t have an account?{" "}
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: "0 4px" }}
                onClick={() => switchMode("signup")}
              >
                Create one free
              </button>
            </>
          ) : (
            <>Already have an account?{" "}
              <button
                className="btn btn-ghost btn-sm"
                style={{ padding: "0 4px" }}
                onClick={() => switchMode("login")}
              >
                Sign in
              </button>
            </>
          )}
        </p>

        <p style={{ fontSize: 11, color: "var(--muted)", textAlign: "center", marginTop: 16 }}>
          <a href="/" style={{ color: "var(--accent)", textDecoration: "none" }}>
            ← Back to CLOCKET AI
          </a>
        </p>
      </div>
    </div>
  );
}
