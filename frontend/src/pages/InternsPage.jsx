import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ChevronRight, User } from "lucide-react";

import { Panel } from "../components/Panel";
import { RatingStars } from "../components/RatingStars";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";

/* ── Single intern row card ── */
function InternCard({ intern }) {
  return (
    <Link to={`/users/${intern.id}`} style={{ textDecoration: "none" }}>
      <article className="intern-list-card">
        <div className="intern-list-card__avatar">{intern.name?.charAt(0)}</div>
        <div className="intern-list-card__info">
          <div className="intern-list-card__name">
            <strong>{intern.name}</strong>
            {intern.intern_id && <span className="intern-list-card__id">{intern.intern_id}</span>}
          </div>
          <span className="intern-list-card__email">{intern.email}</span>
          {intern.education && (
            <span className="intern-list-card__edu">{intern.education}</span>
          )}
          <div className="intern-list-card__ratings">
            <span className="intern-list-card__rating-label">Technical</span>
            <RatingStars value={intern.review_summary?.technical_rating_average} />
            <span className="intern-list-card__rating-label" style={{ marginLeft: "10px" }}>Comm.</span>
            <RatingStars value={intern.review_summary?.communication_rating_average} />
          </div>
        </div>
        <div className="intern-list-card__right">
          <span className={`status-dot`} data-active={intern.is_active} />
          <ChevronRight size={16} style={{ color: "var(--cerulean)", opacity: 0.6 }} />
        </div>
      </article>
    </Link>
  );
}

export function InternsPage() {
  const { token, user } = useAuth();
  const [search, setSearch] = useState("");
  const [minRating, setMinRating] = useState("");
  const [maxRating, setMaxRating] = useState("");
  const deferredSearch = useDeferredValue(search);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (user.role === "admin" && minRating) params.set("min_review_rating", minRating);
    if (user.role === "admin" && maxRating) params.set("max_review_rating", maxRating);
    const suffix = params.toString();
    return suffix ? `?${suffix}` : "";
  }, [maxRating, minRating, user.role]);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.interns(token, query),
    queryFn: () => apiRequest(`/api/dashboard/interns/${query}`, { token }).then((r) => r.data),
  });

  const filteredInterns = useMemo(() => {
    if (!data) return [];
    const normalizedSearch = deferredSearch.trim().toLowerCase();
    if (!normalizedSearch) return data;
    return data.filter((intern) =>
      [intern.name, intern.email, intern.intern_id, intern.education]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [data, deferredSearch]);

  if (isLoading) return <div className="state-block">Loading intern directory...</div>;

  if (error) {
    return (
      <div className="state-block state-block--error">
        <p>{error.message}</p>
        <button type="button" className="ghost-button" onClick={refetch}>Try again</button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Panel title="Intern Directory" subtitle="Click on any intern to open their full profile">
        <div className="toolbar">
          <label className="field field--inline">
            <span>Search</span>
            <input
              type="text"
              placeholder="Search by name, email, intern ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          {user.role === "admin" && (
            <div className="toolbar__cluster">
              <label className="field field--inline">
                <span>Min rating</span>
                <input type="number" min="1" max="5" value={minRating} onChange={(e) => setMinRating(e.target.value)} />
              </label>
              <label className="field field--inline">
                <span>Max rating</span>
                <input type="number" min="1" max="5" value={maxRating} onChange={(e) => setMaxRating(e.target.value)} />
              </label>
            </div>
          )}
        </div>

        {filteredInterns.length === 0 ? (
          <div className="state-block" style={{ marginTop: "16px" }}>No interns found</div>
        ) : (
          <div className="intern-list" style={{ marginTop: "12px" }}>
            {filteredInterns.map((intern) => (
              <InternCard key={intern.id} intern={intern} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
