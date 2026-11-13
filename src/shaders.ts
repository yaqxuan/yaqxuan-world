export const terrainVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uPulseAge;
  uniform vec2 uPointer;

  varying float vElevation;
  varying float vDist;
  varying float vPulseWave;
  varying vec2 vWorldXZ;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    float x = worldPos.x;
    float z = worldPos.z;

    float waveA = sin(x * 0.14 + uTime * 0.38) * cos(z * 0.08 - uTime * 0.24) * 1.45;
    float waveB = sin((x * 0.07 - z * 0.09) + uTime * 0.28) * 0.95;
    float valley = smoothstep(0.0, 24.0, abs(x)) * 2.1;

    float pulseRadius = uPulseAge * 36.0;
    float pulseDist = length(vec2(x, z + 18.0 + uScroll * 160.0));
    float ring = exp(-pow((pulseDist - pulseRadius) * 0.14, 2.0)) * step(0.001, uPulseAge) * exp(-uPulseAge * 0.45);

    float pointerRipple = sin(length(vec2(x - uPointer.x * 16.0, z + 22.0 + uScroll * 150.0)) * 0.35 - uTime * 2.0) * 0.18;

    float elevation = waveA + waveB + valley + ring * 2.6 + pointerRipple;
    worldPos.y += elevation;

    vElevation = elevation;
    vPulseWave = ring;
    vWorldXZ = vec2(x, z);

    vec4 mvPos = viewMatrix * worldPos;
    vDist = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const terrainFragmentShader = /* glsl */ `
  uniform float uScroll;
  uniform float uTime;

  varying float vElevation;
  varying float vDist;
  varying float vPulseWave;
  varying vec2 vWorldXZ;

  void main() {
    float contourCoord = vElevation * 2.6;
    float fw = max(fwidth(contourCoord), 0.002);
    float line = 1.0 - smoothstep(0.0, fw * 1.65, abs(fract(contourCoord - 0.5) - 0.5));

    float majorCoord = vElevation * 0.65;
    float fwMajor = max(fwidth(majorCoord), 0.002);
    float majorLine = 1.0 - smoothstep(0.0, fwMajor * 1.9, abs(fract(majorCoord - 0.5) - 0.5));

    vec3 cyan = vec3(0.369, 0.902, 0.816);
    vec3 amber = vec3(0.953, 0.710, 0.416);
    vec3 violet = vec3(0.663, 0.608, 1.0);
    vec3 deepSea = vec3(0.018, 0.055, 0.082);

    float realmMix = clamp(uScroll, 0.0, 1.0);
    vec3 paletteA = mix(cyan, amber, smoothstep(0.18, 0.55, realmMix));
    vec3 accent = mix(paletteA, violet, smoothstep(0.55, 0.85, realmMix));
    accent = mix(accent, cyan, smoothstep(0.85, 1.0, realmMix));

    float shimmer = 0.78 + 0.22 * sin(vWorldXZ.x * 0.12 + vWorldXZ.y * 0.06 + uTime * 0.5);
    float gridFade = exp(-vDist * 0.0135) * smoothstep(2.0, 12.0, vDist);

    vec3 color = deepSea;
    color += accent * line * 0.28 * shimmer;
    color += mix(accent, amber, 0.4) * majorLine * 0.48;
    color += cyan * vPulseWave * 0.85;

    float alpha = clamp((line * 0.36 + majorLine * 0.55 + vPulseWave * 0.85) * gridFade, 0.0, 0.92);
    if (alpha < 0.01) discard;

    gl_FragColor = vec4(color, alpha);
  }
`;

export const coreVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPulseAge;
  uniform float uBreath;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vNoise;

  void main() {
    float disp =
      sin(position.x * 2.4 + uTime * 0.9) *
      cos(position.y * 2.2 - uTime * 0.7) *
      sin(position.z * 2.5 + uTime * 0.8) * (0.14 + uBreath * 0.08);

    float pulseBoost = exp(-uPulseAge * 1.4) * step(0.001, uPulseAge) * 0.26 * sin(uPulseAge * 10.0);
    vec3 displaced = position + normal * (disp + pulseBoost);

    vec4 worldPos = modelMatrix * vec4(displaced, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = viewMatrix * worldPos;
    vViewDir = normalize(-mvPos.xyz);
    vNoise = disp;

    gl_Position = projectionMatrix * mvPos;
  }
`;

export const coreFragmentShader = /* glsl */ `
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vNoise;

  void main() {
    float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.3);
    float band = 0.5 + 0.5 * sin(vNoise * 18.0 + uTime * 1.4);

    vec3 interior = mix(vec3(0.04, 0.14, 0.18), uPrimaryColor * 0.55, band * 0.65);
    vec3 rim = mix(uPrimaryColor, uSecondaryColor, fresnel * 0.7 + band * 0.2);
    vec3 color = mix(interior, rim, clamp(fresnel * 1.25, 0.0, 1.0));

    float alpha = clamp((0.36 + fresnel * 0.64) * uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const particleVertexShader = /* glsl */ `
  attribute float aScale;
  attribute float aPhase;
  attribute vec3 aColor;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uPulseAge;

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec3 pos = position;
    pos.y += sin(uTime * 0.45 + aPhase) * 0.38;
    pos.x += cos(uTime * 0.32 + aPhase * 1.3) * 0.24;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    float dist = max(-mvPosition.z, 1.0);

    float twinkle = 0.55 + 0.45 * sin(uTime * 1.25 + aPhase * 3.0);
    float pulseGlow = 1.0 + exp(-uPulseAge * 1.1) * step(0.001, uPulseAge) * 0.8;

    vColor = aColor;
    vAlpha = twinkle * smoothstep(220.0, 28.0, dist);

    gl_PointSize = aScale * uPixelRatio * pulseGlow * (115.0 / dist);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const particleFragmentShader = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 centered = gl_PointCoord - vec2(0.5);
    float r2 = dot(centered, centered);
    if (r2 > 0.25) discard;

    float glow = exp(-r2 * 14.0);
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.88);
  }
`;
