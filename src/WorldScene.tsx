import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import {
  ACESFilmicToneMapping,
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  Color,
  DoubleSide,
  Group,
  InstancedMesh,
  MathUtils,
  Mesh,
  Object3D,
  ShaderMaterial,
  SRGBColorSpace,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import {
  coreFragmentShader,
  coreVertexShader,
  particleFragmentShader,
  particleVertexShader,
  terrainFragmentShader,
  terrainVertexShader,
} from "./shaders";

export type WorldSceneProps = {
  scrollProgressRef: MutableRefObject<number>;
  pointerRef: MutableRefObject<{ x: number; y: number }>;
  pulseTimeRef: MutableRefObject<number>;
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

function AdaptiveQuality({ isMobile }: { isMobile: boolean }) {
  const { gl } = useThree();
  const elapsed = useRef(0);
  const frames = useRef(0);
  const maxDpr = isMobile ? 1.35 : 1.65;
  const currentDpr = useRef(Math.min(window.devicePixelRatio || 1, maxDpr));

  useEffect(() => {
    currentDpr.current = Math.min(window.devicePixelRatio || 1, maxDpr);
    gl.setPixelRatio(currentDpr.current);
  }, [gl, maxDpr]);

  useFrame((_, delta) => {
    elapsed.current += delta;
    frames.current += 1;
    if (elapsed.current < 3.0) return;

    const fps = frames.current / elapsed.current;
    const nextDpr =
      fps < 42 ? 1 : fps < 54 ? Math.min(window.devicePixelRatio || 1, 1.2) : maxDpr;

    if (Math.abs(nextDpr - currentDpr.current) > 0.08) {
      currentDpr.current = nextDpr;
      gl.setPixelRatio(nextDpr);
    }
    elapsed.current = 0;
    frames.current = 0;
  });

  return null;
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
  const currentLook = useRef(new Vector3(isMobile ? 0 : 1.6, 2.2, -16));
  const desiredPos = useMemo(() => new Vector3(), []);
  const desiredLook = useMemo(() => new Vector3(), []);

  const { posCurve, lookCurve } = useMemo(() => {
    const xOffset = isMobile ? 0 : 1;
    const posCurve = new CatmullRomCurve3([
      new Vector3(-1.4 * xOffset, isMobile ? 3.8 : 3.2, 6),
      new Vector3(-1.8 * xOffset, isMobile ? 4.4 : 3.6, -34),
      new Vector3(2.2 * xOffset, isMobile ? 4.5 : 3.8, -74),
      new Vector3(-1.8 * xOffset, isMobile ? 4.8 : 4.1, -114),
      new Vector3(0, isMobile ? 4.6 : 4.0, -154),
    ]);
    const lookCurve = new CatmullRomCurve3([
      new Vector3(2.8 * xOffset, isMobile ? 3.0 : 2.2, -16),
      new Vector3(3.8 * xOffset, isMobile ? 3.1 : 2.3, -56),
      new Vector3(-3.8 * xOffset, isMobile ? 3.1 : 2.4, -96),
      new Vector3(3.8 * xOffset, isMobile ? 3.2 : 2.6, -136),
      new Vector3(0, isMobile ? 3.4 : 3.0, -176),
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
    desiredLook.x += pointerRef.current.x * pointerScale * 1.4;
    desiredLook.y += pointerRef.current.y * pointerScale * 0.6;

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

  const segX = isMobile ? 84 : 136;
  const segZ = isMobile ? 120 : 210;

  return (
    <mesh position={[0, -3.8, -96]} rotation={[-Math.PI / 2, 0, 0]} material={material}>
      <planeGeometry args={[150, 260, segX, segZ]} />
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
  const count = isMobile ? 1100 : 2500;

  const { geometry, material } = useMemo(() => {
    const random = seededRandom(42026);
    const positions = new Float32Array(count * 3);
    const scales = new Float32Array(count);
    const phases = new Float32Array(count);
    const colors = new Float32Array(count * 3);

    const palette = [
      new Color("#eaf3f0"),
      new Color("#5ee6d0"),
      new Color("#f3b56a"),
      new Color("#a99bff"),
    ];

    for (let i = 0; i < count; i += 1) {
      const z = 14 - random() * 215;
      const spreadX = 36 + Math.abs(z) * 0.22;
      positions[i * 3] = (random() - 0.5) * spreadX * 2;
      positions[i * 3 + 1] = -2.5 + random() * 26;
      positions[i * 3 + 2] = z;

      scales[i] = 0.65 + Math.pow(random(), 2.1) * 3.1;
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
        uPixelRatio: { value: Math.min(window.devicePixelRatio || 1, 2) },
        uPulseAge: { value: 0 },
      },
    });

    return { geometry: geom, material: mat };
  }, [count]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock, gl }) => {
    material.uniforms.uTime.value = reducedMotion ? 0 : clock.getElapsedTime();
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
    material.uniforms.uPulseAge.value =
      pulseTimeRef.current > 0 ? Math.max(0, (performance.now() - pulseTimeRef.current) * 0.001) : 0;
  });

  return <points geometry={geometry} material={material} />;
}

/** Monument 00: Celestial Astrolabe (Home / Threshold) */
function AstrolabeMonument({
  pulseTimeRef,
  isMobile,
  reducedMotion,
}: {
  pulseTimeRef: MutableRefObject<number>;
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const ringA = useRef<Mesh>(null);
  const ringB = useRef<Mesh>(null);
  const ringC = useRef<Mesh>(null);
  const ticks = useRef<InstancedMesh>(null);

  const coreMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uPulseAge: { value: 0 },
          uBreath: { value: 0.6 },
          uPrimaryColor: { value: new Color("#5ee6d0") },
          uSecondaryColor: { value: new Color("#f3b56a") },
          uOpacity: { value: 0.96 },
        },
      }),
    [],
  );

  useEffect(() => () => coreMat.dispose(), [coreMat]);

  useEffect(() => {
    if (!ticks.current) return;
    const dummy = new Object3D();
    const total = 48;
    for (let i = 0; i < total; i += 1) {
      const angle = (i / total) * Math.PI * 2;
      const r = 6.2;
      dummy.position.set(Math.cos(angle) * r, Math.sin(angle) * r, 0);
      dummy.rotation.set(0, 0, angle);
      const major = i % 4 === 0 ? 1.6 : 0.7;
      dummy.scale.set(major, 1, 1);
      dummy.updateMatrix();
      ticks.current.setMatrixAt(i, dummy.matrix);
    }
    ticks.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame(({ clock }, delta) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    coreMat.uniforms.uTime.value = t;
    coreMat.uniforms.uPulseAge.value =
      pulseTimeRef.current > 0 ? Math.max(0, (performance.now() - pulseTimeRef.current) * 0.001) : 0;

    if (reducedMotion) return;
    if (group.current) group.current.position.y = (isMobile ? 4.4 : 2.7) + Math.sin(t * 0.65) * 0.22;
    if (ringA.current) ringA.current.rotation.z += delta * 0.14;
    if (ringB.current) ringB.current.rotation.y += delta * 0.18;
    if (ringC.current) ringC.current.rotation.x -= delta * 0.11;
  });

  const posX = isMobile ? 0 : 4.2;

  return (
    <group ref={group} position={[posX, isMobile ? 4.4 : 2.7, -16]} scale={isMobile ? 0.78 : 1}>
      <mesh material={coreMat}>
        <icosahedronGeometry args={[2.1, 5]} />
      </mesh>
      <mesh ref={ringA} rotation={[Math.PI * 0.36, 0.25, 0]}>
        <torusGeometry args={[4.1, 0.032, 16, 120]} />
        <meshBasicMaterial color="#5ee6d0" transparent opacity={0.68} />
      </mesh>
      <mesh ref={ringB} rotation={[-Math.PI * 0.25, 0.55, 0.2]}>
        <torusGeometry args={[5.1, 0.024, 16, 120]} />
        <meshBasicMaterial color="#f3b56a" transparent opacity={0.55} />
      </mesh>
      <mesh ref={ringC} rotation={[0.18, -0.3, Math.PI * 0.15]}>
        <torusGeometry args={[6.2, 0.018, 12, 140]} />
        <meshBasicMaterial color="#a99bff" transparent opacity={0.38} />
      </mesh>
      <instancedMesh ref={ticks} args={[undefined, undefined, 48]} rotation={[Math.PI * 0.36, 0.25, 0]}>
        <boxGeometry args={[0.24, 0.035, 0.035]} />
        <meshBasicMaterial color="#5ee6d0" transparent opacity={0.62} />
      </instancedMesh>
    </group>
  );
}

/** Monument 01: Story Archipelago (Imagine) */
function StoryArchipelagoMonument({
  isMobile,
  reducedMotion,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const shardRefs = useRef<Array<Group | null>>([]);

  const { nodes, tubeGeometries } = useMemo(() => {
    const coords: Array<[number, number, number, number, string]> = [
      [0, 0.6, 0, 1.35, "#5ee6d0"],
      [-3.1, 2.2, 1.4, 0.85, "#f3b56a"],
      [2.8, 2.7, -1.5, 0.92, "#5ee6d0"],
      [-2.2, -1.6, -2.0, 0.72, "#a99bff"],
      [3.3, -1.1, 1.6, 0.78, "#f3b56a"],
      [0.4, 3.6, -2.8, 0.62, "#eaf3f0"],
      [-0.4, -2.6, 2.3, 0.65, "#5ee6d0"],
    ];

    const links: Array<[number, number]> = [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 5],
      [2, 5],
      [3, 6],
      [4, 6],
    ];

    const tubes = links.map(([a, b]) => {
      const pA = new Vector3(coords[a][0], coords[a][1], coords[a][2]);
      const pB = new Vector3(coords[b][0], coords[b][1], coords[b][2]);
      const mid = pA.clone().lerp(pB, 0.5).add(new Vector3(0, 0.55, 0));
      return new TubeGeometry(new CatmullRomCurve3([pA, mid, pB]), 36, 0.018, 8, false);
    });

    return { nodes: coords, tubeGeometries: tubes };
  }, []);

  useEffect(() => {
    return () => {
      tubeGeometries.forEach((tube) => tube.dispose());
    };
  }, [tubeGeometries]);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime();
    if (group.current) group.current.rotation.y += delta * 0.075;
    shardRefs.current.forEach((node, idx) => {
      if (!node) return;
      node.position.y = nodes[idx][1] + Math.sin(t * 0.9 + idx * 1.1) * 0.24;
      node.rotation.y += delta * (0.22 + idx * 0.03);
      node.rotation.x += delta * 0.08;
    });
  });

  const posX = isMobile ? 0 : 6.2;

  return (
    <group ref={group} position={[posX, isMobile ? 4.2 : 2.4, -56]} scale={isMobile ? 0.75 : 1}>
      {nodes.map(([x, y, z, size, color], idx) => (
        <group
          key={idx}
          ref={(el) => {
            shardRefs.current[idx] = el;
          }}
          position={[x, y, z]}
        >
          <mesh>
            <octahedronGeometry args={[size, 0]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={0.45}
              roughness={0.22}
              metalness={0.55}
              transparent
              opacity={0.42}
            />
          </mesh>
          <mesh>
            <octahedronGeometry args={[size * 1.06, 0]} />
            <meshBasicMaterial color={color} wireframe transparent opacity={0.78} />
          </mesh>
        </group>
      ))}
      {tubeGeometries.map((tube, idx) => (
        <mesh key={idx} geometry={tube}>
          <meshBasicMaterial color="#5ee6d0" transparent opacity={0.34} />
        </mesh>
      ))}
    </group>
  );
}

