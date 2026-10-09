import * as THREE from 'three';
import type { Exploration } from '@/content/explorations';

// A boundless field of exploration tiles laid out on a seeded grid, wrapped so the
// scroll/drag never hits an edge. The camera flies over it with gentle perspective
// and the previous frame is held back a touch each render to leave a motion trail.

const CELL_W = 4.4;
const CELL_H = 3.0;
const COLS = 4; // the grid repeats every COLS * CELL_W world units
const ROWS = 4; // and every ROWS * CELL_H units; 4×4 fits 16 tiles exactly
const PANEL_MAX_W = 3.0;
const PANEL_MAX_H = 1.9;
const CAM_Z = 6.5;
const DAMP = 0.1; // position easing
const SMEAR_ALPHA = 0.3; // trail passes through this much of the bg each frame; low = long trail
const DRIFT_ALPHA = 0.92; // nearly clean — just a hint of persistence
const AUTOPAN = new THREE.Vector2(0.08, -0.04); // slow idle drift so the stage breathes

type Opts = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  items: Exploration[];
  videos: HTMLVideoElement[];
  onActive: (index: number | null) => void;
  onReady: () => void;
};

type Tile = {
  index: number;
  slug: string;
  group: THREE.Group;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
  home: THREE.Vector2; // base position in the grid (one tile per slot)
  w: number;
  h: number;
  depth: number; // z offset in world units
  tilt: number;
};

type Effect = 'Drift' | 'Smear';

