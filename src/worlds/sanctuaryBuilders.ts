import {
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  Matrix4,
  OctahedronGeometry,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from "three";
import {
  bakePart,
  createArchedBridge,
  createBasinTerrainGeometry,
  createFloatingIslandGeometry,
  createHexCrystalCluster,
  createJellyfishGeometry,
  createObservatoryRotunda,
  createPagoda,
  createPalmTree,
  createRecursiveSpiritTree,
  createToriiGate,
  safeMerge,
  sampleFloatingIslandTopY,
  type CanopyClusterAnchor,
} from "./geometryPrimitives";
import { createRng, fbm2D, mix, ridged2D, smoothstep } from "./noise";
import type { WorldId } from "./worldRegistry";

export type WorldDetailTier = "ultra" | "backdrop";

export interface WaterBodySpec {
  position: [number, number, number];
  radius: number;
}

export interface LightBeamSpec {
  position: [number, number, number];
  rotation: [number, number, number];
  radiusTop: number;
  radiusBottom: number;
  height: number;
  color: string;
  opacity: number;
}

export interface KineticElementSpec {
  geometry: BufferGeometry;
  materialKind: "gold" | "emissive" | "wood" | "jellyfish";
  position: [number, number, number];
  initialRotation?: [number, number, number];
  rotationSpeed: [number, number, number];
  bobAmplitude?: number;
  bobSpeed?: number;
  phase?: number;
  jellyfishColors?: [string, string];
}

export interface FlockSpec {
  kind: "birds" | "fish";
  count: number;
  orbitRadius: [number, number];
  heightRange: [number, number];
  colorA: string;
  colorB: string;
  speed: number;
}

export interface GrassInstanceSpec {
  matrix: Matrix4;
  color: Color;
}

export interface BuiltSanctuaryWorld {
  worldId: WorldId;
  terrainGeometry: BufferGeometry;
  stoneGeometry: BufferGeometry;
  woodGeometry: BufferGeometry;
  goldGeometry: BufferGeometry;
  crystalGeometry: BufferGeometry;
  emissiveGeometry: BufferGeometry;
  canopyClusters: CanopyClusterAnchor[];
  grassInstances: GrassInstanceSpec[];
  waterBodies: WaterBodySpec[];
  waterfalls: BufferGeometry[];
  lightBeams: LightBeamSpec[];
  kinetics: KineticElementSpec[];
  pointLights: Array<{
    position: [number, number, number];
    color: string;
    intensity: number;
    distance: number;
  }>;
  flock?: FlockSpec;
  particleColors: [string, string, string];
  stats: {
    triangles: number;
    instances: number;
  };
  dispose: () => void;
}

function addLanternPost(
  pos: Vector3,
  stoneParts: BufferGeometry[],
  emissiveParts: BufferGeometry[],
  glowHex = "#fef08a",
  scale = 1,
) {
  const post = new CylinderGeometry(0.06 * scale, 0.09 * scale, 0.85 * scale, 6);
  post.translate(pos.x, pos.y + 0.42 * scale, pos.z);
  stoneParts.push(bakePart(post, "#334155", "#64748b"));

  const core = new BoxGeometry(0.2 * scale, 0.26 * scale, 0.2 * scale);
  core.translate(pos.x, pos.y + 0.96 * scale, pos.z);
  emissiveParts.push(bakePart(core, glowHex, "#ffffff"));

  const cap = new ConeGeometry(0.26 * scale, 0.22 * scale, 6);
  cap.translate(pos.x, pos.y + 1.18 * scale, pos.z);
  stoneParts.push(bakePart(cap, "#1e293b", "#475569"));
}

function createWaterfallRibbon(
  topPos: Vector3,
  dropHeight: number,
  width: number,
  outwardDir: Vector3,
): BufferGeometry {
  const segX = 8;
  const segY = 18;
  const plane = new PlaneGeometry(width, dropHeight, segX, segY);
  const pos = plane.getAttribute("position");
  const yaw = Math.atan2(outwardDir.x, outwardDir.z);
  const rotM = new Matrix4().makeRotationY(yaw);

  for (let i = 0; i < pos.count; i += 1) {
    const lx = pos.getX(i);
    const ly = pos.getY(i);
    const v = 1 - (ly + dropHeight * 0.5) / dropHeight; // 0 at top, 1 at bottom
    const curveOut = Math.pow(v, 1.45) * 2.1;
    const local = new Vector3(lx * (1 + v * 0.35), -v * dropHeight, curveOut);
    local.applyMatrix4(rotM);
    pos.setXYZ(i, topPos.x + local.x, topPos.y + local.y, topPos.z + local.z);
  }
  plane.computeVertexNormals();
  return plane;
}

function scatterGrassOnCircle(opts: {
  count: number;
  center: [number, number, number];
  minR: number;
  maxR: number;
  heightSampler: (lx: number, lz: number) => number;
  rng: () => number;
  colorA: string;
  colorB: string;
  scaleRange?: [number, number];
  out: GrassInstanceSpec[];
}) {
  const cA = new Color(opts.colorA);
  const cB = new Color(opts.colorB);
  const dummyPos = new Vector3();
  const dummyQuat = new Quaternion();
  const dummyScale = new Vector3();
  const dummyEuler = new Euler();
  const [sMin, sMax] = opts.scaleRange ?? [0.65, 1.35];

  for (let i = 0; i < opts.count; i += 1) {
    const u = opts.rng();
    const r = Math.sqrt(mix(opts.minR * opts.minR, opts.maxR * opts.maxR, u));
    const ang = opts.rng() * Math.PI * 2;
    const lx = Math.cos(ang) * r;
    const lz = Math.sin(ang) * r;
    const ly = opts.heightSampler(lx, lz);
    if (ly < -90) continue;

    dummyPos.set(opts.center[0] + lx, opts.center[1] + ly - 0.03, opts.center[2] + lz);
    dummyEuler.set((opts.rng() - 0.5) * 0.22, opts.rng() * Math.PI * 2, (opts.rng() - 0.5) * 0.22);
    dummyQuat.setFromEuler(dummyEuler);
    const s = mix(sMin, sMax, opts.rng());
    dummyScale.set(s * 0.95, s * (0.85 + opts.rng() * 0.5), s * 0.95);

    const m = new Matrix4().compose(dummyPos, dummyQuat, dummyScale);
    const col = new Color().copy(cA).lerp(cB, opts.rng());
    opts.out.push({ matrix: m, color: col });
  }
}

function finalizeWorld(
  worldId: WorldId,
  buckets: {
    terrain: BufferGeometry[];
    stone: BufferGeometry[];
    wood: BufferGeometry[];
    gold: BufferGeometry[];
    crystal: BufferGeometry[];
    emissive: BufferGeometry[];
    canopyClusters: CanopyClusterAnchor[];
    grassInstances: GrassInstanceSpec[];
    waterBodies: WaterBodySpec[];
    waterfalls: BufferGeometry[];
    lightBeams: LightBeamSpec[];
    kinetics: KineticElementSpec[];
    pointLights: Array<{
      position: [number, number, number];
      color: string;
      intensity: number;
      distance: number;
    }>;
    flock?: FlockSpec;
    particleColors: [string, string, string];
  },
): BuiltSanctuaryWorld {
  const terrainGeometry = safeMerge(buckets.terrain);
  const stoneGeometry = safeMerge(buckets.stone);
  const woodGeometry = safeMerge(buckets.wood);
  const goldGeometry = safeMerge(buckets.gold);
  const crystalGeometry = safeMerge(buckets.crystal);
  const emissiveGeometry = safeMerge(buckets.emissive);

  const countTris = (g: BufferGeometry) => Math.floor(g.getAttribute("position").count / 3);
  let triangles =
    countTris(terrainGeometry) +
    countTris(stoneGeometry) +
    countTris(woodGeometry) +
    countTris(goldGeometry) +
    countTris(crystalGeometry) +
    countTris(emissiveGeometry);

  for (const k of buckets.kinetics) {
    triangles += countTris(k.geometry);
  }
  // Instanced triangles count toward rich visual telemetry
  const clusterTris = buckets.canopyClusters.length * 80;
  const grassTris = buckets.grassInstances.length * 3;
  const flockTris = (buckets.flock?.count ?? 0) * (buckets.flock?.kind === "fish" ? 36 : 2);
  triangles += Math.round(clusterTris * 0.25 + grassTris * 0.2 + flockTris);

  const instances =
    buckets.canopyClusters.length +
    buckets.grassInstances.length +
    (buckets.flock?.count ?? 0);

  return {
    worldId,
    terrainGeometry,
    stoneGeometry,
    woodGeometry,
    goldGeometry,
    crystalGeometry,
    emissiveGeometry,
    canopyClusters: buckets.canopyClusters,
    grassInstances: buckets.grassInstances,
    waterBodies: buckets.waterBodies,
    waterfalls: buckets.waterfalls,
    lightBeams: buckets.lightBeams,
    kinetics: buckets.kinetics,
    pointLights: buckets.pointLights,
    flock: buckets.flock,
    particleColors: buckets.particleColors,
    stats: { triangles, instances },
    dispose: () => {
      terrainGeometry.dispose();
      stoneGeometry.dispose();
      woodGeometry.dispose();
      goldGeometry.dispose();
      crystalGeometry.dispose();
      emissiveGeometry.dispose();
      for (const wf of buckets.waterfalls) wf.dispose();
      for (const k of buckets.kinetics) k.geometry.dispose();
    },
  };
}

/* ============================================================================
   01. AETHER SANCTUARY (云海星枢 · 暮霞浮岛与三轴浑天圆殿)
============================================================================ */
function buildAetherSanctuary(seed: number, detail: WorldDetailTier): BuiltSanctuaryWorld {
  const rng = createRng(seed);
  const isUltra = detail === "ultra";

  const terrain: BufferGeometry[] = [];
  const stone: BufferGeometry[] = [];
  const wood: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  const crystal: BufferGeometry[] = [];
  const emissive: BufferGeometry[] = [];
  const canopyClusters: CanopyClusterAnchor[] = [];
  const grassInstances: GrassInstanceSpec[] = [];
  const waterfalls: BufferGeometry[] = [];
  const kinetics: KineticElementSpec[] = [];
  const lightBeams: LightBeamSpec[] = [];

  const mainOpts = {
    center: [0, 0, 0] as [number, number, number],
    radius: 16.5,
    depth: 21.5,
    seed,
    radialSegs: isUltra ? 64 : 32,
    ringSegs: isUltra ? 26 : 14,
    craterRadius: 7.5,
    craterDepth: 1.55,
    topInnerColor: "#2d6a4f",
    topOuterColor: "#52b788",
    cliffUpperColor: "#4a3b52",
    cliffDeepColor: "#1b1429",
    craterBedColor: "#1e3a5f",
  };
  terrain.push(createFloatingIslandGeometry(mainOpts));

  const subIslands = [
    { center: [23.5, 2.0, -5.5] as [number, number, number], radius: 7.2, depth: 13.5, s: seed + 31 },
    { center: [-21.8, 1.5, 4.5] as [number, number, number], radius: 7.4, depth: 14.0, s: seed + 67 },
    { center: [-1.5, 3.1, -23.2] as [number, number, number], radius: 6.2, depth: 12.2, s: seed + 113 },
  ];

  for (const isl of subIslands) {
    terrain.push(
      createFloatingIslandGeometry({
        center: isl.center,
        radius: isl.radius,
        depth: isl.depth,
        seed: isl.s,
        radialSegs: isUltra ? 40 : 20,
        ringSegs: isUltra ? 14 : 8,
        topInnerColor: "#2d6a4f",
        topOuterColor: "#74c69d",
        cliffUpperColor: "#4a3b52",
        cliffDeepColor: "#1b1429",
      }),
    );
  }

  // Floating spire shards with glowing cyan crystals
  const shards = [
    [15.5, -2.5, 16.0, 2.7, 6.8],
    [-16.5, -1.8, -16.5, 3.0, 7.4],
    [28.5, 5.4, 8.2, 2.4, 5.8],
    [-28.5, 4.8, -10.5, 2.5, 6.2],
    [12.0, 5.2, -26.5, 2.3, 5.6],
  ];
  for (let i = 0; i < (isUltra ? shards.length : 3); i += 1) {
    const [sx, sy, sz, sr, sd] = shards[i];
    terrain.push(
      createFloatingIslandGeometry({
        center: [sx, sy, sz],
        radius: sr,
        depth: sd,
        seed: seed + 200 + i * 17,
        radialSegs: isUltra ? 24 : 14,
        ringSegs: 6,
        topInnerColor: "#40916c",
        topOuterColor: "#74c69d",
        cliffUpperColor: "#4a3b52",
        cliffDeepColor: "#191226",
      }),
    );
    crystal.push(createHexCrystalCluster(new Vector3(sx, sy + 0.7, sz), 0.72, rng, "#0ea5e9", "#a5f3fc", 4));
  }

  // Central Observatory Rotunda + 3-Axis Rotating Armillary Sphere
  const rotunda = createObservatoryRotunda([0, 0.35, 0], 1.02);
  stone.push(rotunda.stone);
  gold.push(rotunda.gold);

  const starCore = new SphereGeometry(0.68, 20, 16);
  starCore.translate(0, 3.15, 0);
  emissive.push(bakePart(starCore, "#38bdf8", "#fef08a"));

  const ringRadii = [1.35, 1.85, 2.35];
  const ringSpeeds: Array<[number, number, number]> = [
    [0.32, 0.52, 0.12],
    [-0.44, 0.22, 0.36],
    [0.18, -0.38, 0.28],
  ];
  ringRadii.forEach((r, idx) => {
    const ringGeo = bakePart(new TorusGeometry(r, 0.048, 10, 48), "#d97706", "#fef08a");
    kinetics.push({
      geometry: ringGeo,
      materialKind: "gold",
      position: [0, 3.15, 0],
      initialRotation: [idx * 0.6, idx * 0.9, idx * 0.4],
      rotationSpeed: ringSpeeds[idx],
    });
  });

  // East 3-tier Pagoda
  const pagoda = createPagoda([23.5, 2.6, -5.5], 0.95);
  stone.push(pagoda.stone);
  wood.push(pagoda.wood);
  gold.push(pagoda.gold);

  // West Twin Vermilion Torii Gates
  wood.push(createToriiGate([-19.2, 2.1, 3.8], -0.22, 0.95));
  wood.push(createToriiGate([-23.2, 2.15, 4.8], -0.22, 0.88));

  // North Starlight Belvedere Ring
  const northArch = new TorusGeometry(2.4, 0.09, 10, 40, Math.PI);
  northArch.translate(-1.5, 3.7, -23.2);
  gold.push(bakePart(northArch, "#d97706", "#fef08a"));

  // 3 Arched Stone Bridges connecting main to East, West, North
  const bridges = [
    createArchedBridge(new Vector3(13.8, 0.85, -3.2), new Vector3(17.4, 2.35, -4.4), 1.9, 1.45),
    createArchedBridge(new Vector3(-13.8, 0.82, 2.8), new Vector3(-15.6, 1.9, 3.4), 1.65, 1.45),
    createArchedBridge(new Vector3(-0.9, 0.9, -14.2), new Vector3(-1.2, 3.35, -17.6), 2.1, 1.38),
  ];
  const lanternPositions: Vector3[] = [];
  for (const b of bridges) {
    stone.push(b.stone);
    gold.push(b.accent);
    lanternPositions.push(...b.lanterns);
  }

  for (const lp of lanternPositions) {
    const glow = new SphereGeometry(0.11, 8, 8);
    glow.translate(lp.x, lp.y, lp.z);
    emissive.push(bakePart(glow, "#fde047", "#ffffff"));
  }

  // Shore lanterns & stepping stones & wooden gondola
  for (let i = 0; i < 6; i += 1) {
    const ang = (i / 6) * Math.PI * 2 + 0.35;
    const lx = Math.cos(ang) * 8.4;
    const lz = Math.sin(ang) * 8.4;
    const ly = sampleFloatingIslandTopY(lx, lz, mainOpts);
    addLanternPost(new Vector3(lx, ly, lz), stone, emissive, "#fef08a", 0.92);
  }

  for (const dirSign of [-1, 1]) {
    for (let s = 0; s < 4; s += 1) {
      const r = 4.35 + s * 0.82;
      const stepStone = new CylinderGeometry(0.42, 0.48, 0.18, 7);
      stepStone.translate(r * dirSign, 0.25, s % 2 === 0 ? 0.18 : -0.14);
      stone.push(bakePart(stepStone, "#cbd5e1", "#f8fafc"));
    }
  }

  // Bobbing gondola on lake
  const hull = new CylinderGeometry(0.28, 0.18, 2.4, 8);
  hull.rotateZ(Math.PI / 2);
  hull.scale(1.0, 0.45, 0.55);
  const gondolaLamp = new SphereGeometry(0.11, 8, 8);
  gondolaLamp.translate(0.85, 0.28, 0);
  kinetics.push({
    geometry: safeMerge([bakePart(hull, "#451a03", "#78350f"), bakePart(gondolaLamp, "#fde047", "#ffffff")]),
    materialKind: "wood",
    position: [1.8, 0.34, 5.2],
    initialRotation: [0, 0.42, 0],
    rotationSpeed: [0, 0.04, 0],
    bobAmplitude: 0.06,
    bobSpeed: 1.6,
  });

  // Crystal accents on main rim
  crystal.push(createHexCrystalCluster(new Vector3(-11.2, 1.05, 8.8), 1.05, rng, "#06b6d4", "#cffafe", 5));
  crystal.push(createHexCrystalCluster(new Vector3(10.8, 1.0, 9.6), 0.92, rng, "#38bdf8", "#e0f2fe", 4));

  // Spirit Blossom Trees (6 in ultra, 4 in backdrop)
  const treeAnchors = [
    { pos: new Vector3(6.2, 0.95, 6.4), h: 6.4 },
    { pos: new Vector3(-7.6, 1.05, -6.2), h: 6.8 },
    { pos: new Vector3(-22.5, 2.2, 6.2), h: 7.2 },
    { pos: new Vector3(25.2, 2.65, -7.2), h: 6.1 },
    { pos: new Vector3(-2.2, 3.75, -24.8), h: 5.8 },
    { pos: new Vector3(9.8, 0.95, -8.5), h: 5.5 },
  ];

  for (let i = 0; i < (isUltra ? treeAnchors.length : 4); i += 1) {
    const t = treeAnchors[i];
    const tree = createRecursiveSpiritTree({
      origin: t.pos,
      height: t.h,
      trunkRadius: 0.34,
      levels: isUltra ? 4 : 3,
      rng,
      trunkBottomColor: "#2b1810",
      trunkTopColor: "#5c3422",
      canopyColors: ["#ec4899", "#fda4af", "#fef3c7"],
    });
    wood.push(tree.trunk);
    canopyClusters.push(...tree.clusters);
  }

  // Dual cascading waterfalls plunging into the cloud sea
  if (isUltra) {
    waterfalls.push(
      createWaterfallRibbon(new Vector3(-11.8, 0.55, 10.6), 14.5, 1.55, new Vector3(-0.7, 0, 0.7)),
      createWaterfallRibbon(new Vector3(-9.5, 0.52, 12.4), 13.0, 1.15, new Vector3(-0.55, 0, 0.82)),
    );
  } else {
    waterfalls.push(
      createWaterfallRibbon(new Vector3(-11.2, 0.55, 10.8), 12.5, 1.45, new Vector3(-0.7, 0, 0.7)),
    );
  }

  // Celestial central starlight beam
  lightBeams.push({
    position: [0, 6.5, 0],
    rotation: [0, 0, 0],
    radiusTop: 0.45,
    radiusBottom: 2.3,
    height: 13.0,
    color: "#7dd3fc",
    opacity: 0.18,
  });

  // Lush wind-swaying grass
  scatterGrassOnCircle({
    count: isUltra ? 8800 : 420,
    center: [0, 0, 0],
    minR: 7.7,
    maxR: 15.2,
    heightSampler: (lx, lz) => sampleFloatingIslandTopY(lx, lz, mainOpts),
    rng,
    colorA: "#1b4332",
    colorB: "#74c69d",
    out: grassInstances,
  });
  for (const isl of subIslands) {
    scatterGrassOnCircle({
      count: isUltra ? 1400 : 90,
      center: isl.center,
      minR: 2.2,
      maxR: isl.radius * 0.88,
      heightSampler: (lx, lz) =>
        sampleFloatingIslandTopY(lx, lz, { radius: isl.radius, seed: isl.s }),
      rng,
      colorA: "#2d6a4f",
      colorB: "#95d5b2",
      out: grassInstances,
    });
  }

  return finalizeWorld("aether-sanctuary", {
    terrain,
    stone,
    wood,
    gold,
    crystal,
    emissive,
    canopyClusters,
    grassInstances,
    waterBodies: [{ position: [0, 0.28, 0], radius: 7.35 }],
    waterfalls,
    lightBeams,
    kinetics,
    pointLights: [
      { position: [0, 3.4, 0], color: "#38bdf8", intensity: 4.2, distance: 22 },
      { position: [15.5, 3.2, -3.8], color: "#fbbf24", intensity: 2.4, distance: 14 },
      { position: [-14.5, 2.8, 3.2], color: "#fb923c", intensity: 2.4, distance: 14 },
    ],
    flock: {
      kind: "birds",
      count: isUltra ? 14 : 6,
      orbitRadius: [14, 28],
      heightRange: [7.5, 14.5],
      colorA: "#fffbeb",
      colorB: "#bae6fd",
      speed: 0.36,
    },
    particleColors: ["#fde68a", "#fda4af", "#7dd3fc"],
  });
}

/* ============================================================================
   02. ASTRAL CITADEL (星轨悬城 · 四重黄铜浑天星环与六座白曜石星象高塔)
============================================================================ */
function buildAstralCitadel(seed: number, detail: WorldDetailTier): BuiltSanctuaryWorld {
  const rng = createRng(seed);
  const isUltra = detail === "ultra";

  const terrain: BufferGeometry[] = [];
  const stone: BufferGeometry[] = [];
  const wood: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  const crystal: BufferGeometry[] = [];
  const emissive: BufferGeometry[] = [];
  const canopyClusters: CanopyClusterAnchor[] = [];
  const grassInstances: GrassInstanceSpec[] = [];
  const kinetics: KineticElementSpec[] = [];
  const lightBeams: LightBeamSpec[] = [];

  // Central Obsidian & Star-Marble Floating Platform
  terrain.push(
    createFloatingIslandGeometry({
      center: [0, -0.4, 0],
      radius: 13.8,
      depth: 19.5,
      seed,
      radialSegs: isUltra ? 56 : 28,
      ringSegs: isUltra ? 18 : 10,
      craterRadius: 8.6,
      craterDepth: 1.2,
      topInnerColor: "#1e293b",
      topOuterColor: "#334155",
      cliffUpperColor: "#1e1b4b",
      cliffDeepColor: "#090d1f",
      craterBedColor: "#0c4a6e",
    }),
  );

  // Engraved stepped central astral dais + gilded zodiac rings
  for (let i = 0; i < 4; i += 1) {
    const r = 5.4 - i * 0.72;
    const step = new CylinderGeometry(r * 0.97, r, 0.34, 36);
    step.translate(0, i * 0.34 + 0.17, 0);
    stone.push(bakePart(step, "#cbd5e1", "#f8fafc"));

    const ring = new TorusGeometry(r * 0.98, 0.05, 8, 48);
    ring.rotateX(Math.PI / 2);
    ring.translate(0, (i + 1) * 0.34, 0);
    gold.push(bakePart(ring, "#d97706", "#fef08a"));
  }

  // Central Gyroscopic 4-Ring Astrolabe Orrery floating at y = 6.2
  const orreryCenterY = 6.3;
  const pulsarCore = new OctahedronGeometry(1.15, 2);
  pulsarCore.translate(0, orreryCenterY, 0);
  emissive.push(bakePart(pulsarCore, "#38bdf8", "#fef9c3"));

  const orreryConfigs: Array<{ r: number; tube: number; speed: [number, number, number]; init: [number, number, number] }> = [
    { r: 3.2, tube: 0.085, speed: [0.35, 0.48, 0.12], init: [0.3, 0.1, 0.2] },
    { r: 4.8, tube: 0.105, speed: [-0.26, 0.32, -0.22], init: [0.8, 0.4, -0.3] },
    { r: 6.6, tube: 0.125, speed: [0.16, -0.24, 0.28], init: [-0.5, 0.9, 0.4] },
    { r: 8.6, tube: 0.14, speed: [-0.09, 0.18, -0.11], init: [0.42, -0.3, 0.65] },
  ];

  for (const cfg of orreryConfigs) {
    const ringParts: BufferGeometry[] = [
      bakePart(new TorusGeometry(cfg.r, cfg.tube, 12, isUltra ? 72 : 44), "#b45309", "#fde68a"),
    ];
    // Degree tick studs & orbiting crystal nodes
    const tickCount = isUltra ? 24 : 12;
    for (let t = 0; t < tickCount; t += 1) {
      const ang = (t / tickCount) * Math.PI * 2;
      const tick = new BoxGeometry(0.08, 0.32, 0.18);
      tick.rotateZ(ang);
      tick.translate(Math.cos(ang) * cfg.r, Math.sin(ang) * cfg.r, 0);
      ringParts.push(bakePart(tick, "#f59e0b", "#fef9c3"));
    }
    const moon = new SphereGeometry(cfg.tube * 2.8, 12, 10);
    moon.translate(cfg.r, 0, 0);
    ringParts.push(bakePart(moon, "#38bdf8", "#ffffff"));

    kinetics.push({
      geometry: safeMerge(ringParts),
      materialKind: "gold",
      position: [0, orreryCenterY, 0],
      initialRotation: cfg.init,
      rotationSpeed: cfg.speed,
    });
  }

  // 6 Satellite Archive Spire Islands + Flying-Buttress Towers + Starlight Aqueduct Bridges
  const towerCount = 6;
  const ringDist = 20.2;
  for (let i = 0; i < towerCount; i += 1) {
    const ang = (i / towerCount) * Math.PI * 2 + 0.26;
    const ix = Math.cos(ang) * ringDist;
    const iz = Math.sin(ang) * ringDist;
    const iy = 1.1 + (i % 2 === 0 ? 0.65 : -0.35);

    terrain.push(
      createFloatingIslandGeometry({
        center: [ix, iy, iz],
        radius: 5.1,
        depth: 12.0,
        seed: seed + 50 + i * 29,
        radialSegs: isUltra ? 32 : 16,
        ringSegs: isUltra ? 10 : 6,
        topInnerColor: "#1e293b",
        topOuterColor: "#475569",
        cliffUpperColor: "#1e1b4b",
        cliffDeepColor: "#090d1f",
      }),
    );

    const towerBaseY = iy + 0.55;
    const towerH = 6.2 + (i % 3) * 1.15;

    // Octagonal marble tower body + gilded rings + spire
    const podium = new CylinderGeometry(2.15, 2.45, 0.7, 8);
    podium.translate(ix, towerBaseY + 0.35, iz);
    stone.push(bakePart(podium, "#94a3b8", "#f1f5f9"));

    const body = new CylinderGeometry(1.18, 1.55, towerH, 8);
    body.translate(ix, towerBaseY + 0.7 + towerH * 0.5, iz);
    stone.push(bakePart(body, "#cbd5e1", "#ffffff"));

    // 4 Gilded vertical ribs
    for (let r = 0; r < 4; r += 1) {
      const ra = ang + (r / 4) * Math.PI * 2;
      const rib = new BoxGeometry(0.16, towerH * 0.92, 0.36);
      rib.rotateY(-ra);
      rib.translate(ix + Math.cos(ra) * 1.38, towerBaseY + 0.7 + towerH * 0.46, iz + Math.sin(ra) * 1.38);
      gold.push(bakePart(rib, "#b45309", "#fde68a"));
    }

    const crown = new TorusGeometry(1.42, 0.09, 8, 28);
    crown.rotateX(Math.PI / 2);
    crown.translate(ix, towerBaseY + 0.7 + towerH, iz);
    gold.push(bakePart(crown, "#d97706", "#fef08a"));

    const spire = new ConeGeometry(1.12, 3.2, 8);
    spire.translate(ix, towerBaseY + 0.7 + towerH + 1.6, iz);
    gold.push(bakePart(spire, "#1d4ed8", "#93c5fd"));

    const starBeacon = new OctahedronGeometry(0.32, 0);
    starBeacon.translate(ix, towerBaseY + 0.7 + towerH + 3.55, iz);
    emissive.push(bakePart(starBeacon, "#38bdf8", "#fef08a"));

    // Luminous Starlight Aqueduct Bridge to central citadel
    const bridgeStart = new Vector3(Math.cos(ang) * 12.2, 0.55, Math.sin(ang) * 12.2);
    const bridgeEnd = new Vector3(ix - Math.cos(ang) * 4.1, towerBaseY + 0.15, iz - Math.sin(ang) * 4.1);
    const bridge = createArchedBridge(
      bridgeStart,
      bridgeEnd,
      2.15,
      1.3,
      ["#cbd5e1", "#f8fafc"],
      ["#38bdf8", "#fef08a"],
    );
    stone.push(bridge.stone);
    emissive.push(bridge.accent);

    // Floating sapphire crystals beside each tower
    crystal.push(
      createHexCrystalCluster(
        new Vector3(ix + Math.cos(ang + 1.2) * 2.8, towerBaseY, iz + Math.sin(ang + 1.2) * 2.8),
        0.85,
        rng,
        "#2563eb",
        "#7dd3fc",
        4,
      ),
    );
  }

  // Central Celestial Light Pillar
  lightBeams.push(
    {
      position: [0, 10.5, 0],
      rotation: [0, 0, 0],
      radiusTop: 0.35,
      radiusBottom: 1.95,
      height: 21.0,
      color: "#7dd3fc",
      opacity: 0.24,
    },
    {
      position: [0, 6.3, 0],
      rotation: [0, 0, Math.PI * 0.28],
      radiusTop: 0.18,
      radiusBottom: 0.9,
      height: 18.0,
      color: "#fde68a",
      opacity: 0.14,
    },
  );

  // Luminous golden-blue astral grass/reeds around outer platform ring
  scatterGrassOnCircle({
    count: isUltra ? 6200 : 320,
    center: [0, -0.4, 0],
    minR: 8.8,
    maxR: 13.0,
    heightSampler: (lx, lz) =>
      sampleFloatingIslandTopY(lx, lz, { radius: 13.8, seed, craterRadius: 8.6, craterDepth: 1.2 }),
    rng,
    colorA: "#1e3a8a",
    colorB: "#38bdf8",
    scaleRange: [0.55, 1.15],
    out: grassInstances,
  });

  // Swirling celestial crystal shards in canopyClusters
  const shardColors = [new Color("#38bdf8"), new Color("#fbbf24"), new Color("#818cf8")];
  const orbitCrystalCount = isUltra ? 260 : 42;
  for (let i = 0; i < orbitCrystalCount; i += 1) {
    const ang = (i / orbitCrystalCount) * Math.PI * 6 + rng() * 0.3;
    const r = 10.8 + Math.sin(i * 0.37) * 3.5 + rng() * 2.4;
    const y = 2.2 + ((i / orbitCrystalCount) * 9.5) + (rng() - 0.5) * 1.2;
    const s = 0.14 + rng() * 0.22;
    canopyClusters.push({
      position: new Vector3(Math.cos(ang) * r, y, Math.sin(ang) * r),
      scale: [s * 0.7, s * 1.65, s * 0.7],
      color: shardColors[i % shardColors.length].clone(),
    });
  }

  return finalizeWorld("astral-citadel", {
    terrain,
    stone,
    wood,
    gold,
    crystal,
    emissive,
    canopyClusters,
    grassInstances,
    waterBodies: [{ position: [0, -0.15, 0], radius: 8.5 }],
    waterfalls: [],
    lightBeams,
    kinetics,
    pointLights: [
      { position: [0, 6.3, 0], color: "#38bdf8", intensity: 5.5, distance: 32 },
      { position: [0, 2.0, 0], color: "#fbbf24", intensity: 3.2, distance: 18 },
    ],
    flock: {
      kind: "birds",
      count: isUltra ? 12 : 5,
      orbitRadius: [14, 25],
      heightRange: [8, 15],
      colorA: "#fde68a",
      colorB: "#7dd3fc",
      speed: 0.42,
    },
    particleColors: ["#38bdf8", "#fde68a", "#c084fc"],
  });
}

/* ============================================================================
   03. ABYSSAL GARDEN (荧光灵渊 · 深海珊瑚圣堂、半透明律动水母与巡游鱼群)
============================================================================ */
function buildAbyssalGarden(seed: number, detail: WorldDetailTier): BuiltSanctuaryWorld {
  const rng = createRng(seed);
  const isUltra = detail === "ultra";

  const terrain: BufferGeometry[] = [];
  const stone: BufferGeometry[] = [];
  const wood: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  const crystal: BufferGeometry[] = [];
  const emissive: BufferGeometry[] = [];
  const canopyClusters: CanopyClusterAnchor[] = [];
  const grassInstances: GrassInstanceSpec[] = [];
  const kinetics: KineticElementSpec[] = [];
  const lightBeams: LightBeamSpec[] = [];

  const seabedHeight = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    const sanctuaryFlat = smoothstep(5.5, 13.5, r);
    const reefRing = Math.exp(-Math.pow((r - 17.5) / 6.5, 2)) * 4.8;
    const outerCanyon = smoothstep(20.0, 42.0, r) * 5.2;
    const ripples = fbm2D(x * 0.12, z * 0.12, seed, 4) * 1.45 * sanctuaryFlat;
    const ridges = ridged2D(x * 0.08, z * 0.08, seed + 41, 3) * 2.2 * sanctuaryFlat;
    return -0.65 + (reefRing + outerCanyon + ripples + ridges * 0.65) * sanctuaryFlat;
  };

  const cSand = new Color("#0f4c5c");
  const cReef = new Color("#134e4a");
  const cCoral = new Color("#4c1d95");
  const cRidge = new Color("#2dd4bf");

  terrain.push(
    createBasinTerrainGeometry({
      size: 88,
      segs: isUltra ? 112 : 52,
      islandSkirt: !isUltra,
      heightFn: seabedHeight,
      colorFn: (x, y, z) => {
        const r = Math.hypot(x, z);
        const col = new Color().copy(cSand).lerp(cReef, smoothstep(6, 22, r));
        col.lerp(cCoral, smoothstep(1.2, 5.2, y) * 0.65);
        col.lerp(cRidge, smoothstep(3.8, 7.5, y) * 0.45);
        return col;
      },
    }),
  );

  // Sunken Atlantean Pearl Sanctuary & Glowing Memory Pearl Altar
  const rotunda = createObservatoryRotunda([0, -0.65, 0], 0.96, {
    stoneBase: "#99f6e4",
    stoneTop: "#f0fdfa",
    goldBase: "#0d9488",
    goldTop: "#fde68a",
  });
  stone.push(rotunda.stone);
  gold.push(rotunda.gold);

  const pearlOrb = new SphereGeometry(0.92, 24, 20);
  pearlOrb.translate(0, 2.55, 0);
  emissive.push(bakePart(pearlOrb, "#2dd4bf", "#fbcfe8"));

  const pearlHalo = bakePart(new TorusGeometry(1.95, 0.055, 10, 48), "#2dd4bf", "#fde68a");
  kinetics.push({
    geometry: pearlHalo,
    materialKind: "gold",
    position: [0, 2.55, 0],
    initialRotation: [0.55, 0.2, 0.1],
    rotationSpeed: [0.22, 0.45, -0.15],
  });

  // 8 Towering Spiraling Bioluminescent Coral Arches + Polyps
  const archCount = isUltra ? 8 : 5;
  const polypColors = [
    new Color("#fb7185"),
    new Color("#2dd4bf"),
    new Color("#fbbf24"),
    new Color("#c084fc"),
  ];

  for (let i = 0; i < archCount; i += 1) {
    const ang = (i / archCount) * Math.PI * 2 + 0.2;
    const r0 = 8.5 + (i % 2) * 2.4;
    const r1 = 16.5 + (i % 2) * 3.0;
    const p0 = new Vector3(Math.cos(ang) * r0, seabedHeight(Math.cos(ang) * r0, Math.sin(ang) * r0) - 0.3, Math.sin(ang) * r0);
    const p2 = new Vector3(
      Math.cos(ang + 0.36) * r1,
      seabedHeight(Math.cos(ang + 0.36) * r1, Math.sin(ang + 0.36) * r1) - 0.3,
      Math.sin(ang + 0.36) * r1,
    );
    const mid = p0.clone().lerp(p2, 0.5);
    mid.y += 5.4 + (i % 3) * 1.35;

    const curve = new CatmullRomCurve3([p0, mid, p2]);
    const archTube = new TubeGeometry(curve, isUltra ? 22 : 12, 0.42, 8, false);
    wood.push(bakePart(archTube, "#3b0764", "#be185d"));

    // Glowing coral blossom clusters along the arch
    const clusterN = isUltra ? 18 : 8;
    for (let k = 0; k < clusterN; k += 1) {
      const pt = curve.getPoint((k + 0.5) / clusterN);
      const s = 0.32 + rng() * 0.48;
      canopyClusters.push({
        position: new Vector3(pt.x + (rng() - 0.5) * 0.9, pt.y + 0.35 + rng() * 0.5, pt.z + (rng() - 0.5) * 0.9),
        scale: [s * 1.3, s * 0.85, s * 1.3],
        color: polypColors[(i + k) % polypColors.length].clone(),
      });
    }
  }

  // Luminous Crystal / Anemone spires on reef floor
  for (let i = 0; i < (isUltra ? 12 : 6); i += 1) {
    const ang = (i / 12) * Math.PI * 2 + 0.4;
    const r = 6.2 + rng() * 11.5;
    const cx = Math.cos(ang) * r;
    const cz = Math.sin(ang) * r;
    const cy = seabedHeight(cx, cz);
    crystal.push(
      createHexCrystalCluster(
        new Vector3(cx, cy, cz),
        0.75 + rng() * 0.55,
        rng,
        i % 2 === 0 ? "#0d9488" : "#db2777",
        i % 2 === 0 ? "#99f6e4" : "#fbcfe8",
        5,
      ),
    );
  }

  // 7 Giant Pulsing Translucent Bioluminescent Jellyfish!
  const jellySpecs: Array<{ pos: [number, number, number]; scale: number; cols: [string, string] }> = [
    { pos: [-4.8, 6.6, 2.8], scale: 1.45, cols: ["#06b6d4", "#f472b6"] },
    { pos: [5.6, 7.8, -2.6], scale: 1.62, cols: ["#2dd4bf", "#fde047"] },
    { pos: [0.8, 9.4, -6.8], scale: 1.28, cols: ["#818cf8", "#f472b6"] },
    { pos: [-8.8, 5.4, -5.2], scale: 1.15, cols: ["#2dd4bf", "#fb7185"] },
    { pos: [9.4, 6.0, 5.4], scale: 1.22, cols: ["#38bdf8", "#c084fc"] },
    { pos: [-2.2, 4.8, 8.6], scale: 0.98, cols: ["#fb7185", "#fde68a"] },
    { pos: [12.5, 8.6, -8.2], scale: 1.35, cols: ["#2dd4bf", "#67e8f9"] },
  ];

  for (let i = 0; i < (isUltra ? jellySpecs.length : 4); i += 1) {
    const j = jellySpecs[i];
    kinetics.push({
      geometry: createJellyfishGeometry(j.scale, i * 1.35),
      materialKind: "jellyfish",
      position: j.pos,
      rotationSpeed: [0, 0.14 * (i % 2 === 0 ? 1 : -1), 0],
      bobAmplitude: 0.55,
      bobSpeed: 0.95 + (i % 3) * 0.2,
      phase: i * 1.35,
      jellyfishColors: j.cols,
    });
  }

  // Slanting Volumetric Ocean God-Ray Shafts from surface
  const rayPositions: Array<[number, number, number]> = [
    [-4.5, 11.0, -2.0],
    [3.8, 11.5, 1.5],
    [0.0, 12.0, -6.5],
    [-9.5, 11.0, 4.5],
    [9.2, 11.0, -4.5],
    [5.5, 11.0, 7.5],
  ];
  for (let i = 0; i < (isUltra ? rayPositions.length : 3); i += 1) {
    lightBeams.push({
      position: rayPositions[i],
      rotation: [0.14, 0.2, -0.18],
      radiusTop: 0.85,
      radiusBottom: 3.2,
      height: 22.0,
      color: i % 2 === 0 ? "#5eead4" : "#bae6fd",
      opacity: 0.13,
    });
  }

  // Swaying Kelp & Sea-Grass Meadow (kept clear of inner pearl rotunda)
  scatterGrassOnCircle({
    count: isUltra ? 5200 : 340,
    center: [0, 0, 0],
    minR: 6.4,
    maxR: 21.0,
    heightSampler: seabedHeight,
    rng,
    colorA: "#0d9488",
    colorB: "#5eead4",
    scaleRange: [0.52, 1.12],
    out: grassInstances,
  });

  return finalizeWorld("abyssal-garden", {
    terrain,
    stone,
    wood,
    gold,
    crystal,
    emissive,
    canopyClusters,
    grassInstances,
    waterBodies: [],
    waterfalls: [],
    lightBeams,
    kinetics,
    pointLights: [
      { position: [0, 3.2, 0], color: "#2dd4bf", intensity: 5.0, distance: 26 },
      { position: [-5, 6.8, 3], color: "#f472b6", intensity: 3.6, distance: 20 },
      { position: [6, 7.5, -3], color: "#fde047", intensity: 3.4, distance: 20 },
    ],
    flock: {
      kind: "fish",
      count: isUltra ? 650 : 48,
      orbitRadius: [5.5, 19.5],
      heightRange: [1.2, 9.5],
      colorA: "#fde047",
      colorB: "#2dd4bf",
      speed: 0.58,
    },
    particleColors: ["#5eead4", "#f472b6", "#fde68a"],
  });
}

