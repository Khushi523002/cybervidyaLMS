import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams, useNavigate } from "@tanstack/react-router";
import {
  GraduationCap, Award, Phone, Mail, Calendar, Hash,
  BookOpen, CheckCircle, Lock, MessageSquare, Wrench,
  Edit2, Save, X, Trash2, KeyRound, Eye, EyeOff,
  Star, ChevronDown, ChevronRight, ClipboardList, Users, Layers, ThumbsUp,
} from "lucide-react";

import { Panel } from "../components/Panel";
import { RatingStars } from "../components/RatingStars";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDate, titleCase } from "../lib/formatters";

function parseEducation(str) {
  if (!str) return [];
  return str.split(";").map((s) => s.trim()).filter(Boolean);
}
function parseCerts(str) {
  if (!str) return [];
  return str.split(",").map((s) => s.trim()).filter(Boolean);
}

/* ── Inline editable field ── */
function EditableField({ label, value, field, onSave, textarea = false }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(field, draft);
    setSaving(false);
    setEditing(false);
  }

  if (!editing) {
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
        <span style={{ flex: 1, wordBreak: "break-word" }}>{value || <em style={{ opacity: 0.4 }}>Not set</em>}</span>
        <button
          type="button"
          className="ghost-button"
          style={{ padding: "4px 8px", flexShrink: 0 }}
          onClick={() => { setDraft(value || ""); setEditing(true); }}
        >
          <Edit2 size={13} />
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
      {textarea ? (
        <textarea
          rows="3"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ width: "100%" }}
          autoFocus
        />
      ) : (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          style={{ width: "100%" }}
          autoFocus
          onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
        />
      )}
      <div style={{ display: "flex", gap: "8px" }}>
        <button type="button" className="primary-button primary-button--small" onClick={handleSave} disabled={saving}>
          <Save size={13} />&nbsp;{saving ? "Saving…" : "Save"}
        </button>
        <button type="button" className="ghost-button" onClick={() => setEditing(false)}>
          <X size={13} />
        </button>
      </div>
    </div>
  );
}

/* ── Change password panel ── */
function ChangePasswordPanel({ token }) {
  const [form, setForm] = useState({ current_password: "", new_password: "", confirm: "" });
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [isErr, setIsErr] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setMsg("");
    if (form.new_password !== form.confirm) {
      setIsErr(true);
      setMsg("New passwords do not match.");
      return;
    }
    try {
      const r = await apiRequest("/api/auth/change-password/", {
        method: "POST",
        token,
        body: { current_password: form.current_password, new_password: form.new_password },
      });
      setIsErr(false);
      setMsg(r.message || "Password changed.");
      setForm({ current_password: "", new_password: "", confirm: "" });
    } catch (err) {
      setIsErr(true);
      setMsg(err.message || "Failed.");
    }
  }

  return (
    <Panel title="Change Password">
      <form className="form-stack" onSubmit={handleSubmit} style={{ maxWidth: "380px" }}>
        {msg && <div className={`form-message ${isErr ? "is-error" : "is-success"}`}>{msg}</div>}
        {["current_password", "new_password", "confirm"].map((f) => (
          <label key={f} className="field">
            <span>{f === "current_password" ? "Current password" : f === "new_password" ? "New password" : "Confirm new password"}</span>
            <div style={{ position: "relative" }}>
              <input
                type={show ? "text" : "password"}
                value={form[f]}
                onChange={(e) => setForm((c) => ({ ...c, [f]: e.target.value }))}
                required
                style={{ paddingRight: "40px", width: "100%" }}
              />
              <button
                type="button"
                className="ghost-button"
                style={{ position: "absolute", right: "6px", top: "50%", transform: "translateY(-50%)", padding: "4px" }}
                onClick={() => setShow((s) => !s)}
                tabIndex={-1}
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </label>
        ))}
        <button type="submit" className="primary-button" style={{ width: "fit-content" }}>
          <KeyRound size={14} />&nbsp;Update Password
        </button>
      </form>
    </Panel>
  );
}

