import {
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix4,
  OctahedronGeometry,
  PlaneGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import { clamp, fbm2D, mix, ridged3D, smoothstep } from "./noise";

const tmpColorA = new Color();
const tmpColorB = new Color();
const tmpColorOut = new Color();
const tmpVec = new Vector3();

export function bakePart(
  geo: BufferGeometry,
  bottomColor: string | Color,
  topColor?: string | Color,
): BufferGeometry {
  const nonIndexed = geo.index ? geo.toNonIndexed() : geo.clone();
  nonIndexed.deleteAttribute("uv");
  nonIndexed.deleteAttribute("uv1");
  nonIndexed.deleteAttribute("tangent");
  if (!nonIndexed.getAttribute("normal")) {
    nonIndexed.computeVertexNormals();
  }

  const pos = nonIndexed.getAttribute("position");
  const count = pos.count;
  const colA = bottomColor instanceof Color ? bottomColor : tmpColorA.set(bottomColor);
  const colB = topColor
    ? topColor instanceof Color
      ? topColor
      : tmpColorB.set(topColor)
    : colA;

  let minY = Infinity;
  let maxY = -Infinity;
  if (topColor) {
    for (let i = 0; i < count; i += 1) {
      const y = pos.getY(i);
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  const spanY = Math.max(0.001, maxY - minY);

  const colors = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    if (topColor) {
      const t = clamp((pos.getY(i) - minY) / spanY, 0, 1);
      tmpColorOut.copy(colA).lerp(colB, t);
      colors[i * 3] = tmpColorOut.r;
      colors[i * 3 + 1] = tmpColorOut.g;
      colors[i * 3 + 2] = tmpColorOut.b;
    } else {
      colors[i * 3] = colA.r;
      colors[i * 3 + 1] = colA.g;
      colors[i * 3 + 2] = colA.b;
    }
  }
  nonIndexed.setAttribute("color", new BufferAttribute(colors, 3));
  geo.dispose();
  return nonIndexed;
}

export function safeMerge(parts: BufferGeometry[]): BufferGeometry {
  if (parts.length === 0) {
    const empty = new BufferGeometry();
    empty.setAttribute("position", new BufferAttribute(new Float32Array(9), 3));
    empty.setAttribute("normal", new BufferAttribute(new Float32Array(9), 3));
    empty.setAttribute("color", new BufferAttribute(new Float32Array(9), 3));
    return empty;
  }
  if (parts.length === 1) return parts[0];
  const merged = mergeGeometries(parts, false);
  for (const p of parts) p.dispose();
  return merged;
}

export interface FloatingIslandOptions {
  center: [number, number, number];
  radius: number;
  depth: number;
  seed: number;
  radialSegs: number;
  ringSegs: number;
  craterRadius?: number;
  craterDepth?: number;
  topInnerColor: string;
  topOuterColor: string;
  cliffUpperColor: string;
  cliffDeepColor: string;
  craterBedColor?: string;
}

export function sampleFloatingIslandTopY(
  localX: number,
  localZ: number,
  opts: Pick<FloatingIslandOptions, "radius" | "seed" | "craterRadius" | "craterDepth">,
): number {
  const dist = Math.hypot(localX, localZ);
  const rNorm = clamp(dist / opts.radius, 0, 1.2);
  const hill = fbm2D(localX * 0.11, localZ * 0.11, opts.seed, 4) * 1.15 * (1 - smoothstep(0.65, 1.0, rNorm));
  const rimLift = smoothstep(0.55, 0.92, rNorm) * (1 - smoothstep(0.92, 1.04, rNorm)) * 0.65;
  let y = 0.55 + hill + rimLift;

  if (opts.craterRadius && opts.craterDepth) {
    const craterMask = 1 - smoothstep(opts.craterRadius * 0.42, opts.craterRadius, dist);
    y -= craterMask * opts.craterDepth;
    // Central sanctuary island podium inside crater
    const centerPodium = 1 - smoothstep(opts.craterRadius * 0.24, opts.craterRadius * 0.40, dist);
    y += centerPodium * (opts.craterDepth * 0.88);
  }
  return y;
}

export function createFloatingIslandGeometry(opts: FloatingIslandOptions): BufferGeometry {
  const { center, radius, depth, seed, radialSegs, ringSegs } = opts;
  const positions: number[] = [];
  const colors: number[] = [];

  const cTopIn = new Color(opts.topInnerColor);
  const cTopOut = new Color(opts.topOuterColor);
  const cCliffUp = new Color(opts.cliffUpperColor);
  const cCliffDeep = new Color(opts.cliffDeepColor);
  const cBed = new Color(opts.craterBedColor ?? opts.cliffUpperColor);

  const edgeRadiusAt = (angle: number) => {
    const nx = Math.cos(angle) * 1.8;
    const nz = Math.sin(angle) * 1.8;
    const warp = fbm2D(nx, nz, seed + 19, 3) * 0.16;
    return radius * (1 + warp);
  };

  // Top surface rings
  const topGrid: Vector3[][] = [];
  const topColGrid: Color[][] = [];

  for (let ir = 0; ir <= ringSegs; ir += 1) {
    const v = ir / ringSegs;
    const row: Vector3[] = [];
    const colRow: Color[] = [];
    for (let ia = 0; ia <= radialSegs; ia += 1) {
      const ang = (ia / radialSegs) * Math.PI * 2;
      const maxR = edgeRadiusAt(ang);
      const r = v * maxR;
      const lx = Math.cos(ang) * r;
      const lz = Math.sin(ang) * r;
      const ly = v >= 0.995 ? 0.12 + fbm2D(lx * 0.18, lz * 0.18, seed + 5, 2) * 0.35 : sampleFloatingIslandTopY(lx, lz, opts);

      row.push(new Vector3(center[0] + lx, center[1] + ly, center[2] + lz));

      const col = new Color().copy(cTopIn).lerp(cTopOut, smoothstep(0.15, 0.95, v));
      if (opts.craterRadius && ly < 0.22 && r < opts.craterRadius * 0.96) {
        col.lerp(cBed, smoothstep(0.22, -0.45, ly));
      }
      if (v > 0.88) {
        col.lerp(cCliffUp, smoothstep(0.88, 1.0, v) * 0.65);
      }
      colRow.push(col);
    }
    topGrid.push(row);
    topColGrid.push(colRow);
  }

  const pushTri = (a: Vector3, b: Vector3, c: Vector3, ca: Color, cb: Color, cc: Color) => {
    positions.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
    colors.push(ca.r, ca.g, ca.b, cb.r, cb.g, cb.b, cc.r, cc.g, cc.b);
  };

  for (let ir = 0; ir < ringSegs; ir += 1) {
    for (let ia = 0; ia < radialSegs; ia += 1) {
      const p00 = topGrid[ir][ia];
      const p10 = topGrid[ir + 1][ia];
      const p11 = topGrid[ir + 1][ia + 1];
      const p01 = topGrid[ir][ia + 1];
      const c00 = topColGrid[ir][ia];
      const c10 = topColGrid[ir + 1][ia];
      const c11 = topColGrid[ir + 1][ia + 1];
      const c01 = topColGrid[ir][ia + 1];
      if (ir === 0) {
        pushTri(p00, p11, p10, c00, c11, c10);
      } else {
        pushTri(p00, p01, p11, c00, c01, c11);
        pushTri(p00, p11, p10, c00, c11, c10);
      }
    }
  }

  // Tapered sculpted cliff underside
  const cliffStacks = Math.max(5, Math.round(ringSegs * 0.75));
  const cliffGrid: Vector3[][] = [];
  const cliffCols: Color[][] = [];
  const rimRow = topGrid[ringSegs];

  for (let is = 0; is <= cliffStacks; is += 1) {
    const t = is / cliffStacks;
    const row: Vector3[] = [];
    const colRow: Color[] = [];
    const taper = Math.pow(1 - t, 1.32);

    for (let ia = 0; ia <= radialSegs; ia += 1) {
      if (is === 0) {
        row.push(rimRow[ia].clone());
        colRow.push(new Color().copy(cCliffUp));
        continue;
      }
      const ang = (ia / radialSegs) * Math.PI * 2;
      const baseRim = rimRow[ia];
      const lx = (baseRim.x - center[0]) * taper;
      const lz = (baseRim.z - center[2]) * taper;
      const ly = -Math.pow(t, 1.08) * depth;

      const crag =
        (ridged3D(lx * 0.16, ly * 0.14, lz * 0.16, seed + 91, 3) - 0.45) *
        radius *
        0.26 *
        Math.sin(t * Math.PI);
      const outX = lx + Math.cos(ang) * crag;
      const outZ = lz + Math.sin(ang) * crag;

      row.push(
        new Vector3(
          center[0] + (is === cliffStacks ? 0 : outX),
          center[1] + ly,
          center[2] + (is === cliffStacks ? 0 : outZ),
        ),
      );
      const col = new Color().copy(cCliffUp).lerp(cCliffDeep, smoothstep(0.08, 0.92, t));
      colRow.push(col);
    }
    cliffGrid.push(row);
    cliffCols.push(colRow);
  }

  for (let is = 0; is < cliffStacks; is += 1) {
    for (let ia = 0; ia < radialSegs; ia += 1) {
      const p00 = cliffGrid[is][ia];
      const p01 = cliffGrid[is][ia + 1];
      const p11 = cliffGrid[is + 1][ia + 1];
      const p10 = cliffGrid[is + 1][ia];
      const c00 = cliffCols[is][ia];
      const c01 = cliffCols[is][ia + 1];
      const c11 = cliffCols[is + 1][ia + 1];
      const c10 = cliffCols[is + 1][ia];
      pushTri(p00, p10, p11, c00, c10, c11);
      pushTri(p00, p11, p01, c00, c11, c01);
    }
  }

  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
  geo.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
  geo.computeVertexNormals();
  return geo;
}

export function createBasinTerrainGeometry(opts: {
  size: number;
  segs: number;
  islandSkirt?: boolean;
  heightFn: (x: number, z: number) => number;
  colorFn: (x: number, y: number, z: number) => Color;
}): BufferGeometry {
  if (opts.islandSkirt) {
    // Circular diorama island mesh for seamless floating stations in global backdrop
    const maxR = opts.size * 0.34;
    const radialSegs = Math.max(28, Math.round(opts.segs * 0.75));
    const ringSegs = Math.max(14, Math.round(opts.segs * 0.35));
    const positions: number[] = [];
    const colors: number[] = [];
    const deepCol = new Color("#090d1f");

    const grid: Vector3[][] = [];
    const colGrid: Color[][] = [];
    for (let ir = 0; ir <= ringSegs; ir += 1) {
      const v = ir / ringSegs;
      const row: Vector3[] = [];
      const cRow: Color[] = [];
      for (let ia = 0; ia <= radialSegs; ia += 1) {
        const ang = (ia / radialSegs) * Math.PI * 2;
        const warp = 1 + fbm2D(Math.cos(ang) * 1.7, Math.sin(ang) * 1.7, 307, 2) * 0.12;
        const r = v * maxR * warp;
        const x = Math.cos(ang) * r;
        const z = Math.sin(ang) * r;
        const rawY = opts.heightFn(x, z);
        const edgeDrop = smoothstep(0.76, 1.0, v) * 9.5;
        const y = rawY * (1 - smoothstep(0.82, 1.0, v) * 0.65) - edgeDrop;
        row.push(new Vector3(x, y, z));
        const c = opts.colorFn(x, rawY, z);
        if (v > 0.78) c.lerp(deepCol, smoothstep(0.78, 1.0, v) * 0.82);
        cRow.push(c);
      }
      grid.push(row);
      colGrid.push(cRow);
    }

    for (let ir = 0; ir < ringSegs; ir += 1) {
      for (let ia = 0; ia < radialSegs; ia += 1) {
        const p00 = grid[ir][ia];
        const p10 = grid[ir + 1][ia];
        const p11 = grid[ir + 1][ia + 1];
        const p01 = grid[ir][ia + 1];
        const c00 = colGrid[ir][ia];
        const c10 = colGrid[ir + 1][ia];
        const c11 = colGrid[ir + 1][ia + 1];
        const c01 = colGrid[ir][ia + 1];
        if (ir > 0) {
          positions.push(p00.x, p00.y, p00.z, p01.x, p01.y, p01.z, p11.x, p11.y, p11.z);
          colors.push(c00.r, c00.g, c00.b, c01.r, c01.g, c01.b, c11.r, c11.g, c11.b);
        }
        positions.push(p00.x, p00.y, p00.z, p11.x, p11.y, p11.z, p10.x, p10.y, p10.z);
        colors.push(c00.r, c00.g, c00.b, c11.r, c11.g, c11.b, c10.r, c10.g, c10.b);
      }
    }

    const discGeo = new BufferGeometry();
    discGeo.setAttribute("position", new BufferAttribute(new Float32Array(positions), 3));
    discGeo.setAttribute("color", new BufferAttribute(new Float32Array(colors), 3));
    discGeo.computeVertexNormals();
    return discGeo;
  }

  const plane = new PlaneGeometry(opts.size, opts.size, opts.segs, opts.segs);
  plane.rotateX(-Math.PI / 2);
  const nonIdx = plane.toNonIndexed();
  plane.dispose();
  nonIdx.deleteAttribute("uv");

  const pos = nonIdx.getAttribute("position");
  const count = pos.count;
  const colors = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = opts.heightFn(x, z);
    pos.setY(i, y);
    const c = opts.colorFn(x, y, z);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }

  nonIdx.setAttribute("color", new BufferAttribute(colors, 3));
  nonIdx.computeVertexNormals();
  return nonIdx;
}

export function createObservatoryRotunda(
  center: [number, number, number],
  scale = 1,
  opts?: { stoneBase?: string; stoneTop?: string; goldBase?: string; goldTop?: string },
): { stone: BufferGeometry; gold: BufferGeometry } {
  const stoneParts: BufferGeometry[] = [];
  const goldParts: BufferGeometry[] = [];
  const sBase = opts?.stoneBase ?? "#cbd5e1";
  const sTop = opts?.stoneTop ?? "#f8fafc";
  const gBase = opts?.goldBase ?? "#d97706";
  const gTop = opts?.goldTop ?? "#fde68a";

  // 3-stepped marble plinth
  for (let i = 0; i < 3; i += 1) {
    const r = (4.3 - i * 0.42) * scale;
    const h = 0.28 * scale;
    const cyl = new CylinderGeometry(r * 0.98, r, h, 28);
    cyl.translate(center[0], center[1] + (i * 0.28 + 0.14) * scale, center[2]);
    stoneParts.push(bakePart(cyl, sBase, sTop));
  }

  const trim = new TorusGeometry(3.52 * scale, 0.06 * scale, 10, 48);
  trim.rotateX(Math.PI / 2);
  trim.translate(center[0], center[1] + 0.85 * scale, center[2]);
  goldParts.push(bakePart(trim, gBase, gTop));

  // 12 fluted classical columns
  const colCount = 12;
  const ringR = 3.15 * scale;
  const colH = 3.55 * scale;
  const baseY = center[1] + 0.84 * scale;

  for (let i = 0; i < colCount; i += 1) {
    const ang = (i / colCount) * Math.PI * 2;
    const cx = center[0] + Math.cos(ang) * ringR;
    const cz = center[2] + Math.sin(ang) * ringR;

    const plinth = new BoxGeometry(0.46 * scale, 0.22 * scale, 0.46 * scale);
    plinth.rotateY(-ang);
    plinth.translate(cx, baseY + 0.11 * scale, cz);
    stoneParts.push(bakePart(plinth, sBase, sTop));

    const shaft = new CylinderGeometry(0.145 * scale, 0.175 * scale, colH, 12);
    shaft.translate(cx, baseY + 0.22 * scale + colH * 0.5, cz);
    stoneParts.push(bakePart(shaft, sBase, sTop));

    const cap = new CylinderGeometry(0.26 * scale, 0.16 * scale, 0.24 * scale, 12);
    cap.translate(cx, baseY + 0.22 * scale + colH + 0.12 * scale, cz);
    goldParts.push(bakePart(cap, gBase, gTop));
  }

  // Entablature & open-ribbed astronomical dome
  const corniceY = baseY + 0.34 * scale + colH;
  const entablature = new TorusGeometry(ringR, 0.22 * scale, 12, 48);
  entablature.rotateX(Math.PI / 2);
  entablature.translate(center[0], corniceY, center[2]);
  stoneParts.push(bakePart(entablature, sBase, sTop));

  const goldCornice = new TorusGeometry(ringR + 0.18 * scale, 0.055 * scale, 10, 48);
  goldCornice.rotateX(Math.PI / 2);
  goldCornice.translate(center[0], corniceY + 0.14 * scale, center[2]);
  goldParts.push(bakePart(goldCornice, gBase, gTop));

  for (let i = 0; i < 6; i += 1) {
    const ang = (i / 6) * Math.PI;
    const rib = new TorusGeometry(ringR, 0.065 * scale, 8, 36, Math.PI);
    rib.rotateY(ang);
    rib.translate(center[0], corniceY + 0.08 * scale, center[2]);
    goldParts.push(bakePart(rib, gBase, gTop));
  }

  // Finial spire
  const spire = new ConeGeometry(0.24 * scale, 1.45 * scale, 12);
  spire.translate(center[0], corniceY + ringR + 0.72 * scale, center[2]);
  goldParts.push(bakePart(spire, gBase, gTop));

  return {
    stone: safeMerge(stoneParts),
    gold: safeMerge(goldParts),
  };
}

export function createPagoda(
  center: [number, number, number],
  scale = 1,
): { stone: BufferGeometry; wood: BufferGeometry; gold: BufferGeometry } {
  const stoneParts: BufferGeometry[] = [];
  const woodParts: BufferGeometry[] = [];
  const goldParts: BufferGeometry[] = [];

  const podium = new CylinderGeometry(2.85 * scale, 3.15 * scale, 0.55 * scale, 6);
  podium.translate(center[0], center[1] + 0.275 * scale, center[2]);
  stoneParts.push(bakePart(podium, "#94a3b8", "#e2e8f0"));

  let curY = center[1] + 0.55 * scale;
  const tiers = [
    { colR: 2.05, roofR: 3.15, h: 1.65, roofH: 0.92 },
    { colR: 1.42, roofR: 2.38, h: 1.32, roofH: 0.82 },
    { colR: 0.92, roofR: 1.68, h: 1.02, roofH: 0.72 },
  ];

  for (const tier of tiers) {
    for (let i = 0; i < 6; i += 1) {
      const ang = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const cx = center[0] + Math.cos(ang) * tier.colR * scale;
      const cz = center[2] + Math.sin(ang) * tier.colR * scale;
      const pillar = new CylinderGeometry(0.085 * scale, 0.1 * scale, tier.h * scale, 8);
      pillar.translate(cx, curY + tier.h * 0.5 * scale, cz);
      woodParts.push(bakePart(pillar, "#7f1d1d", "#dc2626"));
    }

    const core = new CylinderGeometry(tier.colR * 0.7 * scale, tier.colR * 0.72 * scale, tier.h * scale, 6);
    core.translate(center[0], curY + tier.h * 0.5 * scale, center[2]);
    stoneParts.push(bakePart(core, "#cbd5e1", "#fff7ed"));

    // Flared hexagonal roof eave
    const roofPts = [
      new Vector2(0.02, tier.roofH * scale),
      new Vector2(tier.roofR * 0.48 * scale, tier.roofH * 0.45 * scale),
      new Vector2(tier.roofR * 0.86 * scale, tier.roofH * 0.12 * scale),
      new Vector2(tier.roofR * scale, 0.04 * scale),
      new Vector2(tier.roofR * 0.94 * scale, -0.06 * scale),
      new Vector2(0.1, 0.05 * scale),
    ];
    const roof = new LatheGeometry(roofPts, 6);
    roof.translate(center[0], curY + tier.h * scale, center[2]);
    woodParts.push(bakePart(roof, "#1e293b", "#334155"));

    curY += (tier.h + tier.roofH * 0.78) * scale;
  }

  const finial = new ConeGeometry(0.18 * scale, 1.35 * scale, 10);
  finial.translate(center[0], curY + 0.65 * scale, center[2]);
  goldParts.push(bakePart(finial, "#d97706", "#fef08a"));

  return {
    stone: safeMerge(stoneParts),
    wood: safeMerge(woodParts),
    gold: safeMerge(goldParts),
  };
}

export function createToriiGate(
  center: [number, number, number],
  yaw: number,
  scale = 1,
): BufferGeometry {
  const parts: BufferGeometry[] = [];
  const matRot = new Matrix4().makeRotationY(yaw);
  const matTrans = new Matrix4().makeTranslation(center[0], center[1], center[2]);

  const addBox = (w: number, h: number, d: number, x: number, y: number, z: number, c1: string, c2: string) => {
    const g = new BoxGeometry(w * scale, h * scale, d * scale);
    g.translate(x * scale, y * scale, z * scale);
    g.applyMatrix4(matRot);
    g.applyMatrix4(matTrans);
    parts.push(bakePart(g, c1, c2));
  };

  for (const sx of [-1.25, 1.25]) {
    const post = new CylinderGeometry(0.13 * scale, 0.16 * scale, 3.3 * scale, 10);
    post.translate(sx * scale, 1.65 * scale, 0);
    post.applyMatrix4(matRot);
    post.applyMatrix4(matTrans);
    parts.push(bakePart(post, "#991b1b", "#ef4444"));

    const foot = new CylinderGeometry(0.21 * scale, 0.24 * scale, 0.35 * scale, 10);
    foot.translate(sx * scale, 0.17 * scale, 0);
    foot.applyMatrix4(matRot);
    foot.applyMatrix4(matTrans);
    parts.push(bakePart(foot, "#1e293b", "#475569"));
  }

  // Lower nuki & upper kasagi + flared cap
  addBox(3.2, 0.18, 0.18, 0, 2.55, 0, "#991b1b", "#ef4444");
  addBox(3.75, 0.22, 0.26, 0, 3.28, 0, "#b91c1c", "#f87171");
  addBox(4.05, 0.14, 0.32, 0, 3.44, 0, "#0f172a", "#334155");
  addBox(0.22, 0.56, 0.16, 0, 2.92, 0, "#d97706", "#fde047");

  return safeMerge(parts);
}

export function createArchedBridge(
  start: Vector3,
  end: Vector3,
  archHeight: number,
  width = 1.45,
  stoneColors: [string, string] = ["#94a3b8", "#e2e8f0"],
  railColors: [string, string] = ["#d97706", "#fde68a"],
): { stone: BufferGeometry; accent: BufferGeometry; lanterns: Vector3[] } {
  const stoneParts: BufferGeometry[] = [];
  const accentParts: BufferGeometry[] = [];
  const lanterns: Vector3[] = [];

  const mid = start.clone().lerp(end, 0.5);
  mid.y += archHeight;
  const curve = new CatmullRomCurve3([start, mid, end]);
  const steps = 18;
  const up = new Vector3(0, 1, 0);

  for (let i = 0; i < steps; i += 1) {
    const t0 = i / steps;
    const t1 = (i + 1) / steps;
    const tm = (t0 + t1) * 0.5;
    const p0 = curve.getPoint(t0);
    const p1 = curve.getPoint(t1);
    const pm = curve.getPoint(tm);
    const segLen = p0.distanceTo(p1) * 1.06;
    const tangent = curve.getTangent(tm).normalize();
    const side = new Vector3().crossVectors(tangent, up).normalize();

    const m = new Matrix4().lookAt(p0, p1, up);
    const posM = new Matrix4().makeTranslation(pm.x, pm.y, pm.z);

    const deck = new BoxGeometry(width, 0.18, segLen);
    deck.applyMatrix4(m);
    deck.applyMatrix4(posM);
    stoneParts.push(bakePart(deck, stoneColors[0], stoneColors[1]));

    if (i % 3 === 0 || i === steps - 1) {
      for (const s of [-1, 1]) {
        const px = pm.x + side.x * (width * 0.46) * s;
        const pz = pm.z + side.z * (width * 0.46) * s;
        const post = new BoxGeometry(0.11, 0.65, 0.11);
        post.translate(px, pm.y + 0.36, pz);
        stoneParts.push(bakePart(post, stoneColors[0], stoneColors[1]));

        if (i === 0 || i === Math.floor(steps / 2) || i === steps - 1) {
          const orb = new OctahedronGeometry(0.11, 0);
          orb.translate(px, pm.y + 0.78, pz);
          accentParts.push(bakePart(orb, railColors[0], railColors[1]));
          lanterns.push(new Vector3(px, pm.y + 0.78, pz));
        }
      }
    }
  }

  // Handrail curves
  for (const s of [-1, 1]) {
    const railPts: Vector3[] = [];
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const p = curve.getPoint(t);
      const tang = curve.getTangent(t).normalize();
      const side = new Vector3().crossVectors(tang, up).normalize();
      railPts.push(
        new Vector3(
          p.x + side.x * (width * 0.46) * s,
          p.y + 0.62,
          p.z + side.z * (width * 0.46) * s,
        ),
      );
    }
    const railCurve = new CatmullRomCurve3(railPts);
    const tube = new TubeGeometry(railCurve, 20, 0.045, 6, false);
    accentParts.push(bakePart(tube, railColors[0], railColors[1]));
  }

  return {
    stone: safeMerge(stoneParts),
    accent: safeMerge(accentParts),
    lanterns,
  };
}

