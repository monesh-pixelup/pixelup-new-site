import * as THREE from 'three';

/**
 * Surface finishes for the mark. Press and hold cycles through them.
 * Every finish is evaluated in one shader that extends MeshPhysicalMaterial, so each keeps real studio
 * reflections and clearcoat; fire takes its colour from blackbody temperature. A bloom pass in MarkScene supplies the glow.
 */
export const FINISHES = [
  { name: 'chrome', halo: [0.75, 0.82, 1.0], haloStrength: 0, bloom: { strength: 0.12, radius: 0.15, threshold: 5 } },
  { name: 'fireball', halo: [1.0, 0.34, 0.05], haloStrength: 0.05, bloom: { strength: 0.4, radius: 0.3, threshold: 1.4 } },
  { name: 'ascii', halo: [0.55, 0.7, 1.0], haloStrength: 0.0, bloom: { strength: 0.22, radius: 0.3, threshold: 1.6 } },
] as const;

export const FIRE = 1;
export const ASCII = 2;

export type FinishUniforms = {
  uTime: { value: number };
  uFrom: { value: number };
  uTo: { value: number };
  uMix: { value: number };
  uNext: { value: number };
  uCharge: { value: number };
};

export const createFinishUniforms = (finish = 0): FinishUniforms => ({
  uTime: { value: 0 },
  uFrom: { value: finish },
  uTo: { value: finish },
  uMix: { value: 0 },
  uNext: { value: (finish + 1) % FINISHES.length },
  uCharge: { value: 0 },
});

/** Simplex noise (Ashima Arts / Stefan Gustavson, MIT), fractal sums, and a blackbody colour curve. */
const NOISE = /* glsl */ `
vec3 mkMod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mkMod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mkPermute(vec4 x) { return mkMod289(((x * 34.0) + 10.0) * x); }
vec4 mkTaylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float mkSnoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mkMod289(i);
  vec4 p = mkPermute(mkPermute(mkPermute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = mkTaylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// Signed fractal sum, roughly -1..1.
float mkFbm(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * mkSnoise(p);
    p = p * 2.02 + vec3(1.7, 9.2, 3.1);
    a *= 0.5;
  }
  return s;
}

// Turbulence: sum of |noise|, roughly 0..1. Billowing, flame-like.
float mkTurb(vec3 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    s += a * abs(mkSnoise(p));
    p = p * 2.03 + vec3(5.1, 1.3, 7.7);
    a *= 0.5;
  }
  return s;
}

// Colour of a blackbody at temperature K (Tanner Helland's fit to the Planckian locus), in linear RGB.
vec3 mkBlackbody(float K) {
  float t = K / 100.0;
  vec3 c;
  c.r = t <= 66.0 ? 1.0 : clamp(1.29293618606 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
  c.g = t <= 66.0 ? clamp(0.39008157876 * log(t) - 0.63184144378, 0.0, 1.0) : clamp(1.12989086089 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
  c.b = t >= 66.0 ? 1.0 : (t <= 19.0 ? 0.0 : clamp(0.54320678911 * log(t - 10.0) - 1.19625408914, 0.0, 1.0));
  return pow(c, vec3(2.2));
}
`;

