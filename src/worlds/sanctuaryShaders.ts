export const sanctuarySkyVertexShader = /* glsl */ `
  varying vec3 vWorldDir;

  void main() {
    vWorldDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const sanctuarySkyFragmentShader = /* glsl */ `
  uniform vec3 uZenithColor;
  uniform vec3 uMidSkyColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;
  uniform float uTime;
  uniform float uStarVisibility;
  uniform float uAuroraStrength;
  uniform float uPlanetStrength;
  uniform float uUnderwaterMode;

  varying vec3 vWorldDir;

  float hash31(vec3 p) {
    p = fract(p * vec3(443.897, 441.423, 437.195));
    p += dot(p, p.yzx + 19.19);
    return fract((p.x + p.y) * p.z);
  }

  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i), hash21(i + vec2(1.0, 0.0)), f.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float starsLayer(vec3 dir, float scale, float threshold) {
    vec3 grid = floor(dir * scale);
    vec3 f = fract(dir * scale) - 0.5;
    float rnd = hash31(grid);
    if (rnd < threshold) return 0.0;
    vec3 offset = (vec3(rnd, fract(rnd * 13.7), fract(rnd * 31.3)) - 0.5) * 0.52;
    float d = length(f - offset);
    float twinkle = 0.68 + 0.32 * sin(uTime * (1.6 + rnd * 2.8) + rnd * 40.0);
    return smoothstep(0.17, 0.015, d) * twinkle;
  }

  void main() {
    vec3 dir = normalize(vWorldDir);
    float h = clamp(dir.y, -0.3, 1.0);

    vec3 sky = mix(uHorizonColor, uMidSkyColor, smoothstep(-0.06, 0.28, h));
    sky = mix(sky, uZenithColor, smoothstep(0.22, 0.90, h));

    vec3 sunDir = normalize(uSunDirection);
    float sunDot = max(dot(dir, sunDir), 0.0);

    // Rich solar / lunar aureole & crisp glowing disc
    float mieWide = pow(sunDot, 6.0) * 0.24;
    float mieTight = pow(sunDot, 42.0) * 0.48;
    float sunDisc = smoothstep(0.9983, 0.9994, sunDot) * (1.0 - uUnderwaterMode * 0.75);
    sky += uSunColor * (mieWide + mieTight + sunDisc * 1.45);

    // Subtle twilight atmospheric bands & horizon bloom
    float horizonGlow = exp(-abs(h - 0.02) * 7.5);
    float upperWhisp = vnoise2(dir.xz * 4.5 + vec2(uTime * 0.02, -uTime * 0.015));
    sky += uHorizonColor * (0.09 * horizonGlow + 0.04 * upperWhisp * (1.0 - smoothstep(0.0, 0.55, h)));

    // Underwater sunlit caustic surface ceiling (for Abyssal Sanctuary)
    if (uUnderwaterMode > 0.01 && h > 0.05) {
      vec2 uvSea = dir.xz / max(0.18, dir.y) * 2.2;
      float c1 = vnoise2(uvSea * 2.4 + vec2(uTime * 0.25, uTime * 0.18));
      float c2 = vnoise2(uvSea * 3.8 - vec2(uTime * 0.21, uTime * 0.27));
      float web = pow(1.0 - abs(c1 - c2) * 2.0, 4.0);
      float ceilingMask = smoothstep(0.08, 0.55, h) * uUnderwaterMode;
      sky += mix(vec3(0.18, 0.92, 0.85), uSunColor, 0.45) * web * ceilingMask * 0.85;
    }

    // Crisp dual-scale starfield + Milky Way dust band
    if (uStarVisibility > 0.01 && h > 0.0) {
      float s1 = starsLayer(dir, 145.0, 0.980);
      float s2 = starsLayer(dir, 240.0, 0.985) * 0.72;
      float milkyAxis = exp(-pow(abs(dir.x * 0.65 + dir.y * 0.42 - 0.28), 2.0) * 14.0);
      float milkyNoise = vnoise2(dir.xz * 7.0 + dir.y * 4.0);
      float starMask = smoothstep(0.01, 0.30, h) * uStarVisibility * (1.0 - sunDisc);
      sky += vec3(0.92, 0.96, 1.0) * (s1 + s2) * starMask * 1.55;
      sky += mix(vec3(0.24, 0.52, 0.95), vec3(0.75, 0.45, 0.96), milkyNoise) * milkyAxis * milkyNoise * starMask * 0.24;
    }

    // Procedural Ringed Gas Giant in upper sky (Chronos Citadel & Cosmic nights)
    if (uPlanetStrength > 0.02 && h > 0.03) {
      vec3 planetCenter = normalize(vec3(-0.28, 0.22, -0.93)) * 18.0;
      float planetRadius = 3.15;
      float b = dot(dir, planetCenter);
      float c = dot(planetCenter, planetCenter) - planetRadius * planetRadius;
      float disc = b * b - c;

      vec3 ringNormal = normalize(vec3(0.32, 0.86, 0.39));
      float denom = dot(dir, ringNormal);
      float ringHitT = 1e6;
      vec4 ringCol = vec4(0.0);

      if (abs(denom) > 0.001) {
        float tRing = dot(planetCenter, ringNormal) / denom;
        if (tRing > 0.0) {
          vec3 hitPos = dir * tRing - planetCenter;
          float rDist = length(hitPos);
          if (rDist > planetRadius * 1.32 && rDist < planetRadius * 2.48) {
            ringHitT = tRing;
            float uR = (rDist - planetRadius * 1.32) / (planetRadius * 1.16);
            float bands = 0.55 + 0.45 * sin(uR * 46.0) * cos(uR * 19.0);
            float cassini = smoothstep(0.03, 0.08, abs(uR - 0.58));
            float edge = smoothstep(0.0, 0.1, uR) * (1.0 - smoothstep(0.88, 1.0, uR));
            // Planet shadow on rings
            vec3 toSun = normalize(sunDir + vec3(0.2, 0.25, 0.1));
            float shadowProj = dot(hitPos, toSun);
            float perpDist = length(hitPos - toSun * shadowProj);
            float inShadow = shadowProj < 0.0 ? smoothstep(planetRadius * 0.85, planetRadius * 1.05, perpDist) : 1.0;
            vec3 rc = mix(vec3(0.45, 0.82, 1.0), vec3(1.0, 0.84, 0.55), uR);
            float alpha = bands * cassini * edge * (0.28 + 0.72 * inShadow) * 0.78 * uPlanetStrength;
            ringCol = vec4(rc, alpha);
          }
        }
      }

      if (disc > 0.0) {
        float tSphere = b - sqrt(disc);
        if (tSphere > 0.0) {
          vec3 pHit = dir * tSphere;
          vec3 nrm = normalize(pHit - planetCenter);
          vec3 lightD = normalize(vec3(0.65, 0.48, 0.58));
          float ndl = max(dot(nrm, lightD), 0.0);
          float lat = dot(nrm, ringNormal);
          float stormBands = 0.5 + 0.5 * sin(lat * 22.0 + vnoise2(nrm.xz * 4.5) * 2.2);
          vec3 baseP = mix(vec3(0.14, 0.36, 0.68), vec3(0.62, 0.86, 1.0), stormBands);
          baseP = mix(baseP, vec3(0.98, 0.78, 0.48), smoothstep(0.55, 0.95, stormBands) * 0.55);
          float atmoRim = pow(1.0 - max(dot(nrm, -dir), 0.0), 3.0);
          vec3 litPlanet = baseP * (0.10 + 0.95 * pow(ndl, 0.82)) + vec3(0.38, 0.85, 1.0) * atmoRim * 0.55;
          sky = mix(sky, litPlanet, uPlanetStrength * smoothstep(0.02, 0.18, h));
          if (ringHitT < tSphere && ringCol.a > 0.001) {
            sky = mix(sky, ringCol.rgb, ringCol.a);
          }
        }
      } else if (ringCol.a > 0.001) {
        sky = mix(sky, ringCol.rgb, ringCol.a * smoothstep(0.02, 0.18, h));
      }
    }

    // Multi-Curtain Borealis Ribbons with vertical ray striations
    if (uAuroraStrength > 0.01 && h > 0.02) {
      vec2 aUv = dir.xz / (h + 0.28);
      float drift = uTime * 0.11;
      float foldA = sin(aUv.x * 2.6 + sin(aUv.y * 1.9 + drift) * 1.4 + drift);
      float foldB = cos(aUv.x * 1.8 - aUv.y * 2.3 - drift * 0.8);
      float curtainShape = smoothstep(0.12, 0.92, foldA * 0.58 + foldB * 0.42);
      float rays = 0.55 + 0.45 * vnoise2(vec2(aUv.x * 14.0 + drift * 2.0, h * 6.0));
      float vProfile = smoothstep(0.03, 0.22, h) * exp(-max(0.0, h - 0.20) * 3.4);

      vec3 colEmerald = vec3(0.16, 0.98, 0.72);
      vec3 colViolet = vec3(0.66, 0.38, 1.0);
      vec3 colRose = vec3(1.0, 0.36, 0.72);
      vec3 auroraCol = mix(colEmerald, colViolet, smoothstep(0.14, 0.48, h + foldB * 0.08));
      auroraCol = mix(auroraCol, colRose, smoothstep(0.38, 0.65, h) * 0.65);

      sky += auroraCol * curtainShape * rays * vProfile * uAuroraStrength * 0.82;
    }

    gl_FragColor = vec4(sky, 1.0);
  }
