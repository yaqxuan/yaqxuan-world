import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
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
  type ReactNode,
} from "react";
import {
  districtList,
  districtFromPath,
  districts,
  normalizePath,
  routeMeta,
  type DistrictPath,
  type IntroStage,
  type WorldPath,
} from "./content";
import { resolveLocale } from "./i18n";

const WorldScene = lazy(() =>
  import("./WorldScene").then((module) => ({ default: module.WorldScene })),
);

const SESSION_KEY = "yaqxuan:world-born";

class SceneBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed ? null : this.props.children;
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

function useAmbientSound(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    const context = new AudioContextCtor();
    const master = context.createGain();
    const compressor = context.createDynamicsCompressor();
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(0.034, context.currentTime + 2.8);
    master.connect(compressor);
    compressor.connect(context.destination);

    const sources: AudioScheduledSourceNode[] = [];
    const droneFilter = context.createBiquadFilter();
    droneFilter.type = "lowpass";
    droneFilter.frequency.value = 430;
    droneFilter.Q.value = 0.6;
    droneFilter.connect(master);

    const frequencies = [55, 82.5, 110, 165];
    const oscillators = frequencies.map((frequency, index) => {
      const oscillator = context.createOscillator();
      const localGain = context.createGain();
      const lfo = context.createOscillator();
      const lfoGain = context.createGain();
      oscillator.type = index > 1 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      oscillator.detune.value = [-5, 4, -9, 7][index];
      localGain.gain.value = [0.15, 0.1, 0.055, 0.025][index];
      lfo.frequency.value = 0.035 + index * 0.012;
      lfoGain.gain.value = localGain.gain.value * 0.34;
      lfo.connect(lfoGain);
      lfoGain.connect(localGain.gain);
      oscillator.connect(localGain);
      localGain.connect(droneFilter);
      oscillator.start();
      lfo.start();
      sources.push(oscillator, lfo);
      return oscillator;
    });

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 4, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    let memory = 0;
    for (let index = 0; index < noiseData.length; index += 1) {
      memory = memory * 0.985 + (Math.random() * 2 - 1) * 0.015;
      noiseData[index] = memory;
    }
    const wind = context.createBufferSource();
    const windFilter = context.createBiquadFilter();
    const windGain = context.createGain();
    wind.buffer = noiseBuffer;
    wind.loop = true;
    windFilter.type = "bandpass";
    windFilter.frequency.value = 520;
    windFilter.Q.value = 0.42;
    windGain.gain.value = 0.12;
    wind.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);
    wind.start();
    sources.push(wind);

    return () => {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, 0.24);
      window.setTimeout(() => {
        sources.forEach((source) => {
          try {
            source.stop();
          } catch {
            // The source may already have stopped while the audio context was closing.
          }
        });
        void context.close();
      }, 850);
    };
  }, [enabled]);
}

function Brand({ onHome }: { onHome: () => void }) {
  return (
    <button className="brand" type="button" onClick={onHome} aria-label="返回世界入口">
      <span className="brand-word">
        <i />
        YAQXUAN
      </span>
      <span className="brand-coordinate">WORLD / 00</span>
    </button>
  );
}

function Navigation({
  path,
  onNavigate,
}: {
  path: WorldPath;
  onNavigate: (path: WorldPath) => void;
}) {
  return (
    <nav className="world-navigation" aria-label="世界区域">
      {districtList.map((district) => (
        <button
          key={district.path}
          type="button"
          className={path === district.path ? "is-active" : ""}
          onClick={() => onNavigate(district.path)}
        >
          <small>{district.index}</small>
          <span>{district.title}</span>
        </button>
      ))}
      <button
        type="button"
        className={path === "/about" ? "is-active" : ""}
        onClick={() => onNavigate("/about")}
      >
        <small>04</small>
        <span>关于</span>
      </button>
    </nav>
  );
}