const COMMON = /* glsl */ `
uniform float uTime;
uniform float uFrom;
uniform float uTo;
uniform float uMix;
uniform float uNext;
uniform float uCharge;
varying vec3 vMarkPos;
${NOISE}

struct MarkLook {
  vec3 albedo;
  vec3 emissive;
  float rough;
  float metal;
  float coat;
  float coatRough;
  float aniso;
};

MarkLook mkBlend(MarkLook a, MarkLook b, float k) {
  MarkLook o;
  o.albedo = mix(a.albedo, b.albedo, k);
  o.emissive = mix(a.emissive, b.emissive, k);
  o.rough = mix(a.rough, b.rough, k);
  o.metal = mix(a.metal, b.metal, k);
  o.coat = mix(a.coat, b.coat, k);
  o.coatRough = mix(a.coatRough, b.coatRough, k);
  o.aniso = mix(a.aniso, b.aniso, k);
  return o;
}

vec3 mkGlow(float id) {
  if (id < 0.5) return vec3(0.75, 0.85, 1.0);
  if (id < 1.5) return vec3(1.0, 0.42, 0.08);
  return vec3(0.8, 0.88, 1.0);
}

MarkLook mkLook(float id, vec3 p, vec3 N, vec3 V, float fr, float baseRough, float t) {
  MarkLook L;
  L.albedo = vec3(0.0);
  L.emissive = vec3(0.0);
  L.rough = 0.3;
  L.metal = 0.0;
  L.coat = 0.0;
  L.coatRough = 0.1;
  L.aniso = 0.0;

  if (id < 0.5) {
    // Chrome: brushed metal under a clear lacquer, mirror-polished bevels. The lacquer carries faint smudges —
    // a perfectly uniform finish is what makes CG metal read as fake.
    L.albedo = vec3(0.86, 0.87, 0.885);
    L.metal = 1.0;
    #ifdef MARK_SIDE
      L.rough = 0.04;
    #else
      L.rough = baseRough;
    #endif
    float smudge = smoothstep(0.05, 0.75, (mkSnoise(p * 4.5 + 3.0) * 0.65 + mkSnoise(p * 9.0 + 7.0) * 0.3) * 0.5 + 0.5);
    L.coat = 0.5;
    L.coatRough = mix(0.025, 0.11, smudge);
    L.aniso = 1.0;
  } else if (id < 1.5) {
    // Fireball: temperature field from rising, warped turbulence; colour and brightness from blackbody
    // radiation, so the only white is in the hottest cores and the cool regions sink to smoky red-black.
    vec3 q = vec3(p.x * 2.2, p.y * 1.5 - t * 1.25, p.z * 2.2 + t * 0.15);
    vec3 warp = vec3(
      mkSnoise(q * 0.9 + vec3(0.0, 0.0, t * 0.3)),
      mkSnoise(q * 0.9 + vec3(31.4, 0.0, 0.0)),
      mkSnoise(q * 0.9 + vec3(0.0, 47.2, 0.0)));
    // Broad flame bodies first (low-frequency), turbulence for the licking edges, and only a little of the
    // thin ridged "tongue" detail — too much of it reads as electricity rather than fire.
    float body = mkFbm(q * 0.6 + warp * 0.5) * 0.5 + 0.5;
    float turb = mkTurb(q * 1.25 + warp * 0.9);
    float tongues = pow(1.0 - abs(mkSnoise(q * vec3(2.4, 1.3, 2.4) + warp * 1.2 + vec3(0.0, -t * 0.8, 0.0))), 4.0);
    float base = clamp(1.0 - (p.y + 0.36) * 0.95, 0.0, 1.0);
    float T = clamp(base * 0.55 + body * 0.45 + turb * 0.8 + tongues * 0.14 + fr * 0.18 - 0.4, 0.0, 1.0);
    float flick = 0.88 + 0.12 * mkSnoise(vec3(t * 6.0, p.x * 2.0, p.y * 2.0));
    L.emissive = mkBlackbody(mix(800.0, 3200.0, T)) * (pow(T, 3.2) * 3.6 + T * 0.14) * flick;
    L.albedo = vec3(0.025, 0.02, 0.018);
    L.rough = 0.62;
    L.coat = 0.12;
    L.coatRough = 0.25;
  } else {
    // ASCII: matte clay with a soft diagonal falloff, so the glyph pass (MarkScene) gets a smooth tonal ramp
    // across each face — dense characters where it's lit, dots where it falls away — plus edge highlights.
    float ramp = smoothstep(-0.55, 0.75, p.x * 0.55 + p.y * 0.95);
    L.albedo = vec3(0.9) * (0.18 + 0.82 * ramp);
    L.emissive = vec3(0.04) + vec3(0.5) * fr;
    L.rough = 0.6;
  }
  return L;
}
`;

