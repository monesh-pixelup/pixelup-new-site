'use client';

import { useEffect, useRef } from 'react';

/*
  The clients field's sky (ported from /next): a full-screen WebGL pass, sticky behind the drum, that walks down the
  brand gradient as the field scrolls by. The colour drifts slowly as a folded noise flow, parts a little around the
  pointer, and blooms out from a hovered name. It renders at half resolution, throttles itself when idle, and gives up
  (leaving the static CSS gradient) on weak GPUs, lost contexts or reduced contrast.
*/

/** The home gradient (Figma 1524:1200), interpolated in sRGB like the CSS fallback underneath. */
const RAMP: [number, string][] = [
  [0, '#ffffff'],
  [0.048334, '#ffffff'],
  [0.25305, '#061d46'],
  [0.33981, '#030306'],
  [0.44319, '#030207'],
  [0.50167, '#450854'],
  [0.56014, '#880ea2'],
  [0.71067, '#ff4b32'],
  [0.79931, '#ee237c'],
  [0.87981, '#e52c27'],
  [0.99038, '#457738'],
  [1, '#457738'],
];
/** Hover blooms: accents from the same palette, each at a lightness where inverted names still read. */
const TONES = ['#880ea2', '#ff4b32', '#ee237c', '#3a1fd1', '#e52c27', '#5b2bd8', '#457738'];
const TONE_L = [0.45, 0.6, 0.55, 0.42, 0.52, 0.47, 0.5];
const SIZE = 512;
/** How far the colour leans up the screen: the share of the ramp spread from the bottom of the screen to the top. */
const LEAN = 0.34;
/** How early the walk starts, in screen heights before the field reaches the top of the screen: a longer scroll, so
    the colours blend into each other slowly instead of all at once. */
const LEAD = 0.2;
/** The soft fade from paper into colour below the field's top edge, in screen heights. It is pinned to the edge, so
    it scrolls away with the page and the colour never meets the paper above in a hard line. */
const FADE = 0.3;

let broken = false; // once the GPU can't keep up, stay on the CSS gradient for the session

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const smooth = (t: number) => t * t * (3 - 2 * t);
const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const hexRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const toLab = ([r, g, b]: number[]) => {
  const [lr, lg, lb] = [r, g, b].map(toLinear);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
};
const labToLinear = ([L, a, b]: number[]) => {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s];
};
/** An accent at a set lightness, with as much chroma as stays in gamut. */
const tone = (hex: string, i: number) => {
  const [, a, b] = toLab(hexRgb(hex));
  const h = Math.atan2(b, a);
  const L = TONE_L[i];
  let lo = 0;
  let hi = 0.4;
  for (let k = 0; k < 24; k++) {
    const c = (lo + hi) / 2;
    if (labToLinear([L, c * Math.cos(h), c * Math.sin(h)]).every((v) => v >= 0 && v <= 1)) lo = c;
    else hi = c;
  }
  return [L, 0.92 * lo * Math.cos(h), 0.92 * lo * Math.sin(h)];
};

/** The ramp as an sRGB strip (plus each texel's OKLab lightness, to know when the names over it should turn white). */
function buildRamp() {
  const stops = RAMP.map(([, hex]) => hexRgb(hex));
  const raw: number[][] = [];
  for (let x = 0; x < SIZE; x++) {
    const t = x / (SIZE - 1);
    let i = 1;
    while (i < RAMP.length - 1 && RAMP[i][0] < t) i++;
    const a = RAMP[i - 1][0];
    const k = clamp((t - a) / (RAMP[i][0] - a || 1), 0, 1);
    raw.push(stops[i - 1].map((v, c) => v + (stops[i][c] - v) * k));
  }
  const bytes = new Uint8Array(4 * SIZE);
  const lightness = new Float32Array(SIZE);
  for (let x = 0; x < SIZE; x++) {
    // A few texels of smoothing so the stops never show as seams.
    const r = Math.min(5, x, SIZE - 1 - x);
    const sum = [0, 0, 0];
    for (let d = -r; d <= r; d++) for (let c = 0; c < 3; c++) sum[c] += raw[x + d][c] / (2 * r + 1);
    sum.forEach((v, c) => (bytes[4 * x + c] = Math.round(255 * clamp(v, 0, 1))));
    bytes[4 * x + 3] = 255;
    lightness[x] = toLab(sum)[0];
  }
  return { bytes, lightness };
}

