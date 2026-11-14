import { Camera, Dices, Eye, EyeOff, Orbit, Sparkles, Sun, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BackSide,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
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
  MeshStandardMaterial,
  PCFSoftShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  PointLight,
  Points,
  PointsMaterial,
  Quaternion,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  SRGBColorSpace,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import type { Locale } from "./i18n";
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
  sanctuaryCloudFragmentShader,
  sanctuaryCloudVertexShader,
  sanctuarySkyFragmentShader,
  sanctuarySkyVertexShader,
  sanctuaryWaterfallFragmentShader,
  sanctuaryWaterfallVertexShader,
  sanctuaryWaterFragmentShader,
  sanctuaryWaterVertexShader,
} from "./worlds/sanctuaryShaders";
import {
  createEmptyAtmosphere,
  sampleWorldAtmosphere,
  TIME_PRESET_PHASES,
  WORLD_IDS,
  WORLD_SPECS,
  type CameraPresetId,
  type TimePresetId,
  type WorldId,
} from "./worlds/worldRegistry";

export interface SanctuaryExplorerModalProps {
  initialWorldId: WorldId;
  locale: Locale;
  captureMode?: boolean;
  initialPhaseOverride?: number;
  initialCameraOverride?: Exclude<CameraPresetId, "autoOrbit">;
  onClose?: () => void;
  onSelectBackdrop?: (worldId: WorldId) => void;
}

