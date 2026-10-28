/**
 * WebGL engine behind the /case-studies hex dome (HexDome.tsx owns the DOM).
 *
 * Cards sit on a honeycomb (offset-row) lattice in flat "arc space"; the
 * vertex shader wraps that lattice into one period and bends it around the
 * inside of a sphere, so the field drags forever in both directions. The
 * engine owns the canvas, pointer input and the focus animation, and reports
 * what the overlay needs (load progress, active/hovered card, open card)
 * through callbacks.
 */
import gsap from "gsap";
import * as THREE from "three";
import {
  cardFragment,
  domeVertex,
  dustFragment,
  dustVertex,
  labelFragment,
  skyFragment,
  skyVertex,
} from "./hexDomeShaders";

export interface DomeItem {
  media: { type: "image" | "video"; src: string };
  label: string;
  tagline: string;
  /** Short discipline names, rendered as "①Brand, ②Web" under the card. */
  services: string[];
}

export type DomeCursor = "idle" | "view" | "drag";

export interface DomeCallbacks {
  onProgress: (progress: number) => void;
  onReady: () => void;
  /** Index into `items` of the card nearest the focal point. */
  onActive: (index: number) => void;
  onCursor: (state: DomeCursor) => void;
  onDragging: (dragging: boolean) => void;
  /** A card was clicked (or Enter pressed); `index` is into `items`. */
  onOpen: (index: number) => void;
}

export interface DomeHandle {
  /** Ease the open card back into the dome. */
  close: () => void;
  destroy: () => void;
}

const COLS = 12;
const ROWS = 6; // must stay even so the honeycomb offset tiles vertically
const CW = 3.0; // card width, arc units
const MEDIA_W = 1280;
const MEDIA_H = 768;
const CH = CW / (MEDIA_W / MEDIA_H);
const LABEL_GAP = 0.09;
const LABEL_H = 0.34;
const SX = CW + 0.32;
const SY = CH + LABEL_GAP + LABEL_H + 0.42;
const CIRC = COLS * SX;
const R = CIRC / (Math.PI * 2);
const PERIOD = new THREE.Vector2(CIRC, ROWS * SY);
// Pushes the dome's focal point below the headline, as in the Figma frame.
const VIEW_SHIFT = 0.17;
const CIRCLED = ["①", "②", "③", "④", "⑤"];

const wrapDelta = (v: number, period: number) =>
  v - period * Math.floor((v + period / 2) / period);

/**
 * Cover-crops an image onto a fixed-size canvas, so 4K source images don't
 * each cost a 4K texture on the GPU.
 */
function loadImageTexture(src: string, maxAniso: number): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = MEDIA_W;
      c.height = MEDIA_H;
      const g = c.getContext("2d")!;
      const s = Math.max(MEDIA_W / img.naturalWidth, MEDIA_H / img.naturalHeight);
      const w = img.naturalWidth * s;
      const h = img.naturalHeight * s;
      g.drawImage(img, (MEDIA_W - w) / 2, (MEDIA_H - h) / 2, w, h);
      const tex = new THREE.CanvasTexture(c);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = maxAniso;
      tex.userData.aspect = MEDIA_W / MEDIA_H;
      resolve(tex);
    };
    img.onerror = reject;
    img.src = src;
  });
}

function loadVideoTexture(src: string, videos: HTMLVideoElement[]): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    const v = document.createElement("video");
    Object.assign(v, { src, muted: true, loop: true, playsInline: true, autoplay: true, preload: "auto" });
    v.setAttribute("muted", "");
    v.setAttribute("playsinline", "");
    videos.push(v);
    let settled = false;
    const done = () => {
      if (settled) return;
      settled = true;
      const tex = new THREE.VideoTexture(v);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.userData.aspect = v.videoWidth / v.videoHeight || 16 / 9;
      // the real size only lands with metadata; keep the cover-fit honest
      v.addEventListener("loadedmetadata", () => {
        tex.userData.aspect = v.videoWidth / v.videoHeight || tex.userData.aspect;
      });
      resolve(tex);
    };
    ["loadeddata", "canplay", "error"].forEach((ev) => v.addEventListener(ev, done, { once: true }));
    // never let one slow video hold the whole dome back
    setTimeout(done, 1200);
    v.play().catch(() => {});
  });
}

