import { useState } from "react";
import type { VerificationStage } from "./content";

export function AstrolabeBadge({ index }: { index: string }) {
  return (
    <svg className="astrolabe-badge" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1" />
      <ellipse
        cx="24"
        cy="24"
        rx="19"
        ry="7.5"
        transform="rotate(-24 24 24)"
        fill="none"
        stroke="var(--cyan)"
        strokeOpacity="0.65"
        strokeWidth="1"
      />
      <circle cx="24" cy="24" r="2.2" fill="var(--amber)" />
      <text x="24" y="27" textAnchor="middle" className="astrolabe-badge-text">
        {index}
      </text>
    </svg>
  );
}

export function ImagineConstellationDiagram({
  nodes,
}: {
  nodes: Array<{ code: string; label: string; sub: string }>;
}) {
  return (
    <div className="astral-diagram" aria-hidden="true">
      <svg viewBox="0 0 540 164" className="diagram-svg">
        <defs>
          <linearGradient id="imagine-arc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#5ee6d0" stopOpacity="0.7" />
            <stop offset="50%" stopColor="#f3b56a" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#a99bff" stopOpacity="0.7" />
          </linearGradient>
        </defs>
        <path
          d="M 78 94 Q 175 26 270 74 T 462 66"
          fill="none"
          stroke="url(#imagine-arc)"
          strokeWidth="1.5"
          strokeDasharray="4 6"
        />
        <path
          d="M 78 94 Q 270 144 462 66"
          fill="none"
          stroke="#5ee6d0"
          strokeOpacity="0.22"
          strokeWidth="1"
        />
        {[
          { cx: 78, cy: 94, color: "#5ee6d0" },
          { cx: 270, cy: 74, color: "#f3b56a" },
          { cx: 462, cy: 66, color: "#a99bff" },
        ].map((pt, idx) => (
          <g key={nodes[idx].code}>
            <circle cx={pt.cx} cy={pt.cy} r="20" fill="#071820" stroke={pt.color} strokeOpacity="0.55" />
            <circle cx={pt.cx} cy={pt.cy} r="5" fill={pt.color} />
            <text
              x={pt.cx}
              y={pt.cy - 28}
              textAnchor="middle"
              fill={pt.color}
              fontSize="10"
              letterSpacing="2"
              fontFamily="ui-monospace, monospace"
            >
              {nodes[idx].code} · {nodes[idx].sub}
            </text>
            <text
              x={pt.cx}
              y={pt.cy + 40}
              textAnchor="middle"
              fill="#eaf3f0"
              fontSize="13.5"
              fontWeight="500"
            >
              {nodes[idx].label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function AliveMemoryTriadDiagram({
  rings,
}: {
  rings: Array<{ code: string; label: string; detail: string }>;
}) {
  return (
    <div className="astral-diagram alive-triad-diagram">
      <svg viewBox="0 0 210 210" className="triad-svg" aria-hidden="true">
        <circle cx="105" cy="105" r="88" fill="none" stroke="#a99bff" strokeOpacity="0.38" strokeDasharray="3 5" />
        <circle cx="105" cy="105" r="62" fill="none" stroke="#5ee6d0" strokeOpacity="0.52" />
        <circle cx="105" cy="105" r="34" fill="#f3b56a18" stroke="#f3b56a" strokeOpacity="0.82" />
        <circle cx="105" cy="105" r="6" fill="#f3b56a" />
        <circle cx="167" cy="105" r="4.5" fill="#5ee6d0" />
        <circle cx="52" cy="36" r="4" fill="#a99bff" />
      </svg>
      <div className="triad-legend">
        {rings.map((ring) => (
          <div key={ring.code} className="triad-item">
            <span className="triad-code">{ring.code}</span>
            <div>
              <strong>{ring.label}</strong>
              <p>{ring.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConnectRoadmap({
  eyebrow,
  title,
  lead,
  stages,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  stages: VerificationStage[];
}) {
  const [selected, setSelected] = useState(0);
  const current = stages[selected] ?? stages[0];

  return (
    <div className="roadmap-card" role="region" aria-label={title}>
      <div className="roadmap-head">
        <span className="eyebrow">{eyebrow}</span>
        <h3>{title}</h3>
        <p>{lead}</p>
      </div>

      <div className="roadmap-steps" role="tablist" aria-label={title}>
        {stages.map((stage, index) => {
          const active = index === selected;
          return (
            <button
              key={stage.code}
              type="button"
              role="tab"
              aria-selected={active}
              className={`roadmap-step${active ? " is-active" : ""}`}
              onClick={() => setSelected(index)}
            >
              <span className="step-code">{stage.code}</span>
              <strong className="step-title">{stage.title}</strong>
              <small className="step-horizon">{stage.horizon}</small>
            </button>
          );
        })}
      </div>

      <div className="roadmap-detail" role="tabpanel">
        <div className="roadmap-detail-meta">
          <span className="badge-cyan">{current.horizon}</span>
          <span className="badge-amber">{current.direction}</span>
        </div>
        <h4>
          {current.code} · {current.title}
        </h4>
        <p className="roadmap-summary">{current.summary}</p>
        <p className="roadmap-milestone">{current.milestone}</p>
      </div>
    </div>
  );
}

export function AstralStaticBackdrop({ activeRealm }: { activeRealm: string }) {
  return (
    <div className={`astral-static-backdrop realm-${activeRealm}`} aria-hidden="true">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="static-glow" cx="68%" cy="42%" r="52%">
            <stop offset="0%" stopColor="#5ee6d0" stopOpacity="0.18" />
            <stop offset="55%" stopColor="#f3b56a" stopOpacity="0.06" />
            <stop offset="100%" stopColor="#03090d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#static-glow)" />
        <circle cx="820" cy="340" r="240" fill="none" stroke="#5ee6d0" strokeOpacity="0.18" />
        <circle cx="820" cy="340" r="160" fill="none" stroke="#f3b56a" strokeOpacity="0.16" strokeDasharray="4 8" />
        <ellipse
          cx="820"
          cy="340"
          rx="310"
          ry="92"
          transform="rotate(-18 820 340)"
          fill="none"
          stroke="#a99bff"
          strokeOpacity="0.16"
        />
      </svg>
    </div>
  );
}