/* ============================================================================
   04. AURORA PRISM (极光琉璃境 · 镜面冰湾、巨型六棱共鸣晶碑与光弦悬桥)
============================================================================ */
function buildAuroraPrism(seed: number, detail: WorldDetailTier): BuiltSanctuaryWorld {
  const rng = createRng(seed);
  const isUltra = detail === "ultra";

  const terrain: BufferGeometry[] = [];
  const stone: BufferGeometry[] = [];
  const wood: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  const crystal: BufferGeometry[] = [];
  const emissive: BufferGeometry[] = [];
  const canopyClusters: CanopyClusterAnchor[] = [];
  const grassInstances: GrassInstanceSpec[] = [];
  const kinetics: KineticElementSpec[] = [];
  const lightBeams: LightBeamSpec[] = [];

  const fjordHeight = (x: number, z: number) => {
    const r = Math.hypot(x, z);
    // Central sanctuary isle (r < 6.8), surrounded by mirror fjord lagoon (6.8..22.5), ringed by towering snow basalt peaks (> 23.0) with open front vista channel!
    const centerIsle = (1 - smoothstep(4.2, 7.2, r)) * (1.85 + fbm2D(x * 0.25, z * 0.25, seed, 3) * 0.45);
    const lagoonBed = -1.65 * smoothstep(5.8, 9.5, r) * (1 - smoothstep(19.0, 23.5, r));
    const frontAlign = (x * 0.62 + z * 0.78) / Math.max(1.0, r);
    const vistaMouth = 1.0 - 0.86 * smoothstep(0.42, 0.90, frontAlign);
    const mountainRing =
      smoothstep(22.5, 36.0, r) *
      vistaMouth *
      (3.8 + ridged2D(x * 0.082, z * 0.082, seed + 73, 4) * 12.2);
    return centerIsle + lagoonBed + mountainRing;
  };

  const cBasalt = new Color("#1e293b");
  const cMoss = new Color("#312e81");
  const cSnow = new Color("#e2e8f0");
  const cIce = new Color("#bae6fd");

  terrain.push(
    createBasinTerrainGeometry({
      size: 92,
      segs: isUltra ? 116 : 54,
      islandSkirt: !isUltra,
      heightFn: fjordHeight,
      colorFn: (x, y, z) => {
        const snowLine = smoothstep(2.4, 5.8, y + fbm2D(x * 0.2, z * 0.2, seed + 9, 2) * 0.9);
        const col = new Color().copy(cBasalt).lerp(cMoss, smoothstep(0.0, 2.2, y) * 0.5);
        col.lerp(cIce, smoothstep(-0.2, 0.35, y) * (1 - smoothstep(0.35, 1.2, y)) * 0.45);
        col.lerp(cSnow, snowLine);
        return col;
      },
    }),
  );

  // Central Cathedral of Giant Hexagonal Iridescent Resonance Crystal Obelisks!
  crystal.push(createHexCrystalCluster(new Vector3(0, 1.4, 0), 3.35, rng, "#7c3aed", "#67e8f9", 7));
  crystal.push(createHexCrystalCluster(new Vector3(-2.6, 1.1, 1.8), 1.85, rng, "#db2777", "#f9a8d4", 5));
  crystal.push(createHexCrystalCluster(new Vector3(2.8, 1.15, -1.6), 1.95, rng, "#059669", "#a7f3d0", 5));

  // Rotating Harmonic Rune Rings around the Central Crystal Spire
  for (let i = 0; i < 3; i += 1) {
    const r = 3.2 + i * 1.25;
    const runeRing = bakePart(new TorusGeometry(r, 0.055, 10, 56), "#34d399", "#e879f9");
    kinetics.push({
      geometry: runeRing,
      materialKind: "emissive",
      position: [0, 5.2 + i * 1.35, 0],
      initialRotation: [0.22 * (i + 1), i * 0.8, -0.18 * i],
      rotationSpeed: [0.12 * (i % 2 === 0 ? 1 : -1), 0.35, 0.09],
    });
  }

  // 3 Luminous Harp-String Suspension Bridges spanning the mirror fjord + 3 Shore Beacon Shrines
  for (let i = 0; i < 3; i += 1) {
    const ang = (i / 3) * Math.PI * 2 + 1.62;
    const start = new Vector3(Math.cos(ang) * 5.6, 1.25, Math.sin(ang) * 5.6);
    const sx = Math.cos(ang) * 20.5;
    const sz = Math.sin(ang) * 20.5;
    const sy = Math.max(0.85, fjordHeight(sx, sz));
    const end = new Vector3(sx, sy + 0.35, sz);

    const bridge = createArchedBridge(
      start,
      end,
      2.3,
      1.35,
      ["#cbd5e1", "#f8fafc"],
      ["#34d399", "#e879f9"],
    );
    stone.push(bridge.stone);
    emissive.push(bridge.accent);

    // Shore Beacon Pavilion with warm amber hearth
    const shrineX = Math.cos(ang) * 23.2;
    const shrineZ = Math.sin(ang) * 23.2;
    const shrineY = Math.max(1.1, fjordHeight(shrineX, shrineZ));
    const pagoda = createPagoda([shrineX, shrineY - 0.1, shrineZ], 0.72);
    stone.push(pagoda.stone);
    wood.push(pagoda.wood);
    gold.push(pagoda.gold);
    addLanternPost(new Vector3(shrineX - Math.cos(ang) * 1.6, shrineY, shrineZ - Math.sin(ang) * 1.6), stone, emissive, "#fbbf24", 1.15);
  }

  // Floating Glacial Icebergs & Crystal Shards in the fjord lagoon
  for (let i = 0; i < (isUltra ? 14 : 7); i += 1) {
    const ang = (i / 14) * Math.PI * 2 + 0.18;
    const r = 9.5 + rng() * 6.8;
    const ix = Math.cos(ang) * r;
    const iz = Math.sin(ang) * r;
    const berg = new OctahedronGeometry(0.85 + rng() * 0.95, 0);
    berg.scale(1.35, 0.72 + rng() * 0.5, 1.15);
    berg.rotateY(rng() * Math.PI);
    berg.translate(ix, 0.05, iz);
    stone.push(bakePart(berg, "#38bdf8", "#f8fafc"));
  }

  // Frosted Snow-Conifer Trees along the fjord rim
  const pineCount = isUltra ? 26 : 12;
  for (let i = 0; i < pineCount; i += 1) {
    const ang = (i / pineCount) * Math.PI * 2 + rng() * 0.15;
    const r = 19.5 + rng() * 7.5;
    const px = Math.cos(ang) * r;
    const pz = Math.sin(ang) * r;
    const py = fjordHeight(px, pz);
    if (py < 0.6) continue;

    const h = 3.2 + rng() * 2.4;
    const trunk = new CylinderGeometry(0.08, 0.16, h * 0.4, 6);
    trunk.translate(px, py + h * 0.2, pz);
    wood.push(bakePart(trunk, "#1e1b4b", "#475569"));

    for (let tier = 0; tier < 3; tier += 1) {
      const coneR = (1.15 - tier * 0.26) * (h * 0.26);
      const coneH = h * 0.38;
      const cone = new ConeGeometry(coneR, coneH, 7);
      cone.translate(px, py + h * (0.36 + tier * 0.22), pz);
      stone.push(bakePart(cone, "#1e3a5f", "#f1f5f9"));
    }
  }

  // Vertical Aurora Resonance Pillar
  lightBeams.push({
    position: [0, 9.5, 0],
    rotation: [0, 0, 0],
    radiusTop: 0.5,
    radiusBottom: 2.6,
    height: 19.0,
    color: "#c084fc",
    opacity: 0.2,
  });

  // Crystalline frost-grass on central island & shoreline
  scatterGrassOnCircle({
    count: isUltra ? 5800 : 320,
    center: [0, 0, 0],
    minR: 1.8,
    maxR: 6.2,
    heightSampler: fjordHeight,
    rng,
    colorA: "#312e81",
    colorB: "#6ee7b7",
    scaleRange: [0.6, 1.2],
    out: grassInstances,
  });

  return finalizeWorld("aurora-prism", {
    terrain,
    stone,
    wood,
    gold,
    crystal,
    emissive,
    canopyClusters,
    grassInstances,
    waterBodies: [{ position: [0, 0.14, 0], radius: isUltra ? 22.6 : 19.2 }],
    waterfalls: [],
    lightBeams,
    kinetics,
    pointLights: [
      { position: [0, 5.5, 0], color: "#c084fc", intensity: 5.4, distance: 30 },
      { position: [0, 2.5, 0], color: "#34d399", intensity: 3.6, distance: 20 },
    ],
    flock: {
      kind: "birds",
      count: isUltra ? 10 : 4,
      orbitRadius: [12, 24],
      heightRange: [7, 13],
      colorA: "#a7f3d0",
      colorB: "#f5d0fe",
      speed: 0.34,
    },
    particleColors: ["#6ee7b7", "#c084fc", "#f9a8d4"],
  });
}

