import * as THREE from "three";
import { projects } from "./data.js";

const gsap = window.gsap;
const isTouch = matchMedia("(hover: none)").matches;
if (isTouch) document.body.classList.add("is-touch");

/* ------------------------------------------------------------------ *
 * Dome layout
 * Cards sit on a honeycomb (offset-row) lattice in flat "arc space".
 * The vertex shader wraps every card's lattice position into one
 * period, then wraps that flat plane around the inside of a sphere,
 * so the field scrolls forever in both directions.
 * ------------------------------------------------------------------ */
const COLS = 12;
const ROWS = 6; // must be even so the hex offset tiles vertically
const CW = 3.0; // card width (arc units)
const CH = CW / (1280 / 768); // card height, matches media aspect
const LABEL_GAP = 0.09;
const LABEL_H = 0.34;
const SX = CW + 0.32;
const SY = CH + LABEL_GAP + LABEL_H + 0.42;
const CIRC = COLS * SX;
const R = CIRC / (Math.PI * 2);
const PERIOD = new THREE.Vector2(CIRC, ROWS * SY);
const BASE_FOV = 50;
const VIEW_SHIFT = 0.17; // pushes the dome's focal point below the headline, like the Figma frame

/* ---------- renderer ---------- */
const canvas = document.getElementById("gl");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setClearColor(0x000000, 1);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 200);
camera.rotation.order = "YXZ";

/* ---------- shared uniforms ---------- */
const shared = {
  uOffset: { value: new THREE.Vector2() },
  uVel: { value: new THREE.Vector2() },
  uPeriod: { value: PERIOD },
  uR: { value: R },
  uIntro: { value: 0 },
  uStretch: { value: 0 },
  uFocus: { value: 0 },
  uTime: { value: 0 },
};

const vertexShader = /* glsl */ `
  uniform vec2 uCenter;
  uniform vec2 uSize;
  uniform vec2 uOffset;
  uniform vec2 uVel;
  uniform vec2 uPeriod;
  uniform float uR;
  uniform float uIntro;
  uniform float uStretch;
  uniform float uFocus;
  uniform float uHover;
  uniform float uSelected;
  uniform vec2 uAnchor;   // label: card center it belongs to

  varying vec2 vUv;
  varying float vFade;
  varying float vView;
  varying float vIntro;
  varying float vCard;

  vec2 wrapC(vec2 c) { return c - uPeriod * floor((c + uPeriod * 0.5) / uPeriod); }

  void main() {
    vUv = uv;
    // wrap on the parent card so a label never detaches from its card
    vec2 anchor = wrapC(uAnchor + uOffset);
    vec2 c = anchor + (uCenter - uAnchor);

    // intro: cards fly in from deep space, staggered outward from the focal point
    float d = length(anchor);
    float t = clamp(uIntro * 1.9 - d / 14.0, 0.0, 1.0);
    t = 1.0 - pow(1.0 - t, 4.0);
    vIntro = t;

    float sel = uSelected * uFocus;
    float scale = 1.0 + uHover * 0.035 + sel * 0.12;
    // selected card scales about its own center (labels follow it)
    vec2 local = position.xy * scale + (c - anchor) * (scale - 1.0);
    vec2 p = c + local;

    float th = p.x / uR;
    float ph = p.y / uR;

    // drag tension: card edges bow outward and the whole field breathes
    float lx = position.x / (uSize.x * 0.5);
    float r = uR;
    r += uStretch * (0.5 + 0.35 * lx * lx);
    r += length(uVel) * 1.6 * (1.0 - lx * lx * 0.4);
    r -= uHover * 0.18;
    r -= sel * 0.6;
    r += uFocus * (1.0 - uSelected) * 2.4;
    r = mix(uR * 3.2, r, t);
    th += (1.0 - t) * 0.9 * sign(anchor.x + 0.001);

    vec3 pos = vec3(r * cos(ph) * sin(th), r * sin(ph), -r * cos(ph) * cos(th));

    float edge = abs(anchor.y) / (uPeriod.y * 0.5);
    vFade = 1.0 - smoothstep(0.62, 0.92, edge);
    vView = -normalize(pos).z;
    // how squarely this card faces the viewer (per card, not per pixel)
    vCard = cos(anchor.x / uR) * cos(anchor.y / uR);

    gl_Position = projectionMatrix * viewMatrix * vec4(pos, 1.0);
  }
`;

const cardFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform vec2 uSize;
  uniform vec2 uVel;
  uniform float uHover;
  uniform float uSelected;
  uniform float uFocus;
  uniform float uTime;
  uniform float uStretch;
  uniform float uTexAspect;

  varying vec2 vUv;
  varying float vFade;
  varying float vView;
  varying float vIntro;
  varying float vCard;

  float sdRound(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    // cover-fit the media
    float planeAspect = uSize.x / uSize.y;
    vec2 uv = vUv - 0.5;
    if (uTexAspect > planeAspect) uv.x *= planeAspect / uTexAspect;
    else uv.y *= uTexAspect / planeAspect;
    // inner zoom: settles in on hover, pushes out while dragging
    uv *= 1.0 - uHover * 0.07 + uStretch * 0.05 - uSelected * uFocus * 0.04;
    uv += 0.5;

    // chromatic split along the drag direction
    float speed = length(uVel);
    vec2 dir = speed > 0.0001 ? uVel / speed : vec2(1.0, 0.0);
    float shift = clamp(speed * 0.06, 0.0, 0.03) + (1.0 - vIntro) * 0.04;
    dir.y = -dir.y;
    vec3 col;
    col.r = texture2D(uTex, uv + dir * shift).r;
    col.g = texture2D(uTex, uv).g;
    col.b = texture2D(uTex, uv - dir * shift).b;

    // glitch slices while flying fast
    float slice = step(0.985 - speed * 0.06, hash(vec2(floor(vUv.y * 26.0), floor(uTime * 18.0))));
    col = mix(col, texture2D(uTex, uv + vec2(0.04 * slice * sign(uVel.x + 0.0001), 0.0)).rgb, slice * min(speed * 6.0, 1.0));

    // light falloff: the card you face is lit, the dome falls into shadow
    float lit = smoothstep(0.86, 0.995, vCard);
    float bright = mix(0.1, 1.0, lit * lit) * mix(0.7, 1.0, smoothstep(0.75, 1.0, vView));
    bright = max(bright, uHover * 0.95);
    bright = mix(bright, uSelected > 0.5 ? 1.0 : bright * 0.25, uFocus);
    col *= bright;

    // subtle sheen sweeping across on hover
    float sheen = smoothstep(0.0, 0.25, 0.25 - abs(vUv.x + vUv.y * 0.35 - (uHover * 1.6 - 0.2)));
    col += sheen * 0.08 * uHover;

    // film grain
    col += (hash(vUv * 900.0 + uTime) - 0.5) * 0.05;

    // rounded corners + hairline border
    vec2 px = (vUv - 0.5) * uSize;
    float dist = sdRound(px, uSize * 0.5, 0.045);
    float aa = fwidth(dist);
    float mask = 1.0 - smoothstep(-aa, aa, dist);
    float border = 1.0 - smoothstep(0.0, aa * 1.5, abs(dist + 0.004));
    col = mix(col, vec3(1.0), border * (0.08 + uHover * 0.5) * lit);

    gl_FragColor = vec4(col, mask * vFade * smoothstep(0.0, 0.35, vIntro));
  }
`;

const labelFragment = /* glsl */ `
  uniform sampler2D uTex;
  uniform float uHover;
  uniform float uSelected;
  uniform float uFocus;
  varying vec2 vUv;
  varying float vFade;
  varying float vView;
  varying float vIntro;
  varying float vCard;
  void main() {
    vec4 t = texture2D(uTex, vUv);
    float lit = mix(0.16, 1.0, smoothstep(0.86, 0.995, vCard));
    lit = max(lit, uHover);
    float a = t.a * lit * vFade * smoothstep(0.6, 1.0, vIntro);
    a *= 1.0 - uFocus; // the detail panel takes over
    gl_FragColor = vec4(t.rgb, a);
  }