/* ── Compact module progress section ── */
function ModuleProgressSection({ data, allModules }) {
  const [expandedMod, setExpandedMod] = useState(null);
  const completedCount = data.profile_stats?.completed_modules ?? 0;
  const totalModules = allModules.length || (data.profile_stats?.total_modules ?? 0);
  const pct = totalModules === 0 ? 0 : Math.round((completedCount / totalModules) * 100);
  const reviews = data.reviews || [];
  const topicProgressList = data.topic_progress || [];
  const pocFiles = data.poc_files || [];

  if (allModules.length === 0 && totalModules === 0) return null;

  return (
    <Panel title="Module Progress" subtitle={`${completedCount} of ${totalModules} modules · ${pct}% complete`}>
      <div className="module-progress" style={{ marginBottom: "18px" }}>
        <div className="module-progress__bar module-progress__bar--large">
          <div className="module-progress__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="module-progress__label">{pct}%</span>
      </div>

      <div style={{ display: "grid", gap: "6px" }}>
        {allModules.map((mod, idx) => {
          const isCompleted = idx < completedCount;
          const isCurrent = idx === completedCount;
          const isLocked = idx > completedCount;
          const modReviews = reviews.filter((r) => r.module_id === mod.id);
          const isExpanded = expandedMod === mod.id;

          // Use topic_progress records (theoryApproved / practicalApproved) for accurate status
          const approvedTopicIds = new Set(
            (mod.topics || [])
              .filter((t) => {
                const prog = topicProgressList.find(
                  (p) => p.module_id === mod.id && p.topic_id === t.id
                );
                if (!prog) return false;
                const concept = (t.concept || "theory").toLowerCase();
                const needsTheory = concept.includes("theory") || concept === "both";
                const needsPractical = concept.includes("practical") || concept === "both";
                if (needsTheory && !prog.theory_approved) return false;
                if (needsPractical && !prog.practical_approved) return false;
                // If concept is neither theory nor practical, treat theory_approved as the marker
                if (!needsTheory && !needsPractical && !prog.theory_approved) return false;
                return true;
              })
              .map((t) => t.id)
          );

          // Topics that are submitted but not yet approved (pending)
          const pendingTopicIds = new Set(
            (mod.topics || [])
              .filter((t) => {
                const prog = topicProgressList.find(
                  (p) => p.module_id === mod.id && p.topic_id === t.id
                );
                if (!prog) return false;
                const submitted = prog.theory_submitted || prog.practical_submitted;
                const approved = approvedTopicIds.has(t.id);
                return submitted && !approved;
              })
              .map((t) => t.id)
          );

          const approvedCount = approvedTopicIds.size;
          const modPocFiles = pocFiles.filter((f) => f.module_id === mod.id);
          const hasDetails = (mod.topics?.length > 0 || modReviews.length > 0 || modPocFiles.length > 0) && !isLocked;

          return (
            <div key={mod.id} style={{
              borderRadius: "10px",
              border: `1px solid ${isCurrent ? "var(--accent)" : "var(--border)"}`,
              background: isLocked ? "transparent" : isCurrent ? "rgba(34,167,200,0.04)" : "var(--surface)",
              opacity: isLocked ? 0.5 : 1,
              overflow: "hidden",
            }}>
              <button
                type="button"
                disabled={!hasDetails}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: "10px",
                  padding: "10px 14px", background: "none", border: "none",
                  cursor: hasDetails ? "pointer" : "default", textAlign: "left", color: "var(--text)",
                }}
                onClick={() => hasDetails && setExpandedMod(isExpanded ? null : mod.id)}
              >
                <span style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
                  {isCompleted
                    ? <CheckCircle size={15} style={{ color: "#21b554" }} />
                    : isLocked
                    ? <Lock size={15} style={{ opacity: 0.4 }} />
                    : <BookOpen size={15} style={{ color: "var(--accent)" }} />}
                </span>
                <span style={{ flex: 1, fontWeight: 600, fontSize: "0.88rem" }}>{mod.label}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-soft)", flexShrink: 0 }}>
                  {approvedCount}/{mod.topics?.length || 0}
                </span>
                {modReviews.length > 0 && (
                  <span className="status-pill status-pill--approved" style={{ fontSize: "0.68rem", padding: "2px 7px", flexShrink: 0 }}>
                    {modReviews.length} review{modReviews.length !== 1 ? "s" : ""}
                  </span>
                )}
                {modPocFiles.length > 0 && (
                  <span className="status-pill status-pill--neutral" style={{ fontSize: "0.68rem", padding: "2px 7px", flexShrink: 0 }}>
                    {modPocFiles.length} POC{modPocFiles.length !== 1 ? "s" : ""}
                  </span>
                )}
                {hasDetails && (
                  <span style={{ color: "var(--text-soft)", flexShrink: 0 }}>
                    {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  </span>
                )}
              </button>

              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--border)", padding: "10px 14px 12px" }}>
                  {mod.topics?.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: (modReviews.length > 0 || modPocFiles.length > 0) ? "10px" : 0 }}>
                      {mod.topics.map((topic) => {
                        const approved = approvedTopicIds.has(topic.id);
                        const pending = pendingTopicIds.has(topic.id);
                        return (
                          <span key={topic.id} style={{
                            display: "inline-flex", alignItems: "center", gap: "4px",
                            padding: "3px 10px", borderRadius: "20px", fontSize: "0.75rem", fontWeight: 500,
                            background: approved
                              ? "rgba(33,181,84,0.1)"
                              : pending
                              ? "rgba(255,170,0,0.1)"
                              : "var(--surface-alt, rgba(0,0,0,0.04))",
                            border: `1px solid ${approved ? "rgba(33,181,84,0.3)" : pending ? "rgba(255,170,0,0.4)" : "var(--border)"}`,
                            color: approved ? "#21b554" : pending ? "#e6a800" : "var(--text-soft)",
                          }}>
                            {approved && <CheckCircle size={11} />}
                            {topic.label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {/* POC Files uploaded for this module */}
                  {modPocFiles.length > 0 && (
                    <div style={{ marginBottom: modReviews.length > 0 ? "10px" : 0 }}>
                      <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "var(--text-soft)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                        POC Files
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {modPocFiles.map((f) => (
                          <a
                            key={f.id}
                            href={`/uploads/poc/${f.stored_name}`}
                            download={f.original_name}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: "flex", alignItems: "center", gap: "8px",
                              padding: "5px 10px", borderRadius: "7px",
                              background: "rgba(34,167,200,0.06)", border: "1px solid rgba(34,167,200,0.2)",
                              fontSize: "0.78rem", textDecoration: "none", color: "inherit",
                              cursor: "pointer",
                            }}
                          >
                            <Layers size={12} style={{ color: "var(--accent)", flexShrink: 0 }} />
                            <span style={{ flex: 1, fontWeight: 500, color: "var(--accent)" }}>{f.original_name}</span>
                            <span style={{ color: "var(--text-soft)", fontSize: "0.72rem" }}>
                              {(f.size_bytes / 1024).toFixed(0)} KB
                            </span>
                            <span style={{ color: "var(--text-soft)", fontSize: "0.72rem" }}>
                              {formatDate(f.uploaded_at)}
                            </span>
                            <span style={{ color: "var(--accent)", fontSize: "0.72rem", fontWeight: 600 }}>↓</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                  {modReviews.map((r) => (
                    <div key={r.id} style={{
                      display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap",
                      padding: "6px 0", borderTop: "1px solid var(--border)", fontSize: "0.8rem",
                    }}>
                      <span style={{ fontWeight: 600, color: "var(--text-soft)", minWidth: "80px" }}>{r.manager_name}</span>
                      {r.technical_rating > 0 && <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><Wrench size={10} /><RatingStars value={r.technical_rating} /></span>}
                      {r.communication_rating > 0 && <span style={{ display: "flex", alignItems: "center", gap: "3px" }}><MessageSquare size={10} /><RatingStars value={r.communication_rating} /></span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Panel>
  );
}

export function ProfilePage() {
  const { token, user: authUser } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [msg, setMsg] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [reviewHistoryOpen, setReviewHistoryOpen] = useState(false);
  const [approvalHistoryOpen, setApprovalHistoryOpen] = useState(false);

  let userId;
  try {
    const params = useParams({ strict: false });
    userId = params.userId;
  } catch {
    userId = undefined;
  }

  const isOwnProfile = !userId;
  const isStaff = authUser?.role !== "intern";
  const canEdit = isOwnProfile || isStaff;

  const endpoint = userId ? `/api/auth/users/${userId}/profile/` : "/api/auth/profile/";

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.profile(token, userId),
    queryFn: () => apiRequest(endpoint, { token }).then((r) => r.data),
    enabled: !!token,
  });

  // Fetch DB modules for module progress section
  const { data: dbModules = [] } = useQuery({
    queryKey: queryKeys.modules(token),
    queryFn: () => apiRequest("/api/modules/", { token }).then((r) => r.data),
    enabled: !!token,
  });

  async function handleFieldSave(field, value) {
    const bodyKey = field === "contactNo" ? "contact_no" : field;
    const url = userId ? `/api/auth/users/${userId}/profile/` : "/api/auth/profile/";
    try {
      await apiRequest(url, {
        method: "PUT",
        token,
        body: { [bodyKey]: value },
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.profile(token, userId) });
      setMsg("Saved!");
      setTimeout(() => setMsg(""), 2000);
    } catch (err) {
      setMsg(err.message || "Save failed.");
    }
  }

  async function handleDelete() {
    try {
      await apiRequest(`/api/auth/users/${userId}/`, { method: "DELETE", token });
      navigate({ to: "/interns" });
    } catch (err) {
      setMsg(err.message || "Delete failed.");
    }
  }

  if (isLoading) return <div className="state-block">Loading profile…</div>;
  if (error) return (
    <div className="state-block state-block--error">
      <p>{error.message}</p>
      <button type="button" className="ghost-button" onClick={refetch}>Try again</button>
    </div>
  );

  const eduList = parseEducation(data.education);
  const certList = parseCerts(data.certification);
  const isIntern = data.role === "intern";

  return (
    <div className="page-stack">
      {msg && <div className="form-message is-success">{msg}</div>}

      {/* Hero */}
      <section className="profile-hero">
        <div className="profile-hero__identity">
          <div className="profile-hero__avatar">{data.name?.charAt(0)}</div>
          <div>
            <span className="eyebrow">{titleCase(data.role)} Profile</span>
            <h2>{data.name}</h2>
            <p>{data.email}</p>
          </div>
        </div>
        <div className="profile-hero__meta">
          {data.intern_id && <span>{data.intern_id}</span>}
          <span className={`status-pill ${data.is_active ? "status-pill--approved" : "status-pill--rejected"}`}>
            {data.is_active ? "Active" : "Inactive"}
          </span>
          {data.password_ready === false && (
            <span className="status-pill status-pill--pending">No password yet</span>
          )}
          {/* Manager can toggle active status */}
          {isStaff && userId && (
            <button
              type="button"
              className={`ghost-button ${data.is_active ? "ghost-button--danger" : ""}`}
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => handleFieldSave("isActive", !data.is_active)}
            >
              {data.is_active ? "Deactivate" : "Activate"}
            </button>
          )}
          {/* Delete button for staff viewing another user */}
          {isStaff && userId && (
            <button
              type="button"
              className="ghost-button ghost-button--danger"
              style={{ padding: "6px 14px", fontSize: "0.82rem" }}
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={13} />&nbsp;Delete
            </button>
          )}
        </div>
      </section>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="panel" style={{ background: "rgba(220,60,60,0.06)", border: "1px solid rgba(220,60,60,0.3)" }}>
          <p style={{ marginBottom: "12px" }}>
            <strong>Are you sure you want to delete {data.name}?</strong> This cannot be undone.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button type="button" className="ghost-button ghost-button--danger" onClick={handleDelete}>
              <Trash2 size={14} />&nbsp;Yes, delete
            </button>
            <button type="button" className="ghost-button" onClick={() => setConfirmDelete(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Account info (editable) + Stats */}
      <div className="two-column">
        <Panel title="Account Details" subtitle={canEdit ? "Click the edit icon to update" : "Core identity and contact"}>
          <div className="detail-grid">
            <div>
              <span><Mail size={13} style={{ marginRight: 4 }} />Email</span>
              <strong style={{ wordBreak: "break-all", overflowWrap: "anywhere" }}>{data.email}</strong>
            </div>
            <div>
              <span><Phone size={13} style={{ marginRight: 4 }} />Contact</span>
              {canEdit
                ? <EditableField label="Contact" value={data.contact_no} field="contactNo" onSave={handleFieldSave} />
                : <strong>{data.contact_no || "N/A"}</strong>}
            </div>
            <div>
              <span><Hash size={13} style={{ marginRight: 4 }} />Name</span>
              {canEdit
                ? <EditableField label="Name" value={data.name} field="name" onSave={handleFieldSave} />
                : <strong>{data.name}</strong>}
            </div>
            {data.intern_id && (
              <div>
                <span><Hash size={13} style={{ marginRight: 4 }} />Intern ID</span>
                <strong>{data.intern_id}</strong>
              </div>
            )}
            <div>
              <span><Calendar size={13} style={{ marginRight: 4 }} />Joined</span>
              <strong>{formatDate(data.date_joined)}</strong>
            </div>
          </div>
        </Panel>

        <Panel title="Profile Stats" subtitle="Activity snapshot">
          {data.profile_stats && !isIntern ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <StatCard title="Total Approved" value={data.profile_stats.total_approved ?? 0} tone="approved" />
              <StatCard title="Pending Approvals" value={data.profile_stats.pending_approvals ?? 0} tone="pending" />
              <StatCard title="Total Interns" value={data.profile_stats.total_interns ?? 0} />
              <StatCard title="Total Modules" value={data.profile_stats.total_modules ?? 0} />
            </div>
          ) : (
            <div className="detail-grid">
              {Object.entries(data.profile_stats || {}).map(([key, value]) => (
                <div key={key}>
                  <span>{titleCase(key.replace(/_/g, " "))}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      {/* Education — editable */}
      <Panel title="Education" subtitle="Semicolon-separated entries — click edit to update">
        {canEdit ? (
          <EditableField
            label="Education"
            value={data.education}
            field="education"
            onSave={handleFieldSave}
            textarea
          />
        ) : eduList.length > 0 ? (
          <div className="list-stack">
            {eduList.map((edu, i) => (
              <div key={i} className="entity-card" style={{ padding: "14px 18px" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "var(--accent-gradient)", display: "grid", placeItems: "center", color: "var(--midnight)", flexShrink: 0 }}>
                    <GraduationCap size={18} />
                  </div>
                  <span style={{ lineHeight: 1.55 }}>{edu}</span>
                </div>
              </div>
            ))}
          </div>
        ) : <p style={{ color: "var(--text-soft)", fontSize: "0.88rem" }}>No education listed.</p>}

        {/* Also show parsed list if there's content */}
        {canEdit && eduList.length > 0 && (
          <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "6px" }}>
            {eduList.map((edu, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "8px", background: "var(--surface-alt, rgba(0,0,0,0.03))" }}>
                <GraduationCap size={14} style={{ flexShrink: 0, opacity: 0.6 }} />
                <span style={{ fontSize: "0.88rem" }}>{edu}</span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {/* Certifications — editable */}
      <Panel title="Certifications" subtitle="Comma-separated — click edit to update">
        {canEdit ? (
          <EditableField
            label="Certifications"
            value={data.certification}
            field="certification"
            onSave={handleFieldSave}
          />
        ) : null}
        {certList.length > 0 && (
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: canEdit ? "12px" : "0" }}>
            {certList.map((cert, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 16px", borderRadius: "12px", border: "1px solid var(--border)", background: "rgba(34,167,200,0.06)" }}>
                <Award size={15} style={{ color: "var(--cerulean,#22a7c8)", flexShrink: 0 }} />
                <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>{cert}</span>
              </div>
            ))}
          </div>
        )}
        {!canEdit && certList.length === 0 && (
          <p style={{ color: "var(--text-soft)", fontSize: "0.88rem" }}>No certifications listed.</p>
        )}
      </Panel>

      {/* Module Progress — interns only */}
      {isIntern && <ModuleProgressSection data={data} allModules={dbModules} />}

      {/* Ratings overview */}
      {data.review_summary && data.review_summary.overall_rating_average > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          padding: "14px 20px", borderRadius: "12px",
          border: "1px solid var(--border)", background: "var(--surface)",
        }}>
          <Star size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Overall Rating</span>
          </div>
          <RatingStars value={data.review_summary.overall_rating_average} />
          <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--text)", minWidth: "28px", textAlign: "right" }}>
            {data.review_summary.overall_rating_average.toFixed(1)}
          </span>
        </div>
      )}

      {/* Review history */}
      {data.reviews?.length ? (
        <Panel
          title={
            <button
              type="button"
              onClick={() => setReviewHistoryOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontWeight: 700, fontSize: "inherit", padding: 0, width: "100%" }}
            >
              <ClipboardList size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Review History</span>
              <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem" }}>
                {data.reviews.length} review{data.reviews.length !== 1 ? "s" : ""}
              </span>
              {reviewHistoryOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          }
          subtitle={reviewHistoryOpen ? "All reviews attached to this profile" : null}
        >
          {reviewHistoryOpen && (
            <div className="list-stack">
              {[...data.reviews].sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at)).map((review) => (
              <article key={review.id} className="entity-card">
                <div className="entity-card__top">
                  <div>
                    <strong>{review.manager_name}</strong>
                    {(review.module_label || review.topic_label) && (
                      <div style={{ display: "flex", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                        {review.module_label && (
                          <span className="status-pill status-pill--neutral" style={{ fontSize: "0.7rem" }}>
                            <BookOpen size={10} />&nbsp;{review.module_label}
                          </span>
                        )}
                        {review.topic_label && (
                          <span className="status-pill status-pill--neutral" style={{ fontSize: "0.7rem" }}>{review.topic_label}</span>
                        )}
                      </div>
                    )}
                    <span style={{ fontSize: "0.8rem", color: "var(--text-soft)" }}>{formatDate(review.updated_at)}</span>
                  </div>
                  <RatingStars value={review.average_rating} />
                </div>
                <div className="entity-card__details">
                  {review.technical_rating > 0 && (
                    <div className="review-section-row">
                      <span className="review-section-label"><Wrench size={12} />&nbsp;Technical</span>
                      <RatingStars value={review.technical_rating} />
                    </div>
                  )}
                  {review.technical_comment && <p style={{ marginLeft: "18px", marginTop: "4px", fontSize: "0.84rem", color: "var(--text-soft)" }}>{review.technical_comment}</p>}
                  {review.communication_rating > 0 && (
                    <div className="review-section-row" style={{ marginTop: "8px" }}>
                      <span className="review-section-label"><MessageSquare size={12} />&nbsp;Communication</span>
                      <RatingStars value={review.communication_rating} />
                    </div>
                  )}
                  {review.communication_comment && <p style={{ marginLeft: "18px", marginTop: "4px", fontSize: "0.84rem", color: "var(--text-soft)" }}>{review.communication_comment}</p>}
                </div>
              </article>
            ))}
            </div>
          )}
        </Panel>
      ) : null}

      {/* Approval History — topic submissions and module unlocks only */}
      {data.approvals?.filter((a) => ["topic_submit", "module_unlock"].includes(a.request_type)).length ? (() => {
        const filteredApprovals = data.approvals
          .filter((a) => ["topic_submit", "module_unlock"].includes(a.request_type))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return (
          <Panel
            title={
              <button
                type="button"
                onClick={() => setApprovalHistoryOpen((o) => !o)}
                style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontWeight: 700, fontSize: "inherit", padding: 0, width: "100%" }}
              >
                <ThumbsUp size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
                <span style={{ flex: 1 }}>Approval History</span>
                <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem" }}>
                  {filteredApprovals.length} request{filteredApprovals.length !== 1 ? "s" : ""}
                </span>
                {approvalHistoryOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            }
            subtitle={approvalHistoryOpen ? "Topic submissions and module unlock requests" : null}
          >
            {approvalHistoryOpen && (
              <div className="list-stack">
                {filteredApprovals.map((approval) => (
                  <article key={approval.id} className="entity-card">
                    <div className="entity-card__top">
                      <div>
                        <strong>{approval.request_type === "topic_submit" ? "Topic Submission" : "Module Unlock"}</strong>
                        {approval.completion_type && (
                          <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem", marginLeft: "8px" }}>
                            {titleCase(approval.completion_type)}
                          </span>
                        )}
                      </div>
                      <span className={`status-pill status-pill--${approval.status}`}>{titleCase(approval.status)}</span>
                    </div>
                    {(approval.module_label || approval.topic_label) && (
                      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "6px" }}>
                        {approval.module_label && (
                          <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem" }}>
                            <BookOpen size={11} />&nbsp;{approval.module_label}
                          </span>
                        )}
                        {approval.topic_label && (
                          <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem" }}>{approval.topic_label}</span>
                        )}
                      </div>
                    )}
                    <p style={{ fontSize: "0.8rem", color: "var(--text-soft)", marginTop: "6px" }}>{formatDate(approval.created_at)}</p>
                    {approval.review_notes && (
                      <div style={{
                        marginTop: "8px", padding: "8px 12px", borderRadius: "7px",
                        background: approval.status === "approved" ? "rgba(34,167,120,0.08)" : "rgba(220,60,60,0.07)",
                        borderLeft: `2px solid ${approval.status === "approved" ? "var(--green,#22a778)" : "var(--red,#dc3c3c)"}`,
                        fontSize: "0.84rem",
                      }}>
                        <strong style={{ fontSize: "0.78rem", color: "var(--text-soft)" }}>Manager Notes: </strong>
                        {approval.review_notes}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </Panel>
        );
      })() : null}

      {/* Change password — own profile only */}
      {isOwnProfile && <ChangePasswordPanel token={token} />}
    </div>
  );
}
