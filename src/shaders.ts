const REALM_PALETTE_GLSL = /* glsl */ `
void getRealmColors(float scroll, out vec3 cPrimary, out vec3 cSecondary, out vec3 cTertiary) {
  vec3 h1 = vec3(0.310, 0.941, 0.875);
  vec3 h2 = vec3(1.000, 0.745, 0.420);
  vec3 h3 = vec3(0.655, 0.545, 0.980);

  vec3 i1 = vec3(0.220, 0.741, 0.973);
  vec3 i2 = vec3(0.310, 0.941, 0.875);
  vec3 i3 = vec3(1.000, 0.820, 0.400);

  vec3 a1 = vec3(1.000, 0.706, 0.341);
  vec3 a2 = vec3(1.000, 0.459, 0.561);
  vec3 a3 = vec3(0.769, 0.565, 1.000);

  vec3 c1 = vec3(0.702, 0.573, 1.000);
  vec3 c2 = vec3(0.957, 0.447, 0.714);
  vec3 c3 = vec3(0.310, 0.941, 0.875);

  vec3 d1 = vec3(1.000, 0.769, 0.420);
  vec3 d2 = vec3(0.984, 0.443, 0.522);
  vec3 d3 = vec3(0.376, 0.647, 0.980);

  float s = clamp(scroll, 0.0, 1.0);
  float w1 = smoothstep(0.00, 0.25, s);
  float w2 = smoothstep(0.25, 0.50, s);
  float w3 = smoothstep(0.50, 0.75, s);
  float w4 = smoothstep(0.75, 1.00, s);

  cPrimary = mix(mix(mix(mix(h1, i1, w1), a1, w2), c1, w3), d1, w4);
  cSecondary = mix(mix(mix(mix(h2, i2, w1), a2, w2), c2, w3), d2, w4);
  cTertiary = mix(mix(mix(mix(h3, i3, w1), a3, w2), c3, w3), d3, w4);
}
`;