/** Mulberry32 — tiny, deterministic PRNG. We want the layout to be stable between renders. */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class ExplorationsScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private tiles: Tile[] = [];
  private items: Exploration[];
  private videos: HTMLVideoElement[];
  private videoTextures = new Map<string, THREE.VideoTexture>();
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private onActive: Opts['onActive'];
  private onReady: Opts['onReady'];
  private pos = new THREE.Vector2(0, 0);
  private target = new THREE.Vector2(0, 0);
  private vel = new THREE.Vector2(0, 0);
  private pointer = new THREE.Vector2(0, 0);
  private pointerFocus = new THREE.Vector2(0, 0);
  private hoverIndex: number | null = null;
  private pointerActive = false;
  private isPointerDown = false;
  private dragStart = new THREE.Vector2(0, 0);
  private dragTarget = new THREE.Vector2(0, 0);
  private dragged = false;
  private raycaster = new THREE.Raycaster();
  private effect: Effect = 'Drift';
  private rafId = 0;
  private disposed = false;
  private last = performance.now();
  private ro: ResizeObserver;
  private listeners: Array<() => void> = [];
  private readonly fieldW: number;
  private readonly fieldH: number;

  constructor({ root, canvas, items, videos, onActive, onReady }: Opts) {
    this.root = root;
    this.canvas = canvas;
    this.items = items;
    this.videos = videos;
    this.onActive = onActive;
    this.onReady = onReady;

    this.fieldW = COLS * CELL_W;
    this.fieldH = ROWS * CELL_H;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // required for the motion-trail — we blend the previous frame
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.setClearColor(0x0a0a0a, DRIFT_ALPHA);
    this.renderer.autoClear = false;

    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 200);
    this.camera.position.set(0, 0, CAM_Z);

    const ambient = new THREE.AmbientLight(0xffffff, 1);
    this.scene.add(ambient);

    this.buildTiles();

    // Clear the trail buffer once we have content so the first frame isn't a smear.
    const flush = () => this.renderer.clear(true, true, true);
    flush();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(root);
    this.resize();

    this.wire();

    this.rafId = requestAnimationFrame(this.frame);
    this.videos.forEach((v) => void v.play().catch(() => {}));
    requestAnimationFrame(() => this.onReady());
  }

  setEffect(e: Effect) {
    this.effect = e;
    // Flush the trail buffer so switching modes doesn't carry stale pixels.
    this.renderer.setClearColor(0x0a0a0a, 1);
    this.renderer.clear(true, true, true);
    this.renderer.setClearColor(0x0a0a0a, e === 'Smear' ? SMEAR_ALPHA : DRIFT_ALPHA);
  }

  private buildTiles() {
    const loader = new THREE.TextureLoader();
    const r = rng(1337);

    this.items.forEach((it, i) => {
      // Seeded cell within a wrapping COLS×ROWS grid.
      const col = i % COLS;
      const row = Math.floor(i / COLS) % ROWS;
      // Random jitter within the cell for the hand-arranged feel.
      const jx = (r() - 0.5) * CELL_W * 0.4;
      const jy = (r() - 0.5) * CELL_H * 0.4;
      const cx = col * CELL_W - (COLS * CELL_W) / 2 + CELL_W / 2 + jx;
      const cy = -(row * CELL_H - (ROWS * CELL_H) / 2 + CELL_H / 2 + jy);
      const depth = (r() - 0.5) * 2.4;
      const tilt = (r() - 0.5) * 0.08;
      const sw = PANEL_MAX_W * (0.72 + r() * 0.28);
      const sh = PANEL_MAX_H * (0.72 + r() * 0.28);

      const texture = this.loadTexture(it, loader);
      const material = new THREE.MeshBasicMaterial({ map: texture, transparent: false, color: 0xffffff });
      const geom = new THREE.PlaneGeometry(sw, sh, 1, 1);
      const mesh = new THREE.Mesh(geom, material);
      mesh.userData.index = i;
      mesh.rotation.z = tilt;

      const group = new THREE.Group();
      group.add(mesh);
      group.position.set(cx, cy, depth);
      this.scene.add(group);

      this.tiles.push({
        index: i,
        slug: it.slug,
        group,
        mesh,
        home: new THREE.Vector2(cx, cy),
        w: sw,
        h: sh,
        depth,
        tilt,
      });
    });
  }

  private loadTexture(it: Exploration, loader: THREE.TextureLoader): THREE.Texture {
    if (it.media.kind === 'video') {
      const vid = this.videos.find((v) => v.getAttribute('data-slug') === it.slug);
      if (vid) {
        const vt = new THREE.VideoTexture(vid);
        vt.colorSpace = THREE.SRGBColorSpace;
        vt.minFilter = THREE.LinearFilter;
        vt.magFilter = THREE.LinearFilter;
        this.videoTextures.set(it.slug, vt);
        return vt;
      }
    } else if (it.media.kind === 'image') {
      const t = loader.load(it.media.src, (loaded) => {
        loaded.colorSpace = THREE.SRGBColorSpace;
        loaded.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
      });
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }
    // Fallback — a solid accent tile.
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = it.accent ?? '#242424';
    ctx.fillRect(0, 0, 2, 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private wire() {
    const root = this.root;

    const wheel = (e: WheelEvent) => {
      // Trackpads deliver two-axis delta; mouse wheels mostly deliver Y.
      e.preventDefault();
      this.target.x += e.deltaX * 0.015;
      this.target.y -= e.deltaY * 0.015;
    };
    root.addEventListener('wheel', wheel, { passive: false });
    this.listeners.push(() => root.removeEventListener('wheel', wheel));

    const pointerDown = (e: PointerEvent) => {
      this.isPointerDown = true;
      this.dragged = false;
      this.dragStart.set(e.clientX, e.clientY);
      this.dragTarget.copy(this.target);
      root.setPointerCapture(e.pointerId);
      root.classList.add('is-dragging');
    };
    const pointerMove = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      this.pointerActive = true;
      if (this.isPointerDown) {
        const dx = e.clientX - this.dragStart.x;
        const dy = e.clientY - this.dragStart.y;
        // Convert pixels to world units at the camera's focal depth so drag feels 1:1.
        const scale = this.worldPerPixel();
        this.target.x = this.dragTarget.x - dx * scale;
        this.target.y = this.dragTarget.y + dy * scale;
        if (Math.hypot(dx, dy) > 4) this.dragged = true;
      }
    };
    const pointerUp = (e: PointerEvent) => {
      this.isPointerDown = false;
      try {
        root.releasePointerCapture(e.pointerId);
      } catch {}
      root.classList.remove('is-dragging');
    };
    const pointerLeave = () => {
      this.pointerActive = false;
      this.hoverIndex = null;
    };
    root.addEventListener('pointerdown', pointerDown);
    root.addEventListener('pointermove', pointerMove, { passive: true });
    root.addEventListener('pointerup', pointerUp);
    root.addEventListener('pointercancel', pointerUp);
    root.addEventListener('pointerleave', pointerLeave);
    this.listeners.push(() => root.removeEventListener('pointerdown', pointerDown));
    this.listeners.push(() => root.removeEventListener('pointermove', pointerMove));
    this.listeners.push(() => root.removeEventListener('pointerup', pointerUp));
    this.listeners.push(() => root.removeEventListener('pointercancel', pointerUp));
    this.listeners.push(() => root.removeEventListener('pointerleave', pointerLeave));

    const click = () => {
      if (this.dragged) return;
      if (this.hoverIndex == null) return;
      const it = this.items[this.hoverIndex];
      if (it.href) window.location.assign(it.href);
    };
    root.addEventListener('click', click);
    this.listeners.push(() => root.removeEventListener('click', click));

    const vis = () => {
      if (document.hidden) this.videos.forEach((v) => v.pause());
      else this.videos.forEach((v) => void v.play().catch(() => {}));
    };
    document.addEventListener('visibilitychange', vis);
    this.listeners.push(() => document.removeEventListener('visibilitychange', vis));
  }

  private worldPerPixel() {
    // At the plane z=0 and a camera at CAM_Z, the visible world height is 2 * tan(fov/2) * CAM_Z.
    const h = 2 * Math.tan((this.camera.fov * Math.PI) / 360) * this.camera.position.z;
    return h / this.canvas.clientHeight;
  }

  private resize() {
    const r = this.root.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    // Scrub the trail buffer so stale pixels don't streak across the new size.
    this.renderer.setClearColor(0x0a0a0a, 1);
    this.renderer.clear(true, true, true);
    this.renderer.setClearColor(0x0a0a0a, this.effect === 'Smear' ? SMEAR_ALPHA : DRIFT_ALPHA);
  }

  private pick(): number | null {
    if (!this.pointerActive || this.isPointerDown) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.tiles.map((t) => t.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    return hits[0].object.userData.index as number;
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    // Idle drift so the scene never fully stops moving.
    if (!this.isPointerDown) {
      this.target.x += AUTOPAN.x * dt;
      this.target.y += AUTOPAN.y * dt;
    }

    // Position easing with velocity tracking.
    const prev = this.pos.clone();
    this.pos.x += (this.target.x - this.pos.x) * DAMP;
    this.pos.y += (this.target.y - this.pos.y) * DAMP;
    this.vel.set((this.pos.x - prev.x) / Math.max(dt, 0.001), (this.pos.y - prev.y) / Math.max(dt, 0.001));

    // Pointer parallax — gentle, so the room sways with the cursor.
    this.pointerFocus.x += (this.pointer.x * 0.3 - this.pointerFocus.x) * 0.06;
    this.pointerFocus.y += (this.pointer.y * 0.2 - this.pointerFocus.y) * 0.06;
    this.camera.position.x = this.pos.x + this.pointerFocus.x;
    this.camera.position.y = this.pos.y + this.pointerFocus.y;
    // A very light tilt from pointer gives the shot some life without breaking the pan.
    this.camera.rotation.x = -this.pointerFocus.y * 0.04;
    this.camera.rotation.y = this.pointerFocus.x * 0.04;

    // Wrap tiles around the camera so the field feels endless.
    const fx = this.fieldW;
    const fy = this.fieldH;
    const cx = this.camera.position.x;
    const cy = this.camera.position.y;
    this.tiles.forEach((t) => {
      let dx = t.home.x - cx;
      let dy = t.home.y - cy;
      dx -= Math.round(dx / fx) * fx;
      dy -= Math.round(dy / fy) * fy;
      const wx = cx + dx;
      const wy = cy + dy;
      t.group.position.x = wx;
      t.group.position.y = wy;
      // Perspective fade — tiles further from the camera's focal point dim and desaturate.
      const dist = Math.hypot(dx, dy);
      const near = THREE.MathUtils.clamp(1 - dist / (Math.max(fx, fy) * 0.6), 0.15, 1);
      t.mesh.material.color.setScalar(0.6 + 0.4 * near);
      // Breathing scale on hover and a hair of auto-oscillation to catch the eye.
      const hover = this.hoverIndex === t.index ? 1 : 0;
      const breath = 1 + Math.sin(now * 0.0015 + t.index * 1.3) * 0.012;
      const s = breath * (1 + hover * 0.08);
      t.group.scale.setScalar(s);
    });

    // Pick the hovered tile.
    const hover = this.pick();
    if (hover !== this.hoverIndex) {
      this.hoverIndex = hover;
      this.onActive(hover);
      this.canvas.style.cursor = hover != null ? 'pointer' : '';
    }

    // Motion-blur: clear with a translucent color each frame so previous pixels fade out.
    // Lower alpha during fast movement for a longer trail.
    const speed = this.vel.length();
    const alphaBase = this.effect === 'Smear' ? SMEAR_ALPHA : DRIFT_ALPHA;
    const alpha = THREE.MathUtils.clamp(alphaBase - Math.min(speed * 0.05, 0.25), 0.1, 1);
    this.renderer.setClearColor(0x0a0a0a, alpha);
    this.renderer.clear(true, false, false);
    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.frame);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.ro.disconnect();
    this.listeners.forEach((off) => off());
    this.listeners.length = 0;
    this.tiles.forEach((t) => {
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
      if (t.mesh.material.map && !(t.mesh.material.map instanceof THREE.VideoTexture)) {
        t.mesh.material.map.dispose();
      }
    });
    this.videoTextures.forEach((t) => t.dispose());
    this.renderer.dispose();
  }
}