/** Monument 02: Living Memory Core (Alive) */
function LivingMemoryMonument({
  isMobile,
  reducedMotion,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const orbitGroup = useRef<Group>(null);
  const nodeRefs = useRef<Array<Mesh | null>>([]);

  const coreMat = useMemo(
    () =>
      new ShaderMaterial({
        vertexShader: coreVertexShader,
        fragmentShader: coreFragmentShader,
        transparent: true,
        uniforms: {
          uTime: { value: 0 },
          uPulseAge: { value: 0 },
          uBreath: { value: 1.1 },
          uPrimaryColor: { value: new Color("#f3b56a") },
          uSecondaryColor: { value: new Color("#5ee6d0") },
          uOpacity: { value: 0.94 },
        },
      }),
    [],
  );

  useEffect(() => () => coreMat.dispose(), [coreMat]);

  const satellites = useMemo(
    () => [
      { radius: 3.3, speed: 0.42, tilt: 0.3, color: "#f3b56a" },
      { radius: 4.3, speed: -0.31, tilt: -0.45, color: "#5ee6d0" },
      { radius: 5.3, speed: 0.23, tilt: 0.62, color: "#a99bff" },
      { radius: 3.8, speed: -0.5, tilt: 0.85, color: "#eaf3f0" },
    ],
    [],
  );

  useFrame(({ clock }) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    coreMat.uniforms.uTime.value = t;

    if (reducedMotion) return;
    if (orbitGroup.current) {
      orbitGroup.current.position.y = (isMobile ? 4.1 : 2.5) + Math.sin(t * 0.7) * 0.18;
    }
    satellites.forEach((sat, idx) => {
      const mesh = nodeRefs.current[idx];
      if (!mesh) return;
      const angle = t * sat.speed + idx * 1.4;
      mesh.position.set(
        Math.cos(angle) * sat.radius,
        Math.sin(angle) * sat.radius * Math.sin(sat.tilt),
        Math.sin(angle) * sat.radius * Math.cos(sat.tilt),
      );
    });
  });

  const posX = isMobile ? 0 : -6.2;

  return (
    <group ref={orbitGroup} position={[posX, isMobile ? 4.1 : 2.5, -96]} scale={isMobile ? 0.76 : 1}>
      <mesh material={coreMat}>
        <icosahedronGeometry args={[1.85, 5]} />
      </mesh>
      <mesh rotation={[Math.PI * 0.42, 0.2, 0]}>
        <torusGeometry args={[3.3, 0.025, 16, 120]} />
        <meshBasicMaterial color="#f3b56a" transparent opacity={0.62} />
      </mesh>
      <mesh rotation={[-Math.PI * 0.34, 0.45, 0.3]}>
        <torusGeometry args={[4.3, 0.022, 16, 120]} />
        <meshBasicMaterial color="#5ee6d0" transparent opacity={0.48} />
      </mesh>
      <mesh rotation={[Math.PI * 0.22, -0.55, -0.25]}>
        <torusGeometry args={[5.3, 0.018, 16, 120]} />
        <meshBasicMaterial color="#a99bff" transparent opacity={0.42} />
      </mesh>
      {satellites.map((sat, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            nodeRefs.current[idx] = el;
          }}
        >
          <sphereGeometry args={[0.19, 16, 16]} />
          <meshBasicMaterial color={sat.color} />
        </mesh>
      ))}
    </group>
  );
}

