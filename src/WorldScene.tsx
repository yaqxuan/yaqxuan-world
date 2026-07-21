import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, type MutableRefObject } from "react";
import * as THREE from "three";
import type { IntroStage, WorldPath } from "./content";

type SceneProps = {
  path: WorldPath;
  stage: IntroStage;
};

type BuildingDatum = {
  position: [number, number, number];
  scale: [number, number, number];
  phase: number;
  color: THREE.Color;
  windowPosition: [number, number, number];
  windowScale: [number, number, number];
};

const CAMERA_PRESETS: Record<
  WorldPath,
  { position: THREE.Vector3; target: THREE.Vector3 }
> = {
  "/": {
    position: new THREE.Vector3(0, 5.5, 18),
    target: new THREE.Vector3(0, 4.2, -72),
  },
  "/imagine": {
    position: new THREE.Vector3(8, 7.5, 17),
    target: new THREE.Vector3(12, 5, -78),
  },
  "/alive": {
    position: new THREE.Vector3(-8, 7, 17),
    target: new THREE.Vector3(-12, 4, -76),
  },
  "/connect": {
    position: new THREE.Vector3(0, 11, 19),
    target: new THREE.Vector3(0, 8, -94),
  },
  "/about": {
    position: new THREE.Vector3(0, 6, 22),
    target: new THREE.Vector3(0, 5, -75),
  },
};

function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function smooth(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

function WorldProgress({
  stage,
  progress,
}: {
  stage: IntroStage;
  progress: MutableRefObject<number>;
}) {
  useFrame((_, delta) => {
    const target = stage === "seed" ? 0.018 : 1;
    const speed = stage === "seed" ? 1.6 : 0.72;
    progress.current = THREE.MathUtils.damp(progress.current, target, speed, delta);
  });
  return null;
}

function AdaptiveQuality() {
  const { gl } = useThree();
  const elapsed = useRef(0);
  const frames = useRef(0);
  const currentDpr = useRef(Math.min(window.devicePixelRatio, 1.55));

  useFrame((_, delta) => {
    elapsed.current += delta;
    frames.current += 1;
    if (elapsed.current < 3.2) return;

    const fps = frames.current / elapsed.current;
    const nextDpr =
      fps < 43 ? 1 : fps < 54 ? Math.min(window.devicePixelRatio, 1.22) : Math.min(window.devicePixelRatio, 1.55);

    if (Math.abs(nextDpr - currentDpr.current) > 0.08) {
      currentDpr.current = nextDpr;
      gl.setPixelRatio(nextDpr);
    }
    elapsed.current = 0;
    frames.current = 0;
  });

  return null;
}

function Atmosphere({ progress }: { progress: MutableRefObject<number> }) {
  const fog = useRef<THREE.FogExp2>(null);
  const hemisphere = useRef<THREE.HemisphereLight>(null);
  const sunLight = useRef<THREE.DirectionalLight>(null);
  const fogNight = useMemo(() => new THREE.Color("#030508"), []);
  const fogDawn = useMemo(() => new THREE.Color("#8f969c"), []);

  useFrame(() => {
    const p = smooth(progress.current);
    if (fog.current) {
      fog.current.color.lerpColors(fogNight, fogDawn, p);
      fog.current.density = THREE.MathUtils.lerp(0.034, 0.009, p);
    }
    if (hemisphere.current) {
      hemisphere.current.intensity = THREE.MathUtils.lerp(0.08, 1.45, p);
    }
    if (sunLight.current) {
      sunLight.current.intensity = THREE.MathUtils.lerp(0.05, 3.4, p);
    }
  });

  return (
    <>
      <fogExp2 ref={fog} attach="fog" args={["#030508", 0.034]} />
      <hemisphereLight
        ref={hemisphere}
        args={["#dce8f2", "#1b1714", 0.08]}
        position={[0, 50, 0]}
      />
      <directionalLight
        ref={sunLight}
        color="#ffd59a"
        intensity={0.05}
        position={[-24, 28, -60]}
      />
      <ambientLight color="#657180" intensity={0.15} />
    </>
  );
}

function CameraRig({
  path,
  stage,
  progress,
}: SceneProps & { progress: MutableRefObject<number> }) {
  const lookAt = useRef(new THREE.Vector3(0, 3.5, -65));
  const desiredPosition = useMemo(() => new THREE.Vector3(), []);
  const desiredTarget = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    const preset = CAMERA_PRESETS[path];
    desiredPosition.copy(preset.position);
    desiredTarget.copy(preset.target);

    if (path === "/") {
      const intro = smooth(progress.current);
      desiredPosition.y = THREE.MathUtils.lerp(3.6, preset.position.y, intro);
      desiredPosition.z = THREE.MathUtils.lerp(10.5, preset.position.z, intro);
      desiredTarget.y = THREE.MathUtils.lerp(2.1, preset.target.y, intro);
    }

    const pointerWeight = stage === "seed" ? 1.1 : 0.48;
    desiredPosition.x += state.pointer.x * pointerWeight;
    desiredPosition.y += state.pointer.y * pointerWeight * 0.45;
    desiredTarget.x += state.pointer.x * pointerWeight * 1.9;
    desiredTarget.y += state.pointer.y * pointerWeight * 0.8;

    const easing = 1 - Math.exp(-delta * (path === "/" ? 0.82 : 1.22));
    state.camera.position.lerp(desiredPosition, easing);
    lookAt.current.lerp(desiredTarget, easing);
    state.camera.lookAt(lookAt.current);
  });

  return null;
}

