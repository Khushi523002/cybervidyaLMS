export function Logo({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand--compact" : ""}`}>
      <svg viewBox="0 0 180 180" aria-hidden="true" className="brand__icon">
        <defs>
          <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4FFFF2" />
            <stop offset="100%" stopColor="#22A7C8" />
          </linearGradient>
        </defs>
        <path d="M90 18 36 52l14 8v38h10V66l30 18 30-18v32h10V60l14-8Z" fill="url(#brandGradient)" />
        <path d="M46 104c20 2 32 8 44 24 12-16 24-22 44-24l-6 20c-18-4-28-2-38 12-10-14-20-16-38-12Z" fill="url(#brandGradient)" />
        <path d="M56 126c16 0 24 8 34 20 10-12 18-20 34-20" stroke="url(#brandGradient)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path d="M65 86c0-16 11-29 25-29s25 13 25 29v8H65Z" fill="#FFFFFF" />
        <circle cx="90" cy="82" r="24" fill="#08083F" opacity=".96" />
        <path d="M90 40c12 0 23 5 30 14-9-4-18-5-30-2-10 3-17 8-22 16V53c5-8 12-13 22-13Z" fill="#08083F" opacity=".92" />
      </svg>
      {!compact && (
        <div className="brand__text">
          <span className="brand__title">Cyber Vidya</span>
          <span className="brand__subtitle">Learning Management System</span>
        </div>
      )}
    </div>
  );
}
