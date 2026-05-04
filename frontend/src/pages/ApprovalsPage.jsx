import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
  BookOpen, Layers, CheckCircle, XCircle, Clock,
  ArrowUpDown, User, FileText, Star,
} from "lucide-react";

import { Panel } from "../components/Panel";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDate, titleCase } from "../lib/formatters";

/* ─── Type pill ─── */
function ApprovalTypePill({ type }) {
  const map = {
    topic_submit: { cls: "status-pill--pending", label: "Topic Submission", Icon: BookOpen },
    module_unlock: { cls: "status-pill--approved", label: "Module Unlock", Icon: Layers },
    module_complete: { cls: "status-pill--pending", label: "Module Completion", Icon: Layers },
  };
  const { cls, label, Icon } = map[type] || { cls: "status-pill--neutral", label: titleCase(type), Icon: BookOpen };
  return (
    <span className={`status-pill ${cls}`} style={{ fontSize: "0.74rem" }}>
      <Icon size={11} />&nbsp;{label}
    </span>
  );
}

/* ─── Status pill ─── */
function StatusPill({ status }) {
  const map = {
    approved: { cls: "status-pill--approved", Icon: CheckCircle },
    rejected: { cls: "status-pill--rejected", Icon: XCircle },
    pending: { cls: "status-pill--pending", Icon: Clock },
  };
  const { cls, Icon } = map[status] || { cls: "status-pill--neutral", Icon: Clock };
  return (
    <span className={`status-pill ${cls}`}>
      <Icon size={12} />&nbsp;{titleCase(status)}
    </span>
  );
}