export interface CanopyClusterAnchor {
  position: Vector3;
  scale: [number, number, number];
  color: Color;
}

export function createRecursiveSpiritTree(opts: {
  origin: Vector3;
  height: number;
  trunkRadius: number;
  levels: number;
  rng: () => number;
  trunkBottomColor: string;
  trunkTopColor: string;
  canopyColors: [string, string, string];
  radialSegs?: number;
}): { trunk: BufferGeometry; clusters: CanopyClusterAnchor[] } {
  const trunkParts: BufferGeometry[] = [];
  const clusters: CanopyClusterAnchor[] = [];
  const c0 = new Color(opts.canopyColors[0]);
  const c1 = new Color(opts.canopyColors[1]);
  const c2 = new Color(opts.canopyColors[2]);
  const segs = opts.radialSegs ?? 7;

  const grow = (start: Vector3, dir: Vector3, len: number, rad: number, depth: number) => {
    const mid = start
      .clone()
      .addScaledVector(dir, len * 0.52)
      .add(new Vector3((opts.rng() - 0.5) * len * 0.22, 0, (opts.rng() - 0.5) * len * 0.22));
    const end = start.clone().addScaledVector(dir, len);
    const curve = new CatmullRomCurve3([start, mid, end]);
    const tube = new TubeGeometry(curve, 6, rad, segs, false);
    // Taper end slightly
    const pos = tube.getAttribute("position");
    for (let i = 0; i < pos.count; i += 1) {
      tmpVec.fromBufferAttribute(pos, i);
      const t = clamp(tmpVec.distanceTo(start) / Math.max(0.1, len), 0, 1);
      const centerOnCurve = curve.getPoint(clamp(t, 0, 1));
      tmpVec.sub(centerOnCurve).multiplyScalar(mix(1.0, 0.62, t)).add(centerOnCurve);
      pos.setXYZ(i, tmpVec.x, tmpVec.y, tmpVec.z);
    }
    trunkParts.push(bakePart(tube, opts.trunkBottomColor, opts.trunkTopColor));

    if (depth <= 1) {
      const puffCount = 5 + Math.floor(opts.rng() * 4);
      for (let k = 0; k < puffCount; k += 1) {
        const ang = opts.rng() * Math.PI * 2;
        const dist = opts.rng() * 1.35 * (opts.height * 0.22);
        const py = end.y + (opts.rng() - 0.28) * 0.95;
        const px = end.x + Math.cos(ang) * dist;
        const pz = end.z + Math.sin(ang) * dist;
        const s = (0.55 + opts.rng() * 0.68) * (opts.height * 0.16);
        const heightBias = clamp((py - opts.origin.y) / (opts.height * 1.85), 0, 1);
        const col = new Color().copy(c0).lerp(c1, smoothstep(0.25, 0.72, heightBias));
        if (opts.rng() > 0.55) {
          col.lerp(c2, 0.45 + opts.rng() * 0.45);
        }
        clusters.push({
          position: new Vector3(px, py, pz),
          scale: [s * 1.28, s * 0.76, s * 1.22],
          color: col,
        });
      }
      return;
    }

    const childCount = depth === opts.levels ? 3 : 2 + (opts.rng() > 0.55 ? 1 : 0);
    for (let c = 0; c < childCount; c += 1) {
      const yaw = (c / childCount) * Math.PI * 2 + (opts.rng() - 0.5) * 0.85;
      const spread = 0.42 + opts.rng() * 0.34;
      const nextDir = new Vector3(
        dir.x * 0.45 + Math.cos(yaw) * spread,
        Math.max(0.45, dir.y * 0.85 + 0.15),
        dir.z * 0.45 + Math.sin(yaw) * spread,
      ).normalize();
      grow(end, nextDir, len * (0.68 + opts.rng() * 0.12), rad * 0.62, depth - 1);
    }
  };

  grow(opts.origin, new Vector3(0, 1, 0), opts.height * 0.46, opts.trunkRadius, opts.levels);
  return {
    trunk: safeMerge(trunkParts),
    clusters,
  };
}