/* ============================================================================
   05. SOLARIS OASIS (破晓金沙神殿 · 风纹沙海、翡翠新月泉与阶梯日冕金字塔)
============================================================================ */
function buildSolarisOasis(seed: number, detail: WorldDetailTier): BuiltSanctuaryWorld {
  const rng = createRng(seed);
  const isUltra = detail === "ultra";

  const terrain: BufferGeometry[] = [];
  const stone: BufferGeometry[] = [];
  const wood: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  const crystal: BufferGeometry[] = [];
  const emissive: BufferGeometry[] = [];
  const canopyClusters: CanopyClusterAnchor[] = [];
  const grassInstances: GrassInstanceSpec[] = [];
  const waterfalls: BufferGeometry[] = [];
  const kinetics: KineticElementSpec[] = [];
  const lightBeams: LightBeamSpec[] = [];

  // Crescent Oasis Lagoon centered around (0, 3.8) with Ziggurat plateau behind at (0, -9.5)
  const duneHeight = (x: number, z: number) => {
    const dLagoon = Math.hypot(x * 0.88, z - 4.2);
    const dCove = Math.hypot(x * 1.1, z - 8.2);
    const lagoonBowl =
      (1 - smoothstep(6.2, 11.8, dLagoon)) * 2.35 -
      (1 - smoothstep(3.0, 6.2, dCove)) * 0.85;

    const dTemple = Math.hypot(x * 0.85, z + 9.2);
    const templePlateau = (1 - smoothstep(6.8, 12.5, dTemple)) * 1.45;

    const rOuter = Math.hypot(x, z);
    const windWave = Math.sin(x * 0.24 + z * 0.16 + fbm2D(x * 0.08, z * 0.08, seed, 3) * 2.6);
    const duneCrest = Math.pow(0.5 + 0.5 * windWave, 1.7) * 3.8 * smoothstep(10.5, 26.0, rOuter);
    const desertHills = ridged2D(x * 0.045, z * 0.045, seed + 29, 3) * 5.2 * smoothstep(15.0, 36.0, rOuter);

    return 0.55 - lagoonBowl + templePlateau + duneCrest + desertHills;
  };

  const cWetSand = new Color("#0d9488");
  const cWarmSand = new Color("#eab308");
  const cRoseDune = new Color("#f97316");
  const cSunCrest = new Color("#fde68a");

  terrain.push(
    createBasinTerrainGeometry({
      size: 94,
      segs: isUltra ? 116 : 54,
      islandSkirt: !isUltra,
      heightFn: duneHeight,
      colorFn: (x, y, z) => {
        if (y < 0.25) {
          return new Color().copy(cWetSand).lerp(cWarmSand, smoothstep(-1.1, 0.25, y));
        }
        const col = new Color().copy(cWarmSand).lerp(cRoseDune, smoothstep(0.6, 4.2, y));
        const crest = smoothstep(2.8, 6.8, y + Math.sin(x * 0.25 + z * 0.15) * 0.5);
        col.lerp(cSunCrest, crest * 0.65);
        return col;
      },
    }),
  );

  // Monumental 5-Tier Stepped Sandstone Sun-Ziggurat at [0, 1.8, -9.5]
  const zigX = 0;
  const zigZ = -9.5;
  const zigBaseY = 1.65;
  for (let tier = 0; tier < 5; tier += 1) {
    const w = 11.4 - tier * 1.85;
    const h = 1.05;
    const block = new BoxGeometry(w, h, w * 0.88);
    block.translate(zigX, zigBaseY + tier * h + h * 0.5, zigZ);
    stone.push(bakePart(block, "#b45309", "#fde68a"));

    const trim = new BoxGeometry(w + 0.24, 0.12, w * 0.88 + 0.24);
    trim.translate(zigX, zigBaseY + (tier + 1) * h, zigZ);
    gold.push(bakePart(trim, "#d97706", "#fef9c3"));
  }

  // Grand ceremonial stairway down to the oasis water
  for (let s = 0; s < 14; s += 1) {
    const sy = zigBaseY + (14 - s) * 0.36;
    const sz = zigZ + 3.6 + s * 0.52;
    const step = new BoxGeometry(2.6, 0.38, 0.62);
    step.translate(0, sy * 0.5, sz);
    stone.push(bakePart(step, "#d97706", "#fef3c7"));
  }

  // 4 Tall Engraved Sun-Obelisks with Gilded Pyramidions
  const obeliskCoords: Array<[number, number]> = [
    [-8.2, -5.2],
    [8.2, -5.2],
    [-10.8, -11.8],
    [10.8, -11.8],
  ];
  for (const [ox, oz] of obeliskCoords) {
    const oy = Math.max(0.8, duneHeight(ox, oz));
    const h = 6.8;
    const shaft = new CylinderGeometry(0.36, 0.58, h, 4);
    shaft.rotateY(Math.PI / 4);
    shaft.translate(ox, oy + h * 0.5, oz);
    stone.push(bakePart(shaft, "#9a3412", "#fcd34d"));

    const cap = new ConeGeometry(0.52, 1.15, 4);
    cap.rotateY(Math.PI / 4);
    cap.translate(ox, oy + h + 0.57, oz);
    gold.push(bakePart(cap, "#f59e0b", "#ffffff"));
  }

  // Levitating Solar Octahedron Prism + Rotating Sun-Gate Rings above Ziggurat!
  const prismY = zigBaseY + 5 * 1.05 + 2.55;
  kinetics.push({
    geometry: bakePart(new OctahedronGeometry(1.35, 0), "#f59e0b", "#fef9c3"),
    materialKind: "emissive",
    position: [zigX, prismY, zigZ],
    rotationSpeed: [0.18, 0.65, 0.12],
    bobAmplitude: 0.24,
    bobSpeed: 1.5,
  });
  kinetics.push({
    geometry: bakePart(new TorusGeometry(2.85, 0.085, 10, 56), "#d97706", "#fef08a"),
    materialKind: "gold",
    position: [zigX, prismY, zigZ],
    initialRotation: [0.35, 0.2, 0],
    rotationSpeed: [-0.25, 0.42, 0.15],
  });

  // 2 Sandstone Aqueducts pouring sparkling waterfalls into the turquoise oasis
  for (const side of [-1, 1]) {
    const aqX = side * 9.6;
    const aqZ = 1.2;
    const aqChannel = new BoxGeometry(5.2, 0.55, 1.25);
    aqChannel.rotateY(side * -0.35);
    aqChannel.translate(aqX, 3.6, aqZ);
    stone.push(bakePart(aqChannel, "#b45309", "#fde68a"));

    for (const pOff of [-1.8, 1.8]) {
      const pillar = new BoxGeometry(0.68, 3.8, 0.68);
      pillar.translate(aqX + pOff * 0.85, 1.8, aqZ + pOff * side * -0.3);
      stone.push(bakePart(pillar, "#9a3412", "#fbbf24"));
    }

    waterfalls.push(
      createWaterfallRibbon(
        new Vector3(aqX - side * 2.2, 3.45, aqZ + 0.8),
        3.55,
        0.92,
        new Vector3(-side * 0.85, 0, 0.45),
      ),
    );
  }

  // 18 Curved Oasis Palm Trees & Caravan Lanterns around the turquoise lagoon
  const palmCount = isUltra ? 18 : 9;
  for (let i = 0; i < palmCount; i += 1) {
    const ang = (i / palmCount) * Math.PI * 2 + rng() * 0.25;
    const rx = 9.2 + rng() * 3.8;
    const rz = 7.4 + rng() * 3.4;
    const px = Math.cos(ang) * rx;
    const pz = 4.2 + Math.sin(ang) * rz;
    if (pz < -2.2 && Math.abs(px) < 6.5) continue; // Keep Ziggurat vista clear!
    const py = Math.max(0.25, duneHeight(px, pz));
    const palm = createPalmTree(
      new Vector3(px, py - 0.15, pz),
      4.2 + rng() * 2.4,
      ang + (rng() - 0.5) * 0.6,
      0.85 + rng() * 0.9,
      rng,
    );
    wood.push(palm.trunk);
    stone.push(palm.fronds);

    if (i % 3 === 0) {
      addLanternPost(new Vector3(px * 0.86, Math.max(0.2, duneHeight(px * 0.86, pz * 0.9)), pz * 0.9), stone, emissive, "#fde047", 0.95);
    }
  }

  // Radiant Dawn Sun-Shaft from the Solar Prism
  lightBeams.push({
    position: [zigX, prismY + 3.0, zigZ],
    rotation: [0.12, 0, 0],
    radiusTop: 0.55,
    radiusBottom: 3.4,
    height: 18.0,
    color: "#fde68a",
    opacity: 0.22,
  });

  // Lush oasis shoreline reeds
  scatterGrassOnCircle({
    count: isUltra ? 5200 : 300,
    center: [0, 0, 4.2],
    minR: 6.8,
    maxR: 12.8,
    heightSampler: (lx, lz) => {
      const y = duneHeight(lx, lz + 4.2);
      return y > 0.08 && y < 1.35 ? y : -999;
    },
    rng,
    colorA: "#15803d",
    colorB: "#84cc16",
    scaleRange: [0.75, 1.45],
    out: grassInstances,
  });

  return finalizeWorld("solaris-oasis", {
    terrain,
    stone,
    wood,
    gold,
    crystal,
    emissive,
    canopyClusters,
    grassInstances,
    waterBodies: [{ position: [0, 0.08, 4.2], radius: 11.2 }],
    waterfalls,
    lightBeams,
    kinetics,
    pointLights: [
      { position: [zigX, prismY, zigZ], color: "#fbbf24", intensity: 5.5, distance: 32 },
      { position: [0, 2.2, 4.2], color: "#2dd4bf", intensity: 3.2, distance: 20 },
    ],
    flock: {
      kind: "birds",
      count: isUltra ? 12 : 5,
      orbitRadius: [12, 26],
      heightRange: [8, 15],
      colorA: "#fef3c7",
      colorB: "#fed7aa",
      speed: 0.35,
    },
    particleColors: ["#fde68a", "#fb923c", "#5eead4"],
  });
}

