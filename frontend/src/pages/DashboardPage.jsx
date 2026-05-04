import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { Panel } from "../components/Panel";
import { RatingStars } from "../components/RatingStars";
import { StatCard } from "../components/StatCard";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDate, titleCase } from "../lib/formatters";

function LoadingState() {
  return <div className="state-block">Loading dashboard...</div>;
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="state-block state-block--error">
      <p>{error}</p>
      <button type="button" className="ghost-button" onClick={onRetry}>
        Try again
      </button>
    </div>
  );
}

function ReviewSummaryCard({ reviewSummary }) {
  return (
    <div className="review-summary">
      <div>
        <span>Communication</span>
        <RatingStars value={reviewSummary.communication_rating_average} />
      </div>
      <div>
        <span>Technical</span>
        <RatingStars value={reviewSummary.technical_rating_average} />
      </div>
      <div>
        <span>Overall</span>
        <RatingStars value={reviewSummary.overall_rating_average} />
      </div>
    </div>
  );
}

/* Scrollable list wrapper */
function ScrollList({ children, maxHeight = "340px" }) {
  return (
    <div style={{
      maxHeight,
      overflowY: "auto",
      overflowX: "hidden",
      paddingRight: "4px",
      scrollbarWidth: "thin",
      scrollbarColor: "var(--border) transparent",
    }}>
      <div className="list-stack">{children}</div>
    </div>
  );
}

/* Manager mini-card for dashboard grid */
function ManagerMiniCard({ manager }) {
  return (
    <article className="directory-card">
      <div className="directory-card__head">
        <strong>{manager.name}</strong>
        <span className={`status-dot`} data-active={manager.is_active} style={{ width: 8, height: 8, borderRadius: "50%", background: manager.is_active ? "var(--success, #22c55e)" : "var(--text-muted)" }} />
      </div>
      <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: 2 }}>{manager.email}</p>
      <p style={{ fontSize: "0.78rem", marginTop: 4 }}>
        <span style={{ color: "var(--cerulean)" }}>{manager.reviews_given ?? 0}</span> reviews given
      </p>
    </article>
  );
}

/* Fetches and renders managers grid inline on dashboard */
function ManagersGrid({ token }) {
  const { data, isLoading, error } = useQuery({
    queryKey: queryKeys.managers(token),
    queryFn: () => apiRequest("/api/dashboard/managers/", { token }).then((r) => r.data),
  });

  if (isLoading) return <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>Loading managers...</div>;
  if (error) return <div style={{ padding: "12px 0", color: "var(--error)", fontSize: "0.88rem" }}>Could not load managers.</div>;
  if (!data?.length) return <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>No managers found.</div>;

  return (
    <div style={{
      maxHeight: "280px",
      overflowY: "auto",
      overflowX: "hidden",
      paddingRight: "4px",
      scrollbarWidth: "thin",
      scrollbarColor: "var(--border) transparent",
    }}>
      <div className="card-grid">
        {data.map((mgr) => <ManagerMiniCard key={mgr.id} manager={mgr} />)}
      </div>
    </div>
  );
}

