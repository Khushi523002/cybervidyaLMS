import {
  Bell, BookOpen,
  ClipboardCheck, LayoutDashboard, LogOut, Menu,
  Settings, ShieldUser, Star, TrendingUp,
  UserCircle2, UserPlus, Users, X, Upload,
} from "lucide-react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { titleCase } from "../lib/formatters";

/* ─── Nav builders per role ─────────────────────────── */
function buildNav(role) {
  if (role === "admin") {
    return [
      { to: "/dashboard",   label: "Dashboard",       icon: LayoutDashboard },
      { to: "/performance", label: "Performance",     icon: TrendingUp },
      { to: "/interns",     label: "Intern Profiles",  icon: Users },
      { to: "/managers",    label: "Manager Profiles", icon: Users },
      { to: "/profile",     label: "My Profile",      icon: UserCircle2 },
      { to: "/settings",    label: "Settings",        icon: Settings },
    ];
  }

  if (role === "manager") {
    return [
      { to: "/dashboard",     label: "Dashboard",      icon: LayoutDashboard },
      { to: "/modules",       label: "Modules",        icon: BookOpen },
      { to: "/upload-module", label: "Upload Module",  icon: Upload },
      { to: "/interns",       label: "Intern Profile", icon: Users },
      { to: "/reviews",       label: "Reviews",        icon: Star },
      { to: "/approvals",     label: "Approvals",      icon: ClipboardCheck },
      { to: "/profile",       label: "My Profile",     icon: UserCircle2 },
      { to: "/notifications", label: "Notifications",  icon: Bell },
      { to: "/onboard",       label: "Onboard Intern", icon: UserPlus },
      { to: "/settings",      label: "Settings",       icon: Settings },
    ];
  }

  // intern
  return [
    { to: "/dashboard",    label: "Dashboard",    icon: LayoutDashboard },
    { to: "/modules",      label: "Modules",      icon: BookOpen },
    { to: "/reviews",      label: "Reviews",      icon: Star },
    { to: "/approvals",    label: "Approvals",    icon: ClipboardCheck },
    { to: "/profile",      label: "My Profile",   icon: UserCircle2 },
    { to: "/notifications",label: "Notifications",icon: Bell },
    { to: "/settings",     label: "Settings",     icon: Settings },
  ];
}

/* ─── No dropdown needed — modules nav is now page-based ─── */

/* ─── AppShell ───────────────────────────────────────── */
export function AppShell({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const nav = buildNav(user?.role);

  async function handleLogout() {
    await logout();
    navigate({ to: "/login" });
  }

  function closeSidebar() { setSidebarOpen(false); }

  const pageTitle =
    nav.find((item) => pathname === item.to || pathname.startsWith(item.to + "/"))?.label ||
    (pathname.startsWith("/modules") ? "Modules" :
     pathname === "/upload-module" ? "Upload Module" : "Workspace");

  return (
    <div className="app-shell">
      <aside className={`sidebar ${sidebarOpen ? "is-open" : ""}`}>
        <div className="sidebar__brand">
          <Logo />
          <button type="button" className="sidebar__close" onClick={closeSidebar}>
            <X size={18} />
          </button>
        </div>

        <div className="sidebar__role">
          <ShieldUser size={18} />
          <span>{titleCase(user?.role)}</span>
        </div>

        <nav className="sidebar__nav">
          {nav.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.to || pathname.startsWith(item.to + "/");
            const isUpload = item.to === "/upload-module";
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`sidebar__link ${isActive ? "is-active" : ""}`}
                onClick={closeSidebar}
                style={isUpload && !isActive ? {
                  color: "var(--accent)",
                  borderLeft: "2px solid var(--accent)",
                  marginLeft: "-2px",
                } : {}}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="app-shell__backdrop" onClick={closeSidebar} />

      <div className="app-shell__content">
        <header className="topbar">
          <div className="topbar__left">
            <button type="button" className="topbar__menu" onClick={() => setSidebarOpen(true)}>
              <Menu size={18} />
            </button>
            <div>
              <span className="eyebrow">Cyber Vidya Workspace</span>
              <h1>{pageTitle}</h1>
            </div>
          </div>

          <div className="topbar__right">
            <ThemeToggle compact />
            <Link to="/profile" className="user-chip">
              <span className="user-chip__avatar">{user?.name?.charAt(0) || "U"}</span>
              <div>
                <strong>{user?.name}</strong>
                <span style={{ fontSize: "0.8rem", color: "var(--text-soft)" }}>
                  {titleCase(user?.role)}
                </span>
              </div>
            </Link>
            <button
              type="button"
              className="ghost-button"
              style={{ padding: "10px 14px" }}
              onClick={handleLogout}
              title="Log out"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <main className="page-frame">
          {children}
        </main>
      </div>
    </div>
  );
}