/* ============================================================================
   06. EMERALD TERRACES (浮岚叠翠谷 · 千年世界巨树、七级镜面水梯田与白帆风车)
============================================================================ */
function buildEmeraldTerraces(seed: number, detail: WorldDetailTier): BuiltSanctuaryWorld {
  const rng = createRng(seed);
  const isUltra = detail === "ultra";

  const terrain: BufferGeometry[] = [];
  const stone: BufferGeometry[] = [];
  const wood: BufferGeometry[] = [];
  const gold: BufferGeometry[] = [];
  const crystal: BufferGeometry[] = [];
  const emissive: BufferGeometry[] = [];
  const canopyClusters: CanopyClusterAnchor[] = [];
  const grassInstances: GrassInstanceSpec[] = [];
  const waterBodies: WaterBodySpec[] = [];
  const waterfalls: BufferGeometry[] = [];
  const kinetics: KineticElementSpec[] = [];
  const lightBeams: LightBeamSpec[] = [];

  // Main Floating Mountain Base
  terrain.push(
    createFloatingIslandGeometry({
      center: [0, -0.6, 0],
      radius: 17.8,
      depth: 22.5,
      seed,
      radialSegs: isUltra ? 64 : 32,
      ringSegs: isUltra ? 20 : 10,
      topInnerColor: "#15803d",
      topOuterColor: "#4ade80",
      cliffUpperColor: "#3f6212",
      cliffDeepColor: "#142921",
    }),
  );

  // 6 Cascading Mirror Rice-Water Terraces stepping upward toward the World-Tree summit!
  const terraceTiers = [
    { x: 0.0, z: 2.2, r: 13.8, y: 0.45 },
    { x: -0.6, z: 1.4, r: 11.4, y: 1.25 },
    { x: 0.5, z: 0.6, r: 9.2, y: 2.05 },
    { x: -0.3, z: -0.4, r: 7.2, y: 2.85 },
    { x: 0.2, z: -1.1, r: 5.4, y: 3.65 },
  ];

  for (const t of terraceTiers) {
    // Mossy stone & emerald bund wall (top sits cleanly below water plane so mirror jade pools shine!)
    const bund = new CylinderGeometry(t.r * 0.99, t.r * 1.05, 0.78, isUltra ? 48 : 24);
    bund.translate(t.x, t.y - 0.44, t.z);
    terrain.push(bakePart(bund, "#14532d", "#4ade80"));

    const rim = new TorusGeometry(t.r * 0.99, 0.19, 10, isUltra ? 52 : 28);
    rim.rotateX(Math.PI / 2);
    rim.translate(t.x, t.y + 0.04, t.z);
    stone.push(bakePart(rim, "#15803d", "#86efac"));

    waterBodies.push({ position: [t.x, t.y + 0.04, t.z], radius: t.r * 0.975 });
  }

  // Summit knoll for the Colossal Braided World-Tree
  const knoll = new CylinderGeometry(3.4, 4.4, 1.1, 24);
  knoll.translate(0, 4.15, -1.6);
  terrain.push(bakePart(knoll, "#166534", "#86efac"));

  // Colossal Braided Ancient World-Tree!
  const worldTree = createRecursiveSpiritTree({
    origin: new Vector3(0, 4.5, -1.6),
    height: 10.8,
    trunkRadius: 0.72,
    levels: isUltra ? 4 : 3,
    rng,
    trunkBottomColor: "#3f2718",
    trunkTopColor: "#784b2a",
    canopyColors: ["#15803d", "#4ade80", "#fde047"],
    radialSegs: 9,
  });
  wood.push(worldTree.trunk);
  canopyClusters.push(...worldTree.clusters);

  // Braided buttress roots gripping the summit terraces
  for (let r = 0; r < 6; r += 1) {
    const ang = (r / 6) * Math.PI * 2;
    const rootCurve = new CatmullRomCurve3([
      new Vector3(Math.cos(ang) * 0.45, 5.8, -1.6 + Math.sin(ang) * 0.45),
      new Vector3(Math.cos(ang) * 2.1, 4.4, -1.6 + Math.sin(ang) * 2.1),
      new Vector3(Math.cos(ang) * 4.2, 3.55, -1.6 + Math.sin(ang) * 4.2),
    ]);
    wood.push(bakePart(new TubeGeometry(rootCurve, 8, 0.24, 6, false), "#3f2718", "#713f12"));
  }

  // 2 Satellite Meadow Islands + 3 Spinning White Wind-Sail Mill Towers!
  const millLocations: Array<{ pos: [number, number, number]; yaw: number }> = [
    { pos: [13.2, 0.55, -5.8], yaw: 0.55 },
    { pos: [-12.8, 0.55, -4.5], yaw: -0.45 },
    { pos: [22.2, 2.55, 4.8], yaw: -0.65 },
  ];

  terrain.push(
    createFloatingIslandGeometry({
      center: [22.2, 2.0, 4.8],
      radius: 6.2,
      depth: 12.8,
      seed: seed + 88,
      radialSegs: isUltra ? 36 : 18,
      ringSegs: isUltra ? 10 : 6,
      topInnerColor: "#16a34a",
      topOuterColor: "#86efac",
      cliffUpperColor: "#3f6212",
      cliffDeepColor: "#142921",
    }),
  );

  const millBridge = createArchedBridge(
    new Vector3(14.8, 0.45, 2.6),
    new Vector3(16.8, 2.35, 3.6),
    1.85,
    1.35,
    ["#78350f", "#d97706"],
    ["#fef08a", "#ffffff"],
  );
  wood.push(millBridge.stone);
  gold.push(millBridge.accent);

  for (let m = 0; m < millLocations.length; m += 1) {
    const { pos, yaw } = millLocations[m];
    const towerH = 4.2;
    const tower = new CylinderGeometry(0.72, 1.12, towerH, 10);
    tower.translate(pos[0], pos[1] + towerH * 0.5, pos[2]);
    stone.push(bakePart(tower, "#cbd5e1", "#f8fafc"));

    const roof = new ConeGeometry(1.05, 1.15, 10);
    roof.translate(pos[0], pos[1] + towerH + 0.55, pos[2]);
    wood.push(bakePart(roof, "#0f766e", "#2dd4bf"));

    // 6-Bladed White Wind-Sail Rotor
    const rotorParts: BufferGeometry[] = [
      bakePart(new CylinderGeometry(0.18, 0.18, 0.5, 8).rotateX(Math.PI / 2), "#78350f", "#b45309"),
    ];
    for (let b = 0; b < 6; b += 1) {
      const bang = (b / 6) * Math.PI * 2;
      const spar = new CylinderGeometry(0.035, 0.045, 2.65, 5);
      spar.translate(0, 1.32, 0);
      spar.rotateZ(bang);
      rotorParts.push(bakePart(spar, "#78350f", "#d97706"));

      const sail = new BoxGeometry(0.58, 1.85, 0.04);
      sail.rotateY(0.22);
      sail.translate(0.26, 1.55, 0.03);
      sail.rotateZ(bang);
      rotorParts.push(bakePart(sail, "#fef3c7", "#ffffff"));
    }

    const hubOffset = new Vector3(Math.sin(yaw) * 0.92, towerH * 0.82, Math.cos(yaw) * 0.92);
    kinetics.push({
      geometry: safeMerge(rotorParts),
      materialKind: "wood",
      position: [pos[0] + hubOffset.x, pos[1] + hubOffset.y, pos[2] + hubOffset.z],
      initialRotation: [0, yaw, 0],
      rotationSpeed: [0, 0, 0.65 + m * 0.08],
    });
  }

  // Sparkling waterfalls spilling down the terraces & off the southern cliff
  waterfalls.push(
    createWaterfallRibbon(new Vector3(1.8, 0.45, 15.6), 14.2, 1.65, new Vector3(0.12, 0, 0.98)),
    createWaterfallRibbon(new Vector3(-4.2, 1.25, 12.2), 2.2, 1.15, new Vector3(-0.3, 0, 0.95)),
  );

  // Warm sunlit shafts piercing the World-Tree canopy
  lightBeams.push({
    position: [1.5, 9.5, 0.5],
    rotation: [0.16, 0.1, -0.18],
    radiusTop: 0.9,
    radiusBottom: 3.6,
    height: 17.0,
    color: "#fef9c3",
    opacity: 0.16,
  });

  // Lush sunlit emerald grass & golden wildflowers along outer meadow & satellite island
  scatterGrassOnCircle({
    count: isUltra ? 7400 : 380,
    center: [0, -0.6, 0],
    minR: 13.6,
    maxR: 16.8,
    heightSampler: (lx, lz) =>
      sampleFloatingIslandTopY(lx, lz, { radius: 17.8, seed }),
    rng,
    colorA: "#16a34a",
    colorB: "#bef264",
    out: grassInstances,
  });
  scatterGrassOnCircle({
    count: isUltra ? 1800 : 100,
    center: [22.2, 2.0, 4.8],
    minR: 1.5,
    maxR: 5.5,
    heightSampler: (lx, lz) =>
      sampleFloatingIslandTopY(lx, lz, { radius: 6.2, seed: seed + 88 }),
    rng,
    colorA: "#22c55e",
    colorB: "#fde047",
    out: grassInstances,
  });

  return finalizeWorld("emerald-terraces", {
    terrain,
    stone,
    wood,
    gold,
    crystal,
    emissive,
    canopyClusters,
    grassInstances,
    waterBodies,
    waterfalls,
    lightBeams,
    kinetics,
    pointLights: [
      { position: [0, 6.8, -1.6], color: "#fde047", intensity: 4.2, distance: 26 },
      { position: [0, 2.2, 3.0], color: "#34d399", intensity: 3.0, distance: 20 },
    ],
    flock: {
      kind: "birds",
      count: isUltra ? 18 : 7,
      orbitRadius: [12, 27],
      heightRange: [8.5, 16.5],
      colorA: "#ffffff",
      colorB: "#fef08a",
      speed: 0.4,
    },
    particleColors: ["#fef08a", "#86efac", "#bae6fd"],
  });
}

export function buildSanctuaryWorld(
  worldId: WorldId,
  seed: number,
  detail: WorldDetailTier = "ultra",
): BuiltSanctuaryWorld {
  switch (worldId) {
    case "aether-sanctuary":
      return buildAetherSanctuary(seed, detail);
    case "astral-citadel":
      return buildAstralCitadel(seed, detail);
    case "abyssal-garden":
      return buildAbyssalGarden(seed, detail);
    case "aurora-prism":
      return buildAuroraPrism(seed, detail);
    case "solaris-oasis":
      return buildSolarisOasis(seed, detail);
    case "emerald-terraces":
      return buildEmeraldTerraces(seed, detail);
  }
}
