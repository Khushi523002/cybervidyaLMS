import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, BookOpen, MessageSquare, Wrench,
  CheckCircle, Lock, ChevronRight, ChevronDown, Star,
} from "lucide-react";

import { Panel } from "../components/Panel";
import { RatingStars } from "../components/RatingStars";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDate } from "../lib/formatters";

/* ── Clickable star rating ── */
function StarInput({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-input">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`star-input__star ${star <= (hovered || value) ? "is-active" : ""}`}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(star)}
          aria-label={`${star} star`}
        >★</button>
      ))}
      <span className="star-input__label">{value} / 5</span>
    </div>
  );
}

/* ── Progress bar ── */
function ModuleProgress({ completed, total }) {
  const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
  return (
    <div className="module-progress">
      <div className="module-progress__bar">
        <div className="module-progress__fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="module-progress__label">{completed}/{total} modules</span>
    </div>
  );
}

/* ── Review card (compact) ── */
function ReviewCard({ review }) {
  return (
    <article className="entity-card">
      <div className="entity-card__top">
        <div>
          <strong>{review.manager_name}</strong>
          <span>{formatDate(review.updated_at)}</span>
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
        {review.technical_comment && (
          <p style={{ marginLeft: "18px", marginTop: "4px", fontSize: "0.84rem" }}>{review.technical_comment}</p>
        )}
        {review.communication_rating > 0 && (
          <div className="review-section-row" style={{ marginTop: "8px" }}>
            <span className="review-section-label"><MessageSquare size={12} />&nbsp;Comm.</span>
            <RatingStars value={review.communication_rating} />
          </div>
        )}
        {review.communication_comment && (
          <p style={{ marginLeft: "18px", marginTop: "4px", fontSize: "0.84rem" }}>{review.communication_comment}</p>
        )}
      </div>
    </article>
  );
}

