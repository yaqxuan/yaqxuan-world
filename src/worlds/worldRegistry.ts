import { Color, MathUtils, Vector3 } from "three";
import type { Locale, RealmId } from "../i18n";

export const WORLD_IDS = [
  "aether-sanctuary",
  "astral-citadel",
  "abyssal-garden",
  "aurora-prism",
  "solaris-oasis",
  "emerald-terraces",
] as const;

export type WorldId = (typeof WORLD_IDS)[number];

export type TimePresetId = "dusk" | "dawn" | "noon" | "night";
export type CameraPresetId = "panorama" | "hero" | "sanctum" | "vista" | "autoOrbit";

export interface WorldCameraPreset {
  id: Exclude<CameraPresetId, "autoOrbit">;
  label: Record<Locale, string>;
  position: [number, number, number];
  target: [number, number, number];
}

export interface WorldKeyframe {
  t: number;
  zenith: string;
  midSky: string;
  horizon: string;
  sun: string;
  sunElevation: number;
  sunAzimuth: number;
  sunIntensity: number;
  ambSky: string;
  ambGround: string;
  ambIntensity: number;
  fog: string;
  fogDensity: number;
  cloudLit: string;
  cloudShadow: string;
  waterDeep: string;
  waterShallow: string;
  stars: number;
  aurora: number;
  planet: number;
  caustics: number;
  emissiveBoost: number;
}

export interface SampledAtmosphere {
  zenithColor: Color;
  midSkyColor: Color;
  horizonColor: Color;
  sunColor: Color;
  sunDirection: Vector3;
  sunIntensity: number;
  ambientSkyColor: Color;
  ambientGroundColor: Color;
  ambientIntensity: number;
  fogColor: Color;
  fogDensity: number;
  cloudLitColor: Color;
  cloudShadowColor: Color;
  waterDeepColor: Color;
  waterShallowColor: Color;
  starVisibility: number;
  auroraStrength: number;
  planetStrength: number;
  causticsStrength: number;
  emissiveBoost: number;
}

export interface WorldSpec {
  id: WorldId;
  code: string;
  linkedRealm: RealmId;
  defaultSeed: number;
  defaultTimePreset: TimePresetId;
  defaultPhase: number;
  primaryCapture: {
    phase: number;
    camera: Exclude<CameraPresetId, "autoOrbit">;
  };
  altCapture: {
    phase: number;
    camera: Exclude<CameraPresetId, "autoOrbit">;
  };
  accentPrimary: string;
  accentSecondary: string;
  accentTertiary: string;
  cloudHeight: number;
  waterHeight: number;
  hasCloudSea: boolean;
  telemetryHint: {
    triangles: string;
    instances: string;
  };
  copy: Record<
    Locale,
    {
      title: string;
      subtitle: string;
      biome: string;
      summary: string;
      primaryShotLabel: string;
      altShotLabel: string;
      highlights: [string, string, string];
    }
  >;
  cameras: WorldCameraPreset[];
  keyframes: WorldKeyframe[];
}

export const TIME_PRESET_PHASES: Record<
  TimePresetId,
  { phase: number; label: Record<Locale, string> }
> = {
  dusk: { phase: 0.28, label: { "zh-CN": "暮霞", en: "Dusk" } },
  dawn: { phase: 0.52, label: { "zh-CN": "破晓", en: "Dawn" } },
  noon: { phase: 0.76, label: { "zh-CN": "晴昼", en: "Noon" } },
  night: { phase: 0.05, label: { "zh-CN": "星夜", en: "Night" } },
};