export function createHexCrystalCluster(
  origin: Vector3,
  scale: number,
  rng: () => number,
  baseColor: string,
  tipColor: string,
  count = 5,
): BufferGeometry {
  const parts: BufferGeometry[] = [];
  for (let i = 0; i < count; i += 1) {
    const isMain = i === 0;
    const h = (isMain ? 2.6 : 1.1 + rng() * 1.45) * scale;
    const r = (isMain ? 0.38 : 0.18 + rng() * 0.16) * scale;
    const shaft = new CylinderGeometry(r * 0.86, r, h, 6);
    shaft.translate(0, h * 0.5, 0);
    const tip = new ConeGeometry(r * 0.86, r * 1.65, 6);
    tip.translate(0, h + r * 0.825, 0);

    const ang = (i / Math.max(1, count - 1)) * Math.PI * 2 + rng() * 0.5;
    const tilt = isMain ? (rng() - 0.5) * 0.12 : 0.22 + rng() * 0.36;
    const offsetR = isMain ? 0 : (0.28 + rng() * 0.35) * scale;

    const rotM = new Matrix4().makeRotationFromEuler(
      new Euler(Math.sin(ang) * tilt, ang, Math.cos(ang) * tilt),
    );
    const transM = new Matrix4().makeTranslation(
      origin.x + Math.cos(ang) * offsetR,
      origin.y - 0.15 * scale,
      origin.z + Math.sin(ang) * offsetR,
    );

    shaft.applyMatrix4(rotM).applyMatrix4(transM);
    tip.applyMatrix4(rotM).applyMatrix4(transM);
    parts.push(bakePart(shaft, baseColor, tipColor));
    parts.push(bakePart(tip, tipColor, "#ffffff"));
  }
  return safeMerge(parts);
}

