import { Check, Compass, Eye, Layers, Sparkles } from "lucide-react";
import { useState, type CSSProperties } from "react";
import type { Locale } from "./i18n";
import { WORLD_IDS, WORLD_SPECS, type WorldId } from "./worlds/worldRegistry";

export interface WorldGalleryProps {
  locale: Locale;
  heroWorldId: WorldId;
  onSelectHeroWorld: (worldId: WorldId) => void;
  onEnterWorld: (worldId: WorldId) => void;
}

export function WorldGallery({
  locale,
  heroWorldId,
  onSelectHeroWorld,
  onEnterWorld,
}: WorldGalleryProps) {
  const [spotlightId, setSpotlightId] = useState<WorldId>(heroWorldId);
  const [spotlightAlt, setSpotlightAlt] = useState(false);

  const isZh = locale === "zh-CN";
  const spotSpec = WORLD_SPECS[spotlightId];
  const spotCopy = spotSpec.copy[locale];

  const handleFocusCard = (id: WorldId) => {
    if (id !== spotlightId) {
      setSpotlightId(id);
      setSpotlightAlt(false);
    }
  };

  return (
    <div id="world-gallery" className="world-gallery-shell" aria-labelledby="world-gallery-title">
      <div className="world-gallery-header">
        <div className="gallery-eyebrow-row">
          <span className="gallery-zero-badge">
            <Sparkles size={13} aria-hidden="true" />
            {isZh ? "PURE CODE WORLDS · 0 KB 外部模型与贴图" : "PURE CODE WORLDS · 0 KB EXTERNAL ASSETS"}
          </span>
          <span className="gallery-count-pill">
            {isZh ? "6 座实时演算奇观 · 12 帧实机直出画幅" : "6 Procedural Sanctuaries · 12 In-Engine Captures"}
          </span>
        </div>

        <h2 id="world-gallery-title">
          {isZh ? "六座纯代码构筑的可进入奇观。" : "Six Enterable Worlds Forged Purely in Code."}
        </h2>
        <p className="world-gallery-lead">
          {isZh
            ? "每一座浮空岛屿、黄铜星环、半透明律动水母、极光琉璃晶碑与绿洲日冕神殿，均由数学噪声与自定义 GLSL 着色器实时生成。你可以将任意一座投射为主页实时 3D 背景，或直接步入其中自由漫游。"
            : "Every floating island, gyroscopic brass astrolabe, bioluminescent jellyfish, aurora crystal obelisk, and desert ziggurat is synthesized live from mathematical noise and custom GLSL shaders. Project any world onto the homepage backdrop or step inside in full-screen 3D."}
        </p>
      </div>

      {/* Featured Panoramic Spotlight Stage */}
      <div
        className="world-spotlight-card"
        style={
          {
            "--spot-primary": spotSpec.accentPrimary,
            "--spot-secondary": spotSpec.accentSecondary,
          } as CSSProperties
        }
      >
        <div className="world-spotlight-media">
          <img
            className={`spotlight-img${!spotlightAlt ? " is-visible" : ""}`}
            src={`/worlds/${spotSpec.id}-primary.webp`}
            alt={`${spotCopy.title} — ${spotCopy.primaryShotLabel}`}
            width={1600}
            height={1000}
            decoding="async"
          />
          <img
            className={`spotlight-img${spotlightAlt ? " is-visible" : ""}`}
            src={`/worlds/${spotSpec.id}-alt.webp`}
            alt={`${spotCopy.title} — ${spotCopy.altShotLabel}`}
            width={1600}
            height={1000}
            loading="lazy"
            decoding="async"
          />

          <div className="spotlight-media-top">
            <span className="spotlight-telemetry">
              <Layers size={13} aria-hidden="true" />
              {spotSpec.telemetryHint.triangles} {isZh ? "三角面" : "Tris"} ·{" "}
              {spotSpec.telemetryHint.instances} {isZh ? "实例" : "Instances"}
            </span>

            <div className="spotlight-mood-switch" role="group" aria-label={isZh ? "切换实机机位画幅" : "Switch capture mood"}>
              <button
                type="button"
                className={!spotlightAlt ? "is-active" : undefined}
                onClick={() => setSpotlightAlt(false)}
              >
                {spotCopy.primaryShotLabel}
              </button>
              <button
                type="button"
                className={spotlightAlt ? "is-active" : undefined}
                onClick={() => setSpotlightAlt(true)}
              >
                {spotCopy.altShotLabel}
              </button>
            </div>
          </div>

          <button
            type="button"
            className="spotlight-enter-overlay"
            onClick={() => onEnterWorld(spotSpec.id)}
            aria-label={`${isZh ? "进入实时 3D 漫游：" : "Enter 3D World: "}${spotCopy.title}`}
          >
            <span>
              <Compass size={16} aria-hidden="true" />
              {isZh ? "点击画面进入全屏 3D 漫游" : "Click to Enter Full-Screen 3D"}
            </span>
          </button>
        </div>

        <div className="world-spotlight-info">
          <div className="spotlight-meta-top">
            <span className="spotlight-code">WORLD / {spotSpec.code}</span>
            <span className="spotlight-biome">{spotCopy.biome}</span>
          </div>

          <h3>
            {spotCopy.title}
            <small>{spotCopy.subtitle}</small>
          </h3>

          <p className="spotlight-summary">{spotCopy.summary}</p>

          <ul className="spotlight-highlights">
            {spotCopy.highlights.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>

          <div className="spotlight-actions">
            <button
              type="button"
              className="btn-enter-world"
              onClick={() => onEnterWorld(spotSpec.id)}
            >
              <Compass size={16} aria-hidden="true" />
              <span>{isZh ? "进入全屏 3D 漫游" : "Enter Interactive 3D"}</span>
            </button>

            <button
              type="button"
              className={`btn-project-backdrop${heroWorldId === spotSpec.id ? " is-projected" : ""}`}
              onClick={() => onSelectHeroWorld(spotSpec.id)}
            >
              {heroWorldId === spotSpec.id ? <Check size={15} /> : <Eye size={15} />}
              <span>
                {heroWorldId === spotSpec.id
                  ? isZh
                    ? "已投射为主页背景"
                    : "Active Home Backdrop"
                  : isZh
                    ? "投射为主页 3D 背景"
                    : "Project to Backdrop"}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 6-World Showcase Grid (Hover reveals alternate mood capture!) */}
      <div className="world-portals-grid">
        {WORLD_IDS.map((id) => {
          const w = WORLD_SPECS[id];
          const wc = w.copy[locale];
          const isProjected = heroWorldId === id;
          const isSpotlight = spotlightId === id;

          return (
            <article
              key={id}
              className={`world-portal-card${isSpotlight ? " is-spotlight" : ""}${isProjected ? " is-projected" : ""}`}
              style={
                {
                  "--card-accent": w.accentPrimary,
                  "--card-secondary": w.accentSecondary,
                } as CSSProperties
              }
              onMouseEnter={() => handleFocusCard(id)}
            >
              <div
                className="portal-card-media"
                onClick={() => onEnterWorld(id)}
                role="button"
                tabIndex={0}
                aria-label={`${isZh ? "进入 3D 世界：" : "Enter 3D World: "}${wc.title}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onEnterWorld(id);
                  }
                }}
              >
                <img
                  className="portal-img-primary"
                  src={`/worlds/${id}-primary.webp`}
                  alt={`${wc.title} — ${wc.primaryShotLabel}`}
                  width={1600}
                  height={1000}
                  loading="lazy"
                  decoding="async"
                />
                <img
                  className="portal-img-alt"
                  src={`/worlds/${id}-alt.webp`}
                  alt={`${wc.title} — ${wc.altShotLabel}`}
                  width={1600}
                  height={1000}
                  loading="lazy"
                  decoding="async"
                />
                <div className="portal-card-badges">
                  <span className="portal-code">{w.code}</span>
                  <span className="portal-mood-tag">
                    {wc.primaryShotLabel} / {wc.altShotLabel}
                  </span>
                </div>
                {isProjected && (
                  <span className="portal-projected-pill">
                    <Check size={12} />
                    {isZh ? "当前主背景" : "Backdrop"}
                  </span>
                )}
              </div>

              <div className="portal-card-body">
                <div className="portal-title-row">
                  <div>
                    <h4>{wc.title}</h4>
                    <span className="portal-biome">{wc.biome}</span>
                  </div>
                  <span className="portal-tris">{w.telemetryHint.triangles} tris</span>
                </div>

                <p>{wc.summary}</p>

                <div className="portal-card-actions">
                  <button
                    type="button"
                    className="portal-btn-enter"
                    onClick={() => onEnterWorld(id)}
                  >
                    <Compass size={14} aria-hidden="true" />
                    <span>{isZh ? "进入 3D 漫游" : "Enter 3D"}</span>
                  </button>
                  <button
                    type="button"
                    className={`portal-btn-backdrop${isProjected ? " is-active" : ""}`}
                    onClick={() => {
                      onSelectHeroWorld(id);
                      setSpotlightId(id);
                    }}
                  >
                    {isProjected
                      ? isZh
                        ? "主景已启用"
                        : "Active"
                      : isZh
                        ? "设为主背景"
                        : "Set Backdrop"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