const FRAGMENT = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif
uniform sampler2D u_ramp;
uniform vec2 u_res;
uniform float u_aspect;
uniform float u_time;
uniform float u_p;
uniform float u_lean;
uniform vec2 u_edge;
uniform vec3 u_ptr;
uniform vec2 u_lane;
uniform vec4 u_bloom[3];
uniform vec3 u_tone[3];

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 a0 = x - floor(x + 0.5);
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
// Two octaves: broad shapes with a soft secondary ripple.
float fbm(vec2 p) {
  return 0.72 * snoise(p) + 0.28 * snoise(mat2(0.8, 0.6, -0.6, 0.8) * p * 2.07 + 11.7);
}
vec3 lin(vec3 c) { return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(0.04045, c)); }
vec3 srgb(vec3 c) {
  c = clamp(c, 0.0, 1.0);
  return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c));
}
vec3 toLab(vec3 c) {
  vec3 lms = vec3(
    dot(c, vec3(0.4122214708, 0.5363325363, 0.0514459929)),
    dot(c, vec3(0.2119034982, 0.6806995451, 0.1073969566)),
    dot(c, vec3(0.0883024619, 0.2817188376, 0.6299787005)));
  lms = pow(max(lms, 0.0), vec3(1.0 / 3.0));
  return vec3(
    dot(lms, vec3(0.2104542553, 0.7936177850, -0.0040720468)),
    dot(lms, vec3(1.9779984951, -2.4285922050, 0.4505937099)),
    dot(lms, vec3(0.0259040371, 0.7827717662, -0.8086757660)));
}
vec3 fromLab(vec3 c) {
  vec3 lms = vec3(
    c.x + 0.3963377774 * c.y + 0.2158037573 * c.z,
    c.x - 0.1055613458 * c.y - 0.0638541728 * c.z,
    c.x - 0.0894841775 * c.y - 1.2914855480 * c.z);
  lms = lms * lms * lms;
  return vec3(
    dot(lms, vec3(4.0767416621, -3.3077115913, 0.2309699292)),
    dot(lms, vec3(-1.2684380046, 2.6097574011, -0.3413193965)),
    dot(lms, vec3(-0.0041960863, -0.7034186147, 1.7076147010)));
}
float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res;
  vec2 q = vec2(uv.x * u_aspect, uv.y);

  // Where the screen meets the page stays exact: the top while the field arrives under paper, the bottom as it hands over.
  float m = mix(1.0, smoothstep(1.0, 0.72, uv.y), 1.0 - smoothstep(0.0, 0.1, u_p)) * mix(1.0, smoothstep(0.0, 0.32, uv.y), smoothstep(0.9, 1.0, u_p));

  // The flow: broad, slow, folded through itself; it parts a little around the pointer.
  float t = u_time * 0.06;
  vec2 dp = vec2(0.0);
  float pool = 0.0;
  if (u_ptr.z > 0.002) {
    dp = q - vec2(u_ptr.x * u_aspect, u_ptr.y);
    float edge = 1.0 + 0.22 * snoise(q * 1.4 + vec2(t * 0.6, -t * 0.4));
    pool = exp(-dot(dp, dp) / (0.1225 * edge * edge)) * u_ptr.z;
  }
  vec2 s = q * 0.62 - dp * pool * 0.3;
  vec2 w = vec2(fbm(s + vec2(0.0, t)), fbm(s + vec2(5.2, 1.3) + vec2(-t * 0.8, t * 0.3)));
  float n = fbm(s + 0.85 * w + vec2(t * 0.4, -t * 0.5));

  // The ramp position: scroll progress, a top-to-bottom lean (so the colour reaches up from below), and the flow
  // (calmer on the last stretch). The top of the screen still starts on paper.
  float r = u_p * (1.0 - u_lean) + (1.0 - uv.y) * u_lean;
  r += n * 0.05 * m * (1.0 - 0.65 * smoothstep(0.82, 0.95, r));
  // Below the field's top edge the colour fades back to paper (u_edge: the edge's depth below the canvas top, and the
  // fade's height, both in screen heights), with a slight wave from the flow so the line never reads as ruled.
  r *= smoothstep(0.0, u_edge.y, (1.0 - uv.y) - u_edge.x + w.x * 0.03);
  vec3 lab = toLab(lin(texture2D(u_ramp, vec2(clamp(r, 0.0, 1.0), 0.5)).rgb));
  float paper = smoothstep(0.88, 0.995, lab.x);
  lab.x += n * 0.025 * (1.0 - paper) * m;

  // Behind the names the colour is kept out of the mid lightness where inverted names lose contrast.
  float lane = (1.0 - smoothstep(u_lane.x, u_lane.x + u_lane.y, abs(uv.x - 0.5) + w.x * 0.1)) * m * (0.6 + 0.4 * smoothstep(0.0, 0.3, 0.5 - abs(uv.y - 0.5)));
  float deepen = 1.0 - lane * 0.26 * smoothstep(0.74, 0.8, r);
  lab.x *= deepen;
  lab.yz *= 0.5 + 0.5 * deepen;
  float dl = (lab.x - 0.585) / 0.09;
  lab.x += lane * (1.0 - paper) * 0.08 * 1.6487 * dl * exp(-0.5 * dl * dl);

  // The pointer: a soft light on colour, a cool shade on paper.
  pool *= m;
  float lift = pool * 0.1 * (1.0 - paper);
  lab.x += mix(lift, min(lift, max(0.0, 0.42 - lab.x)), lane);
  lab.yz *= 1.0 + pool * 0.25 * (1.0 - paper);
  lab = mix(lab, vec3(0.86, -0.006, -0.03), pool * 0.16 * paper);

  // The hovered name's accent blooms out from its row (newest on top), mixed in lightness, chroma and hue.
  for (int i = 0; i < 3; i++) {
    vec4 g = u_bloom[i];
    if (g.w < 0.002) continue;
    vec2 db = q - vec2(g.x * u_aspect, g.y) + w * 0.12;
    db.x *= mix(0.55, 0.8, paper);
    float R = mix(0.46, 0.3, paper);
    vec3 T = u_tone[i];
    float L = lab.x;
    float C = length(lab.yz);
    float ht = atan(T.z, T.y);
    float h = C > 0.0001 ? atan(lab.z, lab.y) : ht;
    float light = smoothstep(0.64, 0.76, L);
    float b = exp(-dot(db, db) / (R * R)) * g.w * m * 0.85 * (1.0 - 3.0 * light * (1.0 - light));
    float Lt = mix(min(min(max(L, T.x * 0.85), L + 0.18), 0.42), L - 0.05, light);
    float Ct = length(T.yz) * clamp(Lt / T.x, 0.45, 1.1);
    float Cn = mix(min(max(C, Ct), Ct * 1.15), min(length(T.yz), 0.02), light);
    float same = 1.0 - smoothstep(0.05, 0.12, length(vec3(L - Lt, lab.yz - Cn * vec2(cos(ht), sin(ht)))));
    Lt -= 0.1 * same * (1.0 - light);
    h += (mod(ht - h + 3.14159265, 6.28318531) - 3.14159265) * min(1.0, b * 1.25);
    L = mix(L, Lt, b);
    C = mix(C, Cn, b);
    lab = vec3(L, C * cos(h), C * sin(h));
  }

  // A step of dither against banding in the dark; the visible grain is the CSS overlay above the canvas.
  vec3 c = srgb(fromLab(lab)) + (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(c, 1.0);
}
`;

type Bloom = { li: Element | null; x: number; y: number; tone: number[]; amt: number; on: boolean; quick: boolean; at: number };

export default function ClientsSky({ count }: { count: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sky = ref.current;
    const field = sky?.parentElement;
    const canvas = sky?.querySelector('canvas');
    const list = field?.querySelector<HTMLElement>('.hc__list');
    if (!sky || !field || !canvas || !list || broken || window.matchMedia('(prefers-contrast: more)').matches) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const items = Array.from(list.children);
    const tones = TONES.map(tone);
    const ramp = buildRamp();

    let gl: WebGLRenderingContext | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;
    let texture: WebGLTexture | null = null;
    let U: Record<string, WebGLUniformLocation | null> = {};
    let ink = false;
    const inked = items.map(() => false);
    /** Back to the CSS gradient: no live colour, no inverted names. */
    const unink = () => {
      field.classList.remove('is-live', 'is-ink');
      items.forEach((li, i) => {
        li.classList.remove('is-ink');
        inked[i] = false;
      });
      ink = false;
    };

    const init = () => {
      if (!gl) return false;
      const g = gl;
      const shader = (type: number, src: string) => {
        const sh = g.createShader(type)!;
        g.shaderSource(sh, src);
        g.compileShader(sh);
        return sh;
      };
      const vs = shader(g.VERTEX_SHADER, 'attribute vec2 a_pos; void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }');
      const fs = shader(g.FRAGMENT_SHADER, FRAGMENT);
      program = g.createProgram()!;
      g.attachShader(program, vs);
      g.attachShader(program, fs);
      g.linkProgram(program);
      g.deleteShader(vs);
      g.deleteShader(fs);
      if (!g.getProgramParameter(program, g.LINK_STATUS)) return false;
      g.useProgram(program);
      buffer = g.createBuffer();
      g.bindBuffer(g.ARRAY_BUFFER, buffer);
      g.bufferData(g.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), g.STATIC_DRAW);
      const pos = g.getAttribLocation(program, 'a_pos');
      g.enableVertexAttribArray(pos);
      g.vertexAttribPointer(pos, 2, g.FLOAT, false, 0, 0);
      texture = g.createTexture();
      g.activeTexture(g.TEXTURE0);
      g.bindTexture(g.TEXTURE_2D, texture);
      g.texImage2D(g.TEXTURE_2D, 0, g.RGBA, SIZE, 1, 0, g.RGBA, g.UNSIGNED_BYTE, ramp.bytes);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
      g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
      U = Object.fromEntries(['u_ramp', 'u_res', 'u_aspect', 'u_time', 'u_p', 'u_lean', 'u_edge', 'u_ptr', 'u_lane', 'u_bloom', 'u_tone'].map((n) => [n, g.getUniformLocation(program!, n)]));
      g.uniform1i(U.u_ramp, 0);
      pw = ph = 0;
      return true;
    };
    const teardown = () => {
      if (gl) {
        gl.deleteProgram(program);
        gl.deleteBuffer(buffer);
        gl.deleteTexture(texture);
      }
      program = buffer = texture = null;
    };

    // Geometry: the field in the page, the sticky canvas's css size and its drawing buffer (half resolution).
    let top = 0;
    let height = 1;
    let left = 0;
    let cw = 1;
    let ch = 1;
    let pw = 0;
    let ph = 0;
    let lane = 0.2;
    const measure = () => {
      if (!gl) return;
      const r = field.getBoundingClientRect();
      top = r.top + window.scrollY;
      height = r.height;
      left = r.left;
      cw = Math.max(1, canvas.clientWidth);
      ch = Math.max(1, canvas.clientHeight);
      let widest = 0;
      for (let i = 0; i < Math.min(count, items.length); i++) {
        const svg = items[i].firstElementChild;
        if (svg) widest = Math.max(widest, parseFloat(getComputedStyle(svg).width) || 0);
      }
      lane = (widest || 0.3 * cw) / 2 / cw + 0.03;
      const w = Math.round(0.5 * cw);
      const h = Math.round(0.5 * ch);
      if (w !== pw || h !== ph) {
        canvas.width = pw = w;
        canvas.height = ph = h;
        gl.viewport(0, 0, w, h);
      }
      request();
    };
    /** Where the sticky canvas's top is in the viewport for a given scroll position. */
    const canvasTop = (scroll: number) => Math.max(top - scroll, Math.min(0, top + Math.max(1, height - ch) - scroll));

    let time = 7.3;
    let speed = 0;
    let p = -1;
    let lastScroll = window.scrollY;
    const ptr = { x: 0, y: 0, on: false };
    let px = 0;
    let py = 0;
    let presence = 0;
    const blooms: Bloom[] = Array.from({ length: 3 }, () => ({ li: null, x: 0, y: 0, tone: tones[0], amt: 0, on: false, quick: false, at: 0 }));
    const bloomData = new Float32Array(12);
    const toneData = new Float32Array(9);
    let current: Bloom | null = null;
    let order = 0;
    let lockUntil = 0;
    let raf = 0;
    let lastFrame = 0;
    let lastRender = 0;
    let idle = false;
    let live = false;
    let lost = false;
    let dead = false;
    let samples: number[] = [];
    let measured = reduced;
    let visible = false;

    const render = (now: number) => {
      const dt = Math.min(0.1, Math.max(0, (now - lastRender) / 1000));
      lastRender = now;
      const frames = 60 * dt;
      const ease = (k: number) => 1 - Math.pow(1 - k, frames);
      const scroll = window.scrollY;
      const lead = LEAD * ch;
      const target = clamp((scroll - top + lead) / Math.max(1, height - ch + lead), 0, 1);
      if (reduced || p < 0) p = target;
      else {
        p += (target - p) * ease(0.12);
        const slack = 0.5 * Math.min(target, 1 - target);
        p = clamp(p, target - slack, target + slack);
      }
      const scrolled = Math.abs(scroll - lastScroll) > 2;
      if (scrolled) {
        lockUntil = now + 150;
        if (current) release();
      }
      let still = Math.abs(target - p) < 1e-4 && !scrolled;
      if (!reduced) {
        // Scrolling quickens the flow for a moment.
        const v = dt > 0 ? Math.abs(scroll - lastScroll) / dt : 0;
        speed += (Math.min(1, v / 2600) - speed) * ease(v / 2600 > speed ? 0.08 : 0.03);
        time += dt * (1 + 2.2 * speed);
        const ct = canvasTop(scroll);
        const inside = ptr.on && ptr.y >= ct && ptr.y <= ct + ch;
        if (presence < 0.01 && inside) {
          px = ptr.x;
          py = ptr.y;
        }
        presence += (Number(inside) - presence) * ease(0.06);
        px += (ptr.x - px) * ease(0.1);
        py += (ptr.y - py) * ease(0.1);
        for (const b of blooms) {
          const goal = Number(b.on);
          b.amt += (goal - b.amt) * ease(b.on ? 0.085 : b.quick ? 0.15 : 0.055);
          if (Math.abs(goal - b.amt) > 0.004) still = false;
        }
        still &&= speed < 0.02 && Math.abs(presence - Number(inside)) < 0.01 && Math.abs(ptr.x - px) + Math.abs(ptr.y - py) < 1;
      }
      idle = still;
      lastScroll = scroll;

      // Each name turns white where the field behind it is dark: with the colour leaning up the screen, the top of
      // it can still be paper while the bottom is already deep. The side labels follow the middle of the screen.
      const ct0 = canvasTop(scroll);
      const edge = top - scroll - ct0;
      const shade = (y: number) => {
        const r = ((1 - LEAN) * Math.max(0, p) + LEAN * clamp(y / ch, 0, 1)) * smooth(clamp((y - edge) / (FADE * ch), 0, 1));
        return ramp.lightness[Math.round(clamp(r, 0, 1) * (SIZE - 1))] < 0.6;
      };
      for (let i = 0; i < items.length; i++) {
        const r = items[i].getBoundingClientRect();
        const on = shade(r.top + r.height / 2 - ct0);
        if (on !== inked[i]) items[i].classList.toggle('is-ink', (inked[i] = on));
      }
      const dark = shade(0.5 * ch);
      if (dark !== ink) field.classList.toggle('is-ink', (ink = dark));

      if (gl && program) {
        const ct = canvasTop(scroll);
        gl.uniform2f(U.u_res, pw, ph);
        gl.uniform1f(U.u_aspect, cw / ch);
        gl.uniform1f(U.u_time, time);
        gl.uniform1f(U.u_p, Math.max(0, p));
        gl.uniform1f(U.u_lean, LEAN);
        gl.uniform2f(U.u_edge, (top - scroll - ct) / ch, FADE);
        gl.uniform3f(U.u_ptr, (px - left) / cw, 1 - (py - ct) / ch, presence);
        gl.uniform2f(U.u_lane, lane, 0.3);
        [...blooms]
          .sort((a, b) => a.at - b.at)
          .forEach((b, i) => {
            bloomData.set([b.x / cw, 1 - b.y / ch, 0, b.amt], 4 * i);
            toneData.set(b.tone, 3 * i);
          });
        gl.uniform4fv(U.u_bloom, bloomData);
        gl.uniform3fv(U.u_tone, toneData);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
      }
      if (!live) {
        live = true;
        field.classList.add('is-live');
      }
    };

    const active = () => visible && !document.hidden && !lost && !dead && !reduced;
    const loop = (now: number) => {
      raf = active() ? requestAnimationFrame(loop) : 0;
      // The first 40 frames decide whether this GPU can afford the sky at all.
      if (!measured && lastFrame) {
        samples.push(now - lastFrame);
        if (samples.length >= 40) {
          measured = true;
          const sorted = samples.sort((a, b) => a - b);
          if (sorted[sorted.length >> 1] > 36) {
            kill();
            return;
          }
        }
      }
      lastFrame = now;
      // Settled: about 30fps; moving: every frame.
      if (measured && now - lastRender < (idle ? 31 : 13)) return;
      render(now);
    };
    function request() {
      if (reduced) {
        if (visible && gl && program && !lost) render(performance.now());
        return;
      }
      if (!raf && active()) {
        lastFrame = 0;
        if (!measured) samples = [];
        lastRender = performance.now() - 1000 / 60;
        raf = requestAnimationFrame(loop);
      }
    }
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const kill = () => {
      broken = dead = true;
      stop();
      unink();
      teardown();
      gl?.getExtension('WEBGL_lose_context')?.loseContext();
    };

    // Hover: the name's accent blooms from its row.
    const bloom = (li: Element) => {
      if (current?.li === li) return;
      if (current) Object.assign(current, { on: false, quick: true });
      const slot = blooms.find((b) => b.li === li) ?? blooms.reduce((a, b) => (b.amt < a.amt ? b : a));
      const r = li.getBoundingClientRect();
      if (slot.li !== li) slot.amt = 0;
      Object.assign(slot, {
        li,
        x: r.left + r.width / 2 - left,
        y: r.top + r.height / 2 - canvasTop(window.scrollY),
        tone: tones[(items.indexOf(li) % count) % tones.length],
        on: true,
        quick: false,
        at: ++order,
      });
      current = slot;
      request();
    };
    function release() {
      if (current) Object.assign(current, { on: false, quick: false });
      current = null;
    }
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      const moved = !ptr.on || e.clientX !== ptr.x || e.clientY !== ptr.y;
      ptr.x = e.clientX;
      ptr.y = e.clientY;
      ptr.on = true;
      if (!moved) return;
      request();
      const hit = (e.target as Element | null)?.closest?.('.hc__logo');
      const li = hit && list.contains(hit) ? hit : null;
      if (li) {
        if (performance.now() >= lockUntil && current?.li !== li) bloom(li);
      } else if (current) release();
    };
    const onOut = (e: MouseEvent) => {
      if (e.relatedTarget) return;
      ptr.on = false;
      release();
    };
    let tapTimer = 0;
    const onTap = (e: MouseEvent) => {
      const li = (e.target as Element).closest('.hc__logo');
      if (!li) return;
      bloom(li);
      window.clearTimeout(tapTimer);
      tapTimer = window.setTimeout(release, 900);
    };
    const resize = new ResizeObserver(measure);
    const onVisibility = () => (document.hidden ? stop() : request());
    const onScroll = () => request();
    const onLost = (e: Event) => {
      e.preventDefault();
      lost = true;
      stop();
      unink();
    };
    const onRestored = () => {
      if (dead) return;
      lost = false;
      live = false;
      p = -1;
      if (init()) measure();
    };

    let started = false;
    const boot = new IntersectionObserver(
      (entries) => {
        if (!entries[entries.length - 1].isIntersecting) return;
        boot.disconnect();
        gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: true });
        if (gl && init()) {
          started = true;
          resize.observe(field);
          resize.observe(canvas);
          resize.observe(document.body);
          document.addEventListener('visibilitychange', onVisibility);
          window.addEventListener('resize', measure);
          canvas.addEventListener('webglcontextlost', onLost);
          canvas.addEventListener('webglcontextrestored', onRestored);
          if (reduced) window.addEventListener('scroll', onScroll, { passive: true });
          else if (fine) {
            window.addEventListener('pointermove', onMove, { passive: true });
            document.addEventListener('mouseout', onOut);
          } else list.addEventListener('click', onTap);
          measure();
          render(performance.now());
        } else {
          teardown();
          gl = null;
          dead = true;
          watch.disconnect();
        }
      },
      { rootMargin: '100% 0px' },
    );
    const watch = new IntersectionObserver(
      (entries) => {
        visible = entries[entries.length - 1].isIntersecting;
        if (!visible) return stop();
        p = -1;
        lastScroll = window.scrollY;
        if (started) request();
      },
      { rootMargin: '25% 0px' },
    );
    boot.observe(field);
    watch.observe(field);

    return () => {
      stop();
      boot.disconnect();
      watch.disconnect();
      resize.disconnect();
      window.clearTimeout(tapTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('resize', measure);
      canvas.removeEventListener('webglcontextlost', onLost);
      canvas.removeEventListener('webglcontextrestored', onRestored);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('mouseout', onOut);
      list.removeEventListener('click', onTap);
      unink();
      teardown();
    };
  }, [count]);

  return (
    <div ref={ref} className="hc__sky" aria-hidden="true">
      <div>
        <canvas />
      </div>
    </div>
  );
}