export function createPalmTree(
  origin: Vector3,
  height: number,
  leanAngle: number,
  leanAmount: number,
  rng: () => number,
): { trunk: BufferGeometry; fronds: BufferGeometry } {
  const p0 = origin.clone();
  const p1 = origin
    .clone()
    .add(new Vector3(Math.cos(leanAngle) * leanAmount * 0.45, height * 0.52, Math.sin(leanAngle) * leanAmount * 0.45));
  const p2 = origin
    .clone()
    .add(new Vector3(Math.cos(leanAngle) * leanAmount, height, Math.sin(leanAngle) * leanAmount));

  const curve = new CatmullRomCurve3([p0, p1, p2]);
  const trunkTube = new TubeGeometry(curve, 10, height * 0.036, 7, false);
  const trunk = bakePart(trunkTube, "#78350f", "#b45309");

  const frondParts: BufferGeometry[] = [];
  const frondCount = 9;
  for (let i = 0; i < frondCount; i += 1) {
    const yaw = (i / frondCount) * Math.PI * 2 + rng() * 0.24;
    const len = height * (0.44 + rng() * 0.12);
    const fCurve = new CatmullRomCurve3([
      new Vector3(0, 0, 0),
      new Vector3(Math.cos(yaw) * len * 0.52, len * 0.28, Math.sin(yaw) * len * 0.52),
      new Vector3(Math.cos(yaw) * len, -len * 0.3, Math.sin(yaw) * len),
    ]);
    const frondGeo = new TubeGeometry(fCurve, 7, height * 0.032, 5, false);
    frondGeo.scale(1, 0.36, 1);
    frondGeo.translate(p2.x, p2.y, p2.z);
    frondParts.push(bakePart(frondGeo, "#15803d", "#84cc16"));
  }

  return {
    trunk,
    fronds: safeMerge(frondParts),
  };
}

