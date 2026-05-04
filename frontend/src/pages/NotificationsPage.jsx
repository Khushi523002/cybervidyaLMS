import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Panel } from "../components/Panel";
import { useAuth } from "../context/AuthContext";
import { apiRequest } from "../lib/api";
import { queryKeys } from "../lib/queryKeys";
import { formatDate, titleCase } from "../lib/formatters";

export function NotificationsPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, error, isLoading, refetch } = useQuery({
    queryKey: queryKeys.notifications(token, unreadOnly),
    queryFn: () =>
      apiRequest(`/api/notifications/${unreadOnly ? "?unread_only=true" : ""}`, { token }).then(
        (r) => r.data
      ),
  });

  async function markRead(notificationId) {
    setMessage("");
    try {
      const response = await apiRequest(`/api/notifications/${notificationId}/read/`, {
        method: "POST",
        token,
      });
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      setMessage(err.message || "Unable to mark notification as read.");
    }
  }

  async function markAllRead() {
    setMessage("");
    try {
      const response = await apiRequest("/api/notifications/read-all/", {
        method: "POST",
        token,
      });
      setMessage(response.message);
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    } catch (err) {
      setMessage(err.message || "Unable to update notifications.");
    }
  }

  return (
    <div className="page-stack">
      {message ? <div className="form-message is-success">{message}</div> : null}

      <Panel
        title="Notification center"
        subtitle="Track approvals, reviews, onboarding, and password activity"
        action={
          <div className="toolbar__cluster">
            <button type="button" className="ghost-button" onClick={() => setUnreadOnly((c) => !c)}>
              {unreadOnly ? "Show all" : "Unread only"}
            </button>
            <button type="button" className="primary-button primary-button--small" onClick={markAllRead}>
              Mark all read
            </button>
          </div>
        }
      >
        {isLoading ? <div className="state-block">Loading notifications...</div> : null}
        {error ? <div className="form-message is-error">{error.message}</div> : null}
        <div className="list-stack">
          {data?.map((notification) => (
            <article key={notification.id} className={`entity-card ${notification.is_read ? "is-read" : "is-unread"}`}>
              <div className="entity-card__top">
                <div>
                  <strong>{notification.title}</strong>
                  <span>{titleCase(notification.notification_type)}</span>
                </div>
                <span className={`status-pill ${notification.is_read ? "status-pill--neutral" : "status-pill--pending"}`}>
                  {notification.is_read ? "Read" : "Unread"}
                </span>
              </div>
              <p>{notification.message}</p>
              <div className="entity-card__details">
                <p><strong>Actor:</strong> {notification.actor_name || "System"}</p>
                <p><strong>Created:</strong> {formatDate(notification.created_at)}</p>
              </div>
              {!notification.is_read ? (
                <button type="button" className="ghost-button" onClick={() => markRead(notification.id)}>
                  Mark as read
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </Panel>
    </div>
  );
}