/** Turns a MeshPhysicalMaterial into a finish-switching material. `side` marks the polished bevel walls. */
export function applyFinish(material: THREE.MeshPhysicalMaterial, uniforms: FinishUniforms, side: boolean) {
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (side) shader.defines = { ...shader.defines, MARK_SIDE: '' };

    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vMarkPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvMarkPos = position;');

    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${COMMON}`)
      // Burn: each pixel switches when the transition front passes its noise value; the front is an ember line.
      .replace(
        'vec3 totalEmissiveRadiance = emissive;',
        /* glsl */ `vec3 totalEmissiveRadiance = emissive;
        float mkK = 0.0;
        float mkEdge = 0.0;
        if (uMix > 0.0) {
          float w = 0.08;
          float front = uMix * (1.0 + 2.0 * w) - w;
          float n = clamp(mkFbm(vMarkPos * 3.4 + 7.0) * 0.6 + 0.5, 0.0, 1.0);
          mkK = smoothstep(n - w * 0.5, n + w * 0.5, front);
          mkEdge = (1.0 - smoothstep(0.0, w, abs(front - n))) * step(uMix, 0.999);
        }
        float mkGrain = mix(uFrom < 0.5 ? 1.0 : 0.0, uTo < 0.5 ? 1.0 : 0.0, mkK);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        THREE.ShaderChunk.normal_fragment_maps.replace('mapN.xy *= normalScale;', 'mapN.xy *= normalScale * mkGrain;'),
      )
      .replace(
        '#include <emissivemap_fragment>',
        /* glsl */ `#include <emissivemap_fragment>
        vec3 mkV = normalize(vViewPosition);
        float mkFr = pow(1.0 - saturate(dot(nonPerturbedNormal, mkV)), 3.0);
        MarkLook mk = mkLook(uMix >= 1.0 ? uTo : uFrom, vMarkPos, nonPerturbedNormal, mkV, mkFr, roughnessFactor, uTime);
        if (uMix > 0.0 && uMix < 1.0) {
          mk = mkBlend(mk, mkLook(uTo, vMarkPos, nonPerturbedNormal, mkV, mkFr, roughnessFactor, uTime), mkK);
        }
        diffuseColor.rgb = mk.albedo;
        roughnessFactor = mk.rough;
        metalnessFactor = mk.metal;
        totalEmissiveRadiance += mk.emissive;
        // The burn front glows like a paper edge catching: blackbody orange at the rim, white at its hottest.
        totalEmissiveRadiance += mkBlackbody(mix(1200.0, 3200.0, mkEdge)) * mkEdge * mkEdge * 6.0;
        // Holding charges the rim with the colour of the finish that's coming.
        float mkPulse = 0.8 + 0.2 * sin(uTime * 18.0);
        totalEmissiveRadiance += mkGlow(uNext) * uCharge * uCharge * (0.18 + mkFr * 2.2) * mkPulse;`,
      )
      .replace(
        '#include <lights_physical_fragment>',
        /* glsl */ `#include <lights_physical_fragment>
        #ifdef USE_CLEARCOAT
          material.clearcoat = saturate(mk.coat);
          material.clearcoatRoughness = min(max(mk.coatRough, 0.0525) + geometryRoughness, 1.0);
        #endif
        #ifdef USE_ANISOTROPY
          material.anisotropy *= mk.aniso;
          material.alphaT = mix(pow2(material.roughness), 1.0, pow2(material.anisotropy));
        #endif`,
      );
  };
  material.customProgramCacheKey = () => (side ? 'mark-finish-side' : 'mark-finish-face');
  // Turn on every physical feature a finish can use; the shader sets the per-pixel amounts.
  material.clearcoat = 1;
  // Halves the plain dielectric reflection so colour finishes stay saturated (the clearcoat carries their gloss).
  // Metals take their reflectance from their own colour, so chrome is unaffected.
  material.specularIntensity = 0.5;
  material.needsUpdate = true;
}