export function createJellyfishGeometry(scale = 1, phaseOffset = 0): BufferGeometry {
  const parts: BufferGeometry[] = [];

  // Translucent umbrella bell
  const bellProfile = [
    new Vector2(0.001, 1.08 * scale),
    new Vector2(0.42 * scale, 1.02 * scale),
    new Vector2(0.82 * scale, 0.74 * scale),
    new Vector2(1.02 * scale, 0.32 * scale),
    new Vector2(1.06 * scale, 0.02 * scale),
    new Vector2(0.92 * scale, -0.06 * scale),
    new Vector2(0.75 * scale, 0.16 * scale),
  ];
  const bell = new LatheGeometry(bellProfile, 20);
  parts.push(bakePart(bell, "#2dd4bf", "#f472b6"));

  // Sinuous oral arms & trailing tentacles
  for (let i = 0; i < 8; i += 1) {
    const ang = (i / 8) * Math.PI * 2;
    const r = (i % 2 === 0 ? 0.32 : 0.72) * scale;
    const len = (i % 2 === 0 ? 2.1 : 1.65) * scale;
    const pts = [
      new Vector3(Math.cos(ang) * r, 0.12 * scale, Math.sin(ang) * r),
      new Vector3(Math.cos(ang + 0.25) * r * 1.1, -len * 0.45, Math.sin(ang + 0.25) * r * 1.1),
      new Vector3(Math.cos(ang - 0.2) * r * 0.85, -len, Math.sin(ang - 0.2) * r * 0.85),
    ];
    const tentacle = new TubeGeometry(new CatmullRomCurve3(pts), 9, (i % 2 === 0 ? 0.042 : 0.022) * scale, 5, false);
    parts.push(bakePart(tentacle, "#fbbf24", "#38bdf8"));
  }

  const merged = safeMerge(parts);
  const count = merged.getAttribute("position").count;
  const phases = new Float32Array(count).fill(phaseOffset);
  merged.setAttribute("aPhase", new BufferAttribute(phases, 1));
  return merged;
}