function BirthOverlay({
  stage,
  beat,
  onStart,
}: {
  stage: IntroStage;
  beat: number;
  onStart: () => void;
}) {
  if (stage === "revealed") return null;
  const beats = ["光先抵达。", "然后，是一条可以行走的路。", "最后，世界开始记住你。"];

  return (
    <div className={`birth-overlay birth-${stage}`}>
      {stage === "seed" ? (
        <button className="birth-trigger" type="button" onClick={onStart}>
          <span className="seed-orbit" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <small>一个尚未存在的世界</small>
          <strong>靠近，让它看见你。</strong>
          <em>点击唤醒</em>
        </button>
      ) : (
        <div className="birth-beat" key={beat}>
          <span>0{beat + 1}</span>
          <p>{beats[beat]}</p>
        </div>
      )}
    </div>
  );
}

function HomeOverlay({
  onNavigate,
  onPreview,
}: {
  onNavigate: (path: WorldPath) => void;
  onPreview: (path: WorldPath | null) => void;
}) {
  return (
    <section className="home-overlay" aria-labelledby="home-title">
      <div className="hero-statement">
        <span className="hero-eyebrow">A WORLD THAT REMEMBERS / 00</span>
        <h1 id="home-title">
          <span>让想象成为</span>
          <em>可以进入的世界。</em>
        </h1>
        <p>不是观看另一个世界，而是在其中被看见、被记住，并留下真实发生过的历史。</p>
      </div>

      <div className="district-rail" aria-label="进入城市区域">
        <div className="rail-intro">
          <small>向城市深处</small>
          <span />
        </div>
        {districtList.map((district) => (
          <button
            key={district.path}
            type="button"
            onClick={() => onNavigate(district.path)}
            onPointerEnter={() => onPreview(district.path)}
            onPointerLeave={() => onPreview(null)}
            onFocus={() => onPreview(district.path)}
            onBlur={() => onPreview(null)}
          >
            <span>{district.index}</span>
            <strong>{district.title}</strong>
            <small>{district.cue}</small>
            <ArrowRight aria-hidden="true" />
          </button>
        ))}
      </div>

    </section>
  );
}

