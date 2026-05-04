import { useState, useRef, useCallback } from "react";
import { TrendingUp, Users, CheckCircle, Star, BarChart2, PieChart, Activity } from "lucide-react";

/* ══════════════════════════════════════════════════
   DUMMY DATA
══════════════════════════════════════════════════ */

const MONTHLY_RATINGS = [
  { month: "Jan", technical: 3.2, communication: 3.5, interns: 8 },
  { month: "Feb", technical: 3.4, communication: 3.6, interns: 10 },
  { month: "Mar", technical: 3.1, communication: 3.8, interns: 11 },
  { month: "Apr", technical: 3.7, communication: 4.0, interns: 14 },
  { month: "May", technical: 3.9, communication: 4.1, interns: 15 },
  { month: "Jun", technical: 4.2, communication: 4.3, interns: 18 },
  { month: "Jul", technical: 4.0, communication: 4.2, interns: 17 },
  { month: "Aug", technical: 4.4, communication: 4.5, interns: 22 },
];

const MODULE_COMPLETION = [
  { label: "Web Security",        completed: 18, total: 24, color: "#4FFFF2" },
  { label: "Network Basics",      completed: 22, total: 24, color: "#22a7c8" },
  { label: "Cryptography",        completed: 12, total: 24, color: "#7c3aed" },
  { label: "Pen Testing",         completed: 9,  total: 24, color: "#f59e0b" },
  { label: "Incident Response",   completed: 15, total: 24, color: "#10b981" },
  { label: "OSINT Fundamentals",  completed: 20, total: 24, color: "#ef4444" },
];

const APPROVAL_DATA = [
  { label: "Approved", value: 42, color: "#10b981" },
  { label: "Pending",  value: 18, color: "#f59e0b" },
  { label: "Rejected", value: 8,  color: "#ef4444" },
];

const TOP_INTERNS = [
  { name: "Aryan Sharma",    technical: 4.8, communication: 4.6, modules: 21 },
  { name: "Priya Mehta",     technical: 4.6, communication: 4.9, modules: 19 },
  { name: "Rohan Verma",     technical: 4.5, communication: 4.3, modules: 20 },
  { name: "Sneha Iyer",      technical: 4.3, communication: 4.7, modules: 18 },
  { name: "Kabir Nair",      technical: 4.2, communication: 4.4, modules: 17 },
];

const SUMMARY_STATS = [
  { label: "Avg Technical",    value: "3.87", icon: Star,        color: "#4FFFF2", sub: "across all interns" },
  { label: "Avg Comm.",        value: "4.06", icon: Users,       color: "#a78bfa", sub: "across all interns" },
  { label: "Total Reviews",    value: "68",   icon: CheckCircle, color: "#10b981", sub: "this quarter" },
  { label: "Active Interns",   value: "22",   icon: TrendingUp,  color: "#f59e0b", sub: "currently enrolled" },
];

/* ══════════════════════════════════════════════════
   TOOLTIP HOOK
══════════════════════════════════════════════════ */
function useTooltip() {
  const [tooltip, setTooltip] = useState(null);
  const show = useCallback((content, x, y) => setTooltip({ content, x, y }), []);
  const hide = useCallback(() => setTooltip(null), []);
  return { tooltip, show, hide };
}

