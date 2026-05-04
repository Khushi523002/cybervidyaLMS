export function RatingStars({ value = 0, outOf = 5 }) {
  const fullStars = Math.round(Number(value) || 0);

  return (
    <div className="rating-stars" aria-label={`${value || 0} out of ${outOf} stars`}>
      {Array.from({ length: outOf }, (_, index) => (
        <span
          key={index}
          className={`rating-stars__star ${index < fullStars ? "is-active" : ""}`}
        >
          ★
        </span>
      ))}
      <strong>{value ?? "N/A"}</strong>
    </div>
  );
}