export const WORLD_SPECS: Record<WorldId, WorldSpec> = {
  "aether-sanctuary": {
    id: "aether-sanctuary",
    code: "01",
    linkedRealm: "home",
    defaultSeed: 2026,
    defaultTimePreset: "dusk",
    defaultPhase: 0.28,
    primaryCapture: { phase: 0.28, camera: "panorama" },
    altCapture: { phase: 0.05, camera: "sanctum" },
    accentPrimary: "#ff9e64",
    accentSecondary: "#4ff0df",
    accentTertiary: "#f472b6",
    cloudHeight: -8.5,
    waterHeight: 0.28,
    hasCloudSea: true,
    telemetryHint: { triangles: "42,600", instances: "14,200" },
    copy: {
      "zh-CN": {
        title: "云海星枢",
        subtitle: "Aether Sanctuary",
        biome: "暮霞浮岛 · 浑天圆殿",
        summary:
          "悬浮于赤金流云之上的群岛圣殿。十二根凹槽白玉柱托起三轴旋转浑天星仪，古樱与双叠飞瀑倒映在火山口镜湖之中。",
        primaryShotLabel: "暮霞全景",
        altShotLabel: "星夜内庭",
        highlights: ["三轴鎏金浑天仪", "重檐六角亭与朱红鸟居", "1.4 万株风场摇曳草海"],
      },
      en: {
        title: "Aether Sanctuary",
        subtitle: "Crimson Cloud Archipelago",
        biome: "Floating Isles · Observatory Dome",
        summary:
          "A celestial archipelago suspended above crimson-gold clouds. Twelve fluted marble columns crown a rotating armillary sphere reflected in a mirror crater lake.",
        primaryShotLabel: "Crimson Dusk",
        altShotLabel: "Starlit Rotunda",
        highlights: ["3-Axis Gilded Armillary", "Pagoda & Twin Torii Bridges", "14k Wind-Swaying Blades"],
      },
    },
    cameras: [
      {
        id: "panorama",
        label: { "zh-CN": "云海全景", en: "Panorama" },
        position: [24.5, 12.8, 27.0],
        target: [0.4, 2.8, -2.0],
      },
      {
        id: "hero",
        label: { "zh-CN": "石桥步入", en: "Arch Bridge" },
        position: [16.8, 5.2, 8.8],
        target: [-0.8, 3.1, -1.2],
      },
      {
        id: "sanctum",
        label: { "zh-CN": "浑天内庭", en: "Rotunda" },
        position: [-9.2, 4.4, 14.5],
        target: [0.3, 3.3, -0.8],
      },
      {
        id: "vista",
        label: { "zh-CN": "飞瀑流霞", en: "Twin Falls" },
        position: [-19.5, 6.4, 21.0],
        target: [-3.5, 1.5, 1.2],
      },
    ],
    keyframes: [
      {
        t: 0.05,
        zenith: "#05091e",
        midSky: "#131842",
        horizon: "#36215e",
        sun: "#7dd3fc",
        sunElevation: 0.24,
        sunAzimuth: -0.65,
        sunIntensity: 1.25,
        ambSky: "#4c62b5",
        ambGround: "#1b1736",
        ambIntensity: 0.72,
        fog: "#121536",
        fogDensity: 0.0032,
        cloudLit: "#4a4685",
        cloudShadow: "#101230",
        waterDeep: "#07142b",
        waterShallow: "#2288a8",
        stars: 1.0,
        aurora: 0.85,
        planet: 0.35,
        caustics: 0.25,
        emissiveBoost: 1.45,
      },
      {
        t: 0.28,
        zenith: "#110d35",
        midSky: "#781d48",
        horizon: "#ff7a33",
        sun: "#ffc44d",
        sunElevation: 0.14,
        sunAzimuth: -0.45,
        sunIntensity: 1.85,
        ambSky: "#f08a65",
        ambGround: "#3b1d38",
        ambIntensity: 0.75,
        fog: "#3f1c3a",
        fogDensity: 0.0028,
        cloudLit: "#ff9852",
        cloudShadow: "#35183b",
        waterDeep: "#161233",
        waterShallow: "#ff6b4a",
        stars: 0.52,
        aurora: 0.12,
        planet: 0.25,
        caustics: 0.35,
        emissiveBoost: 1.2,
      },
      {
        t: 0.52,
        zenith: "#102a5c",
        midSky: "#435da8",
        horizon: "#ffb866",
        sun: "#ffe49e",
        sunElevation: 0.22,
        sunAzimuth: 0.55,
        sunIntensity: 1.78,
        ambSky: "#82b8f5",
        ambGround: "#453247",
        ambIntensity: 0.78,
        fog: "#3f4673",
        fogDensity: 0.0025,
        cloudLit: "#ffcf91",
        cloudShadow: "#3d4975",
        waterDeep: "#0e2b4c",
        waterShallow: "#38bdf8",
        stars: 0.12,
        aurora: 0.0,
        planet: 0.1,
        caustics: 0.5,
        emissiveBoost: 0.85,
      },
      {
        t: 0.76,
        zenith: "#07366b",
        midSky: "#1f78d1",
        horizon: "#8bd8ff",
        sun: "#fff3cc",
        sunElevation: 0.54,
        sunAzimuth: 0.25,
        sunIntensity: 1.88,
        ambSky: "#99d4ff",
        ambGround: "#365363",
        ambIntensity: 0.82,
        fog: "#4389bd",
        fogDensity: 0.0022,
        cloudLit: "#e0f2fe",
        cloudShadow: "#5b89ba",
        waterDeep: "#083359",
        waterShallow: "#2dd4bf",
        stars: 0.0,
        aurora: 0.0,
        planet: 0.0,
        caustics: 0.7,
        emissiveBoost: 0.7,
      },
    ],
  },

  "astral-citadel": {
    id: "astral-citadel",
    code: "02",
    linkedRealm: "imagine",
    defaultSeed: 4096,
    defaultTimePreset: "night",
    defaultPhase: 0.08,
    primaryCapture: { phase: 0.08, camera: "panorama" },
    altCapture: { phase: 0.29, camera: "hero" },
    accentPrimary: "#38bdf8",
    accentSecondary: "#fbbf24",
    accentTertiary: "#818cf8",
    cloudHeight: -10.5,
    waterHeight: -0.15,
    hasCloudSea: true,
    telemetryHint: { triangles: "46,800", instances: "9,600" },
    copy: {
      "zh-CN": {
        title: "星轨悬城",
        subtitle: "Chronos Astrolabe Citadel",
        biome: "巨环行星 · 星象悬城",
        summary:
          "在巨型光环气态行星的凝视下，四重反向运转的黄铜浑天巨环包裹着六座白曜石星象高塔，星光渡槽将记忆与轨道相连。",
        primaryShotLabel: "深空星环",
        altShotLabel: "金辉星盘",
        highlights: ["巨型光环行星天幕", "四重逆旋黄铜星轨环", "六座飞扶壁星象高塔"],
      },
      en: {
        title: "Chronos Citadel",
        subtitle: "Astrolabe Ring City",
        biome: "Ringed Planet · Celestial Orrery",
        summary:
          "Beneath a colossal ringed gas giant, four counter-rotating brass astrolabe rings encircle six marble archive spires linked by luminous starlight aqueducts.",
        primaryShotLabel: "Sapphire Nebula",
        altShotLabel: "Gilded Alignment",
        highlights: ["Procedural Ringed Giant", "4-Ring Gyroscopic Orrery", "6 Flying-Buttress Spires"],
      },
    },
    cameras: [
      {
        id: "panorama",
        label: { "zh-CN": "星城全貌", en: "Citadel Vista" },
        position: [25.5, 11.2, 27.0],
        target: [-1.2, 5.4, -2.5],
      },
      {
        id: "hero",
        label: { "zh-CN": "星环仰视", en: "Orrery Core" },
        position: [15.8, 6.2, 16.4],
        target: [-1.5, 6.2, -1.5],
      },
      {
        id: "sanctum",
        label: { "zh-CN": "星光渡槽", en: "Sky Aqueduct" },
        position: [-14.8, 7.2, 14.8],
        target: [1.0, 5.2, -1.5],
      },
      {
        id: "vista",
        label: { "zh-CN": "行星天际", en: "Ringed Horizon" },
        position: [0.5, 5.4, 25.5],
        target: [-2.0, 6.5, -8.0],
      },
    ],
    keyframes: [
      {
        t: 0.08,
        zenith: "#020717",
        midSky: "#091c3e",
        horizon: "#16406b",
        sun: "#67e8f9",
        sunElevation: 0.26,
        sunAzimuth: -0.52,
        sunIntensity: 1.58,
        ambSky: "#4f94f0",
        ambGround: "#121f45",
        ambIntensity: 0.72,
        fog: "#081730",
        fogDensity: 0.0028,
        cloudLit: "#2ea8e6",
        cloudShadow: "#071126",
        waterDeep: "#040f24",
        waterShallow: "#38bdf8",
        stars: 1.0,
        aurora: 0.52,
        planet: 1.0,
        caustics: 0.45,
        emissiveBoost: 1.4,
      },
      {
        t: 0.29,
        zenith: "#0b0d2c",
        midSky: "#341c5c",
        horizon: "#e68a00",
        sun: "#fcd34d",
        sunElevation: 0.16,
        sunAzimuth: 0.48,
        sunIntensity: 1.82,
        ambSky: "#b074f5",
        ambGround: "#2e1938",
        ambIntensity: 0.76,
        fog: "#21163f",
        fogDensity: 0.0026,
        cloudLit: "#f59e0b",
        cloudShadow: "#17143b",
        waterDeep: "#0c1324",
        waterShallow: "#f59e0b",
        stars: 0.78,
        aurora: 0.28,
        planet: 0.92,
        caustics: 0.4,
        emissiveBoost: 1.25,
      },
      {
        t: 0.52,
        zenith: "#082347",
        midSky: "#1d4ed8",
        horizon: "#60a5fa",
        sun: "#fde68a",
        sunElevation: 0.3,
        sunAzimuth: -0.35,
        sunIntensity: 1.78,
        ambSky: "#7dd3fc",
        ambGround: "#172d4a",
        ambIntensity: 0.78,
        fog: "#15345c",
        fogDensity: 0.0024,
        cloudLit: "#93c5fd",
        cloudShadow: "#172e6e",
        waterDeep: "#07263d",
        waterShallow: "#38bdf8",
        stars: 0.35,
        aurora: 0.1,
        planet: 0.7,
        caustics: 0.55,
        emissiveBoost: 0.95,
      },
      {
        t: 0.76,
        zenith: "#072c5e",
        midSky: "#1570bf",
        horizon: "#7dd3fc",
        sun: "#fffbeb",
        sunElevation: 0.52,
        sunAzimuth: 0.2,
        sunIntensity: 1.88,
        ambSky: "#bae6fd",
        ambGround: "#264766",
        ambIntensity: 0.82,
        fog: "#3878ad",
        fogDensity: 0.0022,
        cloudLit: "#dbeafe",
        cloudShadow: "#4676a8",
        waterDeep: "#062f57",
        waterShallow: "#38bdf8",
        stars: 0.1,
        aurora: 0.0,
        planet: 0.5,
        caustics: 0.65,
        emissiveBoost: 0.8,
      },
    ],
  },

  "abyssal-garden": {
    id: "abyssal-garden",
    code: "03",
    linkedRealm: "alive",
    defaultSeed: 7712,
    defaultTimePreset: "dusk",
    defaultPhase: 0.28,
    primaryCapture: { phase: 0.28, camera: "panorama" },
    altCapture: { phase: 0.52, camera: "hero" },
    accentPrimary: "#2dd4bf",
    accentSecondary: "#fb7185",
    accentTertiary: "#fbbf24",
    cloudHeight: -12.0,
    waterHeight: 16.5,
    hasCloudSea: false,
    telemetryHint: { triangles: "39,400", instances: "8,400" },
    copy: {
      "zh-CN": {
        title: "荧光灵渊",
        subtitle: "Bioluminescent Abyss",
        biome: "深海圣堂 · 灵母与鱼群",
        summary:
          "海面丁达尔光柱刺破幽蓝灵渊，巨型半透明发光水母在螺旋珊瑚拱门与珍珠列柱间律动上浮，数百尾金青灵鱼环绕记忆祭坛巡游。",
        primaryShotLabel: "幽海荧光",
        altShotLabel: "浅海金束",
        highlights: ["7 尊律动半透明发光水母", "丁达尔深海天光束", "650 尾环游发光鱼群"],
      },
      en: {
        title: "Abyssal Sanctuary",
        subtitle: "Bioluminescent Reef Cathedral",
        biome: "Sunken Temple · Living Jellyfish",
        summary:
          "Volumetric god-rays pierce an emerald-sapphire abyss where translucent bioluminescent jellyfish drift past coral arches, pearl columns, and swirling schools of golden fish.",
        primaryShotLabel: "Bioluminescent Glow",
        altShotLabel: "Sunlit Reef Rays",
        highlights: ["7 Pulsing Jellyfish", "Volumetric Ocean God-Rays", "650 Orbiting Spirit Fish"],
      },
    },
    cameras: [
      {
        id: "panorama",
        label: { "zh-CN": "灵渊圣堂", en: "Reef Sanctuary" },
        position: [18.2, 9.2, 19.8],
        target: [0.0, 4.4, -0.8],
      },
      {
        id: "hero",
        label: { "zh-CN": "水母仰望", en: "Jellyfish Drift" },
        position: [-8.2, 5.2, 9.8],
        target: [0.4, 5.0, -0.8],
      },
      {
        id: "sanctum",
        label: { "zh-CN": "珍珠祭坛", en: "Pearl Altar" },
        position: [10.2, 4.2, 12.2],
        target: [0.0, 3.2, 0.0],
      },
      {
        id: "vista",
        label: { "zh-CN": "珊瑚长拱", en: "Coral Arches" },
        position: [-16.5, 7.6, -13.5],
        target: [0.8, 4.0, 0.8],
      },
    ],
    keyframes: [
      {
        t: 0.05,
        zenith: "#02101f",
        midSky: "#04263f",
        horizon: "#08445e",
        sun: "#38bdf8",
        sunElevation: 0.65,
        sunAzimuth: 0.1,
        sunIntensity: 1.35,
        ambSky: "#2dd4bf",
        ambGround: "#18163d",
        ambIntensity: 0.72,
        fog: "#031a2e",
        fogDensity: 0.0052,
        cloudLit: "#2dd4bf",
        cloudShadow: "#031526",
        waterDeep: "#03182b",
        waterShallow: "#14b8a6",
        stars: 0.4,
        aurora: 0.35,
        planet: 0.0,
        caustics: 0.9,
        emissiveBoost: 1.5,
      },
      {
        t: 0.28,
        zenith: "#03263d",
        midSky: "#064c66",
        horizon: "#0e6e82",
        sun: "#5eead4",
        sunElevation: 0.72,
        sunAzimuth: -0.2,
        sunIntensity: 1.68,
        ambSky: "#4fd1c5",
        ambGround: "#2e163b",
        ambIntensity: 0.78,
        fog: "#042b42",
        fogDensity: 0.0045,
        cloudLit: "#5eead4",
        cloudShadow: "#06283d",
        waterDeep: "#052940",
        waterShallow: "#2dd4bf",
        stars: 0.2,
        aurora: 0.25,
        planet: 0.0,
        caustics: 1.0,
        emissiveBoost: 1.35,
      },
      {
        t: 0.52,
        zenith: "#053d52",
        midSky: "#0a6f82",
        horizon: "#24b5a5",
        sun: "#fcd34d",
        sunElevation: 0.78,
        sunAzimuth: 0.28,
        sunIntensity: 1.85,
        ambSky: "#5eead4",
        ambGround: "#2c2a8a",
        ambIntensity: 0.82,
        fog: "#074557",
        fogDensity: 0.004,
        cloudLit: "#99f6e4",
        cloudShadow: "#0b4654",
        waterDeep: "#084c61",
        waterShallow: "#5eead4",
        stars: 0.0,
        aurora: 0.0,
        planet: 0.0,
        caustics: 1.1,
        emissiveBoost: 1.15,
      },
      {
        t: 0.76,
        zenith: "#06495c",
        midSky: "#0e8296",
        horizon: "#48cae4",
        sun: "#fef9c3",
        sunElevation: 0.85,
        sunAzimuth: 0.0,
        sunIntensity: 1.92,
        ambSky: "#99f6e4",
        ambGround: "#163d4d",
        ambIntensity: 0.85,
        fog: "#0b5263",
        fogDensity: 0.0038,
        cloudLit: "#ccfbf1",
        cloudShadow: "#0e5869",
        waterDeep: "#0b5269",
        waterShallow: "#64dfdf",
        stars: 0.0,
        aurora: 0.0,
        planet: 0.0,
        caustics: 1.15,
        emissiveBoost: 0.95,
      },
    ],
  },

  "aurora-prism": {
    id: "aurora-prism",
    code: "04",
    linkedRealm: "connect",
    defaultSeed: 8848,
    defaultTimePreset: "night",
    defaultPhase: 0.06,
    primaryCapture: { phase: 0.06, camera: "panorama" },
    altCapture: { phase: 0.52, camera: "hero" },
    accentPrimary: "#c084fc",
    accentSecondary: "#34d399",
    accentTertiary: "#f472b6",
    cloudHeight: -9.5,
    waterHeight: 0.0,
    hasCloudSea: false,
    telemetryHint: { triangles: "41,200", instances: "11,500" },
    copy: {
      "zh-CN": {
        title: "极光琉璃境",
        subtitle: "Aurora Crystal Fjord",
        biome: "极地冰湾 · 共鸣晶碑",
        summary:
          "翡翠与幻紫极光垂落如天幕绸缎，巨型六棱琉璃共鸣晶碑耸立于镜面冰湾中央，三道发光光弦桥将覆雪玄武岩峰与暖灯木阁相连。",
        primaryShotLabel: "幻紫极光",
        altShotLabel: "冰湾破晓",
        highlights: ["多幕翡翠幻紫极光带", "六棱自发光共鸣晶碑群", "寒潭镜面光弦悬索桥"],
      },
      en: {
        title: "Aurora Crystal Fjord",
        subtitle: "Resonant Prism Lagoon",
        biome: "Arctic Fjord · Borealis Spires",
        summary:
          "Ribbons of emerald and violet aurora drape over a mirror-still arctic lagoon, reflecting towering hexagonal crystal spires, harmonic light bridges, and warm beacon shrines.",
        primaryShotLabel: "Aurora Curtain",
        altShotLabel: "Rose-Ice Dawn",
        highlights: ["Multi-Curtain Borealis", "Hexagonal Crystal Obelisks", "Harmonic Light Bridges"],
      },
    },
    cameras: [
      {
        id: "panorama",
        label: { "zh-CN": "冰湾极光", en: "Fjord Panorama" },
        position: [17.6, 8.2, 19.6],
        target: [-0.4, 4.5, -1.2],
      },
      {
        id: "hero",
        label: { "zh-CN": "光弦冰桥", en: "Light Bridge" },
        position: [12.8, 4.2, 15.2],
        target: [-0.2, 4.8, -0.5],
      },
      {
        id: "sanctum",
        label: { "zh-CN": "琉璃晶阵", en: "Crystal Spire" },
        position: [-10.8, 4.4, 13.8],
        target: [0.0, 5.2, 0.0],
      },
      {
        id: "vista",
        label: { "zh-CN": "雪峰暖阁", en: "Beacon Shore" },
        position: [16.5, 6.8, -14.5],
        target: [-1.2, 3.6, 1.2],
      },
    ],
    keyframes: [
      {
        t: 0.06,
        zenith: "#04061a",
        midSky: "#131138",
        horizon: "#232459",
        sun: "#6ee7b7",
        sunElevation: 0.18,
        sunAzimuth: -0.6,
        sunIntensity: 1.38,
        ambSky: "#727cf0",
        ambGround: "#181d3b",
        ambIntensity: 0.68,
        fog: "#0e1230",
        fogDensity: 0.0028,
        cloudLit: "#6ee7b7",
        cloudShadow: "#121636",
        waterDeep: "#060b21",
        waterShallow: "#34d399",
        stars: 1.0,
        aurora: 1.35,
        planet: 0.3,
        caustics: 0.35,
        emissiveBoost: 1.45,
      },
      {
        t: 0.28,
        zenith: "#110d30",
        midSky: "#461e5c",
        horizon: "#db2777",
        sun: "#f9a8d4",
        sunElevation: 0.14,
        sunAzimuth: 0.45,
        sunIntensity: 1.68,
        ambSky: "#d946ef",
        ambGround: "#25173b",
        ambIntensity: 0.72,
        fog: "#2b1642",
        fogDensity: 0.0026,
        cloudLit: "#f472b6",
        cloudShadow: "#1e1236",
        waterDeep: "#0f0c29",
        waterShallow: "#e879f9",
        stars: 0.72,
        aurora: 0.85,
        planet: 0.2,
        caustics: 0.4,
        emissiveBoost: 1.25,
      },
      {
        t: 0.52,
        zenith: "#0f254f",
        midSky: "#434c8f",
        horizon: "#f472b6",
        sun: "#fbcfe8",
        sunElevation: 0.2,
        sunAzimuth: 0.52,
        sunIntensity: 1.65,
        ambSky: "#93c5fd",
        ambGround: "#334155",
        ambIntensity: 0.74,
        fog: "#36416e",
        fogDensity: 0.0024,
        cloudLit: "#f9a8d4",
        cloudShadow: "#334155",
        waterDeep: "#0e203d",
        waterShallow: "#38bdf8",
        stars: 0.28,
        aurora: 0.42,
        planet: 0.0,
        caustics: 0.5,
        emissiveBoost: 1.0,
      },
      {
        t: 0.76,
        zenith: "#083461",
        midSky: "#236ec4",
        horizon: "#93c5fd",
        sun: "#fef9c3",
        sunElevation: 0.46,
        sunAzimuth: -0.25,
        sunIntensity: 1.78,
        ambSky: "#bae6fd",
        ambGround: "#475569",
        ambIntensity: 0.78,
        fog: "#4778a8",
        fogDensity: 0.0022,
        cloudLit: "#e0f2fe",
        cloudShadow: "#64748b",
        waterDeep: "#0a2d52",
        waterShallow: "#38bdf8",
        stars: 0.0,
        aurora: 0.0,
        planet: 0.0,
        caustics: 0.65,
        emissiveBoost: 0.75,
      },
    ],
  },

  "solaris-oasis": {
    id: "solaris-oasis",
    code: "05",
    linkedRealm: "about",
    defaultSeed: 5180,
    defaultTimePreset: "dawn",
    defaultPhase: 0.52,
    primaryCapture: { phase: 0.52, camera: "panorama" },
    altCapture: { phase: 0.28, camera: "hero" },
    accentPrimary: "#fbbf24",
    accentSecondary: "#2dd4bf",
    accentTertiary: "#fb7185",
    cloudHeight: -9.0,
    waterHeight: 0.05,
    hasCloudSea: false,
    telemetryHint: { triangles: "40,500", instances: "9,800" },
    copy: {
      "zh-CN": {
        title: "破晓金沙神殿",
        subtitle: "Solaris Mirage Oasis",
        biome: "赤金沙海 · 绿洲日冕",
        summary:
          "玫瑰金晨曦掠过流线风纹沙丘，翡翠色新月绿洲环抱着阶梯砂岩太阳神殿与四座金顶方尖碑，高空悬浮棱镜折射出破晓光柱。",
        primaryShotLabel: "破晓绿洲",
        altShotLabel: "赤霞方尖碑",
        highlights: ["风纹流线金沙丘地形", "阶梯太阳神殿与日冕棱镜", "翡翠新月泉与引水石拱"],
      },
      en: {
        title: "Solaris Mirage Oasis",
        subtitle: "Dawn Ziggurat & Lagoon",
        biome: "Golden Dunes · Turquoise Oasis",
        summary:
          "Rose-gold dawn sweeps across wind-rippled desert dunes cradling a crescent turquoise oasis, a stepped sandstone ziggurat, four gilded obelisks, and a levitating solar prism.",
        primaryShotLabel: "Rose-Gold Dawn",
        altShotLabel: "Crimson Mirage",
        highlights: ["Wind-Rippled Sand Dunes", "Solar Ziggurat & Obelisks", "Crescent Oasis Aqueducts"],
      },
    },
    cameras: [
      {
        id: "panorama",
        label: { "zh-CN": "绿洲全境", en: "Oasis Vista" },
        position: [23.5, 11.6, 25.5],
        target: [0.0, 3.2, -2.8],
      },
      {
        id: "hero",
        label: { "zh-CN": "泉畔仰望", en: "Lagoon Shore" },
        position: [-13.8, 4.2, 17.8],
        target: [0.0, 4.6, -4.2],
      },
      {
        id: "sanctum",
        label: { "zh-CN": "日冕圣坛", en: "Solar Prism" },
        position: [11.8, 5.4, 13.5],
        target: [0.0, 5.5, -4.0],
      },
      {
        id: "vista",
        label: { "zh-CN": "渡槽棕影", en: "Palm Aqueduct" },
        position: [19.5, 6.8, -6.5],
        target: [-2.0, 2.8, -1.5],
      },
    ],
    keyframes: [
      {
        t: 0.05,
        zenith: "#070b22",
        midSky: "#171f4d",
        horizon: "#3f2c63",
        sun: "#fcd34d",
        sunElevation: 0.22,
        sunAzimuth: -0.5,
        sunIntensity: 1.35,
        ambSky: "#5c5fe6",
        ambGround: "#2e1f18",
        ambIntensity: 0.7,
        fog: "#1a1836",
        fogDensity: 0.0028,
        cloudLit: "#818cf8",
        cloudShadow: "#14132e",
        waterDeep: "#07263d",
        waterShallow: "#2dd4bf",
        stars: 1.0,
        aurora: 0.25,
        planet: 0.65,
        caustics: 0.45,
        emissiveBoost: 1.35,
      },
      {
        t: 0.28,
        zenith: "#1c1030",
        midSky: "#822547",
        horizon: "#ff7e36",
        sun: "#fbbf24",
        sunElevation: 0.14,
        sunAzimuth: -0.35,
        sunIntensity: 1.82,
        ambSky: "#fb7185",
        ambGround: "#4f2c1f",
        ambIntensity: 0.74,
        fog: "#572836",
        fogDensity: 0.0025,
        cloudLit: "#ff9e57",
        cloudShadow: "#3d1b2d",
        waterDeep: "#093c4a",
        waterShallow: "#14b8a6",
        stars: 0.38,
        aurora: 0.0,
        planet: 0.35,
        caustics: 0.65,
        emissiveBoost: 1.15,
      },
      {
        t: 0.52,
        zenith: "#122f59",
        midSky: "#9e3f5c",
        horizon: "#ffa95e",
        sun: "#fde047",
        sunElevation: 0.2,
        sunAzimuth: 0.32,
        sunIntensity: 1.85,
        ambSky: "#fdba74",
        ambGround: "#613d26",
        ambIntensity: 0.76,
        fog: "#704747",
        fogDensity: 0.0022,
        cloudLit: "#ffd194",
        cloudShadow: "#5c3d4f",
        waterDeep: "#074754",
        waterShallow: "#14b8a6",
        stars: 0.12,
        aurora: 0.0,
        planet: 0.15,
        caustics: 0.85,
        emissiveBoost: 0.95,
      },
      {
        t: 0.76,
        zenith: "#0a3f78",
        midSky: "#2682c4",
        horizon: "#f5cba7",
        sun: "#fef08a",
        sunElevation: 0.54,
        sunAzimuth: 0.15,
        sunIntensity: 1.92,
        ambSky: "#93c5fd",
        ambGround: "#7c5434",
        ambIntensity: 0.8,
        fog: "#8c7562",
        fogDensity: 0.002,
        cloudLit: "#fef3c7",
        cloudShadow: "#78716c",
        waterDeep: "#065261",
        waterShallow: "#2dd4bf",
        stars: 0.0,
        aurora: 0.0,
        planet: 0.0,
        caustics: 1.0,
        emissiveBoost: 0.75,
      },
    ],
  },

  "emerald-terraces": {
    id: "emerald-terraces",
    code: "06",
    linkedRealm: "home",
    defaultSeed: 6180,
    defaultTimePreset: "noon",
    defaultPhase: 0.76,
    primaryCapture: { phase: 0.76, camera: "panorama" },
    altCapture: { phase: 0.28, camera: "hero" },
    accentPrimary: "#34d399",
    accentSecondary: "#38bdf8",
    accentTertiary: "#fde047",
    cloudHeight: -8.0,
    waterHeight: 0.2,
    hasCloudSea: true,
    telemetryHint: { triangles: "45,100", instances: "15,400" },
    copy: {
      "zh-CN": {
        title: "浮岚叠翠谷",
        subtitle: "Verdant Sky Terraces",
        biome: "世界巨树 · 琉璃云梯田",
        summary:
          "晴昼纯白云海之上，盘根交错的千年世界树撑开翡翠与金叶华盖，七级镜面水梯田层层跌落，崖畔白帆风车随山风轻旋。",
        primaryShotLabel: "晴昼叠翠",
        altShotLabel: "晚照金田",
        highlights: ["盘根千年世界巨树", "七级镜面叠水云梯田", "3 座旋转白帆风车塔"],
      },
      en: {
        title: "Verdant Sky Terraces",
        subtitle: "World-Tree & Cloud Falls",
        biome: "Sunlit Clouds · Mirror Terraces",
        summary:
          "Above sunlit cumulus clouds, a colossal braided World-Tree shelters seven cascading jade water terraces, spinning white wind-sail mills, and wheeling flocks of herons.",
        primaryShotLabel: "Sunlit Terraces",
        altShotLabel: "Golden Sunset",
        highlights: ["Colossal Braided World-Tree", "7 Cascading Mirror Terraces", "3 Spinning Wind-Sail Mills"],
      },
    },
    cameras: [
      {
        id: "panorama",
        label: { "zh-CN": "梯田全景", en: "Terrace Vista" },
        position: [24.5, 14.6, 26.8],
        target: [0.2, 5.0, -1.2],
      },
      {
        id: "hero",
        label: { "zh-CN": "巨树仰视", en: "World-Tree" },
        position: [-18.8, 8.4, 21.2],
        target: [0.0, 6.0, -1.4],
      },
      {
        id: "sanctum",
        label: { "zh-CN": "白帆风车", en: "Wind Mills" },
        position: [18.5, 7.2, 13.0],
        target: [1.5, 4.2, -2.0],
      },
      {
        id: "vista",
        label: { "zh-CN": "镜田飞瀑", en: "Mirror Pools" },
        position: [8.5, 5.2, 22.0],
        target: [-1.0, 2.5, 1.0],
      },
    ],
    keyframes: [
      {
        t: 0.05,
        zenith: "#041024",
        midSky: "#0c284d",
        horizon: "#184c63",
        sun: "#6ee7b7",
        sunElevation: 0.25,
        sunAzimuth: -0.5,
        sunIntensity: 1.32,
        ambSky: "#38bdf8",
        ambGround: "#112b26",
        ambIntensity: 0.68,
        fog: "#0b233b",
        fogDensity: 0.0028,
        cloudLit: "#2ea8e6",
        cloudShadow: "#091b30",
        waterDeep: "#062133",
        waterShallow: "#34d399",
        stars: 0.95,
        aurora: 0.55,
        planet: 0.2,
        caustics: 0.4,
        emissiveBoost: 1.35,
      },
      {
        t: 0.28,
        zenith: "#131c42",
        midSky: "#7a2e52",
        horizon: "#ff8c3b",
        sun: "#fcd34d",
        sunElevation: 0.16,
        sunAzimuth: 0.48,
        sunIntensity: 1.78,
        ambSky: "#f59e0b",
        ambGround: "#283622",
        ambIntensity: 0.72,
        fog: "#4a2e42",
        fogDensity: 0.0024,
        cloudLit: "#ffa95e",
        cloudShadow: "#35213d",
        waterDeep: "#0d3345",
        waterShallow: "#2dd4bf",
        stars: 0.35,
        aurora: 0.0,
        planet: 0.1,
        caustics: 0.65,
        emissiveBoost: 1.1,
      },
      {
        t: 0.52,
        zenith: "#0c3b6e",
        midSky: "#2a7cb5",
        horizon: "#ffd485",
        sun: "#fde68a",
        sunElevation: 0.28,
        sunAzimuth: -0.4,
        sunIntensity: 1.82,
        ambSky: "#7dd3fc",
        ambGround: "#294730",
        ambIntensity: 0.76,
        fog: "#467a99",
        fogDensity: 0.0022,
        cloudLit: "#fde68a",
        cloudShadow: "#4a6f8f",
        waterDeep: "#094252",
        waterShallow: "#14b8a6",
        stars: 0.0,
        aurora: 0.0,
        planet: 0.0,
        caustics: 0.85,
        emissiveBoost: 0.85,
      },
      {
        t: 0.76,
        zenith: "#05336b",
        midSky: "#1574cf",
        horizon: "#74ccf4",
        sun: "#fef08a",
        sunElevation: 0.54,
        sunAzimuth: 0.32,
        sunIntensity: 1.88,
        ambSky: "#93c5fd",
        ambGround: "#264d36",
        ambIntensity: 0.78,
        fog: "#3882ba",
        fogDensity: 0.0019,
        cloudLit: "#dbeafe",
        cloudShadow: "#527da8",
        waterDeep: "#064459",
        waterShallow: "#14b8a6",
        stars: 0.0,
        aurora: 0.0,
        planet: 0.0,
        caustics: 1.0,
        emissiveBoost: 0.75,
      },
    ],
  },
};