function CityBuildings({ progress }: { progress: MutableRefObject<number> }) {
  const solid = useRef<THREE.InstancedMesh>(null);
  const wire = useRef<THREE.InstancedMesh>(null);
  const windows = useRef<THREE.InstancedMesh>(null);
  const solidMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const wireMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const windowMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const lastProgress = useRef(-1);

  const buildings = useMemo<BuildingDatum[]>(() => {
    const random = seededRandom(271828);
    return Array.from({ length: 260 }, (_, index) => {
      const depth = 20 + random() * 150;
      const lane = random() > 0.5 ? 1 : -1;
      const x = lane * (7.5 + random() * (depth * 0.34 + 22));
      const centralBoost = Math.max(0, 1 - Math.abs(x) / 50);
      const height =
        2.8 +
        Math.pow(random(), 1.7) * 19 +
        centralBoost * random() * 15 +
        (index % 39 === 0 ? 17 : 0);
      const width = 1.5 + random() * 4.6;
      const buildingDepth = 1.8 + random() * 5.2;
      const z = -depth;
      const hue = 0.09 + random() * 0.045;
      const color = new THREE.Color().setHSL(hue, 0.1, 0.58 + random() * 0.14);
      return {
        position: [x, height / 2 - 0.45, z],
        scale: [width, height, buildingDepth],
        phase: 0.16 + (depth / 170) * 0.5 + random() * 0.16,
        color,
        windowPosition: [x, Math.max(1.1, height * 0.48), z + buildingDepth / 2 + 0.04],
        windowScale: [Math.max(0.22, width * 0.5), 0.16, 0.035],
      };
    });
  }, []);

  useFrame(() => {
    const p = progress.current;
    if (!solid.current || !wire.current || !windows.current || Math.abs(p - lastProgress.current) < 0.002) {
      return;
    }
    lastProgress.current = p;

    buildings.forEach((building, index) => {
      const reveal = smooth((p - building.phase) / 0.28);
      const [x, y, z] = building.position;
      const [width, height, depth] = building.scale;
      dummy.position.set(x, y - (height * (1 - reveal)) / 2, z);
      dummy.scale.set(width, Math.max(0.001, height * reveal), depth);
      dummy.rotation.y = 0;
      dummy.updateMatrix();
      solid.current!.setMatrixAt(index, dummy.matrix);
      wire.current!.setMatrixAt(index, dummy.matrix);

      const [wx, wy, wz] = building.windowPosition;
      const [ww, wh, wd] = building.windowScale;
      dummy.position.set(wx, wy, wz);
      dummy.scale.set(ww * reveal, wh * reveal, wd);
      dummy.updateMatrix();
      windows.current!.setMatrixAt(index, dummy.matrix);
    });

    solid.current.instanceMatrix.needsUpdate = true;
    wire.current.instanceMatrix.needsUpdate = true;
    windows.current.instanceMatrix.needsUpdate = true;

    const dissolve = 1 - smooth((p - 0.68) / 0.28);
    if (solidMaterial.current) {
      solidMaterial.current.opacity = smooth((p - 0.18) / 0.32) * dissolve * 0.32;
    }
    if (wireMaterial.current) {
      wireMaterial.current.opacity = 0.72 * (1 - smooth((p - 0.42) / 0.5));
    }
    if (windowMaterial.current) {
      windowMaterial.current.opacity = smooth((p - 0.32) / 0.24) * dissolve * 0.8;
    }
  });

  useEffect(() => {
    if (!solid.current) return;
    buildings.forEach((building, index) => solid.current!.setColorAt(index, building.color));
    if (solid.current.instanceColor) solid.current.instanceColor.needsUpdate = true;
  }, [buildings]);

  return (
    <group>
      <instancedMesh ref={solid} args={[undefined, undefined, buildings.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial
          ref={solidMaterial}
          vertexColors
          color="#c4c1b7"
          roughness={0.72}
          metalness={0.08}
          transparent
          opacity={0}
        />
      </instancedMesh>
      <instancedMesh ref={wire} args={[undefined, undefined, buildings.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={wireMaterial}
          color="#c28a42"
          wireframe
          transparent
          opacity={0.8}
          depthWrite={false}
        />
      </instancedMesh>
      <instancedMesh ref={windows} args={[undefined, undefined, buildings.length]} frustumCulled={false}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial
          ref={windowMaterial}
          color="#ffd07c"
          transparent
          opacity={0}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  );
}

function HorizonArc({ progress }: { progress: MutableRefObject<number> }) {
  const material = useRef<THREE.MeshBasicMaterial>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const geometry = useMemo(() => {
    const points = Array.from({ length: 80 }, (_, index) => {
      const angle = THREE.MathUtils.lerp(Math.PI * 0.06, Math.PI * 0.94, index / 79);
      return new THREE.Vector3(Math.cos(angle) * 35, Math.sin(angle) * 35, 0);
    });
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 160, 0.12, 8, false);
  }, []);

  useFrame((_, delta) => {
    const reveal = smooth((progress.current - 0.32) / 0.55);
    const dissolve = 1 - smooth((progress.current - 0.76) / 0.2);
    if (material.current) material.current.opacity = reveal * dissolve * 0.78;
    if (mesh.current) {
      mesh.current.rotation.z += delta * 0.004;
      mesh.current.scale.setScalar(0.94 + reveal * 0.06);
    }
  });

  return (
    <mesh ref={mesh} geometry={geometry} position={[0, -8.5, -118]}>
      <meshBasicMaterial
        ref={material}
        color="#f0cf93"
        transparent
        opacity={0}
        toneMapped={false}
      />
    </mesh>
  );
}

function BirthRoad({ progress }: { progress: MutableRefObject<number> }) {
  const road = useRef<THREE.Mesh>(null);
  const roadMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const edgeMaterials = useRef<Array<THREE.MeshBasicMaterial | null>>([]);

  useFrame(() => {
    const reveal = smooth((progress.current - 0.08) / 0.38);
    const dissolve = 1 - smooth((progress.current - 0.7) / 0.24);
    if (road.current) {
      road.current.scale.y = Math.max(0.001, reveal);
      road.current.position.z = -58 * reveal;
    }
    if (roadMaterial.current) roadMaterial.current.opacity = reveal * dissolve * 0.34;
    edgeMaterials.current.forEach((material) => {
      if (material) material.opacity = reveal * dissolve * 0.72;
    });
  });

  return (
    <group>
      <mesh
        ref={road}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.42, 0]}
        scale={[1, 0.001, 1]}
      >
        <planeGeometry args={[9.5, 118, 8, 54]} />
        <meshBasicMaterial
          ref={roadMaterial}
          color="#b88a51"
          wireframe
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
      {[-4.8, 4.8].map((x, index) => (
        <mesh key={x} position={[x, -0.36, -58]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.035, 118]} />
          <meshBasicMaterial
            ref={(material) => {
              edgeMaterials.current[index] = material;
            }}
            color="#e8c27e"
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function CreationParticles({ progress }: { progress: MutableRefObject<number> }) {
  const points = useRef<THREE.Points>(null);
  const material = useRef<THREE.PointsMaterial>(null);
  const positions = useMemo(() => {
    const random = seededRandom(314159);
    const values = new Float32Array(2400 * 3);
    for (let index = 0; index < 2400; index += 1) {
      const depth = random() * 175;
      values[index * 3] = (random() - 0.5) * (28 + depth * 0.8);
      values[index * 3 + 1] = random() * (8 + depth * 0.2) - 0.5;
      values[index * 3 + 2] = -depth;
    }
    return values;
  }, []);

  useFrame((state, delta) => {
    if (points.current) {
      points.current.rotation.y += delta * 0.002;
      points.current.position.x = state.pointer.x * 0.65;
      points.current.position.y = state.pointer.y * 0.35;
    }
    if (material.current) {
      const p = progress.current;
      material.current.opacity =
        p < 0.78 ? THREE.MathUtils.lerp(0.72, 0.22, smooth(p / 0.78)) : 0.12;
      material.current.size = THREE.MathUtils.lerp(0.08, 0.035, smooth(p));
    }
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        ref={material}
        color="#d7a45e"
        size={0.08}
        sizeAttenuation
        transparent
        opacity={0.72}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function World({ path, stage }: SceneProps) {
  const progress = useRef(stage === "seed" ? 0.018 : 1);

  return (
    <>
      <AdaptiveQuality />
      <WorldProgress stage={stage} progress={progress} />
      <Atmosphere progress={progress} />
      <CameraRig path={path} stage={stage} progress={progress} />
      <CityBuildings progress={progress} />
      <BirthRoad progress={progress} />
      <HorizonArc progress={progress} />
      <CreationParticles progress={progress} />
    </>
  );
}

export function WorldScene({ path, stage }: SceneProps) {
  return (
    <Canvas
      className="world-canvas"
      dpr={[1, 1.6]}
      camera={{ position: [0, 5.5, 18], fov: 51, near: 0.1, far: 380 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.08;
      }}
    >
      <World path={path} stage={stage} />
    </Canvas>
  );
}