`;

export const sanctuaryCloudVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying float vBillow;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec3 pos = position;
    vec2 dA = pos.xz * 0.032 + vec2(uTime * 0.038, uTime * 0.016);
    vec2 dB = pos.xz * 0.072 - vec2(uTime * 0.024, uTime * 0.028);
    float b = vnoise(dA) * 0.65 + vnoise(dB) * 0.35;
    pos.y += b * 4.8;
    vBillow = b;

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const sanctuaryCloudFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCloudLitColor;
  uniform vec3 uCloudShadowColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDirection;

  varying vec3 vWorldPos;
  varying float vBillow;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    float puff = vnoise(vWorldPos.xz * 0.13 + vec2(uTime * 0.07, -uTime * 0.04));
    float puffFine = vnoise(vWorldPos.xz * 0.29 - vec2(uTime * 0.05, uTime * 0.06));
    float density = smoothstep(0.16, 0.88, vBillow * 0.72 + puff * 0.22 + puffFine * 0.10);

    vec3 viewDir = normalize(vWorldPos - cameraPosition);
    float forwardScatter = pow(max(dot(viewDir, normalize(uSunDirection)), 0.0), 6.0);

    vec3 col = mix(uCloudShadowColor, uCloudLitColor, smoothstep(0.18, 0.92, density));
    col += uCloudLitColor * forwardScatter * 0.24;

    float dist = length(vWorldPos.xz);
    float edgeFade = 1.0 - smoothstep(68.0, 185.0, dist);
    col = mix(uHorizonColor, col, clamp(edgeFade + 0.16, 0.0, 1.0));

    float alpha = clamp((0.42 + density * 0.50) * edgeFade, 0.0, 0.92);
    if (alpha < 0.02) discard;

    gl_FragColor = vec4(col, alpha);
  }
`;

export const sanctuaryWaterVertexShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vWorldPos;
  varying vec2 vLocalXZ;

  void main() {
    vec3 pos = position;
    float r = length(pos.xz);
    pos.y += sin(r * 2.1 - uTime * 1.8) * 0.02 + cos(pos.x * 1.6 + pos.z * 1.4 + uTime * 1.3) * 0.014;
    vLocalXZ = pos.xz;
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const sanctuaryWaterFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uDeepColor;
  uniform vec3 uShallowColor;
  uniform vec3 uSunColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uSunDirection;
  uniform float uShoreRadius;
  uniform float uCausticsStrength;

  varying vec3 vWorldPos;
  varying vec2 vLocalXZ;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  float waveHeight(vec2 p) {
    float w1 = vnoise(p * 1.65 + vec2(uTime * 0.35, -uTime * 0.24));
    float w2 = vnoise(p * 3.4 - vec2(uTime * 0.28, uTime * 0.38)) * 0.5;
    float w3 = sin(p.x * 4.2 + uTime * 1.7) * cos(p.y * 3.8 - uTime * 1.4) * 0.18;
    return w1 + w2 + w3;
  }

  void main() {
    vec2 wp = vWorldPos.xz * 0.55;
    float eps = 0.09;
    float hC = waveHeight(wp);
    float hX = waveHeight(wp + vec2(eps, 0.0));
    float hZ = waveHeight(wp + vec2(0.0, eps));
    vec3 normal = normalize(vec3((hC - hX) * 0.55, 1.0, (hC - hZ) * 0.55));

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - max(dot(viewDir, normal), 0.0), 3.6);

    float radial = clamp(length(vLocalXZ) / max(1.0, uShoreRadius), 0.0, 1.0);
    vec3 waterCol = mix(uDeepColor, uShallowColor, smoothstep(0.22, 0.95, radial));

    // Caustic light web
    float cA = vnoise(vWorldPos.xz * 1.9 + vec2(uTime * 0.32, uTime * 0.22));
    float cB = vnoise(vWorldPos.xz * 2.9 - vec2(uTime * 0.26, uTime * 0.31));
    float caustic = pow(1.0 - abs(cA - cB) * 1.9, 3.5) * uCausticsStrength;
    waterCol += uShallowColor * caustic * 0.45;

    // Sky & horizon Fresnel reflection
    waterCol = mix(waterCol, mix(uHorizonColor, uSunColor, 0.35), fresnel * 0.68);

    // Liquid-gold / aurora solar specular glint path
    vec3 lightDir = normalize(vec3(uSunDirection.x, max(0.14, uSunDirection.y), uSunDirection.z));
    vec3 halfVec = normalize(lightDir + viewDir);
    float specBroad = pow(max(dot(normal, halfVec), 0.0), 28.0) * 0.42;
    float specSparkle = pow(max(dot(normal, halfVec), 0.0), 140.0) * 1.85;
    waterCol += uSunColor * (specBroad + specSparkle);

    // Subtle shoreline foam ring
    float shoreFoam = smoothstep(0.86, 0.99, radial + (hC - 0.5) * 0.08);
    waterCol = mix(waterCol, vec3(0.92, 0.98, 1.0), shoreFoam * 0.45);

    gl_FragColor = vec4(waterCol, 0.90);
  }