/* ─── Manager action panel ─── */
function ManagerActionPanel({ approval, onApproved, onRejected }) {
  const { token } = useAuth();
  const [notes, setNotes] = useState("");
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(false);

  const endpoint =
    approval.request_type === "topic_submit"
      ? `/api/intern/progress/approve/${approval.id}/`
      : approval.request_type === "module_complete"
        ? `/api/intern/progress/approve/${approval.id}/`
        : approval.request_type === "module_unlock"
          ? `/api/intern/unlocks/approve/${approval.id}/`
          : `/api/approvals/${approval.id}/review/`;

  async function doReview(status) {
    setLoading(true);
    setFeedback("");
    try {
      await apiRequest(endpoint, {
        method: "POST",
        token,
        body: { status, review_notes: notes },
      });
      setFeedback(status === "approved" ? "Approved!" : "Rejected.");
      setTimeout(() => {
        setFeedback("");
        if (status === "approved") onApproved(approval);
        else onRejected();
      }, 900);
    } catch (err) {
      setFeedback(err.message || "Error");
      setLoading(false);
    }
  }

  return (
    <div
      className="action-strip"
      style={{ marginTop: "12px", borderTop: "1px solid var(--border)", paddingTop: "12px" }}
    >
      {feedback && (
        <div className="form-message is-success" style={{ marginBottom: "8px" }}>
          {feedback}
        </div>
      )}
      <textarea
        rows="2"
        placeholder="Add review notes (optional) — shown to intern after decision"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        disabled={loading}
        style={{ width: "100%", marginBottom: "10px" }}
      />
      <div className="action-strip__buttons">
        <button
          type="button"
          className="primary-button primary-button--small"
          onClick={() => doReview("approved")}
          disabled={loading}
        >
          <CheckCircle size={13} />&nbsp;Approve
        </button>
        <button
          type="button"
          className="ghost-button ghost-button--danger"
          onClick={() => doReview("rejected")}
          disabled={loading}
        >
          <XCircle size={13} />&nbsp;Reject
        </button>
        {approval.request_type === "topic_submit" && (
          <span style={{ fontSize: "0.78rem", color: "var(--text-soft)", display: "flex", alignItems: "center", gap: "5px", marginLeft: "auto" }}>
            <Star size={12} />
            Approving will let you add a review
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Single approval card ─── */
function ApprovalCard({ approval, isManager, onApproved, onRejected }) {
  return (
    <article className="entity-card">
      <div className="entity-card__top">
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {isManager && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <User size={13} style={{ color: "var(--text-soft)" }} />
              <strong style={{ fontSize: "0.95rem" }}>{approval.requester_name || "Intern"}</strong>
            </div>
          )}
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            <ApprovalTypePill type={approval.request_type} />
            {approval.completion_type && (
              <span className="status-pill status-pill--neutral" style={{ fontSize: "0.74rem" }}>
                {titleCase(approval.completion_type)}
              </span>
            )}
          </div>
        </div>
        <StatusPill status={approval.status} />
      </div>

      {/* Module / Topic badges */}
      {(approval.module_label || approval.topic_label) && (
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "10px" }}>
          {approval.module_label && (
            <span className="status-pill status-pill--neutral" style={{ fontSize: "0.74rem" }}>
              <BookOpen size={11} />&nbsp;{approval.module_label}
            </span>
          )}
          {approval.topic_label && (
            <span className="status-pill status-pill--neutral" style={{ fontSize: "0.74rem" }}>
              <Layers size={11} />&nbsp;{approval.topic_label}
            </span>
          )}
        </div>
      )}

      <div className="entity-card__details" style={{ marginTop: "8px" }}>
        <p><strong>Submitted:</strong> {formatDate(approval.created_at)}</p>
      </div>

      {/* Manager's review notes — shown to intern */}
      {approval.review_notes && (
        <div
          style={{
            marginTop: "10px",
            padding: "10px 14px",
            borderRadius: "8px",
            background:
              approval.status === "approved"
                ? "rgba(34,167,120,0.08)"
                : "rgba(220,60,60,0.07)",
            borderLeft: `3px solid ${
              approval.status === "approved" ? "var(--green,#22a778)" : "var(--red,#dc3c3c)"
            }`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
            <FileText size={12} style={{ color: "var(--text-soft)" }} />
            <span style={{ fontSize: "0.78rem", color: "var(--text-soft)", fontWeight: 600 }}>
              Manager&apos;s Review Notes
            </span>
          </div>
          <p style={{ fontSize: "0.88rem", margin: 0 }}>{approval.review_notes}</p>
        </div>
      )}

      {/* Manager actions — only for pending */}
      {isManager && approval.status === "pending" && (
        <ManagerActionPanel
          approval={approval}
          onApproved={onApproved}
          onRejected={onRejected}
        />
      )}
    </article>
  );
}

/* ─── Main page ─── */
export function ApprovalsPage() {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [sortOrder, setSortOrder] = useState("pending-first");
  const [filterType, setFilterType] = useState("all");
  const [redirectingTo, setRedirectingTo] = useState(null);

  const isManager = user.role !== "intern";

  const { data, error, isLoading } = useQuery({
    queryKey: queryKeys.approvals(token),
    queryFn: () => apiRequest("/api/approvals/", { token }).then((r) => r.data),
  });

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: queryKeys.approvals(token) });
    queryClient.invalidateQueries({ queryKey: queryKeys.topicProgress(token) });
    queryClient.invalidateQueries({ queryKey: queryKeys.moduleUnlocks(token) });
    queryClient.invalidateQueries({ queryKey: queryKeys.reviews(token) });
  }

  function handleApproved(approval) {
    invalidateAll();
    // For topic_submit approvals, redirect manager to Reviews page to add a review
    if (approval.request_type === "topic_submit" || approval.request_type === "module_complete") {
      setRedirectingTo("reviews");
      setTimeout(() => navigate({ to: "/reviews" }), 400);
    }
  }

  function handleRejected() {
    invalidateAll();
  }

  // Only topic_submit and module_unlock
  const relevantApprovals = useMemo(
    () => (data || []).filter((a) => ["topic_submit", "module_unlock", "module_complete"].includes(a.request_type)),
    [data]
  );

  const filteredByType = useMemo(() => {
    if (filterType === "all") return relevantApprovals;
    return relevantApprovals.filter((a) => a.request_type === filterType);
  }, [relevantApprovals, filterType]);

  const sortedApprovals = useMemo(() => {
    const arr = [...filteredByType];
    if (sortOrder === "newest")
      return arr.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortOrder === "oldest")
      return arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    return arr.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return new Date(b.created_at) - new Date(a.created_at);
    });
  }, [filteredByType, sortOrder]);

  const sortLabels = { newest: "Newest first", oldest: "Oldest first", "pending-first": "Pending first" };
  const sortCycle = { newest: "oldest", oldest: "pending-first", "pending-first": "newest" };

  const pendingCount = relevantApprovals.filter((a) => a.status === "pending").length;
  const approvedCount = relevantApprovals.filter((a) => a.status === "approved").length;
  const rejectedCount = relevantApprovals.filter((a) => a.status === "rejected").length;

  if (redirectingTo) {
    return (
      <div className="state-block">
        <CheckCircle size={36} style={{ color: "var(--green,#22a778)", marginBottom: "12px" }} />
        <p>Approved! Redirecting to Reviews so you can add feedback…</p>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Panel
        title={isManager ? "Approval Requests" : "My Approval Submissions"}
        subtitle={
          isManager
            ? "Review and act on intern topic completions and module unlock requests. After approving a topic, you'll be taken to Reviews to leave feedback."
            : "Track your topic and module submissions sent to the manager for approval."
        }
      >
        {/* Stats row */}
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
          {[
            { label: "Pending", count: pendingCount, cls: "status-pill--pending" },
            { label: "Approved", count: approvedCount, cls: "status-pill--approved" },
            { label: "Rejected", count: rejectedCount, cls: "status-pill--rejected" },
          ].map(({ label, count, cls }) => (
            <span key={label} className={`status-pill ${cls}`} style={{ fontSize: "0.82rem", padding: "5px 14px" }}>
              {label}: {count}
            </span>
          ))}
        </div>

        {/* Filters + sort */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            {[
              { key: "all", label: "All" },
              { key: "module_complete", label: "Module Completions" },
              { key: "module_unlock", label: "Module Unlocks" },
            ].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                className={`ghost-button ${filterType === key ? "is-active" : ""}`}
                style={{ fontSize: "0.8rem", padding: "6px 12px" }}
                onClick={() => setFilterType(key)}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="ghost-button"
            style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.84rem", padding: "7px 14px" }}
            onClick={() => setSortOrder((s) => sortCycle[s])}
          >
            <ArrowUpDown size={13} />
            {sortLabels[sortOrder]}
          </button>
        </div>
      </Panel>

      <Panel>
        {isLoading && <div className="state-block">Loading approvals…</div>}
        {error && <div className="form-message is-error">{error.message}</div>}

        {!isLoading && sortedApprovals.length === 0 && (
          <div className="state-block">
            {isManager
              ? "No approval requests from interns yet."
              : "You haven't submitted any topics or module unlock requests yet. Go to Modules to submit a topic for approval."}
          </div>
        )}

        {sortedApprovals.length > 0 && (
          <div className="list-stack">
            {sortedApprovals.map((approval) => (
              <ApprovalCard
                key={approval.id}
                approval={approval}
                isManager={isManager}
                onApproved={handleApproved}
                onRejected={handleRejected}
              />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