export function DashboardPage() {
  const { token, user } = useAuth();

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.dashboard(token),
    queryFn: () =>
      apiRequest("/api/dashboard/overview/", { token }).then((r) => r.data),
  });

  if (isLoading) return <LoadingState />;
  if (error) return <ErrorState error={error.message} onRetry={refetch} />;

  const statsEntries = Object.entries(data.stats || {});

  /* Intern-specific derived stats */
  const pendingApprovalsCount = data.my_approvals?.filter((a) => a.status === "pending").length ?? 0;
  const approvedCount = data.my_approvals?.filter((a) => a.status === "approved").length ?? 0;
  const reviewsReceived = data.my_reviews?.length ?? 0;

  return (
    <div className="page-stack">
      <section className="hero-banner">
        <div>
          <span className="eyebrow">Role-specific command center</span>
          <h2>{titleCase(user.role)} dashboard for Cyber Vidya</h2>
          <p>
            Track the latest approvals, reviews, activity, and profile health from one focused workspace.
          </p>
        </div>
        <div className="hero-banner__meta">
          <strong>{data.user_profile?.name}</strong>
          <span>{titleCase(data.role)}</span>
        </div>
      </section>

      {data.role === "intern" ? (
        <>
          {/* Intern stat cards — replaced "total reviews" & "total interns" with useful info */}
          <section className="stat-grid">
            <StatCard title="Modules" value={data.stats?.modules ?? 0} />
            <StatCard title="Pending Approvals" value={pendingApprovalsCount} tone="pending" />
            <StatCard title="Approved Topics" value={approvedCount} tone="approved" />
            <StatCard title="Reviews Received" value={reviewsReceived} />
          </section>

          <Panel title="My review snapshot" subtitle="Your latest communication and technical standing">
            <ReviewSummaryCard reviewSummary={data.review_summary} />
          </Panel>

          <div className="two-column">
            <Panel title="My reviews" subtitle="What managers have shared about your growth">
              <ScrollList>
                {!data.my_reviews?.length ? (
                  <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>No reviews yet.</div>
                ) : data.my_reviews.map((review) => (
                  <article key={review.id} className="entity-card">
                    <div className="entity-card__top">
                      <div>
                        <strong>{review.manager_name}</strong>
                        <span>{formatDate(review.updated_at)}</span>
                      </div>
                      <RatingStars value={review.average_rating} />
                    </div>
                    <div className="entity-card__details">
                      <p><strong>Communication:</strong> {review.communication_comment || "Pending"}</p>
                      <p><strong>Technical:</strong> {review.technical_comment || "Pending"}</p>
                    </div>
                  </article>
                ))}
              </ScrollList>
            </Panel>

            <Panel title="My approvals" subtitle="Track your permission requests">
              <ScrollList>
                {!data.my_approvals?.length ? (
                  <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>No approvals yet.</div>
                ) : data.my_approvals.map((approval) => (
                  <article key={approval.id} className="entity-card">
                    <div className="entity-card__top">
                      <div>
                        <strong>{titleCase(approval.request_type)} permission</strong>
                        <span>{formatDate(approval.created_at)}</span>
                      </div>
                      <span className={`status-pill status-pill--${approval.status}`}>{titleCase(approval.status)}</span>
                    </div>
                    <p>{approval.reason}</p>
                  </article>
                ))}
              </ScrollList>
            </Panel>
          </div>
        </>
      ) : (
        <>
          {/* Manager / Admin stat grid — meaningful KPI cards */}
          <section className="stat-grid">
            <StatCard title="Total Modules" value={data.stats?.modules ?? 0} tone="neutral" />
            <StatCard title="Total Interns" value={data.stats?.interns ?? 0} tone="neutral" />
            <StatCard title="Pending Approvals" value={data.stats?.pending_approvals ?? 0} tone="pending" />
            <StatCard title="Total Managers" value={data.stats?.managers ?? 0} tone="approved" />
          </section>

          <div className="two-column two-column--wide">
            <Panel
              title="Intern overview"
              subtitle="Profiles, permissions, and review standing"
              action={<Link className="text-link" to="/interns">Open directory</Link>}
            >
              {/* Shows ALL interns, scrollable — removed slice(0,6) cap */}
              <div style={{
                maxHeight: "420px",
                overflowY: "auto",
                overflowX: "hidden",
                paddingRight: "4px",
                scrollbarWidth: "thin",
                scrollbarColor: "var(--border) transparent",
              }}>
                <div className="card-grid">
                  {data.interns?.map((intern) => (
                    <Link key={intern.id} to={`/users/${intern.id}`} className="directory-card">
                      <div className="directory-card__head">
                        <strong>{intern.name}</strong>
                        <span>{intern.intern_id}</span>
                      </div>
                      <p>{intern.education}</p>
                      <ReviewSummaryCard reviewSummary={intern.review_summary} />
                    </Link>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Recent activity" subtitle="A live operational snapshot">
              <ScrollList maxHeight="420px">
                {!data.recent_activity?.length ? (
                  <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>No recent activity.</div>
                ) : data.recent_activity.map((activity, index) => (
                  <article key={`${activity.activity_type}-${index}`} className="timeline__item">
                    <div className="timeline__dot" />
                    <div>
                      <strong>{activity.title}</strong>
                      <p>{activity.message}</p>
                      <span>{formatDate(activity.timestamp)}</span>
                    </div>
                  </article>
                ))}
              </ScrollList>
            </Panel>
          </div>

          {/* Managers panel — admin only */}
          {data.role === "admin" && (
            <Panel
              title="Manager directory"
              subtitle="All manager accounts on the platform"
              action={<Link className="text-link" to="/managers">Open directory</Link>}
            >
              <ManagersGrid token={token} />
            </Panel>
          )}

          <div className="two-column">
            <Panel
              title="Pending approvals"
              subtitle="Requests needing attention"
              action={<Link className="text-link" to="/approvals">Manage approvals</Link>}
            >
              <ScrollList>
                {!data.pending_approvals?.length ? (
                  <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>No pending approvals.</div>
                ) : data.pending_approvals.map((approval) => (
                  <article key={approval.id} className="entity-card">
                    <div className="entity-card__top">
                      <div>
                        <strong>{approval.requester_name}</strong>
                        <span>{titleCase(approval.request_type)} request</span>
                      </div>
                      <span className={`status-pill status-pill--${approval.status}`}>{titleCase(approval.status)}</span>
                    </div>
                    <p>{approval.reason}</p>
                  </article>
                ))}
              </ScrollList>
            </Panel>

            <Panel
              title={data.role === "admin" ? "Recent reviews" : "Recent reviews given"}
              subtitle="Manager feedback and intern ranking signals"
              action={<Link className="text-link" to="/reviews">Open reviews</Link>}
            >
              <ScrollList>
                {!(data.recent_reviews || data.recent_reviews_given)?.length ? (
                  <div style={{ padding: "12px 0", color: "var(--text-muted)", fontSize: "0.88rem" }}>No reviews yet.</div>
                ) : (data.recent_reviews || data.recent_reviews_given || []).map((review) => (
                  <article key={review.id} className="entity-card">
                    <div className="entity-card__top">
                      <div>
                        <strong>{review.intern_name}</strong>
                        <span>{review.manager_name}</span>
                      </div>
                      <RatingStars value={review.average_rating} />
                    </div>
                    <p>{review.communication_comment || review.technical_comment}</p>
                  </article>
                ))}
              </ScrollList>
            </Panel>
          </div>
        </>
      )}
    </div>
  );
}