export function SanctuaryExplorerModal({
  initialWorldId,
  locale,
  captureMode = false,
  initialPhaseOverride,
  initialCameraOverride,
  onClose,
  onSelectBackdrop,
}: SanctuaryExplorerModalProps) {
  const [worldId, setWorldId] = useState<WorldId>(initialWorldId);
  const spec = WORLD_SPECS[worldId];

  const [seed, setSeed] = useState<number>(() => WORLD_SPECS[initialWorldId].defaultSeed);
  const [timePreset, setTimePreset] = useState<TimePresetId>(
    () => WORLD_SPECS[initialWorldId].defaultTimePreset,
  );
  const [phase, setPhase] = useState<number>(
    () => initialPhaseOverride ?? WORLD_SPECS[initialWorldId].defaultPhase,
  );
  const [cameraPreset, setCameraPreset] = useState<Exclude<CameraPresetId, "autoOrbit">>(
    () => initialCameraOverride ?? "panorama",
  );
  const [cameraTrigger, setCameraTrigger] = useState(0);
  const [autoOrbit, setAutoOrbit] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);
  const [stats, setStats] = useState({ triangles: 0, instances: 0 });
  const [captureReady, setCaptureReady] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const phaseRef = useRef(phase);
  const autoOrbitRef = useRef(autoOrbit);
  phaseRef.current = phase;
  autoOrbitRef.current = autoOrbit;

  const camTargetStateRef = useRef<{
    active: boolean;
    pos: Vector3;
    target: Vector3;
  }>({
    active: false,
    pos: new Vector3(),
    target: new Vector3(),
  });

  // Switch world handler resets seed, signature time-of-day, and panorama camera
  const handleSelectWorld = (nextId: WorldId) => {
    const nextSpec = WORLD_SPECS[nextId];
    setWorldId(nextId);
    setSeed(nextSpec.defaultSeed);
    setTimePreset(nextSpec.defaultTimePreset);
    setPhase(nextSpec.defaultPhase);
    setCameraPreset("panorama");
    setAutoOrbit(false);
  };

  // Update camera target smoothly when preset button clicked
  useEffect(() => {
    const found = WORLD_SPECS[worldId].cameras.find((c) => c.id === cameraPreset) ?? WORLD_SPECS[worldId].cameras[0];
    camTargetStateRef.current = {
      active: !captureMode,
      pos: new Vector3(...found.position),
      target: new Vector3(...found.target),
    };
  }, [worldId, cameraPreset, cameraTrigger, captureMode]);

  // Close on Escape
  useEffect(() => {
    if (captureMode || !onClose) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [captureMode, onClose]);

  // Lock page body scroll while modal open
  useEffect(() => {
    if (captureMode) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [captureMode]);

  // Core WebGL2 + HDR UnrealBloom + Procedural World Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    setCaptureReady(false);

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const currentSpec = WORLD_SPECS[worldId];

    const renderer = new WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: captureMode,
      stencil: false,
    });
    renderer.setPixelRatio(captureMode ? 1.5 : Math.min(window.devicePixelRatio || 1, 1.3));
    renderer.setSize(width, height);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);

    const scene = new Scene();
    const fog = new FogExp2("#141838", 0.003);
    scene.fog = fog;

    // Procedural PBR Environment Map (0 external HDR files!)
    const pmrem = new PMREMGenerator(renderer);
    const roomEnv = new RoomEnvironment();
    const envRT = pmrem.fromScene(roomEnv, 0.04);
    scene.environment = envRT.texture;
    scene.environmentIntensity = 0.26;
    roomEnv.dispose();
    pmrem.dispose();

    const initialCam =
      currentSpec.cameras.find((c) => c.id === cameraPreset) ?? currentSpec.cameras[0];
    const camera = new PerspectiveCamera(46, width / height, 0.2, 420);
    camera.position.set(...initialCam.position);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(...initialCam.target);
    controls.enableDamping = !captureMode;
    controls.dampingFactor = 0.06;
    controls.minDistance = 5;
    controls.maxDistance = 68;
    controls.maxPolarAngle = Math.PI * 0.56;
    controls.update();

    // Post-processing Composer is allocated ONLY in HD offline captureMode; interactive roaming renders directly at 60–120 FPS!
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    let outputPass: OutputPass | null = null;
    if (captureMode) {
      composer = new EffectComposer(renderer);
      const renderPass = new RenderPass(scene, camera);
      bloomPass = new UnrealBloomPass(
        new Vector2(width, height),
        0.24, // strength
        0.46, // radius
        1.02, // threshold
      );
      outputPass = new OutputPass();
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
      composer.addPass(outputPass);
    }

    // Sky Dome
    const skyMat = new ShaderMaterial({
      vertexShader: sanctuarySkyVertexShader,
      fragmentShader: sanctuarySkyFragmentShader,
      side: BackSide,
      depthWrite: false,
      uniforms: {
        uZenithColor: { value: new Color() },
        uMidSkyColor: { value: new Color() },
        uHorizonColor: { value: new Color() },
        uSunColor: { value: new Color() },
        uSunDirection: { value: new Vector3(0.4, 0.4, -0.8) },
        uTime: { value: 0 },
        uStarVisibility: { value: 0 },
        uAuroraStrength: { value: 0 },
        uPlanetStrength: { value: 0 },
        uUnderwaterMode: { value: worldId === "abyssal-garden" ? 1.0 : 0.0 },
      },
    });
    const skyGeo = new SphereGeometry(240, 48, 32);
    const skyMesh = new Mesh(skyGeo, skyMat);
    skyMesh.renderOrder = -20;
    scene.add(skyMesh);

    // Lights
    const hemiLight = new HemisphereLight("#9ecbff", "#2c1e38", 1.0);
    scene.add(hemiLight);

    const sunLight = new DirectionalLight("#ffd166", 2.5);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(captureMode ? 2048 : 1024, captureMode ? 2048 : 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 115;
    const shadowBound = 32;
    sunLight.shadow.camera.left = -shadowBound;
    sunLight.shadow.camera.right = shadowBound;
    sunLight.shadow.camera.top = shadowBound;
    sunLight.shadow.camera.bottom = -shadowBound;
    sunLight.shadow.bias = -0.0005;
    scene.add(sunLight);

    const underBounceLight = new DirectionalLight(currentSpec.accentSecondary, 0.68);
    underBounceLight.position.set(0, -25, 8);
    scene.add(underBounceLight);

    // Build Pure-Code World Geometry
    const built = buildSanctuaryWorld(worldId, seed, "ultra");
    setStats(built.stats);

    const worldGroup = new Group();
    scene.add(worldGroup);

    const disposables: Array<{ dispose: () => void }> = [skyMat, skyGeo, envRT];
    if (composer && bloomPass && outputPass) {
      disposables.push(composer, bloomPass, outputPass);
    }

    // Static PBR Material Buckets
    const terrainMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.86,
      metalness: 0.06,
      flatShading: true,
    });
    const stoneMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.48,
      metalness: 0.12,
    });
    const woodMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.08,
    });
    const goldMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.22,
      metalness: 0.88,
      emissive: new Color("#f59e0b"),
      emissiveIntensity: 0.18,
    });
    const crystalMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.14,
      metalness: 0.25,
      emissive: new Color(currentSpec.accentPrimary),
      emissiveIntensity: 0.52,
    });
    const emissiveMat = new MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.18,
      metalness: 0.1,
      emissive: new Color("#ffffff"),
      emissiveIntensity: 1.45,
    });
    disposables.push(terrainMat, stoneMat, woodMat, goldMat, crystalMat, emissiveMat);

    const addBucketMesh = (geo: BufferGeometry, mat: MeshStandardMaterial, cast = true, receive = true) => {
      const m = new Mesh(geo, mat);
      m.castShadow = cast;
      m.receiveShadow = receive;
      worldGroup.add(m);
    };

    addBucketMesh(built.terrainGeometry, terrainMat, true, true);
    addBucketMesh(built.stoneGeometry, stoneMat, true, true);
    addBucketMesh(built.woodGeometry, woodMat, true, true);
    addBucketMesh(built.goldGeometry, goldMat, true, true);
    addBucketMesh(built.crystalGeometry, crystalMat, true, false);
    addBucketMesh(built.emissiveGeometry, emissiveMat, false, false);

    // Point Lights
    for (const pl of built.pointLights) {
      const light = new PointLight(pl.color, pl.intensity, pl.distance, 1.6);
      light.position.set(...pl.position);
      worldGroup.add(light);
    }

    // Cloud Sea (for floating sky realms)
    let cloudMat: ShaderMaterial | null = null;
    if (currentSpec.hasCloudSea) {
      const cloudSegs = captureMode ? 96 : 56;
      const cloudGeo = new PlaneGeometry(390, 390, cloudSegs, cloudSegs);
      cloudGeo.rotateX(-Math.PI / 2);
      cloudMat = new ShaderMaterial({
        vertexShader: sanctuaryCloudVertexShader,
        fragmentShader: sanctuaryCloudFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uCloudLitColor: { value: new Color() },
          uCloudShadowColor: { value: new Color() },
          uHorizonColor: { value: new Color() },
          uSunDirection: { value: new Vector3(0.3, 0.4, -0.8) },
        },
      });
      const cloudMesh = new Mesh(cloudGeo, cloudMat);
      cloudMesh.position.y = currentSpec.cloudHeight;
      worldGroup.add(cloudMesh);
      disposables.push(cloudGeo, cloudMat);
    }

    // Water Bodies
    const waterMaterials: ShaderMaterial[] = [];
    for (const wb of built.waterBodies) {
      const wGeo = createWaterDiscGeometry(wb.radius, captureMode ? 56 : 40);
      const wMat = new ShaderMaterial({
        vertexShader: sanctuaryWaterVertexShader,
        fragmentShader: sanctuaryWaterFragmentShader,
        transparent: true,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uDeepColor: { value: new Color() },
          uShallowColor: { value: new Color() },
          uSunColor: { value: new Color() },
          uHorizonColor: { value: new Color() },
          uSunDirection: { value: new Vector3(0.3, 0.4, -0.8) },
          uShoreRadius: { value: wb.radius },
          uCausticsStrength: { value: 0.5 },
        },
      });
      const wMesh = new Mesh(wGeo, wMat);
      wMesh.position.set(...wb.position);
      worldGroup.add(wMesh);
      waterMaterials.push(wMat);
      disposables.push(wGeo, wMat);
    }

    // Waterfalls
    const waterfallMaterials: ShaderMaterial[] = [];
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
      worldGroup.add(new Mesh(wfGeo, wfMat));
      waterfallMaterials.push(wfMat);
      disposables.push(wfMat);
    }

    // Volumetric Light Beams / God-Rays
    const beamMaterials: ShaderMaterial[] = [];
    for (const b of built.lightBeams) {
      const bGeo = new CylinderGeometry(b.radiusTop, b.radiusBottom, b.height, 24, 1, true);
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
      const bMesh = new Mesh(bGeo, bMat);
      bMesh.position.set(...b.position);
      bMesh.rotation.set(...b.rotation);
      worldGroup.add(bMesh);
      beamMaterials.push(bMat);
      disposables.push(bGeo, bMat);
    }

    // Kinetic Animated Meshes (Rotating Orrery Rings, Wind-Sails, Pulsing Jellyfish, Solar Prism)
    const kineticNodes: Array<{
      mesh: Mesh;
      basePos: Vector3;
      rotSpeed: [number, number, number];
      bobAmp: number;
      bobSpeed: number;
      phase: number;
      jellyUniform?: { uTime: { value: number } };
    }> = [];

    for (const k of built.kinetics) {
      let mat: MeshStandardMaterial | ShaderMaterial;
      let jellyUniform: { uTime: { value: number } } | undefined;

      if (k.materialKind === "jellyfish") {
        const uTime = { value: 0 };
        jellyUniform = { uTime };
        mat = new ShaderMaterial({
          vertexShader: jellyfishVertexShader,
          fragmentShader: jellyfishFragmentShader,
          transparent: true,
          depthWrite: false,
          side: DoubleSide,
          blending: AdditiveBlending,
          uniforms: {
            uTime,
            uCoreColor: { value: new Color(k.jellyfishColors?.[0] ?? "#2dd4bf") },
            uRimColor: { value: new Color(k.jellyfishColors?.[1] ?? "#f472b6") },
          },
        });
        disposables.push(mat);
      } else if (k.materialKind === "emissive") {
        mat = emissiveMat;
      } else if (k.materialKind === "wood") {
        mat = woodMat;
      } else {
        mat = goldMat;
      }

      const m = new Mesh(k.geometry, mat);
      m.position.set(...k.position);
      if (k.initialRotation) m.rotation.set(...k.initialRotation);
      m.castShadow = k.materialKind !== "jellyfish";
      worldGroup.add(m);
      kineticNodes.push({
        mesh: m,
        basePos: new Vector3(...k.position),
        rotSpeed: k.rotationSpeed,
        bobAmp: k.bobAmplitude ?? 0,
        bobSpeed: k.bobSpeed ?? 1,
        phase: k.phase ?? 0,
        jellyUniform,
      });
    }

    // Instanced Botanical Canopy / Coral Clusters with subtle warm rim glow
    const canopyTimeUniform = { value: 0 };
    if (built.canopyClusters.length > 0) {
      const baseClusterGeo = createCanopyClusterBaseGeometry();
      const clusterMat = new MeshStandardMaterial({
        roughness: 0.58,
        metalness: 0.04,
        flatShading: true,
        emissive: new Color(currentSpec.accentPrimary),
        emissiveIntensity: 0.16,
      });
      clusterMat.onBeforeCompile = (shader) => {
        shader.uniforms.uWindTime = canopyTimeUniform;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uWindTime;")
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             float sway = sin(uWindTime * 1.4 + instanceMatrix[3][0] * 0.35 + instanceMatrix[3][2] * 0.35) * 0.06;
             transformed.x += sway;
             transformed.z += sway * 0.7;`,
          );
      };

      const inst = new InstancedMesh(baseClusterGeo, clusterMat, built.canopyClusters.length);
      inst.castShadow = captureMode;
      inst.receiveShadow = true;
      const m4 = new Matrix4();
      const q = new Quaternion();
      const e = new Euler();
      const sVec = new Vector3();

      built.canopyClusters.forEach((c, idx) => {
        e.set(idx * 0.37, idx * 0.91, idx * 0.19);
        q.setFromEuler(e);
        sVec.set(...c.scale);
        m4.compose(c.position, q, sVec);
        inst.setMatrixAt(idx, m4);
        inst.setColorAt(idx, c.color);
      });
      inst.instanceMatrix.needsUpdate = true;
      if (inst.instanceColor) inst.instanceColor.needsUpdate = true;
      worldGroup.add(inst);
      disposables.push(baseClusterGeo, clusterMat);
    }

    // Instanced Wind-Swaying Grass / Kelp / Frost Blades
    const grassTimeUniform = { value: 0 };
    if (built.grassInstances.length > 0) {
      const bladeGeo = createGrassBladeGeometry();
      const bladeMat = new MeshStandardMaterial({
        roughness: 0.68,
        metalness: 0.05,
        side: DoubleSide,
      });
      bladeMat.onBeforeCompile = (shader) => {
        shader.uniforms.uWindTime = grassTimeUniform;
        shader.vertexShader = shader.vertexShader
          .replace("#include <common>", "#include <common>\nuniform float uWindTime;")
          .replace(
            "#include <begin_vertex>",
            `#include <begin_vertex>
             float gust = sin(uWindTime * 2.1 + instanceMatrix[3][0] * 0.28 + instanceMatrix[3][2] * 0.24) * 0.22;
             transformed.x += gust * position.y * position.y;
             transformed.z += gust * 0.65 * position.y * position.y;`,
          );
      };

      const grassMesh = new InstancedMesh(bladeGeo, bladeMat, built.grassInstances.length);
      grassMesh.receiveShadow = true;
      built.grassInstances.forEach((g, idx) => {
        grassMesh.setMatrixAt(idx, g.matrix);
        grassMesh.setColorAt(idx, g.color);
      });
      grassMesh.instanceMatrix.needsUpdate = true;
      if (grassMesh.instanceColor) grassMesh.instanceColor.needsUpdate = true;
      worldGroup.add(grassMesh);
      disposables.push(bladeGeo, bladeMat);
    }

    // Orbiting Flock (Birds / 650 Spirit Fish)
    let flockInstanced: InstancedMesh | null = null;
    const flockAgents: Array<{
      radius: number;
      height: number;
      angle: number;
      speed: number;
      bobPhase: number;
      scale: number;
    }> = [];

    if (built.flock && built.flock.count > 0) {
      const fSpec = built.flock;
      const fGeo = fSpec.kind === "fish" ? createFishGeometry() : createSpiritBirdGeometry();
      const fMat = new MeshStandardMaterial({
        roughness: 0.35,
        metalness: 0.2,
        side: DoubleSide,
        emissive: new Color(fSpec.colorA),
        emissiveIntensity: fSpec.kind === "fish" ? 0.58 : 0.38,
      });
      flockInstanced = new InstancedMesh(fGeo, fMat, fSpec.count);
      const rngFlock = createRng(seed + 999);
      const colA = new Color(fSpec.colorA);
      const colB = new Color(fSpec.colorB);

      for (let i = 0; i < fSpec.count; i += 1) {
        flockAgents.push({
          radius: MathUtils.lerp(fSpec.orbitRadius[0], fSpec.orbitRadius[1], rngFlock()),
          height: MathUtils.lerp(fSpec.heightRange[0], fSpec.heightRange[1], rngFlock()),
          angle: rngFlock() * Math.PI * 2,
          speed: fSpec.speed * (0.72 + rngFlock() * 0.58) * (i % 5 === 0 ? -1 : 1),
          bobPhase: rngFlock() * Math.PI * 2,
          scale: fSpec.kind === "fish" ? 0.55 + rngFlock() * 0.65 : 0.68 + rngFlock() * 0.52,
        });
        flockInstanced.setColorAt(i, colA.clone().lerp(colB, rngFlock()));
      }
      if (flockInstanced.instanceColor) flockInstanced.instanceColor.needsUpdate = true;
      worldGroup.add(flockInstanced);
      disposables.push(fGeo, fMat);
    }

    // Atmospheric Drifting Light Motes / Petals / Plankton
    const moteCount = 420;
    const rngMote = createRng(seed + 555);
    const motePos = new Float32Array(moteCount * 3);
    const moteCol = new Float32Array(moteCount * 3);
    const pCols = built.particleColors.map((hex) => new Color(hex));
    for (let i = 0; i < moteCount; i += 1) {
      const r = 3 + rngMote() * 28;
      const a = rngMote() * Math.PI * 2;
      motePos[i * 3] = Math.cos(a) * r;
      motePos[i * 3 + 1] = -1.5 + rngMote() * 16.5;
      motePos[i * 3 + 2] = Math.sin(a) * r;
      const c = pCols[i % pCols.length];
      moteCol[i * 3] = c.r;
      moteCol[i * 3 + 1] = c.g;
      moteCol[i * 3 + 2] = c.b;
    }
    const moteCanvas = document.createElement("canvas");
    moteCanvas.width = 32;
    moteCanvas.height = 32;
    const mCtx = moteCanvas.getContext("2d");
    if (mCtx) {
      const grad = mCtx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.35, "rgba(255,255,255,0.65)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      mCtx.fillStyle = grad;
      mCtx.fillRect(0, 0, 32, 32);
    }
    const moteTex = new CanvasTexture(moteCanvas);

    const moteGeo = new BufferGeometry();
    moteGeo.setAttribute("position", new BufferAttribute(motePos, 3));
    moteGeo.setAttribute("color", new BufferAttribute(moteCol, 3));
    const moteMat = new PointsMaterial({
      size: 0.36,
      map: moteTex,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const motes = new Points(moteGeo, moteMat);
    worldGroup.add(motes);
    disposables.push(moteGeo, moteMat, moteTex);

    // WASD Keyboard Flight Support
    const pressedKeys = new Set<string>();
    const onKeyDown = (e: KeyboardEvent) => pressedKeys.add(e.code);
    const onKeyUp = (e: KeyboardEvent) => pressedKeys.delete(e.code);
    const onPointerDown = () => {
      camTargetStateRef.current.active = false;
    };
    if (!captureMode) {
      window.addEventListener("keydown", onKeyDown);
      window.addEventListener("keyup", onKeyUp);
      renderer.domElement.addEventListener("pointerdown", onPointerDown);
    }

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer && bloomPass) {
        composer.setSize(w, h);
        bloomPass.setSize(w, h);
      }
    };
    window.addEventListener("resize", onResize);

    const atmo = createEmptyAtmosphere();
    const dummyM = new Matrix4();
    const dummyUp = new Vector3(0, 1, 0);
    const forwardVec = new Vector3();
    const rightVec = new Vector3();

    let rafId = 0;
    let prevNow = performance.now();
    let renderFrames = 0;
    let lastShadowPhase = -1;

    const renderTick = (now: number) => {
      const dt = Math.min(0.05, (now - prevNow) * 0.001);
      prevNow = now;
      const elapsed = captureMode ? 4.2 : now * 0.001;

      sampleWorldAtmosphere(worldId, phaseRef.current, atmo);

      // Only re-rasterize shadow map on initial frames or when sun phase changes!
      if (renderFrames < 2 || Math.abs(phaseRef.current - lastShadowPhase) > 0.0008) {
        lastShadowPhase = phaseRef.current;
        renderer.shadowMap.needsUpdate = true;
      }

      // Sync Sky, Fog, Sun & Bounce Lights
      skyMesh.position.copy(camera.position);
      skyMat.uniforms.uZenithColor.value.copy(atmo.zenithColor);
      skyMat.uniforms.uMidSkyColor.value.copy(atmo.midSkyColor);
      skyMat.uniforms.uHorizonColor.value.copy(atmo.horizonColor);
      skyMat.uniforms.uSunColor.value.copy(atmo.sunColor);
      skyMat.uniforms.uSunDirection.value.copy(atmo.sunDirection);
      skyMat.uniforms.uTime.value = elapsed;
      skyMat.uniforms.uStarVisibility.value = atmo.starVisibility;
      skyMat.uniforms.uAuroraStrength.value = atmo.auroraStrength;
      skyMat.uniforms.uPlanetStrength.value = atmo.planetStrength;

      fog.color.copy(atmo.fogColor);
      fog.density = atmo.fogDensity;

      sunLight.color.copy(atmo.sunColor);
      sunLight.intensity = atmo.sunIntensity;
      sunLight.position.copy(atmo.sunDirection).multiplyScalar(48);

      hemiLight.color.copy(atmo.ambientSkyColor);
      hemiLight.groundColor.copy(atmo.ambientGroundColor);
      hemiLight.intensity = atmo.ambientIntensity;

      emissiveMat.emissiveIntensity = 1.68 * atmo.emissiveBoost;
      crystalMat.emissiveIntensity = 0.52 * atmo.emissiveBoost;

      if (cloudMat) {
        cloudMat.uniforms.uTime.value = elapsed;
        cloudMat.uniforms.uCloudLitColor.value.copy(atmo.cloudLitColor);
        cloudMat.uniforms.uCloudShadowColor.value.copy(atmo.cloudShadowColor);
        cloudMat.uniforms.uHorizonColor.value.copy(atmo.horizonColor);
        cloudMat.uniforms.uSunDirection.value.copy(atmo.sunDirection);
      }

      for (const wMat of waterMaterials) {
        wMat.uniforms.uTime.value = elapsed;
        wMat.uniforms.uDeepColor.value.copy(atmo.waterDeepColor);
        wMat.uniforms.uShallowColor.value.copy(atmo.waterShallowColor);
        wMat.uniforms.uSunColor.value.copy(atmo.sunColor);
        wMat.uniforms.uHorizonColor.value.copy(atmo.horizonColor);
        wMat.uniforms.uSunDirection.value.copy(atmo.sunDirection);
        wMat.uniforms.uCausticsStrength.value = atmo.causticsStrength;
      }

      for (const wfMat of waterfallMaterials) {
        wfMat.uniforms.uTime.value = elapsed;
      }
      for (const bMat of beamMaterials) {
        bMat.uniforms.uTime.value = elapsed;
      }

      canopyTimeUniform.value = elapsed;
      grassTimeUniform.value = elapsed;

      // Update Kinetic Sculptures & Jellyfish
      for (const kn of kineticNodes) {
        kn.mesh.rotation.x += kn.rotSpeed[0] * (captureMode ? 0 : dt);
        kn.mesh.rotation.y += kn.rotSpeed[1] * (captureMode ? 0 : dt);
        kn.mesh.rotation.z += kn.rotSpeed[2] * (captureMode ? 0 : dt);
        if (kn.bobAmp > 0) {
          kn.mesh.position.y = kn.basePos.y + Math.sin(elapsed * kn.bobSpeed + kn.phase) * kn.bobAmp;
        }
        if (kn.jellyUniform) {
          kn.jellyUniform.uTime.value = elapsed;
        }
      }

      // Update Orbiting Birds / Fish School with zero-allocation yaw basis write
      if (flockInstanced && flockAgents.length > 0) {
        const isBirds = built.flock?.kind === "birds";
        const te = dummyM.elements;
        for (let i = 0; i < flockAgents.length; i += 1) {
          const ag = flockAgents[i];
          const curA = ag.angle + elapsed * ag.speed;
          const c = Math.cos(curA);
          const s = Math.sin(curA);
          const dir = ag.speed >= 0 ? 1 : -1;
          const sc = ag.scale;
          const flap = isBirds ? 0.75 + 0.35 * Math.sin(elapsed * 7.5 + ag.bobPhase) : 1.0;
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
          te[12] = c * ag.radius;
          te[13] = ag.height + Math.sin(elapsed * 2.1 + ag.bobPhase) * 0.42;
          te[14] = s * ag.radius;
          te[15] = 1;
          flockInstanced.setMatrixAt(i, dummyM);
        }
        flockInstanced.instanceMatrix.needsUpdate = true;
      }

      motes.rotation.y = elapsed * 0.025;

      // Camera Preset Smooth Easing, Auto-Orbit & WASD Movement
      if (!captureMode) {
        if (pressedKeys.size > 0) {
          camTargetStateRef.current.active = false;
          camera.getWorldDirection(forwardVec);
          forwardVec.y = 0;
          forwardVec.normalize();
          rightVec.crossVectors(forwardVec, dummyUp).normalize();
          const moveSpeed = 14.0 * dt;
          if (pressedKeys.has("KeyW") || pressedKeys.has("ArrowUp")) {
            camera.position.addScaledVector(forwardVec, moveSpeed);
            controls.target.addScaledVector(forwardVec, moveSpeed);
          }
          if (pressedKeys.has("KeyS") || pressedKeys.has("ArrowDown")) {
            camera.position.addScaledVector(forwardVec, -moveSpeed);
            controls.target.addScaledVector(forwardVec, -moveSpeed);
          }
          if (pressedKeys.has("KeyA") || pressedKeys.has("ArrowLeft")) {
            camera.position.addScaledVector(rightVec, -moveSpeed);
            controls.target.addScaledVector(rightVec, -moveSpeed);
          }
          if (pressedKeys.has("KeyD") || pressedKeys.has("ArrowRight")) {
            camera.position.addScaledVector(rightVec, moveSpeed);
            controls.target.addScaledVector(rightVec, moveSpeed);
          }
        } else if (camTargetStateRef.current.active) {
          const alpha = 1 - Math.exp(-dt * 4.5);
          camera.position.lerp(camTargetStateRef.current.pos, alpha);
          controls.target.lerp(camTargetStateRef.current.target, alpha);
          if (camera.position.distanceTo(camTargetStateRef.current.pos) < 0.08) {
            camTargetStateRef.current.active = false;
          }
        }

        controls.autoRotate = autoOrbitRef.current;
        controls.autoRotateSpeed = 0.85;
        controls.update();
      }

      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      renderFrames += 1;

      if (captureMode) {
        if (renderFrames < 3) {
          rafId = window.requestAnimationFrame(renderTick);
        } else {
          setCaptureReady(true);
        }
      } else {
        rafId = window.requestAnimationFrame(renderTick);
      }
    };

    rafId = window.requestAnimationFrame(renderTick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      controls.dispose();
      built.dispose();
      for (const d of disposables) d.dispose();
      renderer.dispose();
    };
  }, [worldId, seed, captureMode]);

  const worldCopy = useMemo(() => spec.copy[locale], [spec, locale]);

  if (captureMode) {
    return (
      <div
        className="world-capture-stage"
        data-capture-ready={captureReady ? "true" : "false"}
        data-world={worldId}
      >
        <div ref={containerRef} className="explorer-canvas-host" />
      </div>
    );
  }

  const isZh = locale === "zh-CN";

  return (
    <div
      className="sanctuary-explorer-modal"
      role="dialog"
      aria-modal="true"
      aria-label={`${worldCopy.title} — 3D`}
    >
      <div ref={containerRef} className="explorer-canvas-host" />

      {/* Top Overlay Bar */}
      <header className={`explorer-topbar${hudHidden ? " is-hidden-hud" : ""}`}>
        <div className="explorer-identity">
          <div className="explorer-pills">
            <span className="explorer-pill-zero">
              <Sparkles size={13} />
              {isZh ? "100% 纯代码 · 0 KB 外部模型/贴图" : "100% Pure Code · 0 KB External Assets"}
            </span>
            <span className="explorer-pill-stats">
              {stats.triangles.toLocaleString()} {isZh ? "三角面" : "Tris"} ·{" "}
              {stats.instances.toLocaleString()} {isZh ? "实例" : "Instances"} · Seed #{seed}
            </span>
          </div>
          <h2>
            <span>{spec.code}</span> {worldCopy.title} <em>{worldCopy.subtitle}</em>
          </h2>
          <p className="explorer-hint">
            {isZh
              ? "拖拽旋转 · 滚轮缩放 · 右键平移 · WASD 飞行漫游"
              : "Drag to orbit · Scroll to zoom · Right-drag to pan · WASD to fly"}
          </p>
        </div>

        <div className="explorer-top-actions">
          {onSelectBackdrop && (
            <button
              type="button"
              className="explorer-btn-chip"
              onClick={() => onSelectBackdrop(worldId)}
            >
              <span>{isZh ? "投射为主页背景" : "Set as Home Backdrop"}</span>
            </button>
          )}
          <button
            type="button"
            className="explorer-btn-chip"
            onClick={() => setHudHidden((prev) => !prev)}
          >
            {hudHidden ? <Eye size={14} /> : <EyeOff size={14} />}
            <span>{hudHidden ? (isZh ? "显示面板" : "Show HUD") : isZh ? "纯净观景" : "Pure View"}</span>
          </button>
          {onClose && (
            <button
              type="button"
              className="explorer-btn-close"
              onClick={onClose}
              aria-label={isZh ? "返回主页" : "Back to site"}
            >
              <X size={16} />
              <span>{isZh ? "返回主页" : "Close"}</span>
            </button>
          )}
        </div>
      </header>

      {/* Bottom Control Dock */}
      <div className={`explorer-dock${hudHidden ? " is-hidden-hud" : ""}`}>
        {/* Row 1: 6-World Instant Teleport Switcher */}
        <div className="explorer-world-tabs" role="tablist" aria-label={isZh ? "切换奇观世界" : "Switch World"}>
          {WORLD_IDS.map((id) => {
            const w = WORLD_SPECS[id];
            const active = id === worldId;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                className={`explorer-world-tab${active ? " is-active" : ""}`}
                style={{ "--world-accent": w.accentPrimary } as React.CSSProperties}
                onClick={() => handleSelectWorld(id)}
              >
                <small>{w.code}</small>
                <span>{w.copy[locale].title}</span>
              </button>
            );
          })}
        </div>

        {/* Row 2: Time-of-Day, Camera Angles & Procedural Seed Mutator */}
        <div className="explorer-controls-row">
          <div className="explorer-control-group">
            <span className="explorer-group-label">
              <Sun size={13} />
              {isZh ? "天时" : "Time"}
            </span>
            {(["dusk", "dawn", "noon", "night"] as TimePresetId[]).map((tId) => {
              const tp = TIME_PRESET_PHASES[tId];
              return (
                <button
                  key={tId}
                  type="button"
                  className={`explorer-mini-btn${timePreset === tId ? " is-active" : ""}`}
                  onClick={() => {
                    setTimePreset(tId);
                    setPhase(tp.phase);
                  }}
                >
                  {tp.label[locale]}
                </button>
              );
            })}
            <input
              type="range"
              className="explorer-phase-slider"
              min={0}
              max={1}
              step={0.005}
              value={phase}
              aria-label={isZh ? "连续天时滑杆" : "Continuous time of day"}
              onChange={(e) => setPhase(Number(e.target.value))}
            />
          </div>

          <div className="explorer-control-group">
            <span className="explorer-group-label">
              <Camera size={13} />
              {isZh ? "机位" : "Camera"}
            </span>
            {spec.cameras.map((cam) => (
              <button
                key={cam.id}
                type="button"
                className={`explorer-mini-btn${!autoOrbit && cameraPreset === cam.id ? " is-active" : ""}`}
                onClick={() => {
                  setAutoOrbit(false);
                  setCameraPreset(cam.id);
                  setCameraTrigger((c) => c + 1);
                }}
              >
                {cam.label[locale]}
              </button>
            ))}
            <button
              type="button"
              className={`explorer-mini-btn${autoOrbit ? " is-active" : ""}`}
              onClick={() => setAutoOrbit((prev) => !prev)}
            >
              <Orbit size={13} />
              <span>{isZh ? "环绕" : "Orbit"}</span>
            </button>
            <button
              type="button"
              className="explorer-seed-btn"
              onClick={() => setSeed((prev) => ((prev * 1664525 + 1013904223) >>> 0) % 89999 + 1000)}
            >
              <Dices size={13} />
              <span>{isZh ? "演化新地形" : "Mutate Seed"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SanctuaryExplorerModal;