export function createCanopyClusterBaseGeometry(): BufferGeometry {
  // Faceted botanical cloud puff (NO color attribute — colored via InstancedMesh.setColorAt)
  const geo = new IcosahedronGeometry(1, 1);
  const nonIdx = geo.toNonIndexed();
  geo.dispose();
  nonIdx.deleteAttribute("uv");
  nonIdx.computeVertexNormals();
  return nonIdx;
}

export function createGrassBladeGeometry(): BufferGeometry {
  const positions = new Float32Array([
    -0.048, 0.0, 0.0,
     0.048, 0.0, 0.0,
    -0.032, 0.46, 0.02,

     0.048, 0.0, 0.0,
     0.032, 0.46, 0.02,
    -0.032, 0.46, 0.02,

    -0.032, 0.46, 0.02,
     0.032, 0.46, 0.02,
     0.0,   0.98, 0.09,
  ]);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createSpiritBirdGeometry(): BufferGeometry {
  const positions = new Float32Array([
    // Left wing
    0.0, 0.0, 0.24,
    -0.62, 0.14, -0.06,
    0.0, 0.02, -0.22,
    // Right wing
    0.0, 0.0, 0.24,
    0.0, 0.02, -0.22,
    0.62, 0.14, -0.06,
  ]);
  const geo = new BufferGeometry();
  geo.setAttribute("position", new BufferAttribute(positions, 3));
  geo.computeVertexNormals();
  return geo;
}

export function createFishGeometry(): BufferGeometry {
  const body = new OctahedronGeometry(0.22, 1);
  body.scale(0.45, 0.58, 1.55);
  const tail = new ConeGeometry(0.14, 0.26, 4);
  tail.rotateX(Math.PI / 2);
  tail.scale(0.35, 1.0, 1.0);
  tail.translate(0, 0, -0.38);

  const bNon = body.toNonIndexed();
  const tNon = tail.toNonIndexed();
  body.dispose();
  tail.dispose();
  bNon.deleteAttribute("uv");
  tNon.deleteAttribute("uv");
  const merged = mergeGeometries([bNon, tNon], false);
  bNon.dispose();
  tNon.dispose();
  merged.computeVertexNormals();
  return merged;
}

export function createWaterDiscGeometry(radius: number, segs = 48): BufferGeometry {
  const disc = new CircleGeometry(radius, segs);
  disc.rotateX(-Math.PI / 2);
  return disc;
}