`;

/* ---------- assets ---------- */
const loaderBar = document.getElementById("loaderBar");
const loaderPct = document.getElementById("loaderPct");
let loaded = 0;
const total = projects.length;
const progress = { v: 0 };
function bump() {
  loaded++;
  gsap.to(progress, {
    v: loaded / total,
    duration: 0.6,
    ease: "power2.out",
    onUpdate: () => {
      loaderBar.style.transform = `scaleX(${progress.v})`;
      loaderPct.textContent = String(Math.round(progress.v * 100)).padStart(3, "0");
    },
  });
}

const texLoader = new THREE.TextureLoader();
function loadMedia(p) {
  return new Promise((resolve) => {
    if (p.media.type === "video") {
      const v = document.createElement("video");
      Object.assign(v, { src: p.media.src, muted: true, loop: true, playsInline: true, autoplay: true, crossOrigin: "anonymous", preload: "auto" });
      v.setAttribute("muted", "");
      v.setAttribute("playsinline", "");
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        const tex = new THREE.VideoTexture(v);
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.userData.aspect = v.videoWidth / v.videoHeight || 16 / 9;
        bump();
        resolve(tex);
      };
      ["loadeddata", "canplay", "error"].forEach((ev) => v.addEventListener(ev, done, { once: true }));
      if (v.readyState >= 2) done();
      setTimeout(done, 1200); // never let one slow video hold the whole page
      v.play().catch(() => {});
    } else {
      texLoader.load(p.media.src, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
        tex.userData.aspect = tex.image.width / tex.image.height;
        bump();
        resolve(tex);
      });
    }
  });
}

const CIRCLED = ["①", "②", "③", "④", "⑤"];
function makeLabel(p) {
  const W = 1200;
  const H = Math.round((W * LABEL_H) / CW);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d");
  g.fillStyle = "#fff";
  g.textBaseline = "top";
  g.font = `500 34px "Inter Display"`;
  g.fillText(p.name, 0, 4);
  g.fillStyle = "rgba(255,255,255,0.62)";
  g.font = `400 26px "Inter Display"`;
  g.fillText(p.tagline, 0, 50);
  const svc = p.services.map((s, i) => `${CIRCLED[i]}${s}`).join(", ");
  g.fillStyle = "rgba(255,255,255,0.85)";
  g.font = `400 26px "Inter Display"`;
  const w = g.measureText(svc).width;
  g.fillText(svc, W - w - 2, 6);
  g.fillRect(W - w - 2, 36, w, 1.5);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return tex;
}

/* ---------- build the dome ---------- */
const cardGeo = new THREE.PlaneGeometry(CW, CH, 32, 18);
const labelGeo = new THREE.PlaneGeometry(CW, LABEL_H, 32, 2);
const items = [];

function buildDome(textures, labels) {
  for (let j = 0; j < ROWS; j++) {
    for (let i = 0; i < COLS; i++) {
      const idx = (i + j * 5) % projects.length;
      const x = i * SX + ((j + 1) % 2) * SX * 0.5 - CIRC / 2;
      const y = -(j - ROWS / 2) * SY;
      const base = new THREE.Vector2(x, y);
      const hover = { value: 0 };
      const selected = { value: 0 };
      const tex = textures[idx];

      const cardMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: cardFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          ...shared,
          uTex: { value: tex },
          uTexAspect: { value: tex.userData.aspect },
          uCenter: { value: base },
          uAnchor: { value: base },
          uSize: { value: new THREE.Vector2(CW, CH) },
          uHover: hover,
          uSelected: selected,
        },
      });
      const card = new THREE.Mesh(cardGeo, cardMat);
      card.frustumCulled = false;
      scene.add(card);

      const labelMat = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: labelFragment,
        transparent: true,
        depthWrite: false,
        uniforms: {
          ...shared,
          uTex: { value: labels[idx] },
          uCenter: { value: new THREE.Vector2(x, y - CH / 2 - LABEL_GAP - LABEL_H / 2) },
          uAnchor: { value: base },
          uSize: { value: new THREE.Vector2(CW, LABEL_H) },
          uHover: hover,
          uSelected: selected,
        },
      });
      const label = new THREE.Mesh(labelGeo, labelMat);
      label.frustumCulled = false;
      scene.add(label);

      items.push({ idx, base, hover, selected, hoverTarget: 0 });
    }
  }
}

/* ---------- backdrop: hex lattice sky + dust ---------- */
const sky = new THREE.Mesh(
  new THREE.SphereGeometry(60, 64, 32),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...shared, uMouse: { value: new THREE.Vector2() } },
    vertexShader: /* glsl */ `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec2 uOffset;
      uniform vec2 uVel;
      uniform float uR;
      uniform float uTime;
      uniform float uIntro;
      uniform float uStretch;
      varying vec3 vDir;
      const float PI = 3.14159265;
      float hexDist(vec2 p) { p = abs(p); return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x); }
      vec4 hexCoords(vec2 uv) {
        vec2 r = vec2(1.0, 1.7320508);
        vec2 h = r * 0.5;
        vec2 a = mod(uv, r) - h;
        vec2 b = mod(uv - h, r) - h;
        vec2 gv = dot(a, a) < dot(b, b) ? a : b;
        return vec4(gv, uv - gv);
      }
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float th = atan(vDir.x, -vDir.z);
        float ph = asin(clamp(vDir.y, -1.0, 1.0));
        // parallax: the sky turns slower than the cards
        vec2 uv = vec2(th, ph) * (40.0 / (2.0 * PI));
        uv += uOffset / uR * (40.0 / (2.0 * PI)) * 0.35;
        vec4 h = hexCoords(uv);
        float e = 0.5 - hexDist(h.xy);
        float line = 1.0 - smoothstep(0.0, fwidth(e) * 1.4, e);
        float cell = hash(h.zw);
        float twinkle = step(0.93, cell) * (0.5 + 0.5 * sin(uTime * 1.5 + cell * 40.0));
        float horizon = 1.0 - smoothstep(0.0, 1.1, abs(ph));
        float front = smoothstep(-0.2, 1.0, -vDir.z);
        float a = line * (0.05 + uStretch * 0.06) * horizon * (0.4 + 0.6 * front);
        a += twinkle * 0.035 * horizon * (1.0 - smoothstep(0.0, 0.48, hexDist(h.xy)));
        gl_FragColor = vec4(vec3(a * uIntro), 1.0);
      }
    `,
  })
);
scene.add(sky);

const dust = (() => {
  const n = 900;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  for (let k = 0; k < n; k++) {
    const r = R * (1.15 + Math.random() * 2.2);
    const th = Math.random() * Math.PI * 2;
    const ph = (Math.random() - 0.5) * 1.6;
    pos.set([r * Math.cos(ph) * Math.sin(th), r * Math.sin(ph), -r * Math.cos(ph) * Math.cos(th)], k * 3);
    seed[k] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("seed", new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...shared, uDpr: { value: renderer.getPixelRatio() } },
    vertexShader: /* glsl */ `
      attribute float seed;
      uniform float uTime;
      uniform float uDpr;
      varying float vA;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = (1.0 + seed * 2.2) * uDpr * (14.0 / -mv.z);
        vA = (0.25 + 0.75 * seed) * (0.5 + 0.5 * sin(uTime * (0.6 + seed) + seed * 30.0));
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uIntro;
      varying float vA;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        gl_FragColor = vec4(vec3(1.0), smoothstep(0.5, 0.0, d) * vA * 0.5 * uIntro);
      }
    `,
  });
  const pts = new THREE.Points(geo, mat);
  pts.frustumCulled = false;
  pts.renderOrder = -1;
  scene.add(pts);
  return pts;
})();

/* ---------- sizing ---------- */
let vw = innerWidth;
let vh = innerHeight;
function resize() {
  vw = innerWidth;
  vh = innerHeight;
  renderer.setSize(vw, vh, false);
  camera.aspect = vw / vh;
  // narrower screens see fewer cards; widen the lens a touch
  camera.userData.baseFov = vw < 760 ? 64 : BASE_FOV;
  updateView(0);
}
let viewShift = VIEW_SHIFT;
function updateView() {
  camera.setViewOffset(vw, vh, 0, -vh * viewShift, vw, vh);
  camera.updateProjectionMatrix();
}
addEventListener("resize", resize);
resize();

/* ---------- interaction state ---------- */
const offset = shared.uOffset.value;
const target = new THREE.Vector2();
const prev = new THREE.Vector2();
const pointer = { seen: false, x: innerWidth / 2, y: innerHeight / 2, nx: 0, ny: 0, down: false, startX: 0, startY: 0, lastX: 0, lastY: 0, moved: 0 };
const flick = new THREE.Vector2();
let dragging = false;
let hovered = -1;
let active = -1;
let opened = -1;
let ready = false;
let snapAt = 0;
let wheelTimer = 0;

function worldPerPixel() {
  return (2 * R * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / vh;
}

function wrapDelta(v, period) {
  return v - period * Math.floor((v + period / 2) / period);
}

function cardScreenCenter(item) {
  return new THREE.Vector2(wrapDelta(item.base.x + offset.x, PERIOD.x), wrapDelta(item.base.y + offset.y, PERIOD.y));
}

const raycaster = new THREE.Raycaster();
function pick(nx, ny) {
  raycaster.setFromCamera({ x: nx, y: ny }, camera);
  const d = raycaster.ray.direction;
  const p = new THREE.Vector2(Math.atan2(d.x, -d.z) * R, Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) * R);
  for (let k = 0; k < items.length; k++) {
    const c = cardScreenCenter(items[k]);
    const dx = wrapDelta(p.x - c.x, PERIOD.x);
    const dy = p.y - c.y;
    if (Math.abs(dx) < CW / 2 && dy < CH / 2 && dy > -CH / 2 - LABEL_GAP - LABEL_H) return k;
  }
  return -1;
}

function nearestToCenter() {
  let best = -1;
  let bd = Infinity;
  for (let k = 0; k < items.length; k++) {
    const c = cardScreenCenter(items[k]);
    const d = c.x * c.x + c.y * c.y * 1.4;
    if (d < bd) {
      bd = d;
      best = k;
    }
  }
  return best;
}

function snapTo(k) {
  const c = cardScreenCenter(items[k]);
  target.set(offset.x - c.x, offset.y - c.y);
}

/* ---------- pointer ---------- */
canvas.addEventListener("pointerdown", (e) => {
  if (!ready || opened >= 0) return;
  canvas.setPointerCapture(e.pointerId);
  pointer.down = true;
  pointer.startX = pointer.lastX = e.clientX;
  pointer.startY = pointer.lastY = e.clientY;
  pointer.moved = 0;
  flick.set(0, 0);
  target.copy(offset); // grab: stop any glide where it is
});

addEventListener("pointermove", (e) => {
  pointer.seen = true;
  pointer.x = e.clientX;
  pointer.y = e.clientY;
  pointer.nx = (e.clientX / vw) * 2 - 1;
  pointer.ny = -(e.clientY / vh) * 2 + 1;
  if (!pointer.down) return;
  const dx = e.clientX - pointer.lastX;
  const dy = e.clientY - pointer.lastY;
  pointer.lastX = e.clientX;
  pointer.lastY = e.clientY;
  pointer.moved += Math.abs(dx) + Math.abs(dy);
  if (pointer.moved > 6 && !dragging) {
    dragging = true;
    document.body.classList.add("is-dragging");
  }
  const k = worldPerPixel() * 1.15;
  target.x += dx * k;
  target.y -= dy * k;
  flick.set(dx * k, -dy * k);
});

function release(e) {
  if (!pointer.down) return;
  pointer.down = false;
  if (dragging) {
    // throw: carry the last pointer velocity forward
    target.addScaledVector(flick, 9);
    snapAt = performance.now() + 380;
  } else if (e && e.type === "pointerup") {
    const k = pick((e.clientX / vw) * 2 - 1, -(e.clientY / vh) * 2 + 1);
    if (k >= 0) openProject(k);
  }
  dragging = false;
  document.body.classList.remove("is-dragging");
}
addEventListener("pointerup", release);
addEventListener("pointercancel", release);

addEventListener(
  "wheel",
  (e) => {
    if (!ready || opened >= 0) return;
    e.preventDefault();
    const k = worldPerPixel() * 0.9;
    // vertical wheel rolls the dome sideways (trackpads add the second axis)
    target.x -= (e.deltaY + e.deltaX) * k * 0.6;
    target.y += e.shiftKey ? e.deltaY * k * 0.6 : 0;
    document.body.classList.add("is-dragging");
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      document.body.classList.remove("is-dragging");
      snapAt = performance.now();
    }, 160);
  },
  { passive: false }
);

addEventListener("keydown", (e) => {
  if (!ready) return;
  if (e.key === "Escape" && opened >= 0) return closeProject();
  if (opened >= 0) return;
  const step = { ArrowLeft: [SX, 0], ArrowRight: [-SX, 0], ArrowUp: [-SX / 2, -SY], ArrowDown: [SX / 2, SY] }[e.key];
  if (step) {
    target.x += step[0];
    target.y += step[1];
    snapAt = performance.now() + 250;
  }
  if (e.key === "Enter" && active >= 0) openProject(active);
});

/* ---------- HUD ---------- */
const ticks = document.getElementById("ticks");
projects.forEach(() => ticks.appendChild(document.createElement("i")));
document.getElementById("hudTotal").textContent = String(projects.length).padStart(2, "0");
const hudIndex = document.getElementById("hudIndex");
const hudName = document.getElementById("hudName");

function setActive(k) {
  if (k === active) return;
  active = k;
  const idx = items[k].idx;
  hudIndex.textContent = String(idx + 1).padStart(2, "0");
  [...ticks.children].forEach((t, i) => t.classList.toggle("on", i === idx));
  scramble(hudName, projects[idx].name);
}

const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#%&/";
function scramble(el, text) {
  const start = performance.now();
  const dur = 420;
  cancelAnimationFrame(el._raf);
  const tick = (now) => {
    const t = Math.min((now - start) / dur, 1);
    const reveal = Math.floor(t * text.length);
    let out = text.slice(0, reveal);
    for (let i = reveal; i < text.length; i++) out += text[i] === " " ? " " : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    el.textContent = out;
    if (t < 1) el._raf = requestAnimationFrame(tick);
  };
  el._raf = requestAnimationFrame(tick);
}

/* ---------- cursor ---------- */
const cursor = document.getElementById("cursor");
const cursorLabel = document.getElementById("cursorLabel");
const cur = { x: innerWidth / 2, y: innerHeight / 2, s: 0.14 };
let cursorText = "";
function updateCursor() {
  let s = 0.14;
  let text = "";
  if (opened >= 0) {
    s = 0.14;
  } else if (dragging) {
    s = 0.62;
    text = "Drag";
  } else if (hovered >= 0) {
    s = 1;
    text = "View";
  }
  cur.x += (pointer.x - cur.x) * 0.2;
  cur.y += (pointer.y - cur.y) * 0.2;
  cur.s += (s - cur.s) * 0.16;
  cursor.style.transform = `translate3d(${cur.x}px, ${cur.y}px, 0) scale(${cur.s})`;
  cursor.style.mixBlendMode = text ? "normal" : "difference";
  if (text !== cursorText) {
    cursorText = text;
    if (text) cursorLabel.textContent = text;
    cursorLabel.style.opacity = text ? 1 : 0;
  }
}

/* ---------- detail ---------- */
const $ = (id) => document.getElementById(id);
const fov = { extra: 0 };
const view = { shift: VIEW_SHIFT };

function splitWords(el, text) {
  el.innerHTML = text
    .split(" ")
    .map((w) => `<span class="w"><span>${w}</span></span>`)
    .join(" ");
  return el.querySelectorAll(".w > span");
}

function openProject(k) {
  if (opened >= 0) return;
  opened = k;
  hovered = -1;
  const p = projects[items[k].idx];
  snapTo(k);
  items[k].selected.value = 1;
  document.body.classList.add("is-open");
  $("detail").setAttribute("aria-hidden", "false");

  $("dIndex").textContent = String(items[k].idx + 1).padStart(2, "0");
  $("dName").textContent = p.name;
  $("dBadge").textContent = p.badge || "";
  $("dNiche").textContent = p.niche;
  $("dWork").textContent = p.whatWeDid;
  $("dYear").textContent = p.year;
  $("dStat").textContent = p.stat || "";
  $("dStatWrap").classList.toggle("is-empty", !p.stat);
  $("dLink").href = p.href;
  $("dLink").querySelector(".detail__cta-text").textContent = p.external ? "Visit live site" : "View case study";
  const words = splitWords($("dTitle"), p.headline);

  gsap.killTweensOf([shared.uFocus, fov, view]);
  gsap.to(shared.uFocus, { value: 1, duration: 1.4, ease: "expo.inOut" });
  gsap.to(fov, { extra: -3, duration: 1.4, ease: "expo.inOut" });
  gsap.to(view, { shift: innerWidth < 760 ? 0.1 : -0.04, duration: 1.4, ease: "expo.inOut" });
  gsap.fromTo(words, { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.025, ease: "expo.out", delay: 0.55 });
  gsap.fromTo(
    ".detail__eyebrow, .detail__meta > div, .detail__cta",
    { y: 30, opacity: 0 },
    { y: 0, opacity: 1, duration: 1, stagger: 0.06, ease: "expo.out", delay: 0.7 }
  );
}

function closeProject() {
  if (opened < 0) return;
  const k = opened;
  document.body.classList.remove("is-open");
  $("detail").setAttribute("aria-hidden", "true");
  gsap.to(".detail__title .w > span", { yPercent: -110, duration: 0.5, stagger: 0.01, ease: "power3.in" });
  gsap.to(".detail__eyebrow, .detail__meta > div, .detail__cta", { y: -20, opacity: 0, duration: 0.4, ease: "power3.in" });
  gsap.killTweensOf([shared.uFocus, fov, view]);
  gsap.to(shared.uFocus, {
    value: 0,
    duration: 1.2,
    ease: "expo.inOut",
    delay: 0.15,
    onComplete: () => {
      items[k].selected.value = 0;
    },
  });
  gsap.to(fov, { extra: 0, duration: 1.2, ease: "expo.inOut", delay: 0.15 });
  gsap.to(view, { shift: VIEW_SHIFT, duration: 1.2, ease: "expo.inOut", delay: 0.15 });
  opened = -1;
}
$("close").addEventListener("click", closeProject);
$("detail").addEventListener("click", (e) => {
  if (e.target === $("detail")) closeProject();
});

/* ---------- loop ---------- */
const clock = new THREE.Clock();
const look = new THREE.Vector2();
const velSmooth = new THREE.Vector2();

function frame() {
  const dt = Math.min(clock.getDelta(), 1 / 20);
  const f = (rate) => 1 - Math.pow(1 - rate, dt * 60);
  shared.uTime.value += dt;

  // settle on the nearest card once a throw dies down
  if (!pointer.down && snapAt && performance.now() > snapAt && opened < 0) {
    const rest = target.distanceTo(offset);
    if (rest < 0.6) {
      snapTo(nearestToCenter());
      snapAt = 0;
    }
  }

  prev.copy(offset);
  offset.lerp(target, f(pointer.down ? 0.18 : 0.075));
  const vel = new THREE.Vector2().subVectors(offset, prev).divideScalar(dt * 60 || 1);
  velSmooth.lerp(vel, f(0.15));
  shared.uVel.value.copy(velSmooth);
  shared.uStretch.value += ((dragging ? 1 : 0) + Math.min(velSmooth.length() * 0.6, 0.6) - shared.uStretch.value) * f(0.08);

  // camera: lens breathes with speed, head follows the pointer slightly
  const speedFov = Math.min(velSmooth.length() * 22, 14) + shared.uStretch.value * 5;
  const targetFov = camera.userData.baseFov + speedFov + fov.extra;
  camera.fov += (targetFov - camera.fov) * f(0.08);
  viewShift = view.shift;
  updateView();
  look.x += (-pointer.nx * 0.035 * (opened >= 0 ? 0.3 : 1) - look.x) * f(0.05);
  look.y += (pointer.ny * 0.025 * (opened >= 0 ? 0.3 : 1) - look.y) * f(0.05);
  camera.rotation.y = look.x;
  camera.rotation.x = look.y;
  dust.rotation.y = -offset.x / R * 0.5;
  dust.rotation.x = offset.y / R * 0.3;

  // hover
  if (ready && pointer.seen && opened < 0 && !dragging && !isTouch) hovered = pick(pointer.nx, pointer.ny);
  else if (dragging) hovered = -1;
  for (let k = 0; k < items.length; k++) {
    const it = items[k];
    it.hover.value += ((k === hovered ? 1 : 0) - it.hover.value) * f(0.1);
  }
  if (ready) setActive(nearestToCenter());

  if (!isTouch) updateCursor();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

/* ---------- boot ---------- */
async function boot() {
  await Promise.all([document.fonts.load(`500 34px "Inter Display"`), document.fonts.load(`400 26px "Inter Display"`)]);
  const textures = await Promise.all(projects.map(loadMedia));
  const labels = projects.map(makeLabel);
  buildDome(textures, labels);
  renderer.compile(scene, camera);
  requestAnimationFrame(frame);

  // start mid-spin so the dome swings into place
  offset.set(-CIRC * 0.42, SY * 0.5);
  target.set(0, 0);

  const tl = gsap.timeline({ delay: 0.5 });
  tl.to("#loader", { opacity: 0, duration: 0.8, ease: "power2.inOut", onComplete: () => ($("loader").style.display = "none") })
    .to(shared.uIntro, { value: 1, duration: 3.2, ease: "power2.out" }, 0.3)
    .from(".hero .line", { yPercent: 110, duration: 1.4, stagger: 0.07, ease: "expo.out" }, 0.9)
    .from(".nav, .hud", { opacity: 0, y: (i) => (i ? 20 : -20), duration: 1.2, ease: "expo.out" }, 1.6)
    .add(() => {
      ready = true;
    }, 1.4);
}
boot();
