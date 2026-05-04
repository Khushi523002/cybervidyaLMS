export function StatCard({ title, value, hint, tone = "default" }) {
  return (
    <article className={`stat-card stat-card--${tone}`}>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__meta">
        <h4>{title}</h4>
        {hint ? <p>{hint}</p> : null}
      </div>
    </article>
  );
}