const cA = new Color();
const cB = new Color();

export function createEmptyAtmosphere(): SampledAtmosphere {
  return {
    zenithColor: new Color(),
    midSkyColor: new Color(),
    horizonColor: new Color(),
    sunColor: new Color(),
    sunDirection: new Vector3(0.4, 0.4, -0.8),
    sunIntensity: 2.2,
    ambientSkyColor: new Color(),
    ambientGroundColor: new Color(),
    ambientIntensity: 1.0,
    fogColor: new Color(),
    fogDensity: 0.0055,
    cloudLitColor: new Color(),
    cloudShadowColor: new Color(),
    waterDeepColor: new Color(),
    waterShallowColor: new Color(),
    starVisibility: 0,
    auroraStrength: 0,
    planetStrength: 0,
    causticsStrength: 0.5,
    emissiveBoost: 1.0,
  };
}

export function sampleWorldAtmosphere(
  worldId: WorldId,
  phase: number,
  out: SampledAtmosphere = createEmptyAtmosphere(),
): SampledAtmosphere {
  const frames = WORLD_SPECS[worldId].keyframes;
  const p = ((phase % 1) + 1) % 1;

  let prev = frames[frames.length - 1];
  let next = frames[0];
  let span = 1 - prev.t + next.t;
  let local = p >= prev.t ? p - prev.t : p + (1 - prev.t);

  for (let i = 0; i < frames.length - 1; i += 1) {
    if (p >= frames[i].t && p <= frames[i + 1].t) {
      prev = frames[i];
      next = frames[i + 1];
      span = Math.max(0.0001, next.t - prev.t);
      local = p - prev.t;
      break;
    }
  }

  const u = MathUtils.smoothstep(local / span, 0, 1);

  out.zenithColor.copy(cA.set(prev.zenith)).lerp(cB.set(next.zenith), u);
  out.midSkyColor.copy(cA.set(prev.midSky)).lerp(cB.set(next.midSky), u);
  out.horizonColor.copy(cA.set(prev.horizon)).lerp(cB.set(next.horizon), u);
  out.sunColor.copy(cA.set(prev.sun)).lerp(cB.set(next.sun), u);
  out.ambientSkyColor.copy(cA.set(prev.ambSky)).lerp(cB.set(next.ambSky), u);
  out.ambientGroundColor.copy(cA.set(prev.ambGround)).lerp(cB.set(next.ambGround), u);
  out.fogColor.copy(cA.set(prev.fog)).lerp(cB.set(next.fog), u);
  out.cloudLitColor.copy(cA.set(prev.cloudLit)).lerp(cB.set(next.cloudLit), u);
  out.cloudShadowColor.copy(cA.set(prev.cloudShadow)).lerp(cB.set(next.cloudShadow), u);
  out.waterDeepColor.copy(cA.set(prev.waterDeep)).lerp(cB.set(next.waterDeep), u);
  out.waterShallowColor.copy(cA.set(prev.waterShallow)).lerp(cB.set(next.waterShallow), u);

  const elev = MathUtils.lerp(prev.sunElevation, next.sunElevation, u);
  const azim = MathUtils.lerp(prev.sunAzimuth, next.sunAzimuth, u);
  const cosEl = Math.cos(elev * Math.PI * 0.5);
  out.sunDirection
    .set(Math.sin(azim * Math.PI) * cosEl, Math.sin(elev * Math.PI * 0.5), -Math.cos(azim * Math.PI) * cosEl)
    .normalize();

  out.sunIntensity = MathUtils.lerp(prev.sunIntensity, next.sunIntensity, u);
  out.ambientIntensity = MathUtils.lerp(prev.ambIntensity, next.ambIntensity, u);
  out.fogDensity = MathUtils.lerp(prev.fogDensity, next.fogDensity, u);
  out.starVisibility = MathUtils.lerp(prev.stars, next.stars, u);
  out.auroraStrength = MathUtils.lerp(prev.aurora, next.aurora, u);
  out.planetStrength = MathUtils.lerp(prev.planet, next.planet, u);
  out.causticsStrength = MathUtils.lerp(prev.caustics, next.caustics, u);
  out.emissiveBoost = MathUtils.lerp(prev.emissiveBoost, next.emissiveBoost, u);

  return out;
}