/** Monument 03: Bidirectional Synapse Bridge (Connect) */
function SynapseBridgeMonument({
  isMobile,
  reducedMotion,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const group = useRef<Group>(null);
  const outboundParticles = useRef<InstancedMesh>(null);
  const returnParticles = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);

  const { outboundCurve, returnCurve, outboundTube, returnTube } = useMemo(() => {
    const leftAnchor = new Vector3(-4.2, -0.6, 0.8);
    const rightAnchor = new Vector3(4.2, 1.3, -1.2);
    const outboundCurve = new CatmullRomCurve3([
      leftAnchor,
      new Vector3(-1.4, 2.5, 2.0),
      new Vector3(1.6, 2.8, -0.4),
      rightAnchor,
    ]);
    const returnCurve = new CatmullRomCurve3([
      rightAnchor,
      new Vector3(1.4, -1.5, -2.2),
      new Vector3(-1.5, -1.2, 0.6),
      leftAnchor,
    ]);
    return {
      outboundCurve,
      returnCurve,
      outboundTube: new TubeGeometry(outboundCurve, 72, 0.032, 10, false),
      returnTube: new TubeGeometry(returnCurve, 72, 0.032, 10, false),
    };
  }, []);

  useEffect(() => {
    return () => {
      outboundTube.dispose();
      returnTube.dispose();
    };
  }, [outboundTube, returnTube]);

  const pulseCount = 16;

  useFrame(({ clock }, delta) => {
    const t = reducedMotion ? 0 : clock.getElapsedTime();
    if (group.current && !reducedMotion) {
      group.current.rotation.y += delta * 0.06;
    }

    if (outboundParticles.current) {
      for (let i = 0; i < pulseCount; i += 1) {
        const u = ((t * 0.22 + i / pulseCount) % 1 + 1) % 1;
        outboundCurve.getPointAt(u, dummy.position);
        const s = 0.6 + Math.sin(u * Math.PI) * 0.9;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        outboundParticles.current.setMatrixAt(i, dummy.matrix);
      }
      outboundParticles.current.instanceMatrix.needsUpdate = true;
    }

    if (returnParticles.current) {
      for (let i = 0; i < pulseCount; i += 1) {
        const u = ((t * 0.18 + i / pulseCount) % 1 + 1) % 1;
        returnCurve.getPointAt(u, dummy.position);
        const s = 0.6 + Math.sin(u * Math.PI) * 0.9;
        dummy.scale.setScalar(s);
        dummy.updateMatrix();
        returnParticles.current.setMatrixAt(i, dummy.matrix);
      }
      returnParticles.current.instanceMatrix.needsUpdate = true;
    }
  });

  const posX = isMobile ? 0 : 6.0;

  return (
    <group ref={group} position={[posX, isMobile ? 4.3 : 2.7, -136]} scale={isMobile ? 0.72 : 1}>
      <mesh position={[-4.2, -0.6, 0.8]}>
        <icosahedronGeometry args={[0.85, 2]} />
        <meshBasicMaterial color="#5ee6d0" wireframe transparent opacity={0.75} />
      </mesh>
      <mesh position={[4.2, 1.3, -1.2]}>
        <icosahedronGeometry args={[1.05, 2]} />
        <meshBasicMaterial color="#a99bff" wireframe transparent opacity={0.78} />
      </mesh>
      <mesh geometry={outboundTube}>
        <meshBasicMaterial color="#5ee6d0" transparent opacity={0.48} />
      </mesh>
      <mesh geometry={returnTube}>
        <meshBasicMaterial color="#f3b56a" transparent opacity={0.45} />
      </mesh>
      <instancedMesh ref={outboundParticles} args={[undefined, undefined, pulseCount]}>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshBasicMaterial color="#5ee6d0" />
      </instancedMesh>
      <instancedMesh ref={returnParticles} args={[undefined, undefined, pulseCount]}>
        <sphereGeometry args={[0.11, 10, 10]} />
        <meshBasicMaterial color="#f3b56a" />
      </instancedMesh>
    </group>
  );
}

