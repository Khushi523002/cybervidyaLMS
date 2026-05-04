import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Star } from "lucide-react";

import { Panel } from "../components/Panel";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDate } from "../lib/formatters";

/* ── Single manager row card ── */
function ManagerCard({ manager }) {
  return (
    <article className="intern-list-card">
      <div className="intern-list-card__avatar">{manager.name?.charAt(0)}</div>
      <div className="intern-list-card__info">
        <div className="intern-list-card__name">
          <strong>{manager.name}</strong>
        </div>
        <span className="intern-list-card__email">{manager.email}</span>
        {manager.contact_no && (
          <span className="intern-list-card__edu">{manager.contact_no}</span>
        )}
        <div className="intern-list-card__ratings" style={{ marginTop: 6, gap: 6, display: "flex", alignItems: "center", flexWrap: "wrap" }}>
          <span
            style={{
              fontSize: "0.75rem",
              padding: "2px 8px",
              borderRadius: 12,
              background: "var(--surface-raised, rgba(0,0,0,0.06))",
              color: "var(--text-muted)",
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Star size={11} style={{ color: "var(--cerulean)" }} />
            {manager.reviews_given ?? 0} reviews given
          </span>
          {manager.date_joined && (
            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
              Joined {formatDate(manager.date_joined)}
            </span>
          )}
        </div>
      </div>
      <div className="intern-list-card__right">
        <span
          style={{
            width: 9,
            height: 9,
            borderRadius: "50%",
            display: "inline-block",
            background: manager.is_active ? "var(--success, #22c55e)" : "var(--text-muted)",
          }}
        />
        <ChevronRight size={16} style={{ color: "var(--cerulean)", opacity: 0.4 }} />
      </div>
    </article>
  );
}

export function ManagersPage() {
  const { token } = useAuth();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.managers(token),
    queryFn: () =>
      apiRequest("/api/dashboard/managers/", { token }).then((r) => r.data),
  });

  const filteredManagers = useMemo(() => {
    if (!data) return [];
    const q = deferredSearch.trim().toLowerCase();
    if (!q) return data;
    return data.filter((mgr) =>
      [mgr.name, mgr.email, mgr.contact_no]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [data, deferredSearch]);

  if (isLoading)
    return <div className="state-block">Loading manager directory...</div>;

  if (error) {
    return (
      <div className="state-block state-block--error">
        <p>{error.message}</p>
        <button type="button" className="ghost-button" onClick={refetch}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="page-stack">
      <Panel
        title="Manager Directory"
        subtitle={`${data?.length ?? 0} manager${data?.length !== 1 ? "s" : ""} on the platform`}
      >
        <div className="toolbar">
          <label className="field field--inline">
            <span>Search</span>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
        </div>

        {filteredManagers.length === 0 ? (
          <div className="state-block" style={{ marginTop: "16px" }}>
            No managers found
          </div>
        ) : (
          <div className="intern-list" style={{ marginTop: "12px" }}>
            {filteredManagers.map((mgr) => (
              <ManagerCard key={mgr.id} manager={mgr} />
            ))}
          </div>
        )}
      </Panel>
    </div>
  );
}
