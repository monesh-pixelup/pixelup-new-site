'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { motion } from '@/lib/markState';

// Brand gradient (Figma 858:932) as light rising off a horizon. One full-screen triangle, one fragment shader.
// At full rise the ramp lands exactly on the Figma stops: ink 0 → black 35.7% → #273AFB 66.3% → white 100%.

const VERT = `
attribute vec2 p;
varying vec2 vUv;
void main() {
  vUv = p * 0.5 + 0.5;
  gl_Position = vec4(p, 0.0, 1.0);
}`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uRise;
uniform vec2 uMouse;
uniform float uHover;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + 7.1;
    a *= 0.5;
  }
  return v;
}

vec3 ramp(float t) {
  vec3 ink = vec3(12.0) / 255.0;
  vec3 blue = vec3(39.0, 58.0, 251.0) / 255.0;
  vec3 c = mix(ink, vec3(0.0), smoothstep(0.0, 0.357, t));
  // Black into blue stays dark a little longer, so the blue blooms like light rather than fading in flat.
  float b = clamp((t - 0.357) / (0.663 - 0.357), 0.0, 1.0);
  c = mix(c, blue, pow(smoothstep(0.0, 1.0, b), 1.35));
  c = mix(c, vec3(1.0), smoothstep(0.663, 1.0, t));
  return c;
}

void main() {
  float aspect = uRes.x / uRes.y;
  float x = vUv.x;
  float y = 1.0 - vUv.y; // 0 at the top of the footer

  // Scroll: the whole ramp rises from below; exact at uRise = 1.
  float rise = smoothstep(0.0, 1.0, uRise);
  float t = y - (1.0 - rise) * 0.78;

  // A slow, living horizon. Held still near the top (seam with the page) and the very bottom (the link bar).
  float band = smoothstep(0.12, 0.45, y) * (1.0 - smoothstep(0.82, 0.98, y));
  float drift = fbm(vec2(x * 1.35 + uTime * 0.018, uTime * 0.04)) - 0.5;
  float swell = sin(x * 3.14159 + uTime * 0.22) * 0.5 + 0.5;
  t += (drift * 0.075 + (swell - 0.5) * 0.012) * band;

  // The cursor draws the light up toward it, softly.
  vec2 m = vec2(uMouse.x * aspect, uMouse.y);
  float d = distance(vec2(x * aspect, y), m);
  float pull = exp(-d * d * 5.5) * uHover;
  t += pull * 0.055 * (1.0 - smoothstep(0.7, 0.92, y));

  vec3 col = ramp(t);

  // Bloom in the blue band around the cursor and along the centre of the horizon.
  float inBlue = smoothstep(0.36, 0.6, t) * (1.0 - smoothstep(0.82, 1.0, t));
  col += vec3(0.20, 0.26, 0.85) * pull * inBlue * 0.32;
  col += vec3(0.08, 0.11, 0.42) * inBlue * (1.0 - abs(x - 0.5) * 1.6) * 0.14;

  // Film grain, faded in with the light so the top edge matches the flat page black exactly.
  float g = hash(gl_FragCoord.xy + fract(floor(uTime * 24.0) * 0.6180339) * 1000.0) - 0.5;
  col += g * 0.055 * smoothstep(0.25, 0.55, t);
  // Dither against 8-bit banding.
  col += (hash(gl_FragCoord.yx + 3.7) - 0.5) / 255.0;

  gl_FragColor = vec4(col, 1.0);
}`;

const damp = (a: number, b: number, lambda: number, dt: number) => a + (b - a) * (1 - Math.exp(-lambda * dt));

export default function FooterGradient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const foot = canvas?.parentElement;
    if (!canvas || !foot || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const gl = canvas.getContext('webgl', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'low-power' });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = (n: string) => gl.getUniformLocation(prog, n);
    const uRes = u('uRes');
    const uTime = u('uTime');
    const uRise = u('uRise');
    const uMouse = u('uMouse');
    const uHover = u('uHover');

    const state = { rise: 0, mx: 0.5, my: 0.6, tmx: 0.5, tmy: 0.6, hover: 0, thover: 0, time: 0, visible: false, shown: false };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const w = Math.max(1, Math.round(foot.clientWidth * dpr));
      const h = Math.max(1, Math.round(foot.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(foot);

    const io = new IntersectionObserver(([e]) => (state.visible = e.isIntersecting), { rootMargin: '10% 0px' });
    io.observe(foot);

    const onMove = (e: PointerEvent) => {
      const r = foot.getBoundingClientRect();
      state.tmx = (e.clientX - r.left) / r.width;
      state.tmy = (e.clientY - r.top) / r.height;
      state.thover = e.pointerType === 'mouse' && state.tmy >= 0 && state.tmy <= 1 ? 1 : 0;
    };
    const onLeave = () => (state.thover = 0);
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);

    const tick = (_t: number, deltaMs: number) => {
      if (!state.visible) return;
      const dt = Math.min(deltaMs / 1000, 1 / 20);
      state.time += dt;

      // Rise from the moment the footer's top enters until it fills the screen, then eased once more for silk.
      const r = foot.getBoundingClientRect();
      const vh = window.innerHeight;
      const target = Math.min(1, Math.max(0, (vh - r.top) / Math.max(1, Math.min(r.height, vh))));
      state.rise = damp(state.rise, target, motion.reduced ? 60 : 3.2, dt);
      state.mx = damp(state.mx, state.tmx, 2.6, dt);
      state.my = damp(state.my, state.tmy, 2.6, dt);
      state.hover = damp(state.hover, state.thover, 1.8, dt);

      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, state.time);
      gl.uniform1f(uRise, state.rise);
      gl.uniform2f(uMouse, state.mx, state.my);
      gl.uniform1f(uHover, state.hover);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (!state.shown) {
        state.shown = true;
        foot.classList.add('has-gl');
      }
    };
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
      foot.classList.remove('has-gl');
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={ref} className="foot__gl" aria-hidden="true" />;
}