`;

export const sanctuaryBeamVertexShader = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPos;

  void main() {
    vUv = uv;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vViewPos = -mvPos.xyz;
    vNormalView = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const sanctuaryBeamFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uBeamColor;
  uniform float uOpacity;

  varying vec2 vUv;
  varying vec3 vNormalView;
  varying vec3 vViewPos;

  void main() {
    vec3 viewDir = normalize(vViewPos);
    float edgeSoft = pow(abs(dot(normalize(vNormalView), viewDir)), 1.85);
    float vFade = smoothstep(0.0, 0.22, vUv.y) * (1.0 - smoothstep(0.68, 1.0, vUv.y));
    float shimmer = 0.78 + 0.22 * sin(vUv.y * 16.0 - uTime * 1.8 + vUv.x * 6.2831);
    float alpha = edgeSoft * vFade * shimmer * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(uBeamColor, alpha);
  }
`;

export const sanctuaryWaterfallVertexShader = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const sanctuaryWaterfallFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uFoamColor;
  uniform vec3 uWaterColor;

  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x),
      f.y
    );
  }

  void main() {
    vec2 flowUv = vec2(vUv.x * 5.0, vUv.y * 3.5 + uTime * 2.5);
    float streakA = vnoise(flowUv);
    float streakB = vnoise(flowUv * 2.3 + vec2(3.1, uTime * 1.6));
    float foam = smoothstep(0.36, 0.84, streakA * 0.65 + streakB * 0.45);
    float topMist = smoothstep(0.82, 1.0, vUv.y);
    float bottomFade = smoothstep(0.0, 0.16, vUv.y);
    float sideFade = smoothstep(0.0, 0.18, vUv.x) * (1.0 - smoothstep(0.82, 1.0, vUv.x));

    vec3 col = mix(uWaterColor, uFoamColor, clamp(foam + topMist * 0.6, 0.0, 1.0));
    float alpha = (0.52 + foam * 0.45) * bottomFade * sideFade;
    gl_FragColor = vec4(col, alpha);
  }
`;

export const jellyfishVertexShader = /* glsl */ `
  uniform float uTime;
  attribute float aPhase;
  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vHeightNorm;

  void main() {
    vec3 pos = position;
    float hNorm = clamp((pos.y + 1.8) / 3.2, 0.0, 1.0);
    vHeightNorm = hNorm;

    float pulse = sin(uTime * 2.1 + aPhase);
    // Bell contracts and expands; tentacles sway below
    if (pos.y > -0.15) {
      float contract = 1.0 + pulse * 0.13 * (1.0 - smoothstep(-0.15, 1.1, pos.y));
      pos.xz *= contract;
      pos.y += pulse * 0.08;
    } else {
      float depth = abs(pos.y + 0.15);
      pos.x += sin(uTime * 2.4 + depth * 2.2 + aPhase) * 0.16 * depth;
      pos.z += cos(uTime * 2.0 + depth * 1.9 + aPhase) * 0.14 * depth;
    }

    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPos = worldPos.xyz;
    vNormalW = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

export const jellyfishFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uCoreColor;
  uniform vec3 uRimColor;

  varying vec3 vNormalW;
  varying vec3 vWorldPos;
  varying float vHeightNorm;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float fresnel = pow(1.0 - abs(dot(normalize(vNormalW), viewDir)), 2.1);
    float pulseBand = 0.65 + 0.35 * sin(vHeightNorm * 14.0 - uTime * 3.2);
    vec3 col = mix(uCoreColor, uRimColor, clamp(fresnel * 1.15 + (1.0 - vHeightNorm) * 0.35, 0.0, 1.0));
    col *= 0.85 + 0.45 * pulseBand;
    float alpha = clamp(0.28 + fresnel * 0.68, 0.22, 0.92);
    gl_FragColor = vec4(col * 1.35, alpha);
  }
`;