function LivingWorldOverlay() {
  return (
    <div className="living-world" aria-hidden="true">
      <div className="moving-haze haze-a" />
      <div className="moving-haze haze-b" />
      <div className="sun-breath" />
      <div className="bird-flock">
        <i />
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="city-embers">
        {Array.from({ length: 18 }, (_, index) => (
          <i
            key={index}
            style={{
              left: `${24 + ((index * 19) % 61)}%`,
              top: `${49 + ((index * 13) % 32)}%`,
              animationDelay: `${(index % 7) * -0.73}s`,
              animationDuration: `${2.7 + (index % 5) * 0.8}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function DistrictExperience({
  path,
  onClose,
}: {
  path: DistrictPath;
  onClose: () => void;
}) {
  const district = districtFromPath(path);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [reading, setReading] = useState(false);
  const readingClose = useRef<HTMLButtonElement>(null);
  const chapter = district.chapters[chapterIndex];

  useEffect(() => {
    setChapterIndex(0);
    setReading(false);
  }, [path]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (reading) setReading(false);
        else onClose();
      }
      if (!reading && event.key === "ArrowRight") {
        setChapterIndex((current) => Math.min(current + 1, district.chapters.length - 1));
      }
      if (!reading && event.key === "ArrowLeft") {
        setChapterIndex((current) => Math.max(current - 1, 0));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [district.chapters.length, onClose, reading]);

  useEffect(() => {
    if (reading) readingClose.current?.focus();
  }, [reading]);

  return (
    <section className="district-experience" aria-labelledby="district-title">
      <button className="close-region" type="button" onClick={onClose}>
        <ArrowLeft />
        返回城市入口
      </button>

      <div className="district-intro">
        <div className="district-index">
          <span>{district.index}</span>
          <i />
          <small>{district.cue}</small>
        </div>
        <h1 id="district-title">{district.title}</h1>
        <p>{district.lead}</p>
      </div>

      <div className="chapter-stage" key={`${path}-${chapterIndex}`} aria-live="polite">
        <span className="chapter-eyebrow">{chapter.eyebrow}</span>
        <h2>{chapter.title}</h2>
        <p>{chapter.summary}</p>
        <button className="read-chapter" type="button" onClick={() => setReading(true)}>
          展开阅读
          <ArrowRight />
        </button>
      </div>

      <div className="chapter-navigation" aria-label={`${district.title}区域章节`}>
        {district.chapters.map((item, index) => (
          <button
            key={item.eyebrow}
            type="button"
            className={chapterIndex === index ? "is-active" : ""}
            onClick={() => setChapterIndex(index)}
            aria-label={`第 ${index + 1} 章：${item.title}`}
          >
            <span>0{index + 1}</span>
            <i />
            <small>{item.eyebrow.split(" / ")[0]}</small>
          </button>
        ))}
      </div>

      <div className="chapter-arrows">
        <button
          type="button"
          disabled={chapterIndex === 0}
          onClick={() => setChapterIndex((current) => Math.max(0, current - 1))}
          aria-label="上一章"
        >
          <ArrowLeft />
        </button>
        <span>
          0{chapterIndex + 1} / 0{district.chapters.length}
        </span>
        <button
          type="button"
          disabled={chapterIndex === district.chapters.length - 1}
          onClick={() =>
            setChapterIndex((current) => Math.min(district.chapters.length - 1, current + 1))
          }
          aria-label="下一章"
        >
          <ArrowRight />
        </button>
      </div>

      {reading && (
        <div className="reading-layer" role="dialog" aria-modal="true" aria-labelledby="reading-title">
          <button
            ref={readingClose}
            className="reading-close"
            type="button"
            onClick={() => setReading(false)}
            aria-label="关闭阅读层"
          >
            <X />
          </button>
          <article>
            <span>{chapter.eyebrow}</span>
            <h2 id="reading-title">{chapter.title}</h2>
            {chapter.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            {chapter.aside && <blockquote>{chapter.aside}</blockquote>}
          </article>
          <div className="reading-progress" aria-hidden="true">
            <span>{district.title}</span>
            <strong>0{chapterIndex + 1}</strong>
            <i />
            <small>0{district.chapters.length}</small>
          </div>
        </div>
      )}
    </section>
  );
}

function AboutOverlay({ onClose }: { onClose: () => void }) {
  return (
    <section className="about-overlay" aria-labelledby="about-title">
      <button className="close-region" type="button" onClick={onClose}>
        <X />
        关闭
      </button>
      <div className="about-copy">
        <span>ABOUT / 由谁开始</span>
        <h1 id="about-title">一项从想象出发的个人长期探索。</h1>
        <p>
          YAQXUAN 由 Yaqxuan 发起。它目前处于愿景与学习阶段，尝试理解怎样让故事、角色、空间和人的意图真正连接起来。
        </p>
        <p>
          网站呈现方向，博客记录学习、实验、失败和逐渐形成的答案。这里没有虚构团队，也不把尚未发生的未来描述成已经完成的成果。
        </p>
      </div>
      <div className="about-links">
        <a href="https://yaqxuan.xyz" target="_blank" rel="noreferrer">
          <span>研究与思考日志</span>
          <strong>yaqxuan.xyz</strong>
          <ExternalLink />
        </a>
        <a href="mailto:hello@yaqxuan.com">
          <span>联系</span>
          <strong>hello@yaqxuan.com</strong>
          <ArrowRight />
        </a>
      </div>
    </section>
  );
}

function UtilityBar({
  muted,
  onToggleSound,
  onReplay,
}: {
  muted: boolean;
  onToggleSound: () => void;
  onReplay: () => void;
}) {
  return (
    <div className="utility-bar">
      <button type="button" onClick={onToggleSound} aria-label={muted ? "开启声音" : "关闭声音"}>
        {muted ? <VolumeX /> : <Volume2 />}
        <span>{muted ? "声音关闭" : "声音开启"}</span>
      </button>
      <button type="button" onClick={onReplay}>
        <RotateCcw />
        <span>重新观看</span>
      </button>
    </div>
  );
}

function StaticExperience({
  path,
  reason,
  onNavigate,
}: {
  path: WorldPath;
  reason: "narrow" | "reduced" | "webgl";
  onNavigate: (path: WorldPath) => void;
}) {
  const current =
    path === "/imagine"
      ? districts.imagine
      : path === "/alive"
        ? districts.alive
        : path === "/connect"
          ? districts.connect
          : null;
  const staticImage =
    path === "/imagine"
      ? "/assets/world-imagine-anime.webp"
      : path === "/alive"
        ? "/assets/world-alive-anime.webp"
        : path === "/connect"
          ? "/assets/world-connect-anime.webp"
          : path === "/about"
            ? "/assets/world-about-anime.webp"
            : "/assets/world-home-anime.webp";

  return (
    <main className="static-experience">
      <img src={staticImage} alt="" />
      <div className="static-shade" />
      <Brand onHome={() => onNavigate("/")} />
      <div className="static-copy">
        <span>YAQXUAN / STATIC VIEW</span>
        <h1>
          {current
            ? current.title
            : path === "/about"
              ? "一项从想象出发的个人长期探索。"
              : "让想象成为可以进入的世界。"}
        </h1>
        <p>
          {current
            ? current.copy
            : path === "/about"
              ? "YAQXUAN 由 Yaqxuan 发起，目前处于愿景与学习阶段。"
              : "一座从想象中诞生、能够被进入、被改变，也能够记住你的个人世界。"}
        </p>
        <small>
          {reason === "narrow"
            ? "完整实时 3D 体验为桌面屏幕设计。"
            : reason === "reduced"
              ? "已根据系统设置关闭动态三维体验。"
              : "当前浏览器或图形设备无法运行 WebGL 2。"}
        </small>
      </div>
      <div className="static-links">
        {districtList.map((district) => (
          <button key={district.path} type="button" onClick={() => onNavigate(district.path)}>
            <span>{district.index}</span>
            <strong>{district.title}</strong>
          </button>
        ))}
        <button type="button" onClick={() => onNavigate("/about")}>
          <span>04</span>
          <strong>关于</strong>
        </button>
      </div>
    </main>
  );
}

function App() {
  const locale = useMemo(resolveLocale, []);
  const [path, setPath] = useState<WorldPath>(() => normalizePath(window.location.pathname));
  const [stage, setStage] = useState<IntroStage>(() => {
    if (new URLSearchParams(window.location.search).get("preview") === "1") return "revealed";
    if (window.location.pathname !== "/") return "revealed";
    return sessionStorage.getItem(SESSION_KEY) ? "revealed" : "seed";
  });
  const [birthBeat, setBirthBeat] = useState(0);
  const [muted, setMuted] = useState(true);
  const [previewPath, setPreviewPath] = useState<WorldPath | null>(null);
  const [loadedVisuals, setLoadedVisuals] = useState<Set<WorldPath>>(
    () => new Set<WorldPath>(["/", normalizePath(window.location.pathname)]),
  );
  const shell = useRef<HTMLDivElement>(null);
  const narrow = useMediaQuery("(max-width: 900px)");
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const webgl = useMemo(() => supportsWebGL2(), []);
  const force3DPreview = useMemo(
    () =>
      new URLSearchParams(window.location.search).get("force3d") === "1" ||
      new URLSearchParams(window.location.search).get("preview") === "1",
    [],
  );

  useAmbientSound(!muted);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    const visualPath = previewPath ?? path;
    setLoadedVisuals((current) => {
      if (current.has(visualPath)) return current;
      const next = new Set(current);
      next.add(visualPath);
      return next;
    });
  }, [path, previewPath]);

  const navigate = useCallback((nextPath: WorldPath) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setPath(nextPath);
    if (nextPath !== "/") {
      setStage("revealed");
      sessionStorage.setItem(SESSION_KEY, "1");
    }
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const nextPath = normalizePath(window.location.pathname);
      setPath(nextPath);
      if (nextPath !== "/") setStage("revealed");
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const meta = routeMeta[path];
    document.title = meta.title;
    document.querySelector('meta[name="description"]')?.setAttribute("content", meta.description);
  }, [path]);

  useEffect(() => {
    if (stage !== "birthing") return;
    const beatOne = window.setTimeout(() => setBirthBeat(1), 2100);
    const beatTwo = window.setTimeout(() => setBirthBeat(2), 4200);
    const finish = window.setTimeout(() => {
      setStage("revealed");
      sessionStorage.setItem(SESSION_KEY, "1");
    }, 6800);
    return () => {
      window.clearTimeout(beatOne);
      window.clearTimeout(beatTwo);
      window.clearTimeout(finish);
    };
  }, [stage]);

  const startBirth = useCallback(() => {
    if (stage !== "seed") return;
    setBirthBeat(0);
    setStage("birthing");
  }, [stage]);

  const replay = useCallback(() => {
    navigate("/");
    setBirthBeat(0);
    setStage("seed");
    window.setTimeout(() => setStage("birthing"), 420);
  }, [navigate]);

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!shell.current) return;
    shell.current.style.setProperty("--pointer-x", `${event.clientX}px`);
    shell.current.style.setProperty("--pointer-y", `${event.clientY}px`);
    const x = (event.clientX / window.innerWidth - 0.5) * -12;
    const y = (event.clientY / window.innerHeight - 0.5) * -7;
    shell.current.style.setProperty("--parallax-x", `${x}px`);
    shell.current.style.setProperty("--parallax-y", `${y}px`);
  }, []);

  const fallbackReason = force3DPreview
    ? null
    : narrow
      ? "narrow"
      : reducedMotion
        ? "reduced"
        : !webgl
          ? "webgl"
          : null;
  if (fallbackReason) {
    return <StaticExperience path={path} reason={fallbackReason} onNavigate={navigate} />;
  }

  return (
    <div
      ref={shell}
      className={`world-shell stage-${stage} route-${path.replace("/", "") || "home"} ${
        previewPath ? `preview-${previewPath.replace("/", "")}` : ""
      }`}
      onPointerMove={handlePointerMove}
    >
      <div className="world-plate world-plate-home" aria-hidden="true">
        <img src="/assets/world-home-anime.webp" alt="" />
      </div>
      <div className="world-plate world-plate-imagine" aria-hidden="true">
        {loadedVisuals.has("/imagine") && <img src="/assets/world-imagine-anime.webp" alt="" />}
      </div>
      <div className="world-plate world-plate-alive" aria-hidden="true">
        {loadedVisuals.has("/alive") && <img src="/assets/world-alive-anime.webp" alt="" />}
      </div>
      <div className="world-plate world-plate-connect" aria-hidden="true">
        {loadedVisuals.has("/connect") && <img src="/assets/world-connect-anime.webp" alt="" />}
      </div>
      <div className="world-plate world-plate-about" aria-hidden="true">
        {loadedVisuals.has("/about") && <img src="/assets/world-about-anime.webp" alt="" />}
      </div>
      <SceneBoundary>
        <Suspense fallback={null}>
          <WorldScene path={path} stage={stage} />
        </Suspense>
      </SceneBoundary>
      <LivingWorldOverlay />
      <div className="dawn-bloom" aria-hidden="true" />
      <div className="world-vignette" aria-hidden="true" />
      <div className="world-grain" aria-hidden="true" />
      <div className="pointer-aura" aria-hidden="true" />

      <header className="world-header">
        <Brand onHome={() => navigate("/")} />
        <Navigation path={path} onNavigate={navigate} />
      </header>

      <BirthOverlay stage={stage} beat={birthBeat} onStart={startBirth} />

      {stage === "revealed" && path === "/" && (
        <HomeOverlay onNavigate={navigate} onPreview={setPreviewPath} />
      )}
      {stage === "revealed" && path !== "/" && path !== "/about" && (
        <DistrictExperience path={path} onClose={() => navigate("/")} />
      )}
      {stage === "revealed" && path === "/about" && <AboutOverlay onClose={() => navigate("/")} />}

      {stage === "revealed" && (
        <UtilityBar
          muted={muted}
          onToggleSound={() => setMuted((current) => !current)}
          onReplay={replay}
        />
      )}
    </div>
  );
}

export default App;