/** Monument 04: Origin Horizon Spire (About) */
function OriginSpireMonument({
  isMobile,
  reducedMotion,
}: {
  isMobile: boolean;
  reducedMotion: boolean;
}) {
  const spireRef = useRef<Group>(null);
  const haloRef = useRef<Mesh>(null);

  useFrame(({ clock }, delta) => {
    if (reducedMotion) return;
    const t = clock.getElapsedTime();
    if (spireRef.current) {
      spireRef.current.rotation.y += delta * 0.12;
      spireRef.current.position.y = (isMobile ? 4.2 : 3.2) + Math.sin(t * 0.6) * 0.16;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z -= delta * 0.1;
    }
  });

  return (
    <group ref={spireRef} position={[0, isMobile ? 4.2 : 3.2, -176]} scale={isMobile ? 0.78 : 1}>
      <mesh>
        <octahedronGeometry args={[1.35, 0]} />
        <meshBasicMaterial color="#5ee6d0" wireframe transparent opacity={0.7} />
      </mesh>
      <mesh position={[0, -2.4, 0]}>
        <cylinderGeometry args={[0.02, 0.25, 4.4, 8]} />
        <meshBasicMaterial color="#f3b56a" transparent opacity={0.58} />
      </mesh>
      <mesh ref={haloRef} rotation={[Math.PI * 0.48, 0, 0]} position={[0, -1.6, 0]}>
        <torusGeometry args={[4.6, 0.02, 16, 120]} />
        <meshBasicMaterial color="#5ee6d0" transparent opacity={0.45} />
      </mesh>
      <mesh rotation={[Math.PI * 0.48, 0, 0]} position={[0, -1.6, 0]}>
        <torusGeometry args={[6.4, 0.016, 16, 120]} />
        <meshBasicMaterial color="#f3b56a" transparent opacity={0.32} />
      </mesh>
    </group>
  );
}