export const nebulaVertexShader = /* glsl */ `
  varying vec3 vDir;

  void main() {
    vDir = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const nebulaFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform float uScroll;
  uniform float uPulseAge;

  varying vec3 vDir;
  ${REALM_PALETTE_GLSL}

  void main() {
    vec3 dir = normalize(vDir);
    vec3 cPrimary;
    vec3 cSecondary;
    vec3 cTertiary;
    getRealmColors(uScroll, cPrimary, cSecondary, cTertiary);

    float waveA = sin(dir.x * 3.2 + dir.y * 2.4 + uTime * 0.12) * cos(dir.z * 2.1 - uTime * 0.09);
    float waveB = sin(dir.x * 5.6 - dir.y * 3.8 - uTime * 0.15 + dir.z * 2.4);
    float ribbon = smoothstep(-0.35, 0.85, waveA * 0.65 + waveB * 0.35);
    float drift = 0.5 + 0.5 * cos(dir.x * 2.3 - dir.z * 3.1 + uTime * 0.08);
    float zenithBand = smoothstep(-0.25, 0.65, dir.y);
    float horizonGlow = exp(-pow((dir.y + 0.04) * 3.6, 2.0));

    float dawnMask = smoothstep(0.78, 1.0, uScroll) * exp(-pow((dir.y - 0.06) * 4.2, 2.0));
    float pulseBoost = exp(-uPulseAge * 0.9) * step(0.001, uPulseAge) * (0.5 + 0.5 * sin(dir.x * 6.0 - uPulseAge * 5.5));

    vec3 cloudMix = mix(cPrimary, cTertiary, drift);
    cloudMix = mix(cloudMix, cSecondary, ribbon * 0.58);

    vec3 deepSky = mix(vec3(0.015, 0.032, 0.075), cTertiary * 0.12 + cPrimary * 0.08, zenithBand * 0.65);
    vec3 nebula = cloudMix * (0.14 + ribbon * 0.18 + horizonGlow * 0.12);
    vec3 dawn = mix(cPrimary, cSecondary, 0.55) * dawnMask * 0.32;
    vec3 pulse = mix(cPrimary, cSecondary, 0.45) * pulseBoost * 0.14;

    vec3 color = deepSky + nebula + dawn + pulse;
    float alpha = clamp(0.42 + ribbon * 0.20 + horizonGlow * 0.14 + dawnMask * 0.18, 0.0, 0.72);

    gl_FragColor = vec4(color, alpha);
  }
`;

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
  ${REALM_PALETTE_GLSL}

  void main() {
    float contourCoord = vElevation * 2.6;
    float fw = max(fwidth(contourCoord), 0.002);
    float line = 1.0 - smoothstep(0.0, fw * 1.65, abs(fract(contourCoord - 0.5) - 0.5));

    float majorCoord = vElevation * 0.65;
    float fwMajor = max(fwidth(majorCoord), 0.002);
    float majorLine = 1.0 - smoothstep(0.0, fwMajor * 1.9, abs(fract(majorCoord - 0.5) - 0.5));

    vec3 cPrimary;
    vec3 cSecondary;
    vec3 cTertiary;
    getRealmColors(uScroll, cPrimary, cSecondary, cTertiary);

    float elevMix = clamp((vElevation + 2.5) * 0.18, 0.0, 1.0);
    vec3 minorColor = mix(cPrimary, cTertiary, elevMix);
    vec3 majorColor = mix(cSecondary, vec3(1.0, 0.95, 0.88), 0.25);

    float shimmer = 0.78 + 0.22 * sin(vWorldXZ.x * 0.12 + vWorldXZ.y * 0.06 + uTime * 0.5);
    float gridFade = exp(-vDist * 0.013) * smoothstep(2.0, 12.0, vDist);

    vec3 surfaceBase = mix(vec3(0.02, 0.05, 0.10), cPrimary * 0.14 + cSecondary * 0.08, shimmer * 0.55);
    vec3 color = surfaceBase;
    color += minorColor * line * 0.36 * shimmer;
    color += majorColor * majorLine * 0.56;
    color += mix(cPrimary, cSecondary, 0.45) * vPulseWave * 0.92;

    float alpha = clamp((0.06 + line * 0.38 + majorLine * 0.58 + vPulseWave * 0.88) * gridFade, 0.0, 0.94);
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
  uniform vec3 uTertiaryColor;
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewDir;
  varying float vNoise;

  void main() {
    float ndotv = clamp(dot(normalize(vNormal), normalize(vViewDir)), 0.0, 1.0);
    float fresnel = pow(1.0 - ndotv, 2.2);
    float bandA = 0.5 + 0.5 * sin(vNoise * 18.0 + uTime * 1.4);
    float bandB = 0.5 + 0.5 * cos(vNormal.y * 4.5 - uTime * 0.9 + vNoise * 9.0);

    vec3 interior = mix(uTertiaryColor * 0.32, uPrimaryColor * 0.72, bandA * 0.65) + uSecondaryColor * bandB * 0.28;
    vec3 rim = mix(uPrimaryColor, uSecondaryColor, fresnel * 0.65 + bandB * 0.25) + vec3(0.18) * pow(fresnel, 3.0);
    vec3 color = mix(interior, rim, clamp(fresnel * 1.15, 0.0, 1.0));

    float alpha = clamp((0.52 + fresnel * 0.48) * uOpacity, 0.0, 1.0);
    gl_FragColor = vec4(color, alpha);
  }
`;

export const haloVertexShader = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPos = viewMatrix * worldPos;
    vViewDir = normalize(-mvPos.xyz);
    gl_Position = projectionMatrix * mvPos;
  }
`;

export const haloFragmentShader = /* glsl */ `
  uniform vec3 uPrimaryColor;
  uniform vec3 uSecondaryColor;
  uniform float uIntensity;

  varying vec3 vNormal;
  varying vec3 vViewDir;

  void main() {
    float ndotv = abs(dot(normalize(vNormal), normalize(vViewDir)));
    float aura = pow(clamp(1.0 - ndotv, 0.0, 1.0), 2.6);
    vec3 color = mix(uPrimaryColor, uSecondaryColor, clamp(ndotv * 0.7 + 0.2, 0.0, 1.0));
    gl_FragColor = vec4(color, aura * uIntensity);
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

    float twinkle = 0.60 + 0.40 * sin(uTime * 1.25 + aPhase * 3.0);
    float pulseGlow = 1.0 + exp(-uPulseAge * 1.1) * step(0.001, uPulseAge) * 0.8;

    vColor = aColor;
    vAlpha = twinkle * smoothstep(230.0, 26.0, dist);

    gl_PointSize = aScale * uPixelRatio * pulseGlow * (118.0 / dist);
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

    float glow = exp(-r2 * 13.0);
    gl_FragColor = vec4(vColor, glow * vAlpha * 0.94);
  }
`;