function Tooltip({ tooltip }) {
  if (!tooltip) return null;
  return (
    <div style={{
      position: "fixed",
      left: tooltip.x + 12,
      top: tooltip.y - 10,
      background: "rgba(0, 11, 24, 0.96)",
      border: "1px solid rgba(79,255,242,0.25)",
      borderRadius: 8,
      padding: "7px 11px",
      fontSize: "0.78rem",
      color: "#EEF7FF",
      pointerEvents: "none",
      zIndex: 9999,
      backdropFilter: "blur(8px)",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      whiteSpace: "nowrap",
    }}>
      {tooltip.content}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   STAT SUMMARY ROW
══════════════════════════════════════════════════ */
function SummaryRow() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
      {SUMMARY_STATS.map(({ label, value, icon: Icon, color, sub }) => (
        <div key={label} style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-lg)",
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 12,
          transition: "border-color 0.2s",
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = color + "55"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "var(--border)"}
        >
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: color + "18",
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          }}>
            <Icon size={16} style={{ color }} />
          </div>
          <div>
            <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text)", lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: "0.72rem", fontWeight: 600, color: "var(--text-soft)", marginTop: 2 }}>{label}</div>
            <div style={{ fontSize: "0.68rem", color: "var(--text-muted)", marginTop: 1 }}>{sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   GROUPED BAR CHART — Monthly Ratings
══════════════════════════════════════════════════ */
function RatingsBarChart() {
  const [hovered, setHovered] = useState(null);
  const { tooltip, show, hide } = useTooltip();
  const [activeLines, setActiveLines] = useState({ technical: true, communication: true });

  const W = 560, H = 240, PL = 38, PR = 16, PT = 20, PB = 36;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const maxVal = 5;
  const groupW = chartW / MONTHLY_RATINGS.length;
  const bW = groupW * 0.28;
  const yTicks = [1, 2, 3, 4, 5];

  function bX(i, idx) { return PL + i * groupW + groupW / 2 - bW + idx * (bW + 3); }
  function bH(v) { return (v / maxVal) * chartH; }
  function bY(v) { return PT + chartH - bH(v); }

  const SERIES = [
    { key: "technical",     label: "Technical",      color: "#4FFFF2" },
    { key: "communication", label: "Communication",  color: "#a78bfa" },
  ];

  return (
    <div>
      {/* Legend toggles */}
      <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
        {SERIES.map((s, si) => (
          <button key={s.key} onClick={() => setActiveLines(p => ({ ...p, [s.key]: !p[s.key] }))}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "4px 10px", borderRadius: 20,
              border: `1px solid ${activeLines[s.key] ? s.color + "66" : "var(--border)"}`,
              background: activeLines[s.key] ? s.color + "14" : "transparent",
              color: activeLines[s.key] ? s.color : "var(--text-muted)",
              fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: activeLines[s.key] ? s.color : "var(--border)", display: "inline-block" }} />
            {s.label}
          </button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {/* Grid */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PL} y1={bY(v)} x2={W - PR} y2={bY(v)}
              stroke="var(--border)" strokeWidth={0.8} strokeDasharray="4,4" />
            <text x={PL - 6} y={bY(v) + 4} fontSize={9} fill="var(--text-muted)" textAnchor="end">{v}</text>
          </g>
        ))}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="var(--border)" strokeWidth={1} />

        {/* Bars */}
        {MONTHLY_RATINGS.map((d, i) => (
          <g key={d.month}
            onMouseEnter={(e) => {
              setHovered(i);
              show(
                `${d.month}: Tech ${d.technical} · Comm ${d.communication} · ${d.interns} interns`,
                e.clientX, e.clientY
              );
            }}
            onMouseMove={(e) => show(
              `${d.month}: Tech ${d.technical} · Comm ${d.communication} · ${d.interns} interns`,
              e.clientX, e.clientY
            )}
            onMouseLeave={() => { setHovered(null); hide(); }}
            style={{ cursor: "pointer" }}
          >
            {/* Hover highlight bg */}
            <rect x={PL + i * groupW + 3} y={PT} width={groupW - 6} height={chartH}
              fill={hovered === i ? "rgba(79,255,242,0.04)" : "transparent"} rx={4} />

            {SERIES.map((s, si) => activeLines[s.key] && (
              <rect key={s.key}
                x={bX(i, si)} y={bY(d[s.key])}
                width={bW} height={bH(d[s.key])}
                rx={3} fill={s.color}
                opacity={hovered === null ? 0.82 : hovered === i ? 1 : 0.35}
                style={{ transition: "opacity 0.15s, y 0.3s" }}
              />
            ))}
            <text x={PL + i * groupW + groupW / 2} y={H - 8}
              fontSize={9.5} fill={hovered === i ? "var(--text-soft)" : "var(--text-muted)"}
              textAnchor="middle" style={{ transition: "fill 0.15s" }}
            >{d.month}</text>
          </g>
        ))}
      </svg>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   DONUT CHART — Approvals
══════════════════════════════════════════════════ */
function ApprovalDonut() {
  const [hovered, setHovered] = useState(null);
  const { tooltip, show, hide } = useTooltip();

  const total = APPROVAL_DATA.reduce((s, d) => s + d.value, 0);
  const cx = 100, cy = 100, R = 80, r = 52;

  let angle = -Math.PI / 2;
  const slices = APPROVAL_DATA.map((d, i) => {
    const sweep = (d.value / total) * 2 * Math.PI;
    const x1 = cx + R * Math.cos(angle), y1 = cy + R * Math.sin(angle);
    const x2 = cx + R * Math.cos(angle + sweep), y2 = cy + R * Math.sin(angle + sweep);
    const ix1 = cx + r * Math.cos(angle + sweep), iy1 = cy + r * Math.sin(angle + sweep);
    const ix2 = cx + r * Math.cos(angle), iy2 = cy + r * Math.sin(angle);
    const large = sweep > Math.PI ? 1 : 0;
    const midAngle = angle + sweep / 2;
    const path = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${r} ${r} 0 ${large} 0 ${ix2} ${iy2} Z`;
    angle += sweep;
    return { ...d, path, midAngle, pct: Math.round(d.value / total * 100), idx: i };
  });

  const active = hovered !== null ? slices[hovered] : null;

  return (
    <div>
      <svg viewBox="0 0 300 210" style={{ width: "100%", height: "auto", overflow: "visible" }}>
        {slices.map((s) => {
          const isHov = hovered === s.idx;
          const ox = isHov ? Math.cos(s.midAngle) * 6 : 0;
          const oy = isHov ? Math.sin(s.midAngle) * 6 : 0;
          return (
            <path key={s.label}
              d={s.path}
              fill={s.color}
              stroke="var(--bg-panel)" strokeWidth={3}
              opacity={hovered === null ? 0.9 : isHov ? 1 : 0.45}
              transform={`translate(${ox}, ${oy})`}
              style={{ transition: "all 0.2s ease", cursor: "pointer" }}
              onMouseEnter={(e) => { setHovered(s.idx); show(`${s.label}: ${s.value} (${s.pct}%)`, e.clientX, e.clientY); }}
              onMouseMove={(e) => show(`${s.label}: ${s.value} (${s.pct}%)`, e.clientX, e.clientY)}
              onMouseLeave={() => { setHovered(null); hide(); }}
            />
          );
        })}
        {/* Center */}
        <text x={cx} y={cy - 8} textAnchor="middle" fontSize={active ? 22 : 26} fontWeight={800}
          fill={active ? active.color : "var(--text)"} style={{ transition: "all 0.2s" }}>
          {active ? active.value : total}
        </text>
        <text x={cx} y={cy + 10} textAnchor="middle" fontSize={10} fill="var(--text-muted)">
          {active ? active.label : "total requests"}
        </text>
        {active && (
          <text x={cx} y={cy + 24} textAnchor="middle" fontSize={10} fontWeight={700} fill={active.color}>
            {active.pct}%
          </text>
        )}

        {/* Legend */}
        {slices.map((s, i) => (
          <g key={s.label} transform={`translate(205, ${30 + i * 52})`}
            style={{ cursor: "pointer" }}
            onMouseEnter={(e) => { setHovered(i); }}
            onMouseLeave={() => setHovered(null)}
          >
            <rect width={10} height={10} rx={3} fill={s.color}
              opacity={hovered === null || hovered === i ? 1 : 0.35}
              style={{ transition: "opacity 0.15s" }} />
            <text x={16} y={9} fontSize={11} fontWeight={600}
              fill={hovered === i ? s.color : "var(--text-soft)"}
              style={{ transition: "fill 0.15s" }}>{s.label}</text>
            <text x={16} y={22} fontSize={10} fill="var(--text-muted)">{s.value} · {s.pct}%</text>
          </g>
        ))}
      </svg>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   HORIZONTAL BAR CHART — Module Completion
══════════════════════════════════════════════════ */
function ModuleCompletionChart() {
  const [hovered, setHovered] = useState(null);
  const { tooltip, show, hide } = useTooltip();
  const [sortBy, setSortBy] = useState("completed"); // "completed" | "name" | "remaining"

  const sorted = [...MODULE_COMPLETION].sort((a, b) => {
    if (sortBy === "completed") return b.completed - a.completed;
    if (sortBy === "remaining") return (a.completed / a.total) - (b.completed / b.total);
    return a.label.localeCompare(b.label);
  });

  const rowH = 38, barH = 18, labelW = 140, countW = 46;
  const W = 560, chartW = W - labelW - countW - 16;

  return (
    <div>
      {/* Sort controls */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Sort by</span>
        {[["completed", "Completed"], ["remaining", "% Done"], ["name", "Name"]].map(([k, label]) => (
          <button key={k} onClick={() => setSortBy(k)}
            style={{
              padding: "3px 10px", borderRadius: 16,
              border: `1px solid ${sortBy === k ? "rgba(79,255,242,0.4)" : "var(--border)"}`,
              background: sortBy === k ? "rgba(79,255,242,0.1)" : "transparent",
              color: sortBy === k ? "#4FFFF2" : "var(--text-muted)",
              fontSize: "0.73rem", fontWeight: 600, cursor: "pointer",
              transition: "all 0.15s",
            }}
          >{label}</button>
        ))}
      </div>

      <svg viewBox={`0 0 ${W} ${sorted.length * rowH + 8}`} style={{ width: "100%", height: "auto" }}>
        {sorted.map((d, i) => {
          const pct = d.completed / d.total;
          const fillW = chartW * pct;
          const y = i * rowH + 4;
          const midY = y + rowH / 2;
          const isHov = hovered === i;

          return (
            <g key={d.label}
              onMouseEnter={(e) => { setHovered(i); show(`${d.label}: ${d.completed}/${d.total} completed (${Math.round(pct * 100)}%)`, e.clientX, e.clientY); }}
              onMouseMove={(e) => show(`${d.label}: ${d.completed}/${d.total} completed (${Math.round(pct * 100)}%)`, e.clientX, e.clientY)}
              onMouseLeave={() => { setHovered(null); hide(); }}
              style={{ cursor: "pointer" }}
            >
              {/* Row bg on hover */}
              <rect x={0} y={y} width={W} height={rowH - 4} rx={6}
                fill={isHov ? "rgba(79,255,242,0.04)" : "transparent"}
                style={{ transition: "fill 0.15s" }} />

              {/* Label */}
              <text x={labelW - 10} y={midY + 4} fontSize={10.5} fontWeight={isHov ? 600 : 400}
                fill={isHov ? "var(--text)" : "var(--text-soft)"}
                textAnchor="end" style={{ transition: "fill 0.15s" }}>
                {d.label}
              </text>

              {/* Track */}
              <rect x={labelW} y={midY - barH / 2} width={chartW} height={barH} rx={barH / 2}
                fill="rgba(79,255,242,0.07)" />

              {/* Fill with gradient-like effect */}
              <rect x={labelW} y={midY - barH / 2} width={fillW} height={barH} rx={barH / 2}
                fill={d.color}
                opacity={isHov ? 1 : 0.75}
                style={{ transition: "opacity 0.15s, width 0.6s ease" }}
              />

              {/* % inside bar (if wide enough) */}
              {fillW > 40 && (
                <text x={labelW + fillW - 8} y={midY + 4} fontSize={9} fontWeight={700}
                  fill="rgba(0,11,24,0.8)" textAnchor="end">
                  {Math.round(pct * 100)}%
                </text>
              )}

              {/* Count right */}
              <text x={labelW + chartW + 8} y={midY + 4} fontSize={10} fill="var(--text-muted)">
                {d.completed}/{d.total}
              </text>
            </g>
          );
        })}
      </svg>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   LINE CHART — Intern Growth Trend
══════════════════════════════════════════════════ */
function InternGrowthChart() {
  const [hovered, setHovered] = useState(null);
  const { tooltip, show, hide } = useTooltip();

  const W = 560, H = 200, PL = 38, PR = 20, PT = 20, PB = 32;
  const chartW = W - PL - PR;
  const chartH = H - PT - PB;
  const maxVal = 25;
  const yTicks = [5, 10, 15, 20, 25];

  function px(i) { return PL + (i / (MONTHLY_RATINGS.length - 1)) * chartW; }
  function py(v) { return PT + chartH - (v / maxVal) * chartH; }

  const points = MONTHLY_RATINGS.map((d, i) => ({ x: px(i), y: py(d.interns), ...d }));
  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${PT + chartH} L ${points[0].x} ${PT + chartH} Z`;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: "auto", overflow: "visible" }}>
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4FFFF2" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#4FFFF2" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Grid */}
        {yTicks.map(v => (
          <g key={v}>
            <line x1={PL} y1={py(v)} x2={W - PR} y2={py(v)}
              stroke="var(--border)" strokeWidth={0.8} strokeDasharray="4,4" />
            <text x={PL - 6} y={py(v) + 4} fontSize={9} fill="var(--text-muted)" textAnchor="end">{v}</text>
          </g>
        ))}
        <line x1={PL} y1={PT + chartH} x2={W - PR} y2={PT + chartH} stroke="var(--border)" strokeWidth={1} />

        {/* Area fill */}
        <path d={areaPath} fill="url(#areaGrad)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="#4FFFF2" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

        {/* Points + hover areas */}
        {points.map((p, i) => (
          <g key={p.month}
            onMouseEnter={(e) => { setHovered(i); show(`${p.month}: ${p.interns} active interns`, e.clientX, e.clientY); }}
            onMouseMove={(e) => show(`${p.month}: ${p.interns} active interns`, e.clientX, e.clientY)}
            onMouseLeave={() => { setHovered(null); hide(); }}
            style={{ cursor: "pointer" }}
          >
            {/* Invisible hit area */}
            <rect x={p.x - 16} y={PT} width={32} height={chartH} fill="transparent" />
            {/* Vertical guide on hover */}
            {hovered === i && (
              <line x1={p.x} y1={PT} x2={p.x} y2={PT + chartH}
                stroke="rgba(79,255,242,0.2)" strokeWidth={1} strokeDasharray="3,3" />
            )}
            {/* Dot */}
            <circle cx={p.x} cy={p.y} r={hovered === i ? 6 : 4}
              fill={hovered === i ? "#4FFFF2" : "#00172D"}
              stroke="#4FFFF2" strokeWidth={2}
              style={{ transition: "r 0.15s" }} />
            {/* Value on hover */}
            {hovered === i && (
              <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill="#4FFFF2">
                {p.interns}
              </text>
            )}
            {/* X label */}
            <text x={p.x} y={H - 6} fontSize={9.5} fill={hovered === i ? "var(--text-soft)" : "var(--text-muted)"}
              textAnchor="middle" style={{ transition: "fill 0.15s" }}>{p.month}</text>
          </g>
        ))}
      </svg>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TOP INTERNS TABLE
══════════════════════════════════════════════════ */
function TopInternsTable() {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {/* Header */}
      <div style={{
        display: "grid", gridTemplateColumns: "28px 1fr 100px 100px 70px",
        padding: "4px 10px", gap: 8,
        fontSize: "0.7rem", fontWeight: 700, color: "var(--text-muted)",
        letterSpacing: "0.08em", textTransform: "uppercase",
      }}>
        <span>#</span>
        <span>Intern</span>
        <span>Technical</span>
        <span>Comm.</span>
        <span>Modules</span>
      </div>

      {TOP_INTERNS.map((intern, i) => (
        <div key={intern.name}
          onMouseEnter={() => setHovered(i)}
          onMouseLeave={() => setHovered(null)}
          style={{
            display: "grid", gridTemplateColumns: "28px 1fr 100px 100px 70px",
            padding: "10px 10px", gap: 8, borderRadius: 10, alignItems: "center",
            background: hovered === i ? "rgba(79,255,242,0.05)" : "transparent",
            border: `1px solid ${hovered === i ? "rgba(79,255,242,0.15)" : "transparent"}`,
            transition: "all 0.15s", cursor: "default",
          }}
        >
          {/* Rank */}
          <span style={{
            fontSize: "0.75rem", fontWeight: 800,
            color: i === 0 ? "#f59e0b" : i === 1 ? "#94a3b8" : i === 2 ? "#cd7c3a" : "var(--text-muted)",
          }}>#{i + 1}</span>

          {/* Name + avatar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 28, height: 28, borderRadius: 8, flexShrink: 0,
              background: `hsl(${(intern.name.charCodeAt(0) * 37) % 360}, 55%, 35%)`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "0.75rem", fontWeight: 700, color: "#fff",
            }}>{intern.name[0]}</div>
            <span style={{ fontSize: "0.84rem", fontWeight: 600, color: "var(--text)" }}>{intern.name}</span>
          </div>

          {/* Mini bar — technical */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(79,255,242,0.12)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(intern.technical / 5) * 100}%`, background: "#4FFFF2", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#4FFFF2", minWidth: 26, textAlign: "right" }}>{intern.technical}</span>
          </div>

          {/* Mini bar — communication */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 3, background: "rgba(167,139,250,0.15)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(intern.communication / 5) * 100}%`, background: "#a78bfa", borderRadius: 3 }} />
            </div>
            <span style={{ fontSize: "0.78rem", fontWeight: 700, color: "#a78bfa", minWidth: 26, textAlign: "right" }}>{intern.communication}</span>
          </div>

          {/* Modules */}
          <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--text-soft)", textAlign: "center" }}>{intern.modules}/24</span>
        </div>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   PANEL WRAPPER
══════════════════════════════════════════════════ */
function ChartPanel({ title, subtitle, children, action }) {
  return (
    <div className="panel">
      <div className="panel__header">
        <div>
          <h3>{title}</h3>
          {subtitle && <p>{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   TABS
══════════════════════════════════════════════════ */
const TABS = [
  { id: "overview",   label: "Overview",      icon: BarChart2 },
  { id: "ratings",    label: "Ratings",       icon: Star },
  { id: "modules",    label: "Modules",       icon: Activity },
  { id: "approvals",  label: "Approvals",     icon: CheckCircle },
];

/* ══════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════ */
export function PerformancePage() {
  const [tab, setTab] = useState("overview");

  return (
    <div className="page-stack">
      {/* Hero */}
      <section className="hero-banner">
        <div>
          <span className="eyebrow">Analytics &amp; Insights</span>
          <h2>Performance Overview</h2>
          <p>Interactive charts for intern ratings, module completion, approvals, and growth trends.</p>
        </div>
        <div className="hero-banner__meta">
          <strong>Q3 2025</strong>
          <span>Live data</span>
        </div>
      </section>

      {/* Stat row */}
      <SummaryRow />

      {/* Tabs */}
      <div style={{
        display: "flex", gap: 4, padding: "4px",
        background: "var(--bg-panel)", borderRadius: "var(--radius-md)",
        border: "1px solid var(--border)",
        width: "fit-content",
      }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 9,
              border: "none", cursor: "pointer",
              background: tab === id ? "rgba(79,255,242,0.12)" : "transparent",
              color: tab === id ? "#4FFFF2" : "var(--text-muted)",
              fontSize: "0.8rem", fontWeight: tab === id ? 700 : 500,
              transition: "all 0.15s",
            }}>
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "overview" && (
        <>
          <div className="two-column">
            <ChartPanel title="Avg. Ratings by Month" subtitle="Technical vs communication — hover bars for detail">
              <RatingsBarChart />
            </ChartPanel>
            <ChartPanel title="Intern Growth" subtitle="Active intern headcount month-over-month">
              <InternGrowthChart />
            </ChartPanel>
          </div>
          <div className="two-column">
            <ChartPanel title="Top Performers" subtitle="Ranked by combined rating score">
              <TopInternsTable />
            </ChartPanel>
            <ChartPanel title="Approval Breakdown" subtitle="Current request status distribution">
              <ApprovalDonut />
            </ChartPanel>
          </div>
        </>
      )}

      {tab === "ratings" && (
        <ChartPanel title="Avg. Ratings by Month" subtitle="Toggle series below — hover bars for month detail">
          <RatingsBarChart />
        </ChartPanel>
      )}

      {tab === "modules" && (
        <ChartPanel title="Module Completion Rate" subtitle="Sort and hover rows to explore">
          <ModuleCompletionChart />
        </ChartPanel>
      )}

      {tab === "approvals" && (
        <div className="two-column">
          <ChartPanel title="Approval Breakdown" subtitle="Hover slices to inspect">
            <ApprovalDonut />
          </ChartPanel>
          <ChartPanel title="Top Performers" subtitle="Ranked by combined rating score">
            <TopInternsTable />
          </ChartPanel>
        </div>
      )}
    </div>
  );
}