export function WorldScene(props: WorldSceneProps) {
  const [pageVisible, setPageVisible] = useState(() =>
    typeof document === "undefined" ? true : !document.hidden,
  );

  useEffect(() => {
    const onVisibility = () => setPageVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  return (
    <Canvas
      className="world-canvas"
      frameloop={pageVisible ? "always" : "never"}
      dpr={[1, props.isMobile ? 1.35 : 1.65]}
      camera={{ position: [-1.4, 3.2, 6], fov: 49, near: 0.1, far: 320 }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.outputColorSpace = SRGBColorSpace;
        gl.toneMapping = ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.12;
      }}
    >
      <fogExp2 attach="fog" args={["#03090d", 0.0115]} />
      <ambientLight color="#8eb6b0" intensity={0.45} />
      <directionalLight color="#5ee6d0" intensity={1.4} position={[12, 18, 8]} />
      <directionalLight color="#f3b56a" intensity={0.9} position={[-14, 10, -40]} />

      <AdaptiveQuality isMobile={props.isMobile} />
      <CameraSplineRig
        scrollProgressRef={props.scrollProgressRef}
        pointerRef={props.pointerRef}
        isMobile={props.isMobile}
        reducedMotion={props.reducedMotion}
      />
      <TopographicSea {...props} />
      <AstralParticles
        pulseTimeRef={props.pulseTimeRef}
        isMobile={props.isMobile}
        reducedMotion={props.reducedMotion}
      />
      <AstrolabeMonument
        pulseTimeRef={props.pulseTimeRef}
        isMobile={props.isMobile}
        reducedMotion={props.reducedMotion}
      />
      <StoryArchipelagoMonument isMobile={props.isMobile} reducedMotion={props.reducedMotion} />
      <LivingMemoryMonument isMobile={props.isMobile} reducedMotion={props.reducedMotion} />
      <SynapseBridgeMonument isMobile={props.isMobile} reducedMotion={props.reducedMotion} />
      <OriginSpireMonument isMobile={props.isMobile} reducedMotion={props.reducedMotion} />
    </Canvas>
  );
}
