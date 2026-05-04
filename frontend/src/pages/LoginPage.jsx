import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";
import { Logo } from "../components/Logo";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formState, setFormState] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await login(formState.email, formState.password);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">

      {/* ── LEFT: dark immersive brand panel ── */}
      <div className="login-page__visual">
        {/* mesh grid overlay */}
        <div className="mesh" />

        <div className="hero-card">
          {/* Logo top-left */}
          <div className="hero-card__logo">
            <Logo />
          </div>

          {/* Centered headline + description */}
          <div className="hero-card__body">
            <h2 className="hero-card__headline">
              Be a Part of<br />
              Something <strong>Beautiful</strong>
            </h2>
            <p className="hero-card__tag">
              
            </p>
          </div>

          {/* Bottom credit */}
          <div className="hero-card__footer">
            Cyber Vidya · Learning Management System
          </div>
        </div>
      </div>

      {/* ── RIGHT: login form ── */}
      <div className="login-page__form">
        <form className="auth-card" onSubmit={handleSubmit}>

          <div>
            <span className="eyebrow">Welcome back</span>
            <h1>Login</h1>
            <p>Enter your credentials to access your account</p>
          </div>

          <label className="field">
            <span>User Email</span>
            <input
              type="email"
              placeholder="name@cybervidya.com"
              value={formState.email}
              onChange={(e) => setFormState((c) => ({ ...c, email: e.target.value }))}
              required
            />
          </label>

          <label className="field">
            <span>Password</span>
            <input
              type="password"
              placeholder="Enter your password"
              value={formState.password}
              onChange={(e) => setFormState((c) => ({ ...c, password: e.target.value }))}
              required
            />
          </label>

          {error && (
            <div className="form-message is-error">
              <p style={{ margin: 0 }}>{error}</p>
            </div>
          )}

          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? "Signing in..." : "Sign in"}
          </button>

          <div className="auth-card__hint">
            <strong>Test accounts</strong>
            <span>Admin: admin@cybervidya.com</span>
            <span>Manager: manager@cybervidya.com</span>
          </div>

        </form>
      </div>

    </div>
  );
}
