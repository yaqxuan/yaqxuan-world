import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  Euler,
  FogExp2,
  Group,
  HemisphereLight,
  InstancedMesh,
  MathUtils,
  Matrix4,
  Mesh,
  MeshLambertMaterial,
  MeshStandardMaterial,
  Quaternion,
  ShaderMaterial,
  SRGBColorSpace,
  Vector2,
  Vector3,
} from "three";
import {
  nebulaFragmentShader,
  nebulaVertexShader,
  particleFragmentShader,
  particleVertexShader,
  terrainFragmentShader,
  terrainVertexShader,
} from "./shaders";
import {
  createCanopyClusterBaseGeometry,
  createFishGeometry,
  createGrassBladeGeometry,
  createSpiritBirdGeometry,
  createWaterDiscGeometry,
} from "./worlds/geometryPrimitives";
import { createRng } from "./worlds/noise";
import { buildSanctuaryWorld } from "./worlds/sanctuaryBuilders";
import {
  jellyfishFragmentShader,
  jellyfishVertexShader,
  sanctuaryBeamFragmentShader,
  sanctuaryBeamVertexShader,
  sanctuaryWaterfallFragmentShader,
  sanctuaryWaterfallVertexShader,
  sanctuaryWaterFragmentShader,
  sanctuaryWaterVertexShader,
} from "./worlds/sanctuaryShaders";
import {
  createEmptyAtmosphere,
  sampleWorldAtmosphere,
  WORLD_SPECS,
  type WorldId,
} from "./worlds/worldRegistry";

export type WorldSceneProps = {
  scrollProgressRef: MutableRefObject<number>;
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  pulseTimeRef: MutableRefObject<number>;
  heroWorldId?: WorldId;
  isMobile: boolean;
  reducedMotion: boolean;
};

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function interpolateStops(colors: Color[], scroll: number, out: Color) {
  const s = MathUtils.clamp(scroll, 0, 1);
  const maxIdx = colors.length - 1;
  const scaled = s * maxIdx;
  const idx = Math.min(Math.floor(scaled), maxIdx - 1);
  const localT = scaled - idx;
  out.copy(colors[idx]).lerp(colors[idx + 1], localT);
}

function AtmosphereDirector({
  scrollProgressRef,
  heroWorldId,
}: {
  scrollProgressRef: MutableRefObject<number>;
  heroWorldId: WorldId;
}) {
  const { scene } = useThree();
  const lightARef = useRef<DirectionalLight>(null);
  const lightBRef = useRef<DirectionalLight>(null);
  const hemiRef = useRef<HemisphereLight>(null);

  const palettes = useMemo(() => {
    const heroSpec = WORLD_SPECS[heroWorldId];
    const heroAtmo = sampleWorldAtmosphere(heroWorldId, heroSpec.defaultPhase);
    return {
      fog: [
        heroAtmo.fogColor.clone().multiplyScalar(0.55),
        new Color("#07152e"),
        new Color("#06263a"),
        new Color("#101233"),
        new Color("#241829"),
      ],
      lightA: [
        heroAtmo.sunColor.clone(),
        new Color("#7dd3fc"),
        new Color("#5eead4"),
        new Color("#c084fc"),
        new Color("#fde68a"),
      ],
      lightB: [
        new Color(heroSpec.accentPrimary),
        new Color("#fbbf24"),
        new Color("#f472b6"),
        new Color("#34d399"),
        new Color("#fb923c"),
      ],
      tmpFog: new Color(),
      tmpA: new Color(),
      tmpB: new Color(),
    };
  }, [heroWorldId]);

  useFrame(() => {
    const s = scrollProgressRef.current;
    if (scene.fog && scene.fog instanceof FogExp2) {
      interpolateStops(palettes.fog, s, palettes.tmpFog);
      scene.fog.color.lerp(palettes.tmpFog, 0.1);
    }
    if (lightARef.current) {
      interpolateStops(palettes.lightA, s, palettes.tmpA);
      lightARef.current.color.lerp(palettes.tmpA, 0.1);
    }
    if (lightBRef.current) {
      interpolateStops(palettes.lightB, s, palettes.tmpB);
      lightBRef.current.color.lerp(palettes.tmpB, 0.1);
    }
  });

  return (
    <>
      <hemisphereLight ref={hemiRef} args={["#b8dcff", "#241b38", 0.92]} />
      <directionalLight ref={lightARef} color="#ffd166" intensity={2.25} position={[16, 22, 12]} />
      <directionalLight ref={lightBRef} color="#4ff0df" intensity={1.15} position={[-16, 8, -36]} />
    </>
  );
}

