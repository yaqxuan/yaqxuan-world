import { useState, type CSSProperties } from "react";
import type { VerificationStage } from "./content";

const BADGE_PALETTE: Record<"imagine" | "alive" | "connect", { outer: string; ellipse: string; core: string }> = {
  imagine: { outer: "#38bdf8", ellipse: "#4ff0df", core: "#ffd166" },
  alive: { outer: "#ffb457", ellipse: "#ff758f", core: "#c490ff" },
  connect: { outer: "#b392ff", ellipse: "#f472b6", core: "#4ff0df" },
};

export function AstrolabeBadge({
  index,
  variant = "imagine",
}: {
  index: string;
  variant?: "imagine" | "alive" | "connect";
}) {
  const colors = BADGE_PALETTE[variant];
  return (
    <svg className="astrolabe-badge" viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="19" fill="none" stroke={colors.outer} strokeOpacity="0.48" strokeWidth="1.2" />
      <ellipse
        cx="24"
        cy="24"
        rx="19"
        ry="7.5"
        transform="rotate(-24 24 24)"
        fill="none"
        stroke={colors.ellipse}
        strokeOpacity="0.78"
        strokeWidth="1.2"
      />
      <circle cx="24" cy="24" r="2.4" fill={colors.core} />
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
    <div className="astral-diagram imagine-constellation-diagram" aria-hidden="true">
      <svg viewBox="0 0 540 164" className="diagram-svg">
        <defs>
          <linearGradient id="imagine-arc" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.88" />
            <stop offset="50%" stopColor="#ffbe6b" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#e879f9" stopOpacity="0.88" />
          </linearGradient>
          <linearGradient id="imagine-arc-sub" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#4ff0df" stopOpacity="0.34" />
            <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.34" />
            <stop offset="100%" stopColor="#b392ff" stopOpacity="0.34" />
          </linearGradient>
        </defs>
        <path
          d="M 78 94 Q 175 26 270 74 T 462 66"
          fill="none"
          stroke="url(#imagine-arc)"
          strokeWidth="1.75"
          strokeDasharray="4 6"
        />
        <path
          d="M 78 94 Q 270 144 462 66"
          fill="none"
          stroke="url(#imagine-arc-sub)"
          strokeWidth="1.15"
        />
        {[
          { cx: 78, cy: 94, color: "#38bdf8" },
          { cx: 270, cy: 74, color: "#ffbe6b" },
          { cx: 462, cy: 66, color: "#e879f9" },
        ].map((pt, idx) => (
          <g key={nodes[idx].code}>
            <circle cx={pt.cx} cy={pt.cy} r="30" fill={pt.color} fillOpacity="0.12" />
            <circle cx={pt.cx} cy={pt.cy} r="20" fill="#071828" stroke={pt.color} strokeOpacity="0.72" />
            <circle cx={pt.cx} cy={pt.cy} r="5.5" fill={pt.color} />
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

const ALIVE_RING_COLORS = ["#ffbe6b", "#ff758f", "#c490ff"] as const;

export function AliveMemoryTriadDiagram({
  rings,
}: {
  rings: Array<{ code: string; label: string; detail: string }>;
}) {
  return (
    <div className="astral-diagram alive-triad-diagram">
      <svg viewBox="0 0 210 210" className="triad-svg" aria-hidden="true">
        <circle cx="105" cy="105" r="88" fill="#c490ff0f" stroke="#c490ff" strokeOpacity="0.52" strokeDasharray="3 5" />
        <circle cx="105" cy="105" r="62" fill="#ff758f12" stroke="#ff758f" strokeOpacity="0.65" />
        <circle cx="105" cy="105" r="34" fill="#ffbe6b22" stroke="#ffbe6b" strokeOpacity="0.88" />
        <circle cx="105" cy="105" r="7" fill="#ffbe6b" />
        <circle cx="167" cy="105" r="5" fill="#ff758f" />
        <circle cx="52" cy="36" r="4.5" fill="#c490ff" />
      </svg>
      <div className="triad-legend">
        {rings.map((ring, idx) => {
          const color = ALIVE_RING_COLORS[idx] ?? ALIVE_RING_COLORS[0];
          return (
            <div key={ring.code} className="triad-item">
              <span
                className="triad-code"
                style={
                  {
                    borderColor: `${color}88`,
                    color,
                    background: `${color}18`,
                  } as CSSProperties
                }
              >
                {ring.code}
              </span>
              <div>
                <strong>{ring.label}</strong>
                <p>{ring.detail}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const STAGE_COLORS = ["#4ff0df", "#38bdf8", "#a78bfa", "#f472b6", "#ffc46b"] as const;

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
  const activeStageColor = STAGE_COLORS[selected] ?? STAGE_COLORS[0];

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
          const stageColor = STAGE_COLORS[index] ?? STAGE_COLORS[0];
          return (
            <button
              key={stage.code}
              type="button"
              role="tab"
              aria-selected={active}
              className={`roadmap-step${active ? " is-active" : ""}`}
              style={{ "--stage-color": stageColor } as CSSProperties}
              onClick={() => setSelected(index)}
            >
              <span className="step-code">{stage.code}</span>
              <strong className="step-title">{stage.title}</strong>
              <small className="step-horizon">{stage.horizon}</small>
            </button>
          );
        })}
      </div>

      <div
        className="roadmap-detail"
        role="tabpanel"
        style={{ "--stage-color": activeStageColor } as CSSProperties}
      >
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

const BACKDROP_PALETTES: Record<string, [string, string, string]> = {
  home: ["#4ff0df", "#ffbe6b", "#a78bfa"],
  imagine: ["#38bdf8", "#4ff0df", "#ffd166"],
  alive: ["#ffb457", "#ff758f", "#c490ff"],
  connect: ["#b392ff", "#f472b6", "#4ff0df"],
  about: ["#ffc46b", "#fb7185", "#60a5fa"],
};

export function AstralStaticBackdrop({ activeRealm }: { activeRealm: string }) {
  const [primary, secondary, tertiary] = BACKDROP_PALETTES[activeRealm] ?? BACKDROP_PALETTES.home;
  return (
    <div className={`astral-static-backdrop realm-${activeRealm}`} aria-hidden="true">
      <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
        <defs>
          <radialGradient id="static-glow" cx="68%" cy="42%" r="54%">
            <stop offset="0%" stopColor={primary} stopOpacity="0.24" />
            <stop offset="50%" stopColor={secondary} stopOpacity="0.12" />
            <stop offset="100%" stopColor="#03090d" stopOpacity="0" />
          </radialGradient>
        </defs>
        <rect width="1200" height="800" fill="url(#static-glow)" />
        <circle cx="820" cy="340" r="240" fill="none" stroke={primary} strokeOpacity="0.28" />
        <circle cx="820" cy="340" r="160" fill="none" stroke={secondary} strokeOpacity="0.24" strokeDasharray="4 8" />
        <ellipse
          cx="820"
          cy="340"
          rx="310"
          ry="92"
          transform="rotate(-18 820 340)"
          fill="none"
          stroke={tertiary}
          strokeOpacity="0.26"
        />
      </svg>
    </div>
  );
}
