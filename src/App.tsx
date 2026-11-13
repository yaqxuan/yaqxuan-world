import {
  ArrowDown,
  ArrowUpRight,
  Check,
  Copy,
  Mail,
  Sparkles,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  Component,
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { CONTENT } from "./content";
import {
  AliveMemoryTriadDiagram,
  AstralStaticBackdrop,
  AstrolabeBadge,
  ConnectRoadmap,
  ImagineConstellationDiagram,
} from "./diagrams";
import {
  buildPath,
  otherLocale,
  parseLocation,
  REALM_IDS,
  saveLocale,
  type Locale,
  type RealmId,
} from "./i18n";

const WorldScene = lazy(() =>
  import("./WorldScene").then((module) => ({ default: module.WorldScene })),
);

const REALM_FREQUENCIES: Record<RealmId, [number, number, number]> = {
  home: [55, 82.5, 110],
  imagine: [65.41, 98.0, 146.83],
  alive: [58.27, 87.31, 130.81],
  connect: [73.42, 110.0, 164.81],
  about: [55, 82.5, 123.47],
};

class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() =>
    typeof window === "undefined" ? false : window.matchMedia(query).matches,
  );

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [query]);

  return matches;
}

function supportsWebGL2() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2"));
  } catch {
    return false;
  }
}

function useAmbientSound(enabled: boolean, activeRealm: RealmId) {
  const oscillatorsRef = useRef<OscillatorNode[]>([]);
  const contextRef = useRef<AudioContext | null>(null);
  const filterRef = useRef<BiquadFilterNode | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    contextRef.current = context;

    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(0.032, context.currentTime + 2.2);
    master.connect(compressor);
    compressor.connect(context.destination);

    const filter = context.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 460;
    filter.Q.value = 0.7;
    filter.connect(master);
    filterRef.current = filter;

    const baseFreqs = REALM_FREQUENCIES[activeRealm];
    const oscList: OscillatorNode[] = [];
    const lfoList: OscillatorNode[] = [];

    baseFreqs.forEach((freq, idx) => {
      const osc = context.createOscillator();
      const gain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();

      osc.type = idx === 0 ? "triangle" : "sine";
      osc.frequency.value = freq;
      osc.detune.value = [-4, 5, -7][idx] ?? 0;
      gain.gain.value = [0.16, 0.1, 0.055][idx] ?? 0.05;

      lfo.frequency.value = 0.04 + idx * 0.015;
      lfoGain.gain.value = gain.gain.value * 0.35;

      lfo.connect(lfoGain);
      lfoGain.connect(gain.gain);
      osc.connect(gain);
      gain.connect(filter);

      osc.start();
      lfo.start();
      oscList.push(osc);
      lfoList.push(lfo);
    });

    oscillatorsRef.current = oscList;

    const onVisibility = () => {
      if (document.hidden) {
        void context.suspend();
      } else {
        void context.resume();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      oscillatorsRef.current = [];
      filterRef.current = null;
      contextRef.current = null;

      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, 0.22);
      window.setTimeout(() => {
        [...oscList, ...lfoList].forEach((node) => {
          try {
            node.stop();
          } catch {
            // Oscillator already stopped.
          }
        });
        void context.close();
      }, 650);
    };
  }, [enabled]);

  useEffect(() => {
    const context = contextRef.current;
    const filter = filterRef.current;
    if (!enabled || !context || !filter) return;

    const targetFreqs = REALM_FREQUENCIES[activeRealm];
    const now = context.currentTime;
    oscillatorsRef.current.forEach((osc, idx) => {
      osc.frequency.setTargetAtTime(targetFreqs[idx] ?? 110, now, 0.9);
    });
    const cutoffMap: Record<RealmId, number> = {
      home: 420,
      imagine: 560,
      alive: 490,
      connect: 640,
      about: 390,
    };
    filter.frequency.setTargetAtTime(cutoffMap[activeRealm], now, 0.9);
  }, [activeRealm, enabled]);
}