function NebulaSkyDome({
  scrollProgressRef,
  pulseTimeRef,
  reducedMotion,
}: {
  scrollProgressRef: MutableRefObject<number>;
  pulseTimeRef: MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const domeRef = useRef<Mesh>(null);
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: nebulaVertexShader,
        fragmentShader: nebulaFragmentShader,
        transparent: true,
        depthWrite: false,
        side: BackSide,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uPulseAge: { value: 0 },
        },
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ camera, clock }) => {
    if (domeRef.current) {
      domeRef.current.position.copy(camera.position);
    }
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.getElapsedTime();
    material.uniforms.uScroll.value = scrollProgressRef.current;
    material.uniforms.uPulseAge.value =
      pulseTimeRef.current > 0 ? Math.max(0, (performance.now() - pulseTimeRef.current) * 0.001) : 0;
  });

  return (
    <mesh ref={domeRef} renderOrder={-10} material={material}>
      <sphereGeometry args={[240, 32, 20]} />
    </mesh>
  );
}

function CameraSplineRig({
  scrollProgressRef,
  pointerRef,
  isMobile,
  reducedMotion,
}: {
  scrollProgressRef: MutableRefObject<number>;
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const smoothScroll = useRef(scrollProgressRef.current);
  const currentLook = useRef(new Vector3(isMobile ? 0 : 2.8, 2.2, -16));
  const desiredPos = useMemo(() => new Vector3(), []);
  const desiredLook = useMemo(() => new Vector3(), []);

  const { posCurve, lookCurve } = useMemo(() => {
    const xOffset = isMobile ? 0 : 1;
    const posCurve = new CatmullRomCurve3([
      new Vector3(-1.6 * xOffset, isMobile ? 4.4 : 4.1, 7.2),
      new Vector3(-1.9 * xOffset, isMobile ? 4.7 : 4.3, -33.0),
      new Vector3(2.2 * xOffset, isMobile ? 4.7 : 4.3, -73.0),
      new Vector3(-1.9 * xOffset, isMobile ? 4.8 : 4.4, -113.0),
      new Vector3(0, isMobile ? 4.9 : 4.5, -153.0),
    ]);
    const lookCurve = new CatmullRomCurve3([
      new Vector3(2.9 * xOffset, isMobile ? 2.4 : 2.1, -17.0),
      new Vector3(3.6 * xOffset, isMobile ? 2.6 : 2.3, -57.0),
      new Vector3(-3.6 * xOffset, isMobile ? 2.6 : 2.3, -97.0),
      new Vector3(3.6 * xOffset, isMobile ? 2.7 : 2.4, -137.0),
      new Vector3(isMobile ? 0 : 1.5, isMobile ? 3.2 : 2.9, -177.0),
    ]);
    return { posCurve, lookCurve };
  }, [isMobile]);

  useFrame((state, delta) => {
    const damping = reducedMotion ? 18 : 4.5;
    smoothScroll.current = MathUtils.damp(
      smoothScroll.current,
      MathUtils.clamp(scrollProgressRef.current, 0, 1),
      damping,
      delta,
    );

    const t = smoothScroll.current;
    posCurve.getPointAt(t, desiredPos);
    lookCurve.getPointAt(t, desiredLook);

    const pointerScale = reducedMotion ? 0 : isMobile ? 0.3 : 0.85;
    desiredPos.x += pointerRef.current.x * pointerScale;
    desiredPos.y += pointerRef.current.y * pointerScale * 0.45;
    desiredLook.x += pointerRef.current.x * pointerScale * 1.35;
    desiredLook.y += pointerRef.current.y * pointerScale * 0.55;

    const lerpFactor = reducedMotion ? 1 : 1 - Math.exp(-delta * 6.5);
    state.camera.position.lerp(desiredPos, lerpFactor);
    currentLook.current.lerp(desiredLook, lerpFactor);
    state.camera.lookAt(currentLook.current);
  });

  return null;
}

function TopographicSea({
  scrollProgressRef,
  pointerRef,
  pulseTimeRef,
  isMobile,
  reducedMotion,
}: WorldSceneProps) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: terrainVertexShader,
        fragmentShader: terrainFragmentShader,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uScroll: { value: 0 },
          uPulseAge: { value: 0 },
          uPointer: { value: new Vector2(0, 0) },
        },
      }),
    [],
  );

  useEffect(() => () => material.dispose(), [material]);

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    material.uniforms.uTime.value = t;
    material.uniforms.uScroll.value = scrollProgressRef.current;
    material.uniforms.uPointer.value.set(pointerRef.current.x, pointerRef.current.y);
    material.uniforms.uPulseAge.value =
      pulseTimeRef.current > 0 ? Math.max(0, (performance.now() - pulseTimeRef.current) * 0.001) : 0;
  });

  const segX = isMobile ? 48 : 72;
  const segZ = isMobile ? 72 : 112;

  return (
    <mesh position={[0, -4.4, -96]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[155, 265, segX, segZ]} />
    </mesh>
  );
}