/** Soft coloured glow behind the mark. */
export function createHalo() {
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uColor: { value: new THREE.Color(...FINISHES[0].halo) },
      uStrength: { value: FINISHES[0].haloStrength },
      uBoostColor: { value: new THREE.Color(...FINISHES[1].halo) },
      uBoost: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uStrength;
      uniform vec3 uBoostColor;
      uniform float uBoost;
      varying vec2 vUv;
      void main() {
        vec2 c = (vUv - 0.5) * 2.0;
        float total = uStrength + uBoost;
        vec3 col = (uColor * uStrength + uBoostColor * uBoost) / max(total, 1e-4);
        gl_FragColor = vec4(col, exp(-dot(c, c) * 3.4) * total);
      }
    `,
  });
  return new THREE.Mesh(new THREE.PlaneGeometry(3.2, 3.2), material);
}

/**
 * Flames licking off the outline of one half of the mark. A plane behind the half, shaded from a signed
 * distance to the glyph polygon: the outline is smeared upward through rising turbulence into tongues of fire,
 * coloured by blackbody temperature. The solid mark in front hides the plane inside the outline.
 */
export function createFlames(outline: [number, number][], uniforms: { uTime: { value: number }; uFire: { value: number } }) {
  const xs = outline.map((v) => v[0]);
  const ys = outline.map((v) => v[1]);
  const minX = Math.min(...xs) - 0.3;
  const maxX = Math.max(...xs) + 0.3;
  const minY = Math.min(...ys) - 0.2;
  const maxY = Math.max(...ys) + 0.75;
  const geometry = new THREE.PlaneGeometry(maxX - minX, maxY - minY);
  geometry.translate((minX + maxX) / 2, (minY + maxY) / 2, 0);
  const poly = Array.from({ length: 8 }, (_, i) => new THREE.Vector2(...(outline[i] ?? outline[0])));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...uniforms, uPoly: { value: poly }, uCount: { value: outline.length } },
    vertexShader: /* glsl */ `
      varying vec2 vPos;
      void main() {
        vPos = position.xy;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uFire;
      uniform vec2 uPoly[8];
      uniform int uCount;
      varying vec2 vPos;
      ${NOISE}

      // Signed distance to the polygon (Inigo Quilez), negative inside.
      float sdPoly(vec2 p) {
        float d = dot(p - uPoly[0], p - uPoly[0]);
        float s = 1.0;
        for (int i = 0; i < 8; i++) {
          if (i >= uCount) break;
          int j = i == 0 ? uCount - 1 : i - 1;
          vec2 vi = uPoly[i];
          vec2 vj = uPoly[j];
          vec2 e = vj - vi;
          vec2 w = p - vi;
          vec2 b = w - e * clamp(dot(w, e) / dot(e, e), 0.0, 1.0);
          d = min(d, dot(b, b));
          bvec3 c = bvec3(p.y >= vi.y, p.y < vj.y, e.x * w.y > e.y * w.x);
          if (all(c) || all(not(c))) s *= -1.0;
        }
        return s * sqrt(d);
      }

      void main() {
        if (uFire < 0.001) discard;
        vec2 p = vPos;
        float t = uTime;
        float n = mkTurb(vec3(p.x * 3.0, p.y * 2.0 - t * 1.9, t * 0.25));
        float wobble = mkSnoise(vec3(p.x * 6.0, p.y * 4.0 - t * 3.2, t * 0.6));
        // Smear the outline upward: sample it lower down, paying a toll for the height climbed.
        float d = 1e3;
        for (int k = 0; k < 6; k++) {
          float lift = float(k) * 0.065;
          d = min(d, sdPoly(p - vec2(wobble * 0.03, lift)) + lift * (0.5 + 0.7 * (1.0 - n)));
        }
        float flame = pow(clamp(1.0 - max(d, 0.0) / (0.03 + 0.08 * n), 0.0, 1.0), 1.8);
        float T = clamp(flame * (0.45 + 0.6 * n), 0.0, 1.0);
        vec3 col = mkBlackbody(mix(900.0, 3000.0, T)) * (pow(T, 2.6) * 2.6 + T * 0.2);
        gl_FragColor = vec4(col, clamp(T * 1.2, 0.0, 1.0) * uFire * 0.8);
      }
    `,
  });
  return new THREE.Mesh(geometry, material);
}

/** Glyphs ordered from sparse to dense; the ASCII pass picks one per cell from its brightness. */
const ASCII_RAMP = ' .:-;/=<>?@';

/** A one-row atlas of the ramp, white on black, rendered from the system monospace. */
function glyphAtlas() {
  const cell = 64;
  const canvas = document.createElement('canvas');
  canvas.width = cell * ASCII_RAMP.length;
  canvas.height = cell;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#fff';
  ctx.font = `500 ${cell * 0.78}px ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  [...ASCII_RAMP].forEach((ch, i) => ctx.fillText(ch, i * cell + cell / 2, cell * 0.54));
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

/**
 * ASCII post-process: the frame is split into a monospace grid and each cell is redrawn as the glyph that
 * matches its brightness. Cells flip to glyphs in a random scatter as `uAmount` rises, and a few
 * occasionally scramble so the type feels live.
 */
export function createAsciiShader() {
  return {
    uniforms: {
      tDiffuse: { value: null },
      tGlyphs: { value: glyphAtlas() },
      uResolution: { value: new THREE.Vector2(1, 1) },
      uCell: { value: 12 },
      uAmount: { value: 0 },
      uTime: { value: 0 },
      uCount: { value: ASCII_RAMP.length },
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform sampler2D tDiffuse;
      uniform sampler2D tGlyphs;
      uniform vec2 uResolution;
      uniform float uCell;
      uniform float uAmount;
      uniform float uTime;
      uniform float uCount;
      varying vec2 vUv;

      float hash(vec2 p) {
        vec3 q = fract(vec3(p.xyx) * 0.1031);
        q += dot(q, q.yzx + 33.33);
        return fract((q.x + q.y) * q.z);
      }

      void main() {
        vec4 src = texture2D(tDiffuse, vUv);
        vec2 px = vUv * uResolution;
        vec2 cell = floor(px / uCell);
        vec4 c = texture2D(tDiffuse, (cell + 0.5) * uCell / uResolution);
        // Premultiplied scene colour: recover brightness, compress HDR, and keep coverage separate.
        float cover = c.a;
        float lum = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722)) / max(cover, 1e-3);
        lum = 1.0 - exp(-lum * 2.2);
        float level = clamp(lum * 1.1, 0.0, 0.999);
        // Now and then a glyph scrambles to its neighbour for a beat.
        float tick = floor(uTime * 9.0);
        level += step(0.985, hash(cell + tick)) * (hash(cell - tick) - 0.5) * 0.35;
        float idx = floor(clamp(level, 0.0, 0.999) * uCount);
        vec2 inCell = fract(px / uCell);
        float glyph = texture2D(tGlyphs, vec2((idx + inCell.x) / uCount, inCell.y)).r;
        float ink = glyph * cover * (0.4 + 0.75 * lum);
        vec4 ascii = vec4(vec3(0.84, 0.9, 1.0) * ink, ink);
        // Each cell switches at its own moment, so the mark resolves into type in a scatter.
        float on = step(hash(cell * 1.37 + 4.1), uAmount);
        gl_FragColor = mix(src, ascii, on);
      }
    `,
  };
}

/** Embers: sparks that lift off the burning mark, drift, cool from yellow to deep red, and fade. */
export function createEmbers(count: number, uniforms: { uTime: { value: number }; uFire: { value: number } }) {
  const geometry = new THREE.BufferGeometry();
  const seeds = new Float32Array(count);
  for (let i = 0; i < count; i++) seeds[i] = Math.random();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
  geometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 1));
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { ...uniforms, uSize: { value: 4 }, uPixelRatio: { value: 1 } },
    vertexShader: /* glsl */ `
      attribute float aSeed;
      uniform float uTime;
      uniform float uSize;
      uniform float uPixelRatio;
      varying float vLife;
      void main() {
        float s = aSeed;
        float life = fract(uTime * (0.16 + fract(s * 7.13) * 0.22) + s);
        vec3 pos = vec3((fract(s * 3.7) - 0.5) * 1.1, -0.32 + fract(s * 5.3) * 0.62, (fract(s * 9.1) - 0.5) * 0.3);
        pos.y += life * (0.85 + fract(s * 2.9) * 0.8);
        pos.x += sin(uTime * (1.5 + fract(s * 4.3) * 2.0) + s * 40.0) * 0.06 * life + (fract(s * 6.1) - 0.5) * 0.3 * life;
        vLife = life;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        gl_PointSize = uSize * (0.35 + fract(s * 8.7)) * (1.0 - life * 0.65) * uPixelRatio;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uFire;
      varying float vLife;
      ${NOISE}
      void main() {
        if (uFire < 0.001) discard;
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r);
        a *= smoothstep(0.0, 0.08, vLife) * (1.0 - smoothstep(0.55, 1.0, vLife)) * uFire;
        float T = mix(0.95, 0.3, vLife);
        gl_FragColor = vec4(mkBlackbody(mix(1300.0, 2700.0, T)) * (1.2 + 3.0 * T * T), a * 0.7);
      }
    `,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return points;
}