function makeLabel(item: DomeItem, fontFamily: string, maxAniso: number) {
  const W = 1200;
  const H = Math.round((W * LABEL_H) / CW);
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  g.textBaseline = "top";
  g.fillStyle = "#fff";
  g.font = `500 34px ${fontFamily}`;
  g.fillText(item.label, 0, 4);
  g.fillStyle = "rgba(255,255,255,0.65)";
  g.font = `400 26px ${fontFamily}`;
  g.fillText(item.tagline, 0, 50);
  const svc = item.services.map((s, i) => `${CIRCLED[i] ?? ""}${s}`).join(", ");
  g.fillStyle = "rgba(255,255,255,0.85)";
  const w = g.measureText(svc).width;
  g.fillText(svc, W - w - 2, 6);
  g.fillRect(W - w - 2, 36, w, 1.5);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAniso;
  return tex;
}

interface Cell {
  idx: number;
  base: THREE.Vector2;
  hover: { value: number };
  selected: { value: number };
}

export function createHexDome(
  canvas: HTMLCanvasElement,
  items: DomeItem[],
  cb: DomeCallbacks,
): DomeHandle {
  const isTouch = matchMedia("(hover: none)").matches;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let destroyed = false;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 1);
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  camera.rotation.order = "YXZ";
  let baseFov = 50;

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

  /* ---------- backdrop: honeycomb sky + dust ---------- */
  const skyGeo = new THREE.SphereGeometry(60, 64, 32);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: { ...shared },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
  });
  scene.add(new THREE.Mesh(skyGeo, skyMat));

  const DUST = 900;
  const dustPos = new Float32Array(DUST * 3);
  const dustSeed = new Float32Array(DUST);
  for (let k = 0; k < DUST; k++) {
    const r = R * (1.15 + Math.random() * 2.2);
    const th = Math.random() * Math.PI * 2;
    const ph = (Math.random() - 0.5) * 1.6;
    dustPos.set([r * Math.cos(ph) * Math.sin(th), r * Math.sin(ph), -r * Math.cos(ph) * Math.cos(th)], k * 3);
    dustSeed[k] = Math.random();
  }
  const dustGeo = new THREE.BufferGeometry();
  dustGeo.setAttribute("position", new THREE.BufferAttribute(dustPos, 3));
  dustGeo.setAttribute("seed", new THREE.BufferAttribute(dustSeed, 1));
  const dustMat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { ...shared, uDpr: { value: renderer.getPixelRatio() } },
    vertexShader: dustVertex,
    fragmentShader: dustFragment,
  });
  const dust = new THREE.Points(dustGeo, dustMat);
  dust.frustumCulled = false;
  scene.add(dust);

  /* ---------- cards ---------- */
  const cardGeo = new THREE.PlaneGeometry(CW, CH, 32, 18);
  const labelGeo = new THREE.PlaneGeometry(CW, LABEL_H, 32, 2);
  const cells: Cell[] = [];
  const materials: THREE.Material[] = [skyMat, dustMat];
  const textures: THREE.Texture[] = [];
  const videos: HTMLVideoElement[] = [];

  function buildDome(media: THREE.Texture[], labels: THREE.Texture[]) {
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        // stepping 5 per row keeps honeycomb neighbours on different projects
        const idx = (i + j * 5) % items.length;
        const base = new THREE.Vector2(i * SX + ((j + 1) % 2) * SX * 0.5 - CIRC / 2, -(j - ROWS / 2) * SY);
        const hover = { value: 0 };
        const selected = { value: 0 };
        const tex = media[idx];

        const cardMat = new THREE.ShaderMaterial({
          vertexShader: domeVertex,
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
        card.onBeforeRender = () => {
          cardMat.uniforms.uTexAspect.value = tex.userData.aspect;
        };
        scene.add(card);

        const labelMat = new THREE.ShaderMaterial({
          vertexShader: domeVertex,
          fragmentShader: labelFragment,
          transparent: true,
          depthWrite: false,
          uniforms: {
            ...shared,
            uTex: { value: labels[idx] },
            uCenter: { value: new THREE.Vector2(base.x, base.y - CH / 2 - LABEL_GAP - LABEL_H / 2) },
            uAnchor: { value: base },
            uSize: { value: new THREE.Vector2(CW, LABEL_H) },
            uHover: hover,
            uSelected: selected,
          },
        });
        const label = new THREE.Mesh(labelGeo, labelMat);
        label.frustumCulled = false;
        scene.add(label);

        materials.push(cardMat, labelMat);
        cells.push({ idx, base, hover, selected });
      }
    }
  }

  /* ---------- sizing ---------- */
  let vw = 1;
  let vh = 1;
  let viewShift = VIEW_SHIFT;
  const view = { shift: VIEW_SHIFT };
  const fov = { extra: 0 };
  function applyView() {
    camera.setViewOffset(vw, vh, 0, -vh * viewShift, vw, vh);
    camera.updateProjectionMatrix();
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    vw = Math.max(1, rect.width);
    vh = Math.max(1, rect.height);
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;
    // narrow screens see fewer cards; widen the lens a touch
    baseFov = vw < 760 ? 64 : 50;
    applyView();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  /* ---------- interaction ---------- */
  const offset = shared.uOffset.value;
  const target = new THREE.Vector2();
  const prev = new THREE.Vector2();
  const flick = new THREE.Vector2();
  const pointer = { seen: false, nx: 0, ny: 0, down: false, lastX: 0, lastY: 0, moved: 0 };
  let dragging = false;
  let hovered = -1;
  let active = -1;
  let opened = -1;
  let ready = false;
  let snapAt = 0;
  let cursorState: DomeCursor = "idle";

  const worldPerPixel = () => (2 * R * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2)) / vh;

  const cellCenter = (c: Cell) =>
    new THREE.Vector2(wrapDelta(c.base.x + offset.x, PERIOD.x), wrapDelta(c.base.y + offset.y, PERIOD.y));

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(nx: number, ny: number) {
    ndc.set(nx, ny);
    raycaster.setFromCamera(ndc, camera);
    const d = raycaster.ray.direction;
    const px = Math.atan2(d.x, -d.z) * R;
    const py = Math.asin(THREE.MathUtils.clamp(d.y, -1, 1)) * R;
    for (let k = 0; k < cells.length; k++) {
      const c = cellCenter(cells[k]);
      const dx = wrapDelta(px - c.x, PERIOD.x);
      const dy = py - c.y;
      if (Math.abs(dx) < CW / 2 && dy < CH / 2 && dy > -CH / 2 - LABEL_GAP - LABEL_H) return k;
    }
    return -1;
  }

  function nearestToCenter() {
    let best = 0;
    let bd = Infinity;
    for (let k = 0; k < cells.length; k++) {
      const c = cellCenter(cells[k]);
      const d = c.x * c.x + c.y * c.y * 1.4;
      if (d < bd) {
        bd = d;
        best = k;
      }
    }
    return best;
  }

  function snapTo(k: number) {
    const c = cellCenter(cells[k]);
    target.set(offset.x - c.x, offset.y - c.y);
  }

  function toNdc(e: PointerEvent) {
    const rect = canvas.getBoundingClientRect();
    return [((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1];
  }

  function setDragging(d: boolean) {
    if (d === dragging) return;
    dragging = d;
    cb.onDragging(d);
  }

  function open(k: number) {
    if (opened >= 0) return;
    opened = k;
    hovered = -1;
    snapTo(k);
    cells[k].selected.value = 1;
    gsap.killTweensOf([shared.uFocus, fov, view]);
    gsap.to(shared.uFocus, { value: 1, duration: 1.4, ease: "expo.inOut" });
    gsap.to(fov, { extra: -3, duration: 1.4, ease: "expo.inOut" });
    gsap.to(view, { shift: vw < 760 ? -0.2 : -0.04, duration: 1.4, ease: "expo.inOut" });
    cb.onOpen(cells[k].idx);
  }

  function close() {
    if (opened < 0) return;
    const k = opened;
    opened = -1;
    gsap.killTweensOf([shared.uFocus, fov, view]);
    gsap.to(shared.uFocus, {
      value: 0,
      duration: 1.2,
      ease: "expo.inOut",
      delay: 0.15,
      onComplete: () => {
        cells[k].selected.value = 0;
      },
    });
    gsap.to(fov, { extra: 0, duration: 1.2, ease: "expo.inOut", delay: 0.15 });
    gsap.to(view, { shift: VIEW_SHIFT, duration: 1.2, ease: "expo.inOut", delay: 0.15 });
  }

  const onPointerDown = (e: PointerEvent) => {
    if (!ready || opened >= 0 || e.button > 0) return;
    canvas.setPointerCapture(e.pointerId);
    pointer.down = true;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    pointer.moved = 0;
    flick.set(0, 0);
    target.copy(offset); // grab: stop any glide where it is
  };

  const onPointerMove = (e: PointerEvent) => {
    pointer.seen = e.pointerType === "mouse";
    [pointer.nx, pointer.ny] = toNdc(e);
    if (!pointer.down) return;
    const dx = e.clientX - pointer.lastX;
    const dy = e.clientY - pointer.lastY;
    pointer.lastX = e.clientX;
    pointer.lastY = e.clientY;
    pointer.moved += Math.abs(dx) + Math.abs(dy);
    if (pointer.moved > 6) setDragging(true);
    const k = worldPerPixel() * 1.15;
    target.x += dx * k;
    // touch drags are horizontal only; vertical swipes scroll the page (touch-action: pan-y)
    const ky = e.pointerType === "touch" ? 0 : k;
    target.y -= dy * ky;
    flick.set(dx * k, -dy * ky);
  };

  const onPointerUp = (e: PointerEvent) => {
    if (!pointer.down) return;
    pointer.down = false;
    if (dragging) {
      // throw: carry the last pointer velocity forward
      target.addScaledVector(flick, 9);
      snapAt = performance.now() + 380;
    } else if (e.type === "pointerup") {
      const [nx, ny] = toNdc(e);
      const k = pick(nx, ny);
      if (k >= 0) open(k);
    }
    setDragging(false);
  };

  const onPointerLeave = () => {
    pointer.seen = false;
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!ready || opened >= 0) return;
    const step = ({ ArrowLeft: [SX, 0], ArrowRight: [-SX, 0], ArrowUp: [-SX / 2, -SY], ArrowDown: [SX / 2, SY] } as Record<string, number[]>)[e.key];
    if (step) {
      e.preventDefault();
      target.x += step[0];
      target.y += step[1];
      snapAt = performance.now() + 250;
    }
    if (e.key === "Enter" && active >= 0) open(active);
  };

  canvas.addEventListener("pointerdown", onPointerDown);
  canvas.addEventListener("pointermove", onPointerMove);
  canvas.addEventListener("pointerup", onPointerUp);
  canvas.addEventListener("pointercancel", onPointerUp);
  canvas.addEventListener("pointerleave", onPointerLeave);
  canvas.addEventListener("keydown", onKeyDown);

  /* ---------- loop (only while on screen) ---------- */
  const clock = new THREE.Clock();
  const look = new THREE.Vector2();
  const vel = new THREE.Vector2();
  const velSmooth = new THREE.Vector2();
  let raf = 0;
  let visible = false;

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 1 / 20);
    const f = (rate: number) => 1 - Math.pow(1 - rate, dt * 60);
    shared.uTime.value += dt;

    // settle on the nearest card once a throw dies down
    if (!pointer.down && snapAt && performance.now() > snapAt && opened < 0 && target.distanceTo(offset) < 0.6) {
      snapTo(nearestToCenter());
      snapAt = 0;
    }

    prev.copy(offset);
    offset.lerp(target, f(pointer.down ? 0.18 : 0.075));
    vel.subVectors(offset, prev).divideScalar(dt * 60 || 1);
    velSmooth.lerp(vel, f(0.15));
    shared.uVel.value.copy(reduceMotion ? vel.set(0, 0) : velSmooth);
    const stretchTarget = (dragging ? 1 : 0) + Math.min(velSmooth.length() * 0.6, 0.6);
    shared.uStretch.value += ((reduceMotion ? 0 : stretchTarget) - shared.uStretch.value) * f(0.08);

    // the lens breathes with speed; the head follows the pointer slightly
    const speedFov = reduceMotion ? 0 : Math.min(velSmooth.length() * 22, 14) + shared.uStretch.value * 5;
    camera.fov += (baseFov + speedFov + fov.extra - camera.fov) * f(0.08);
    viewShift = view.shift;
    applyView();
    const damp = opened >= 0 ? 0.3 : 1;
    look.x += ((pointer.seen ? -pointer.nx : 0) * 0.035 * damp - look.x) * f(0.05);
    look.y += ((pointer.seen ? pointer.ny : 0) * 0.025 * damp - look.y) * f(0.05);
    camera.rotation.y = look.x;
    camera.rotation.x = look.y;
    dust.rotation.y = (-offset.x / R) * 0.5;
    dust.rotation.x = (offset.y / R) * 0.3;

    if (ready && pointer.seen && opened < 0 && !dragging && !isTouch) hovered = pick(pointer.nx, pointer.ny);
    else hovered = -1;
    for (let k = 0; k < cells.length; k++) {
      const c = cells[k];
      c.hover.value += ((k === hovered ? 1 : 0) - c.hover.value) * f(0.1);
    }

    if (ready && cells.length) {
      const a = nearestToCenter();
      if (a !== active) {
        active = a;
        cb.onActive(cells[a].idx);
      }
    }

    const nextCursor: DomeCursor = opened >= 0 || !pointer.seen ? "idle" : dragging ? "drag" : hovered >= 0 ? "view" : "idle";
    if (nextCursor !== cursorState) {
      cursorState = nextCursor;
      cb.onCursor(nextCursor);
    }

    renderer.render(scene, camera);
  }

  function setRunning(run: boolean) {
    if (run === visible || destroyed) return;
    visible = run;
    if (run) {
      clock.getDelta(); // don't count the time spent off screen
      raf = requestAnimationFrame(frame);
      videos.forEach((v) => v.play().catch(() => {}));
    } else {
      cancelAnimationFrame(raf);
      videos.forEach((v) => v.pause());
    }
  }
  const io = new IntersectionObserver(([entry]) => setRunning(entry.isIntersecting));
  io.observe(canvas);

  /* ---------- boot ---------- */
  (async () => {
    const fontFamily = getComputedStyle(canvas).fontFamily || "sans-serif";
    await document.fonts.ready;
    let loaded = 0;
    const media = await Promise.all(
      items.map(async (item) => {
        const tex =
          item.media.type === "video"
            ? await loadVideoTexture(item.media.src, videos)
            : await loadImageTexture(item.media.src, maxAniso).catch(() => new THREE.Texture());
        cb.onProgress(++loaded / items.length);
        return tex;
      }),
    );
    if (destroyed) {
      media.forEach((t) => t.dispose());
      return;
    }
    const labels = items.map((item) => makeLabel(item, fontFamily, maxAniso));
    textures.push(...media, ...labels);
    buildDome(media, labels);
    renderer.compile(scene, camera);

    // start mid-spin so the dome swings into place
    offset.set(reduceMotion ? 0 : -CIRC * 0.42, reduceMotion ? 0 : SY * 0.5);
    target.set(0, 0);
    gsap.to(shared.uIntro, { value: 1, duration: reduceMotion ? 0.6 : 3.2, ease: "power2.out", delay: 0.2 });
    gsap.delayedCall(reduceMotion ? 0.3 : 1.2, () => {
      ready = true;
    });
    cb.onReady();
  })();

  return {
    close,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerUp);
      canvas.removeEventListener("pointercancel", onPointerUp);
      canvas.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("keydown", onKeyDown);
      gsap.killTweensOf([shared.uIntro, shared.uFocus, fov, view]);
      videos.forEach((v) => {
        v.pause();
        v.removeAttribute("src");
        v.load();
      });
      textures.forEach((t) => t.dispose());
      materials.forEach((m) => m.dispose());
      [cardGeo, labelGeo, skyGeo, dustGeo].forEach((g) => g.dispose());
      renderer.dispose();
    },
  };
}