function AstralParticles({
  pulseTimeRef,
  isMobile,
  reducedMotion,
}: {
  pulseTimeRef: MutableRefObject<number>;
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const count = isMobile ? 420 : 860;

  const { geometry, material } = useMemo(() => {
    const random = seededRandom(42026);
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const palette = [
      new Color("#f8fafc"),
      new Color("#4ff0df"),
      new Color("#38bdf8"),
      new Color("#ffbe6b"),
      new Color("#ff758f"),
      new Color("#b392ff"),
    ];

    for (let i = 0; i < count; i += 1) {
      const z = 14 - random() * 215;
      const spreadX = 36 + Math.abs(z) * 0.22;
      positions[i * 3] = (random() - 0.5) * spreadX * 2;
      positions[i * 3 + 1] = -2.5 + random() * 26;
      positions[i * 3 + 2] = z;

      scales[i] = 0.72 + Math.pow(random(), 2.0) * 3.2;
      phases[i] = random() * Math.PI * 2;

      const c = palette[Math.floor(random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geom = new BufferGeometry();
    geom.setAttribute("position", new BufferAttribute(positions, 3));
    geom.setAttribute("aScale", new BufferAttribute(scales, 1));
    geom.setAttribute("aPhase", new BufferAttribute(phases, 1));
    geom.setAttribute("aColor", new BufferAttribute(colors, 3));

    const mat = new ShaderMaterial({
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uPulseAge: { value: 0 },
      },
    });

    return { geometry: geom, material: mat };
  }, [count]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material],
  );

  useFrame(({ clock }) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.getElapsedTime();
    material.uniforms.uPulseAge.value =
      pulseTimeRef.current > 0 ? Math.max(0, (performance.now() - pulseTimeRef.current) * 0.001) : 0;
  });

  return <points geometry={geometry} material={material} />;
}

/**
 * Tangible Pure-Code 3D Sanctuary Diorama Station mounted along the 5-Act Spatial Corridor
 */
function BackdropSanctuaryStation({
  worldId,
  position,
  yaw,
  scale,
  pulseTimeRef,
  reducedMotion,
}: {
  worldId: WorldId;
  position: [number, number, number];
  yaw: number;
  scale: number;
  pulseTimeRef?: MutableRefObject<number>;
  reducedMotion: boolean;
}) {
  const rootRef = useRef<Group>(null);
  const spec = WORLD_SPECS[worldId];

  const stationResources = useMemo(() => {
    const built = buildSanctuaryWorld(worldId, spec.defaultSeed, "backdrop");
    const atmo = sampleWorldAtmosphere(worldId, spec.defaultPhase, createEmptyAtmosphere());

    const terrainMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.84,
      metalness: 0.06,
      flatShading: true,
    });
    const stoneMat = new MeshLambertMaterial({
      vertexColors: true,
    });
    const woodMat = new MeshLambertMaterial({
      vertexColors: true,
    });
    const goldMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.24,
      metalness: 0.86,
      emissive: new Color("#f59e0b"),
      emissiveIntensity: 0.28,
    });
    const crystalMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.16,
      metalness: 0.25,
      emissive: new Color(spec.accentPrimary),
      emissiveIntensity: 0.58,
    });
    const emissiveMat = new MeshLambertMaterial({
      vertexColors: true,
      emissive: new Color("#ffffff"),
      emissiveIntensity: 1.45,
    });

    const group = new Group();
    const extraDisposables: Array<{ dispose: () => void }> = [
      terrainMat,
      stoneMat,
      woodMat,
      goldMat,
      crystalMat,
      emissiveMat,
    ];

    group.add(new Mesh(built.terrainGeometry, terrainMat));
    group.add(new Mesh(built.stoneGeometry, stoneMat));
    group.add(new Mesh(built.woodGeometry, woodMat));
    group.add(new Mesh(built.goldGeometry, goldMat));
    group.add(new Mesh(built.crystalGeometry, crystalMat));
    group.add(new Mesh(built.emissiveGeometry, emissiveMat));

    // Water Discs
    const waterMats: ShaderMaterial[] = [];
    for (const wb of built.waterBodies) {
      const wGeo = createWaterDiscGeometry(wb.radius, 36);
      const wMat = new ShaderMaterial({
        vertexShader: sanctuaryWaterVertexShader,
        fragmentShader: sanctuaryWaterFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uDeepColor: { value: atmo.waterDeepColor.clone() },
          uShallowColor: { value: atmo.waterShallowColor.clone() },
          uSunColor: { value: atmo.sunColor.clone() },
          uHorizonColor: { value: atmo.horizonColor.clone() },
          uSunDirection: { value: atmo.sunDirection.clone() },
          uShoreRadius: { value: wb.radius },
          uCausticsStrength: { value: atmo.causticsStrength },
        },
      });
      const wm = new Mesh(wGeo, wMat);
      wm.position.set(...wb.position);
      group.add(wm);
      waterMats.push(wMat);
      extraDisposables.push(wGeo, wMat);
    }

    // Waterfalls
    const waterfallMats: ShaderMaterial[] = [];
    for (const wfGeo of built.waterfalls) {
      const wfMat = new ShaderMaterial({
        vertexShader: sanctuaryWaterfallVertexShader,
        fragmentShader: sanctuaryWaterfallFragmentShader,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uFoamColor: { value: new Color("#f0f9ff") },
          uWaterColor: { value: new Color("#38bdf8") },
        },
      });
      group.add(new Mesh(wfGeo, wfMat));
      waterfallMats.push(wfMat);
      extraDisposables.push(wfMat);
    }

    // Light Beams
    const beamMats: ShaderMaterial[] = [];
    for (const b of built.lightBeams) {
      const bGeo = new CylinderGeometry(b.radiusTop, b.radiusBottom, b.height, 18, 1, true);
      const bMat = new ShaderMaterial({
        vertexShader: sanctuaryBeamVertexShader,
        fragmentShader: sanctuaryBeamFragmentShader,
        transparent: true,
        depthWrite: false,
        blending: AdditiveBlending,
        side: DoubleSide,
        uniforms: {
          uTime: { value: 0 },
          uBeamColor: { value: new Color(b.color) },
          uOpacity: { value: b.opacity },
        },
      });
      const bm = new Mesh(bGeo, bMat);
      bm.position.set(...b.position);
      bm.rotation.set(...b.rotation);
      group.add(bm);
      beamMats.push(bMat);
      extraDisposables.push(bGeo, bMat);
    }

    // Kinetics
    const kineticItems: Array<{
      mesh: Mesh;
      basePos: Vector3;
      rotSpeed: [number, number, number];
      bobAmp: number;
      bobSpeed: number;
      phase: number;
      jellyTime?: { value: number };
    }> = [];

    for (const k of built.kinetics) {
      let mat: MeshStandardMaterial | MeshLambertMaterial | ShaderMaterial = goldMat;
      let jellyTime: { value: number } | undefined;
      if (k.materialKind === "jellyfish") {
        jellyTime = { value: 0 };
        mat = new ShaderMaterial({
          vertexShader: jellyfishVertexShader,
          fragmentShader: jellyfishFragmentShader,
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          blending: AdditiveBlending,
          uniforms: {
            uTime: jellyTime,
            uCoreColor: { value: new Color(k.jellyfishColors?.[0] ?? "#2dd4bf") },
            uRimColor: { value: new Color(k.jellyfishColors?.[1] ?? "#f472b6") },
          },
        });
        extraDisposables.push(mat);
      } else if (k.materialKind === "emissive") {
        mat = emissiveMat;
      } else if (k.materialKind === "wood") {
        mat = woodMat;
      }
      const km = new Mesh(k.geometry, mat);
      km.position.set(...k.position);
      if (k.initialRotation) km.rotation.set(...k.initialRotation);
      group.add(km);
      kineticItems.push({
        mesh: km,
        basePos: new Vector3(...k.position),
        rotSpeed: k.rotationSpeed,
        bobAmp: k.bobAmplitude ?? 0,
        bobSpeed: k.bobSpeed ?? 1,
        phase: k.phase ?? 0,
        jellyTime,
      });
    }

    // Canopy Clusters
    if (built.canopyClusters.length > 0) {
      const cGeo = createCanopyClusterBaseGeometry();
      const cMat = new MeshStandardMaterial({
        roughness: 0.56,
        metalness: 0.04,
        flatShading: true,
        emissive: new Color(spec.accentPrimary),
        emissiveIntensity: 0.18,
      });
      const inst = new InstancedMesh(cGeo, cMat, built.canopyClusters.length);
      const m4 = new Matrix4();
      const q = new Quaternion();
      const e = new Euler();
      const sv = new Vector3();
      built.canopyClusters.forEach((c, idx) => {
        e.set(idx * 0.31, idx * 0.87, idx * 0.19);
        q.setFromEuler(e);
        sv.set(...c.scale);
        m4.compose(c.position, q, sv);
        inst.setMatrixAt(idx, m4);
        inst.setColorAt(idx, c.color);
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      group.add(inst);
      extraDisposables.push(cGeo, cMat);
    }

    // Grass / Kelp Instances
    if (built.grassInstances.length > 0) {
      const gGeo = createGrassBladeGeometry();
      const gMat = new MeshLambertMaterial({
        side: DoubleSide,
      });
      const gInst = new InstancedMesh(gGeo, gMat, built.grassInstances.length);
      built.grassInstances.forEach((g, idx) => {
        gInst.setMatrixAt(idx, g.matrix);
        gInst.setColorAt(idx, g.color);
      });
      gInst.instanceMatrix.needsUpdate = true;
      if (gInst.instanceColor) gInst.instanceColor.needsUpdate = true;
      group.add(gInst);
      extraDisposables.push(gGeo, gMat);
    }

    // Flock (Birds or Spirit Fish)
    let flockInst: InstancedMesh | null = null;
    const flockData: Array<{
      r: number;
      h: number;
      a: number;
      speed: number;
      phase: number;
      scale: number;
    }> = [];
    if (built.flock && built.flock.count > 0) {
      const fs = built.flock;
      const fGeo = fs.kind === "fish" ? createFishGeometry() : createSpiritBirdGeometry();
      const fMat = new MeshLambertMaterial({
        side: DoubleSide,
        emissive: new Color(fs.colorA),
        emissiveIntensity: 0.55,
      });
      flockInst = new InstancedMesh(fGeo, fMat, fs.count);
      const rngF = createRng(spec.defaultSeed + 777);
      const colA = new Color(fs.colorA);
      const colB = new Color(fs.colorB);
      for (let i = 0; i < fs.count; i += 1) {
        flockData.push({
          r: MathUtils.lerp(fs.orbitRadius[0], fs.orbitRadius[1], rngF()),
          h: MathUtils.lerp(fs.heightRange[0], fs.heightRange[1], rngF()),
          a: rngF() * Math.PI * 2,
          speed: fs.speed * (0.75 + rngF() * 0.5) * (i % 4 === 0 ? -1 : 1),
          phase: rngF() * Math.PI * 2,
          scale: fs.kind === "fish" ? 0.65 + rngF() * 0.5 : 0.75 + rngF() * 0.45,
        });
        flockInst.setColorAt(i, colA.clone().lerp(colB, rngF()));
      }
      if (flockInst.instanceColor) flockInst.instanceColor.needsUpdate = true;
      group.add(flockInst);
      extraDisposables.push(fGeo, fMat);
    }

    return {
      group,
      built,
      waterMats,
      waterfallMats,
      beamMats,
      kineticItems,
      flockInst,
      flockData,
      emissiveMat,
      crystalMat,
      disposeAll: () => {
        built.dispose();
        for (const d of extraDisposables) d.dispose();
      },
    };
  }, [worldId, spec]);

  useEffect(() => () => stationResources.disposeAll(), [stationResources]);

  const dummyM = useMemo(() => new Matrix4(), []);

  useFrame((state, delta) => {
    const root = rootRef.current;
    if (!root) return;

    // Distance-cull far stations so at most 1–2 sanctuaries render simultaneously
    const distZ = Math.abs(position[2] - state.camera.position.z);
    const isVisible = distZ < 72;
    root.visible = isVisible;
    if (!isVisible) return;

    const t = reducedMotion ? 2.4 : state.clock.getElapsedTime();

    // Pulse boost on Genesis button click
    if (pulseTimeRef && pulseTimeRef.current > 0) {
      const pulseAge = (performance.now() - pulseTimeRef.current) * 0.001;
      const boost = pulseAge < 2.5 ? 1 + Math.sin(Math.min(1, pulseAge / 2.2) * Math.PI) * 1.1 : 1;
      stationResources.emissiveMat.emissiveIntensity = 1.45 * boost;
      stationResources.crystalMat.emissiveIntensity = 0.58 * boost;
    }

    if (!reducedMotion) {
      root.position.y = position[1] + Math.sin(t * 0.52 + position[2] * 0.05) * 0.14;
    }

    for (const wm of stationResources.waterMats) wm.uniforms.uTime.value = t;
    for (const wf of stationResources.waterfallMats) wf.uniforms.uTime.value = t;
    for (const bm of stationResources.beamMats) bm.uniforms.uTime.value = t;

    for (const k of stationResources.kineticItems) {
      if (!reducedMotion) {
        k.mesh.rotation.x += k.rotSpeed[0] * delta;
        k.mesh.rotation.y += k.rotSpeed[1] * delta;
        k.mesh.rotation.z += k.rotSpeed[2] * delta;
        if (k.bobAmp > 0) {
          k.mesh.position.y = k.basePos.y + Math.sin(t * k.bobSpeed + k.phase) * k.bobAmp;
        }
      }
      if (k.jellyTime) k.jellyTime.value = t;
    }

    if (stationResources.flockInst && stationResources.flockData.length > 0) {
      const isBirds = stationResources.built.flock?.kind === "birds";
      const te = dummyM.elements;
      for (let i = 0; i < stationResources.flockData.length; i += 1) {
        const ag = stationResources.flockData[i];
        const curA = ag.a + t * ag.speed;
        const c = Math.cos(curA);
        const s = Math.sin(curA);
        const dir = ag.speed >= 0 ? 1 : -1;
        const sc = ag.scale;
        const flap = isBirds && !reducedMotion ? 0.76 + 0.32 * Math.sin(t * 7.2 + ag.phase) : 1.0;
        te[0] = dir * c * sc;
        te[1] = 0;
        te[2] = dir * s * sc;
        te[3] = 0;
        te[4] = 0;
        te[5] = sc * flap;
        te[6] = 0;
        te[7] = 0;
        te[8] = -dir * s * sc;
        te[9] = 0;
        te[10] = dir * c * sc;
        te[11] = 0;
        te[12] = c * ag.r;
        te[13] = ag.h + Math.sin(t * 2.0 + ag.phase) * 0.35;
        te[14] = s * ag.r;
        te[15] = 1;
        stationResources.flockInst.setMatrixAt(i, dummyM);
      }
      stationResources.flockInst.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={rootRef} position={position} rotation={[0, yaw, 0]} scale={scale}>
      <primitive object={stationResources.group} />
    </group>
  );
}

export function WorldScene(props: WorldSceneProps) {
  const [pageVisible, setPageVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );
  const [mountedStage, setMountedStage] = useState(() =>
    props.reducedMotion || props.scrollProgressRef.current > 0.04 ? 4 : 0,
  );

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  // Stagger building off-screen stations 01..04 across idle frames so first paint is instant
  useEffect(() => {
    if (mountedStage >= 4) return;
    const timer = window.setTimeout(() => {
      setMountedStage((prev) => Math.min(4, prev + 1));
    }, 110);
    return () => window.clearTimeout(timer);
  }, [mountedStage]);

  const heroWorldId: WorldId = props.heroWorldId ?? "aether-sanctuary";
  const m = props.isMobile;

  return (
    <Canvas
      className="world-canvas"
      frameloop={pageVisible ? "always" : "never"}
      dpr={[1, m ? 1 : 1.25]}
      camera={{ position: [-1.6, 4.1, 7.2], fov: 48, near: 0.1, far: 340 }}
      gl={{ antialias: !m, alpha: true, powerPreference: "high-performance", stencil: false }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.04;
      }}
    >
      <fogExp2 attach="fog" args={["#071126", 0.0086]} />
      <AtmosphereDirector scrollProgressRef={props.scrollProgressRef} heroWorldId={heroWorldId} />

      <NebulaSkyDome
        scrollProgressRef={props.scrollProgressRef}
        pulseTimeRef={props.pulseTimeRef}
        reducedMotion={props.reducedMotion}
      />
      <CameraSplineRig
        scrollProgressRef={props.scrollProgressRef}
        pointerRef={props.pointerRef}
        isMobile={m}
        reducedMotion={props.reducedMotion}
      />
      <TopographicSea {...props} />
      <AstralParticles
        pulseTimeRef={props.pulseTimeRef}
        isMobile={m}
        reducedMotion={props.reducedMotion}
      />

      {/* Station 00 (Home / Hero): Live Switchable Wonder World (defaults to Aether Sanctuary) */}
      <BackdropSanctuaryStation
        worldId={heroWorldId}
        position={[m ? 0.2 : 6.7, m ? -0.35 : -0.32, -18.2]}
        yaw={-0.38}
        scale={m ? 0.30 : 0.40}
        pulseTimeRef={props.pulseTimeRef}
        reducedMotion={props.reducedMotion}
      />

      {/* Station 01 (Imagine): Chronos Astrolabe Citadel */}
      {mountedStage >= 1 && (
        <BackdropSanctuaryStation
          worldId="astral-citadel"
          position={[m ? 0.0 : 5.8, -0.1, -57.5]}
          yaw={-0.32}
          scale={m ? 0.30 : 0.40}
          reducedMotion={props.reducedMotion}
        />
      )}

      {/* Station 02 (Alive): Bioluminescent Abyssal Sanctuary */}
      {mountedStage >= 2 && (
        <BackdropSanctuaryStation
          worldId="abyssal-garden"
          position={[m ? 0.0 : -5.8, -0.45, -97.5]}
          yaw={0.35}
          scale={m ? 0.30 : 0.40}
          reducedMotion={props.reducedMotion}
        />
      )}

      {/* Station 03 (Connect): Aurora Crystal Fjord */}
      {mountedStage >= 3 && (
        <BackdropSanctuaryStation
          worldId="aurora-prism"
          position={[m ? 0.0 : 5.8, -0.35, -137.5]}
          yaw={-0.34}
          scale={m ? 0.30 : 0.40}
          reducedMotion={props.reducedMotion}
        />
      )}

      {/* Station 04 (About): Solaris Mirage Oasis */}
      {mountedStage >= 4 && (
        <BackdropSanctuaryStation
          worldId="solaris-oasis"
          position={[m ? 0.0 : 4.4, 0.35, -177.5]}
          yaw={-0.28}
          scale={m ? 0.31 : 0.41}
          reducedMotion={props.reducedMotion}
        />
      )}
    </Canvas>
  );
}
