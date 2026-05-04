import { AlertCircle, LogOut } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { useAuth } from "../context/AuthContext";

export function SettingsPage() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  async function handleSignout() {
    await logout();
    navigate({ to: "/login" });
  }

  return (
    <div className="page-stack">
      <div className="panel">
        <div className="panel__header">
          <div>
            <h3>Settings</h3>
            <p>Manage your account and workspace preferences.</p>
          </div>
        </div>

        <div style={{ display: "grid", gap: "12px", maxWidth: "420px" }}>
          <button
            type="button"
            className="ghost-button"
            style={{ justifyContent: "flex-start", gap: "12px", padding: "16px 18px" }}
            onClick={() => {}}
          >
            <AlertCircle size={18} />
            <div style={{ textAlign: "left" }}>
              <strong style={{ display: "block" }}>Report an Issue</strong>
              <span style={{ fontSize: "0.82rem", color: "var(--text-soft)", fontWeight: 400 }}>
                Let us know about a bug or problem
              </span>
            </div>
          </button>

          <button
            type="button"
            className="ghost-button ghost-button--danger"
            style={{ justifyContent: "flex-start", gap: "12px", padding: "16px 18px" }}
            onClick={handleSignout}
          >
            <LogOut size={18} />
            <div style={{ textAlign: "left" }}>
              <strong style={{ display: "block" }}>Sign Out</strong>
              <span style={{ fontSize: "0.82rem", opacity: 0.7, fontWeight: 400 }}>
                Log out of your Cyber Vidya account
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