function updateDocumentMeta(locale: Locale, realm: RealmId) {
  const meta = CONTENT[locale].routeMeta[realm];
  const canonicalUrl = `https://yaqxuan.com${buildPath(locale, realm)}`;

  document.title = meta.title;
  document.documentElement.lang = locale;
  document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
  document.querySelector('meta[property="og:title"]')?.setAttribute("content", meta.title);
  document.querySelector('meta[property="og:description"]')?.setAttribute("content", meta.description);
  document.querySelector('meta[property="og:url"]')?.setAttribute("content", canonicalUrl);

  let canonicalLink = document.querySelector('link[rel="canonical"]');
  if (!canonicalLink) {
    canonicalLink = document.createElement("link");
    canonicalLink.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalLink);
  }
  canonicalLink.setAttribute("href", canonicalUrl);
}

const REALM_SCROLL_INDEX: Record<RealmId, number> = {
  home: 0,
  imagine: 0.25,
  alive: 0.5,
  connect: 0.75,
  about: 1,
};

function App() {
  const initialParsed = useMemo(
    () => parseLocation(window.location.pathname, window.location.search),
    [],
  );
  const searchParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const ogMode = searchParams.get("og") === "1";
  const ogRealm = (searchParams.get("realm") as RealmId | null) ?? initialParsed.realm;

  const [locale, setLocale] = useState<Locale>(initialParsed.locale);
  const [activeRealm, setActiveRealm] = useState<RealmId>(ogMode ? ogRealm : initialParsed.realm);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [pulsed, setPulsed] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [scrollUiProgress, setScrollUiProgress] = useState(() =>
    ogMode ? REALM_SCROLL_INDEX[ogRealm] : REALM_SCROLL_INDEX[initialParsed.realm],
  );

  const isMobile = useMediaQuery("(max-width: 900px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const webglSupported = useMemo(() => supportsWebGL2(), []);

  const scrollProgressRef = useRef(
    ogMode ? REALM_SCROLL_INDEX[ogRealm] : REALM_SCROLL_INDEX[initialParsed.realm],
  );
  const pointerRef = useRef({ x: 0, y: 0 });
  const pulseTimeRef = useRef(0);
  const lockSyncUntilRef = useRef(0);
  const activeRealmRef = useRef<RealmId>(activeRealm);
  const localeRef = useRef<Locale>(locale);

  activeRealmRef.current = activeRealm;
  localeRef.current = locale;

  useAmbientSound(soundEnabled && !ogMode, activeRealm);

  const copy = CONTENT[locale];

  const triggerPulse = useCallback(() => {
    pulseTimeRef.current = performance.now();
    setPulsed(true);
    window.setTimeout(() => setPulsed(false), 2400);
  }, []);

  const scrollToRealm = useCallback(
    (realm: RealmId, instant = false) => {
      const targetEl = document.getElementById(`section-${realm}`);
      if (!targetEl) return;

      lockSyncUntilRef.current = performance.now() + (instant ? 120 : 900);
      setActiveRealm(realm);
      activeRealmRef.current = realm;

      if (realm === "home") {
        window.scrollTo({ top: 0, behavior: instant || reducedMotion ? "auto" : "smooth" });
      } else {
        targetEl.scrollIntoView({
          behavior: instant || reducedMotion ? "auto" : "smooth",
          block: "start",
        });
      }
    },
    [reducedMotion],
  );

  const navigateRealm = useCallback(
    (realm: RealmId, event?: MouseEvent<HTMLAnchorElement>) => {
      if (event) {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
          return;
        }
        event.preventDefault();
      }
      const nextUrl = buildPath(localeRef.current, realm);
      if (window.location.pathname !== nextUrl) {
        window.history.pushState({}, "", nextUrl);
      }
      scrollToRealm(realm, false);
      updateDocumentMeta(localeRef.current, realm);
    },
    [scrollToRealm],
  );

  const handleToggleLocale = useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
      return;
    }
    event.preventDefault();
    const nextLocale = otherLocale(localeRef.current);
    setLocale(nextLocale);
    localeRef.current = nextLocale;
    saveLocale(nextLocale);

    const nextPath = buildPath(nextLocale, activeRealmRef.current);
    window.history.pushState({}, "", nextPath);
    updateDocumentMeta(nextLocale, activeRealmRef.current);
  }, []);

  // Scroll to initial section if landed directly on /imagine, /alive, /connect, or /about
  useEffect(() => {
    if (ogMode) return;
    if (initialParsed.realm !== "home") {
      window.requestAnimationFrame(() => {
        scrollToRealm(initialParsed.realm, true);
      });
    }
    updateDocumentMeta(initialParsed.locale, initialParsed.realm);
  }, [initialParsed.locale, initialParsed.realm, ogMode, scrollToRealm]);

  // Listen to browser Back / Forward
  useEffect(() => {
    if (ogMode) return;
    const onPopState = () => {
      const parsed = parseLocation(window.location.pathname, window.location.search);
      setLocale(parsed.locale);
      localeRef.current = parsed.locale;
      saveLocale(parsed.locale);
      scrollToRealm(parsed.realm, true);
      updateDocumentMeta(parsed.locale, parsed.realm);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, [ogMode, scrollToRealm]);

  // Single rAF-throttled scroll tracker driving both 3D spline and clean URL sync
  useEffect(() => {
    if (ogMode) return;
    let frameId = 0;

    const updateFromScroll = () => {
      frameId = 0;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = docHeight > 0 ? Math.min(1, Math.max(0, window.scrollY / docHeight)) : 0;
      scrollProgressRef.current = ratio;
      setScrollUiProgress(ratio);

      if (performance.now() < lockSyncUntilRef.current) return;

      const marker = window.innerHeight * 0.42;
      let detected: RealmId = "home";
      for (const id of REALM_IDS) {
        const el = document.getElementById(`section-${id}`);
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        if (rect.top <= marker) {
          detected = id;
        }
      }

      if (detected !== activeRealmRef.current) {
        setActiveRealm(detected);
        activeRealmRef.current = detected;
        const nextUrl = buildPath(localeRef.current, detected);
        if (window.location.pathname !== nextUrl) {
          window.history.replaceState({}, "", nextUrl);
        }
        updateDocumentMeta(localeRef.current, detected);
      }
    };

    const onScroll = () => {
      if (!frameId) {
        frameId = window.requestAnimationFrame(updateFromScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateFromScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [ogMode]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const nx = (event.clientX / window.innerWidth) * 2 - 1;
    const ny = -((event.clientY / window.innerHeight) * 2 - 1);
    pointerRef.current.x = nx;
    pointerRef.current.y = ny;
  }, []);

  const handleCopyEmail = useCallback(() => {
    const email = copy.about.links.email.value;
    void navigator.clipboard?.writeText(email).then(() => {
      setCopiedEmail(true);
      window.setTimeout(() => setCopiedEmail(false), 2000);
    });
  }, [copy.about.links.email.value]);

  const activeIndexStr =
    copy.nav.items.find((item) => item.id === activeRealm)?.index ?? "00";

  if (ogMode) {
    const ogMeta = copy.routeMeta[ogRealm];
    return (
      <div className={`og-capture-frame og-realm-${ogRealm}`} data-realm={ogRealm}>
        <div className="cosmos-backdrop">
          <div className="cosmos-aurora-wash" />
          {webglSupported ? (
            <SceneBoundary fallback={<AstralStaticBackdrop activeRealm={ogRealm} />}>
              <Suspense fallback={null}>
                <WorldScene
                  scrollProgressRef={scrollProgressRef}
                  pointerRef={pointerRef}
                  pulseTimeRef={pulseTimeRef}
                  isMobile={false}
                  reducedMotion={true}
                />
              </Suspense>
            </SceneBoundary>
          ) : (
            <AstralStaticBackdrop activeRealm={ogRealm} />
          )}
          <div className="astral-stars" />
          <div className="astral-vignette" />
        </div>
        <div className="og-card-content">
          <div className="og-brand">
            <span className="brand-mark" />
            <strong>YAQXUAN.COM</strong>
          </div>
          <span className="og-eyebrow">{ogMeta.ogEyebrow}</span>
          <h1>{ogMeta.ogHeadline}</h1>
          <p>{ogMeta.description}</p>
        </div>
      </div>
    );
  }

  const nextLocale = otherLocale(locale);

  return (
    <div className={`world-app locale-${locale}`} data-realm={activeRealm} onPointerMove={handlePointerMove}>
      {/* Persistent 3D World Backdrop */}
      <div className="cosmos-backdrop" aria-hidden="true">
        <div className="cosmos-aurora-wash" />
        {webglSupported ? (
          <SceneBoundary fallback={<AstralStaticBackdrop activeRealm={activeRealm} />}>
            <Suspense fallback={<AstralStaticBackdrop activeRealm={activeRealm} />}>
              <WorldScene
                scrollProgressRef={scrollProgressRef}
                pointerRef={pointerRef}
                pulseTimeRef={pulseTimeRef}
                isMobile={isMobile}
                reducedMotion={reducedMotion}
              />
            </Suspense>
          </SceneBoundary>
        ) : (
          <AstralStaticBackdrop activeRealm={activeRealm} />
        )}
        <div className="astral-stars" />
        <div className="astral-vignette" />
      </div>

      {/* Fixed Header */}
      <header className="world-header">
        <a
          className="brand"
          href={buildPath(locale, "home")}
          aria-label={copy.brand.homeAria}
          onClick={(e) => navigateRealm("home", e)}
        >
          <span className="brand-word">
            <i className="brand-slash" aria-hidden="true" />
            {copy.brand.name}
          </span>
          <span className="brand-coordinate">
            {copy.brand.worldLabel} / {activeIndexStr}
          </span>
        </a>

        <nav className="world-navigation" aria-label={copy.nav.ariaLabel}>
          {copy.nav.items.map((item) => {
            const isActive = activeRealm === item.id;
            return (
              <a
                key={item.id}
                href={buildPath(locale, item.id)}
                className={isActive ? "is-active" : undefined}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => navigateRealm(item.id, e)}
              >
                <small>{item.index}</small>
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="header-actions">
          <a
            className="locale-switch"
            href={buildPath(nextLocale, activeRealm)}
            aria-label={copy.nav.switchAria}
            onClick={handleToggleLocale}
          >
            {copy.nav.switchToLabel}
          </a>
          <button
            type="button"
            className={`sound-toggle${soundEnabled ? " is-on" : ""}`}
            aria-label={soundEnabled ? copy.controls.soundOnAria : copy.controls.soundOffAria}
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled((prev) => !prev)}
          >
            {soundEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
            <span>{soundEnabled ? copy.controls.soundOn : copy.controls.soundOff}</span>
          </button>
        </div>
      </header>

      {/* Desktop Right-Edge Astral Compass */}
      <aside className="astral-compass" aria-hidden="true">
        <div className="compass-track">
          <div
            className="compass-fill"
            style={{ transform: `scaleY(${Math.max(0.05, scrollUiProgress)})` }}
          />
        </div>
        <div className="compass-ticks">
          {copy.nav.items.map((item) => (
            <a
              key={item.id}
              href={buildPath(locale, item.id)}
              className={activeRealm === item.id ? "is-active" : undefined}
              onClick={(e) => navigateRealm(item.id, e)}
              tabIndex={-1}
            >
              <span>{item.index}</span>
            </a>
          ))}
        </div>
      </aside>

      {/* Main Continuous Five-Act Spatial Track */}
      <main className="world-track">
        {/* ACT 00: THRESHOLD / HOME */}
        <section id="section-home" className="realm-section realm-home" aria-labelledby="hero-title">
          <div className="hero-column">
            <span className="eyebrow">{copy.hero.eyebrow}</span>
            {!webglSupported && (
              <span className="fallback-pill">{copy.controls.webglFallbackBadge}</span>
            )}
            <h1 id="hero-title">
              <span>{copy.hero.titleLine1}</span>
              <em>{copy.hero.titleLine2}</em>
            </h1>
            <p className="hero-lead">{copy.hero.lead}</p>

            <div className="hero-actions">
              <button
                type="button"
                className={`btn-primary${pulsed ? " is-pulsed" : ""}`}
                onClick={triggerPulse}
              >
                <Sparkles size={16} aria-hidden="true" />
                <span>{pulsed ? copy.controls.pulseDone : copy.controls.pulseGenesis}</span>
              </button>
              <a
                className="btn-secondary"
                href={buildPath(locale, "imagine")}
                onClick={(e) => navigateRealm("imagine", e)}
              >
                <span>{copy.controls.exploreWorld}</span>
                <ArrowDown size={15} aria-hidden="true" />
              </a>
            </div>
          </div>

          <div className="hero-pillars" aria-label={copy.controls.scrollCue}>
            {copy.hero.pillars.map((pillar) => (
              <a
                key={pillar.realm}
                href={buildPath(locale, pillar.realm)}
                className={`pillar-card pillar-${pillar.realm}`}
                onClick={(e) => navigateRealm(pillar.realm, e)}
              >
                <div className="pillar-top">
                  <span className="pillar-index">{pillar.index}</span>
                  <ArrowUpRight size={15} aria-hidden="true" />
                </div>
                <strong>{pillar.title}</strong>
                <small>{pillar.subtitle}</small>
              </a>
            ))}
          </div>
        </section>

        {/* ACT 01: IMAGINE */}
        <section
          id="section-imagine"
          className="realm-section realm-editorial align-left"
          aria-labelledby="imagine-title"
        >
          <div className="editorial-column">
            <header className="realm-header">
              <div className="realm-badge-row">
                <AstrolabeBadge index={copy.realms.imagine.index} variant="imagine" />
                <span className="eyebrow">
                  {copy.realms.imagine.index} / {copy.realms.imagine.cue}
                </span>
              </div>
              <h2 id="imagine-title">{copy.realms.imagine.title}</h2>
              <p className="realm-lead">{copy.realms.imagine.lead}</p>
              <p className="realm-copy">{copy.realms.imagine.copy}</p>
            </header>

            <ImagineConstellationDiagram nodes={copy.diagrams.imagineNodes} />

            <div className="chapter-stack">
              {copy.realms.imagine.chapters.map((chapter, idx) => (
                <article key={chapter.eyebrow} className={`chapter-card accent-cyan accent-imagine-${idx}`}>
                  <span className="eyebrow">{chapter.eyebrow}</span>
                  <h3>{chapter.title}</h3>
                  <p className="chapter-summary">{chapter.summary}</p>
                  <div className="chapter-body">
                    {chapter.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <blockquote>{chapter.aside}</blockquote>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ACT 02: ALIVE */}
        <section
          id="section-alive"
          className="realm-section realm-editorial align-right"
          aria-labelledby="alive-title"
        >
          <div className="editorial-column">
            <header className="realm-header">
              <div className="realm-badge-row">
                <AstrolabeBadge index={copy.realms.alive.index} variant="alive" />
                <span className="eyebrow">
                  {copy.realms.alive.index} / {copy.realms.alive.cue}
                </span>
              </div>
              <h2 id="alive-title">{copy.realms.alive.title}</h2>
              <p className="realm-lead">{copy.realms.alive.lead}</p>
              <p className="realm-copy">{copy.realms.alive.copy}</p>
            </header>

            <AliveMemoryTriadDiagram rings={copy.diagrams.aliveRings} />

            <div className="chapter-stack">
              {copy.realms.alive.chapters.map((chapter, idx) => (
                <article key={chapter.eyebrow} className={`chapter-card accent-amber accent-alive-${idx}`}>
                  <span className="eyebrow">{chapter.eyebrow}</span>
                  <h3>{chapter.title}</h3>
                  <p className="chapter-summary">{chapter.summary}</p>
                  <div className="chapter-body">
                    {chapter.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <blockquote>{chapter.aside}</blockquote>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ACT 03: CONNECT */}
        <section
          id="section-connect"
          className="realm-section realm-editorial align-left"
          aria-labelledby="connect-title"
        >
          <div className="editorial-column">
            <header className="realm-header">
              <div className="realm-badge-row">
                <AstrolabeBadge index={copy.realms.connect.index} variant="connect" />
                <span className="eyebrow">
                  {copy.realms.connect.index} / {copy.realms.connect.cue}
                </span>
              </div>
              <h2 id="connect-title">{copy.realms.connect.title}</h2>
              <p className="realm-lead">{copy.realms.connect.lead}</p>
              <p className="realm-copy">{copy.realms.connect.copy}</p>
            </header>

            <div className="chapter-stack">
              {copy.realms.connect.chapters.map((chapter, idx) => (
                <article key={chapter.eyebrow} className={`chapter-card accent-violet accent-connect-${idx}`}>
                  <span className="eyebrow">{chapter.eyebrow}</span>
                  <h3>{chapter.title}</h3>
                  <p className="chapter-summary">{chapter.summary}</p>
                  <div className="chapter-body">
                    {chapter.body.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                  <blockquote>{chapter.aside}</blockquote>
                </article>
              ))}
            </div>

            <ConnectRoadmap
              eyebrow={copy.diagrams.roadmapEyebrow}
              title={copy.diagrams.roadmapTitle}
              lead={copy.diagrams.roadmapLead}
              stages={copy.diagrams.verificationStages}
            />
          </div>
        </section>

        {/* ACT 04: ABOUT / ORIGIN */}
        <section id="section-about" className="realm-section realm-about" aria-labelledby="about-title">
          <div className="about-panel">
            <div className="about-main">
              <span className="eyebrow">{copy.about.eyebrow}</span>
              <h2 id="about-title">{copy.about.title}</h2>
              <span className="status-pill">{copy.about.statusBadge}</span>
              <div className="about-paragraphs">
                {copy.about.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            </div>

            <div className="about-links">
              <a
                className="about-link-card"
                href={copy.about.links.blog.url}
                target="_blank"
                rel="noreferrer"
              >
                <div className="about-link-top">
                  <span>{copy.about.links.blog.label}</span>
                  <ArrowUpRight size={17} aria-hidden="true" />
                </div>
                <strong>{copy.about.links.blog.value}</strong>
                <p>{copy.about.links.blog.description}</p>
              </a>

              <div className="about-link-card">
                <a className="about-email-anchor" href={`mailto:${copy.about.links.email.value}`}>
                  <div className="about-link-top">
                    <span>{copy.about.links.email.label}</span>
                    <Mail size={16} aria-hidden="true" />
                  </div>
                  <strong>{copy.about.links.email.value}</strong>
                  <p>{copy.about.links.email.description}</p>
                </a>
                <button type="button" className="copy-email-btn" onClick={handleCopyEmail}>
                  {copiedEmail ? <Check size={13} /> : <Copy size={13} />}
                  <span>{copiedEmail ? copy.controls.copiedEmail : copy.controls.copyEmail}</span>
                </button>
              </div>
            </div>
          </div>

          <footer className="world-footer">
            <span>{copy.about.colophon}</span>
            <span>yaqxuan.com</span>
          </footer>
        </section>
      </main>

      {/* Mobile Floating Dock */}
      <nav className="mobile-dock" aria-label={copy.nav.ariaLabel}>
        {copy.nav.items.map((item) => {
          const isActive = activeRealm === item.id;
          return (
            <a
              key={item.id}
              href={buildPath(locale, item.id)}
              className={isActive ? "is-active" : undefined}
              aria-current={isActive ? "page" : undefined}
              onClick={(e) => navigateRealm(item.id, e)}
            >
              <small>{item.index}</small>
              <span>{item.label}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}

export default App;