/* ── Module-wise grouped review list (for intern's own page or manager's view) ── */
function ModuleGroupedReviews({ reviews, allModules }) {
  const [openModules, setOpenModules] = useState({});

  // Group reviews by module_id → topic_id
  const grouped = useMemo(() => {
    const map = {};
    for (const review of reviews) {
      const mId = review.module_id || "__none__";
      const tId = review.topic_id || "__none__";
      if (!map[mId]) map[mId] = { moduleLabel: review.module_label || "General", topics: {} };
      if (!map[mId].topics[tId]) map[mId].topics[tId] = { topicLabel: review.topic_label || "General", reviews: [] };
      map[mId].topics[tId].reviews.push(review);
    }
    return map;
  }, [reviews]);

  // Build ordered list: modules in order, then __none__
  const orderedModuleIds = [
    ...allModules.map((m) => m.id).filter((id) => grouped[id]),
    ...Object.keys(grouped).filter((id) => !allModules.find((m) => m.id === id)),
  ];

  if (orderedModuleIds.length === 0) {
    return <div className="state-block">No reviews yet.</div>;
  }

  return (
    <div className="list-stack">
      {orderedModuleIds.map((mId) => {
        const modGroup = grouped[mId];
        const isOpen = openModules[mId] !== false; // default open
        const topicIds = Object.keys(modGroup.topics);
        const totalReviews = topicIds.reduce((s, t) => s + modGroup.topics[t].reviews.length, 0);

        return (
          <div key={mId} className="entity-card" style={{ padding: 0, overflow: "hidden" }}>
            {/* Module header */}
            <button
              type="button"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: "10px",
                padding: "14px 18px",
                background: "none",
                border: "none",
                cursor: "pointer",
                textAlign: "left",
                color: "var(--text)",
                fontWeight: 600,
              }}
              onClick={() => setOpenModules((prev) => ({ ...prev, [mId]: !isOpen }))}
            >
              <BookOpen size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>
                {mId === "__none__" ? "General Reviews" : (modGroup.moduleLabel || mId)}
              </span>
              <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem" }}>
                <Star size={10} />&nbsp;{totalReviews} review{totalReviews !== 1 ? "s" : ""}
              </span>
              {isOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>

            {isOpen && (
              <div style={{ borderTop: "1px solid var(--border)", padding: "0 18px 16px" }}>
                {topicIds.map((tId) => {
                  const tGroup = modGroup.topics[tId];
                  return (
                    <div key={tId} style={{ marginTop: "14px" }}>
                      {tId !== "__none__" && (
                        <div style={{
                          fontSize: "0.78rem",
                          fontWeight: 600,
                          color: "var(--text-soft)",
                          marginBottom: "8px",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}>
                          <span style={{
                            width: "5px", height: "5px", borderRadius: "50%",
                            background: "var(--accent)", flexShrink: 0,
                          }} />
                          {tGroup.topicLabel || tId}
                        </div>
                      )}
                      <div className="list-stack">
                        {tGroup.reviews.map((r) => <ReviewCard key={r.id} review={r} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Intern matrix row ── */
function InternRow({ intern, onSelect, allModules }) {
  const completedCount = intern.profile_stats?.completed_modules ?? 0;
  const totalModules = allModules.length || (intern.profile_stats?.total_modules ?? 0);
  const currentModule = allModules[completedCount] ?? null;

  return (
    <tr className="intern-matrix__row" onClick={() => onSelect(intern)}>
      <td className="intern-matrix__cell intern-matrix__cell--name">
        <div className="intern-matrix__avatar">{intern.name?.charAt(0)}</div>
        <div>
          <strong>{intern.name}</strong>
          <span>{intern.intern_id}</span>
        </div>
      </td>
      <td className="intern-matrix__cell">{intern.email}</td>
      <td className="intern-matrix__cell">
        {currentModule ? (
          <span className="status-pill status-pill--pending" style={{ fontSize: "0.74rem" }}>
            <BookOpen size={11} />&nbsp;{currentModule.label}
          </span>
        ) : (
          <span className="status-pill status-pill--approved" style={{ fontSize: "0.74rem" }}>
            <CheckCircle size={11} />&nbsp;All Complete
          </span>
        )}
      </td>
      <td className="intern-matrix__cell">
        <ModuleProgress completed={completedCount} total={totalModules} />
      </td>
      <td className="intern-matrix__cell">
        {intern.review_summary?.overall_rating_average > 0 ? (
          <RatingStars value={intern.review_summary.overall_rating_average} />
        ) : (
          <span style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>No reviews yet</span>
        )}
      </td>
      <td className="intern-matrix__cell intern-matrix__cell--action">
        <ChevronRight size={16} style={{ color: "var(--cerulean)" }} />
      </td>
    </tr>
  );
}

/* ── Intern review detail page (manager view) ── */
function InternReviewDetail({ intern, allReviews, allModules, onBack }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("technical");
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedTopicId, setSelectedTopicId] = useState("");
  const [techRating, setTechRating] = useState(4);
  const [techComment, setTechComment] = useState("");
  const [commRating, setCommRating] = useState(4);
  const [commComment, setCommComment] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackIsError, setFeedbackIsError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pastReviewsOpen, setPastReviewsOpen] = useState(true);

  const selectedModule = allModules.find((m) => m.id === selectedModuleId);
  const topics = selectedModule?.topics || [];

  const internReviews = useMemo(
    () => (allReviews || []).filter((r) => r.intern_user_id === intern.id || r.intern_name === intern.name),
    [allReviews, intern]
  );

  const completedCount = intern.profile_stats?.completed_modules ?? 0;
  const totalModules = allModules.length || (intern.profile_stats?.total_modules ?? 1);

  async function handleSave() {
    setSaving(true);
    setFeedback("");
    setFeedbackIsError(false);
    try {
      if (activeTab === "technical") {
        const res = await apiRequest("/api/reviews/technical/", {
          method: "POST", token,
          body: {
            intern_user_id: Number(intern.id),
            technical_rating: techRating,
            technical_comment: techComment,
            module_id: selectedModuleId || undefined,
            topic_id: selectedTopicId || undefined,
          },
        });
        setFeedback(res.message || "Technical review saved!");
        setFeedbackIsError(false);
        setTechComment(""); setTechRating(4);
      } else {
        const res = await apiRequest("/api/reviews/communication/", {
          method: "POST", token,
          body: {
            intern_user_id: Number(intern.id),
            communication_rating: commRating,
            communication_comment: commComment,
            module_id: selectedModuleId || undefined,
            topic_id: selectedTopicId || undefined,
          },
        });
        setFeedback(res.message || "Communication review saved!");
        setFeedbackIsError(false);
        setCommComment(""); setCommRating(4);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.reviews(token) });
      setTimeout(() => setFeedback(""), 3000);
    } catch (err) {
      setFeedback(err.message || "Unable to save review.");
      setFeedbackIsError(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="page-stack">
      <button type="button" className="ghost-button" style={{ width: "fit-content" }} onClick={onBack}>
        <ArrowLeft size={15} />&nbsp;Back to Interns
      </button>

      <section className="profile-hero">
        <div className="profile-hero__identity">
          <div className="profile-hero__avatar">{intern.name?.charAt(0)}</div>
          <div>
            <span className="eyebrow">Intern Review</span>
            <h2>{intern.name}</h2>
            <p>{intern.email}</p>
          </div>
        </div>
        <div className="profile-hero__meta">
          {intern.intern_id && <span>{intern.intern_id}</span>}
          <span className={`status-pill ${intern.is_active ? "status-pill--approved" : "status-pill--rejected"}`}>
            {intern.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </section>

      <div className="two-column">
        <Panel title="Module Progress" subtitle="Current learning status">
          <div className="intern-modules-grid">
            {allModules.map((mod, idx) => {
              const isCompleted = idx < completedCount;
              const isCurrent = idx === completedCount;
              const isLocked = idx > completedCount;
              return (
                <div key={mod.id} className={`module-status-card ${isCompleted ? "is-completed" : ""} ${isCurrent ? "is-current" : ""} ${isLocked ? "is-locked" : ""}`}>
                  <div className="module-status-card__icon">
                    {isCompleted ? <CheckCircle size={15} /> : isLocked ? <Lock size={15} /> : <BookOpen size={15} />}
                  </div>
                  <div>
                    <strong>{mod.label}</strong>
                    <span>{mod.topics?.length || 0} topics</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: "14px" }}>
            <ModuleProgress completed={completedCount} total={totalModules} />
          </div>
        </Panel>

        <Panel title="Review Summary" subtitle="Ratings received">
          <div style={{ display: "grid", gap: "14px" }}>
            {[
              ["Communication", intern.review_summary?.communication_rating_average],
              ["Technical", intern.review_summary?.technical_rating_average],
              ["Overall", intern.review_summary?.overall_rating_average],
            ].map(([label, val]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ color: "var(--text-soft)", fontSize: "0.84rem" }}>{label}</span>
                <RatingStars value={val} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Add review form — manager selects module + topic */}
      <Panel title="Add Review" subtitle="Rate performance by module and topic">
        <div className="two-column" style={{ marginBottom: "18px" }}>
          <label className="field">
            <span>Module</span>
            <select value={selectedModuleId} onChange={(e) => { setSelectedModuleId(e.target.value); setSelectedTopicId(""); }}>
              <option value="">Select module (optional)</option>
              {allModules.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Topic</span>
            <select value={selectedTopicId} onChange={(e) => setSelectedTopicId(e.target.value)} disabled={!selectedModuleId}>
              <option value="">Select topic (optional)</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
          </label>
        </div>

        <div className="review-tabs">
          <button type="button" className={`review-tab ${activeTab === "technical" ? "is-active" : ""}`} onClick={() => setActiveTab("technical")}>
            <Wrench size={14} />&nbsp;Technical Review
          </button>
          <button type="button" className={`review-tab ${activeTab === "communication" ? "is-active" : ""}`} onClick={() => setActiveTab("communication")}>
            <MessageSquare size={14} />&nbsp;Communication Review
          </button>
        </div>

        <div className="review-tab-body">
          {activeTab === "technical" ? (
            <div className="form-stack">
              <div className="field"><span>Technical Rating</span><StarInput value={techRating} onChange={setTechRating} /></div>
              <label className="field">
                <span>Technical Comment</span>
                <textarea rows={4} value={techComment} onChange={(e) => setTechComment(e.target.value)} placeholder="Problem-solving, code quality, understanding..." />
              </label>
            </div>
          ) : (
            <div className="form-stack">
              <div className="field"><span>Communication Rating</span><StarInput value={commRating} onChange={setCommRating} /></div>
              <label className="field">
                <span>Communication Comment</span>
                <textarea rows={4} value={commComment} onChange={(e) => setCommComment(e.target.value)} placeholder="Clarity, teamwork, responsiveness..." />
              </label>
            </div>
          )}

          {feedback && (
            <div className={`form-message ${feedbackIsError ? "is-error" : "is-success"}`}>
              {feedback}
            </div>
          )}

          <button type="button" className="primary-button" onClick={handleSave} disabled={saving} style={{ marginTop: "12px" }}>
            {saving ? "Saving..." : `Save ${activeTab === "technical" ? "Technical" : "Communication"} Review`}
          </button>
        </div>
      </Panel>

      {/* Past reviews — module-grouped */}
      {internReviews.length > 0 && (
        <Panel
          title={
            <button
              type="button"
              onClick={() => setPastReviewsOpen((o) => !o)}
              style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontWeight: 700, fontSize: "inherit", padding: 0, width: "100%" }}
            >
              <Star size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
              <span style={{ flex: 1 }}>Past Reviews</span>
              <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem" }}>
                {internReviews.length} review{internReviews.length !== 1 ? "s" : ""}
              </span>
              {pastReviewsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
            </button>
          }
          subtitle={pastReviewsOpen ? "Grouped by module and topic" : null}
        >
          {pastReviewsOpen && (
            <ModuleGroupedReviews reviews={internReviews} allModules={allModules} />
          )}
        </Panel>
      )}
    </div>
  );
}

/* ── Intern's own reviews page (module-grouped) ── */
function InternReviewsView({ reviews, allModules }) {
  const [myReviewsOpen, setMyReviewsOpen] = useState(true);

  // Compute overall average rating across all reviews
  const overallAvg = useMemo(() => {
    if (!reviews || reviews.length === 0) return 0;
    const vals = reviews.map((r) => r.average_rating).filter((v) => v > 0);
    if (!vals.length) return 0;
    return Number((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1));
  }, [reviews]);

  return (
    <div className="page-stack">
      {/* Single overall rating box */}
      {overallAvg > 0 && (
        <div style={{
          display: "flex", alignItems: "center", gap: "16px",
          padding: "14px 20px", borderRadius: "12px",
          border: "1px solid var(--border)", background: "var(--surface)",
        }}>
          <Star size={18} style={{ color: "var(--accent)", flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>Overall Rating</span>
          <RatingStars value={overallAvg} />
          <span style={{ fontWeight: 700, fontSize: "1rem", minWidth: "28px", textAlign: "right" }}>{overallAvg}</span>
        </div>
      )}

      <Panel
        title={
          <button
            type="button"
            onClick={() => setMyReviewsOpen((o) => !o)}
            style={{ display: "flex", alignItems: "center", gap: "8px", background: "none", border: "none", cursor: "pointer", color: "var(--text)", fontWeight: 700, fontSize: "inherit", padding: 0, width: "100%" }}
          >
            <Star size={16} style={{ color: "var(--accent)", flexShrink: 0 }} />
            <span style={{ flex: 1 }}>My Reviews</span>
            {reviews?.length > 0 && (
              <span className="status-pill status-pill--neutral" style={{ fontSize: "0.72rem" }}>
                {reviews.length} review{reviews.length !== 1 ? "s" : ""}
              </span>
            )}
            {myReviewsOpen ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
          </button>
        }
        subtitle={myReviewsOpen ? "Feedback from your managers — grouped by module and topic" : null}
      >
        {myReviewsOpen && (
          !reviews || reviews.length === 0 ? (
            <div className="state-block">No reviews yet.</div>
          ) : (
            <ModuleGroupedReviews reviews={reviews} allModules={allModules} />
          )
        )}
      </Panel>
    </div>
  );
}

/* ── Main ReviewsPage ── */
export function ReviewsPage() {
  const { token, user } = useAuth();
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [search, setSearch] = useState("");

  const { data: allModules = [] } = useQuery({
    queryKey: queryKeys.modules(token),
    queryFn: () => apiRequest("/api/modules/", { token }).then((r) => r.data),
    enabled: !!token,
  });

  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: queryKeys.reviews(token),
    queryFn: () => apiRequest("/api/reviews/", { token }).then((r) => r.data),
  });

  const { data: internsData, isLoading: internsLoading } = useQuery({
    queryKey: queryKeys.interns(token, ""),
    queryFn: () =>
      user.role === "manager" || user.role === "admin"
        ? apiRequest("/api/dashboard/interns/", { token }).then((r) => r.data)
        : Promise.resolve([]),
    enabled: user.role === "manager" || user.role === "admin",
  });

  const filteredInterns = useMemo(() => {
    if (!internsData) return [];
    if (!search.trim()) return internsData;
    const q = search.toLowerCase();
    return internsData.filter((i) =>
      [i.name, i.email, i.intern_id].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [internsData, search]);

  // Intern own view
  if (user.role === "intern") {
    return reviewsLoading
      ? <div className="state-block">Loading reviews...</div>
      : <InternReviewsView reviews={reviewsData} allModules={allModules} />;
  }

  // Manager: intern detail
  if (selectedIntern) {
    return (
      <InternReviewDetail
        intern={selectedIntern}
        allReviews={reviewsData}
        allModules={allModules}
        onBack={() => setSelectedIntern(null)}
      />
    );
  }

  // Manager: intern list
  return (
    <div className="page-stack">
      <Panel title="Review Dashboard" subtitle="Select an intern to view details and add reviews">
        <label className="field field--inline" style={{ marginBottom: "16px" }}>
          <span>Search</span>
          <input type="text" placeholder="Search by name, email, intern ID..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </label>

        {internsLoading || reviewsLoading ? (
          <div className="state-block">Loading interns...</div>
        ) : (
          <div className="intern-matrix-wrap">
            <table className="intern-matrix">
              <thead>
                <tr>
                  <th>Intern</th>
                  <th>Email</th>
                  <th>Current Module</th>
                  <th>Progress</th>
                  <th>Rating</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredInterns.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>No interns found</td></tr>
                ) : (
                  filteredInterns.map((intern) => (
                    <InternRow key={intern.id} intern={intern} onSelect={setSelectedIntern} allModules={allModules} />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
