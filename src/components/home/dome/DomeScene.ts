import * as THREE from 'three';

/*
  The work dome (Figma "Case studies / Hex dome — Default", 1524:2321).
  The camera stands at the centre of a cylinder and looks at its inside wall. Projects sit on the wall in two
  staggered rows: the lower row is the index you drag through, the upper row repeats the list half a step over.
  Measured from the Figma capture at 1440 × 836: focal length 989 px, cards 431 × 262 px with a 3.1° gap,
  lower row 12 px below the horizon, upper row 153 px above it.
*/

export type DomeItem = { client: string; summary: string; scope: string[]; src: string };

type Options = {
  items: DomeItem[];
  start: number;
  reduced: boolean;
  /** CSS font-family stack of the page, for the captions drawn into the card textures. */
  font: string;
  onActive: (index: number) => void;
  onHover: (over: boolean) => void;
  onOpen: (index: number) => void;
};

const R = 10;
const FIGMA_F = 989; // focal length in px on the 1440 × 836 frame
const GAP = THREE.MathUtils.degToRad(3.1);
// Card in css px at the centre of the frame: image, then its caption.
const CARD = { w: 431, img: 262, cap: 52, radius: 6 };
const LOWER_TOP = -12; // px below the horizon
const UPPER_TOP = 418; // px above the horizon: the upper row's images start at the frame's top edge
const UPPER_SHIFT = 4.5; // upper card for project p sits at (p + 4.5) steps
/** Brightness of cards away from the centre, as displayed (sampled from the Figma capture). */
const DIM = 0.11;

const damp = (a: number, b: number, k: number, dt: number) => a + (b - a) * (1 - Math.exp(-k * dt));
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

/** A slice of the cylinder wall: `angle` is the card's centre, `top` its upper edge, both in world units. */
function wallGeometry(width: number, top: number, height: number) {
  const seg = 32;
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  for (let i = 0; i <= seg; i++) {
    const u = i / seg;
    const a = (u - 0.5) * width;
    const x = R * Math.sin(a);
    const z = -R * Math.cos(a);
    pos.push(x, top - height, z, x, top, z);
    uv.push(u, 0, u, 1);
    if (i < seg) {
      const k = i * 2;
      idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

/** Draws one card (image plus caption) at `k` texture px per css px. */
function drawCard(item: DomeItem, img: HTMLImageElement | null, k: number, font: string) {
  const c = document.createElement('canvas');
  c.width = Math.round(CARD.w * k);
  c.height = Math.round((CARD.img + CARD.cap) * k);
  const g = c.getContext('2d')!;
  g.scale(k, k);

  g.save();
  g.beginPath();
  g.roundRect(0, 0, CARD.w, CARD.img, CARD.radius);
  g.clip();
  g.fillStyle = '#151515';
  g.fillRect(0, 0, CARD.w, CARD.img);
  if (img) {
    const s = Math.max(CARD.w / img.naturalWidth, CARD.img / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    g.drawImage(img, (CARD.w - w) / 2, (CARD.img - h) / 2, w, h);
  }
  g.restore();

  // Caption, after the Figma: name, summary under it, scope of work on the right.
  const top = CARD.img + 14;
  g.textBaseline = 'alphabetic';
  g.fillStyle = '#ffffff';
  g.font = `500 12.8px ${font}`;
  g.letterSpacing = '-0.2px';
  g.fillText(item.client, 0, top + 8.7);
  g.fillStyle = 'rgba(255,255,255,0.62)';
  g.font = `400 10.2px ${font}`;
  g.letterSpacing = '-0.1px';
  g.fillText(item.summary, 0, top + 23);

  // ①Brand, ②Web — circled numbers drawn as rings so they match the face.
  g.font = `400 10.4px ${font}`;
  g.fillStyle = '#ffffff';
  g.strokeStyle = '#ffffff';
  g.lineWidth = 0.8;
  const parts = item.scope.map((s, i) => ({ n: String(i + 1), label: i < item.scope.length - 1 ? `${s}, ` : s }));
  const ring = 11;
  const width = parts.reduce((sum, p) => sum + ring + 1 + g.measureText(p.label).width, 0);
  let x = CARD.w - width;
  const base = top + 8.2;
  for (const p of parts) {
    g.beginPath();
    g.arc(x + ring / 2, base - 3.6, ring / 2 - 0.4, 0, Math.PI * 2);
    g.stroke();
    g.save();
    g.font = `400 7.4px ${font}`;
    g.textAlign = 'center';
    g.fillText(p.n, x + ring / 2, base - 1);
    g.restore();
    x += ring + 1;
    g.fillText(p.label, x, base);
    x += g.measureText(p.label).width;
  }
  g.fillRect(CARD.w - width, base + 3.2, width, 0.8);
  return c;
}

const hexVertex = /* glsl */ `
  varying vec3 vPos;
  void main() {
    vPos = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Pointy-top hexagons in the wall's unrolled (arc length, height) space, plus a sparse scatter of specks.
const hexFragment = /* glsl */ `
  precision highp float;
  varying vec3 vPos;
  uniform float uCols;
  uniform float uRadius;
  float hexDist(vec2 p) {
    p = abs(p);
    return max(dot(p, normalize(vec2(1.0, 1.7320508))), p.x);
  }
  vec4 hexCell(vec2 p) {
    vec2 s = vec2(1.0, 1.7320508);
    vec4 c = floor(vec4(p, p - vec2(0.5, 1.0)) / s.xyxy) + 0.5;
    vec4 h = vec4(p - c.xy * s, p - (c.zw + 0.5) * s);
    return dot(h.xy, h.xy) < dot(h.zw, h.zw) ? vec4(h.xy, c.xy) : vec4(h.zw, c.zw + 0.5);
  }
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    float a = atan(vPos.x, -vPos.z);
    // Whole columns around the circle so the pattern closes on itself.
    vec2 p = vec2(a / 6.2831853 * uCols, vPos.y / (6.2831853 * uRadius) * uCols);
    vec4 h = hexCell(p);
    float d = 0.5 - hexDist(h.xy);
    float w = fwidth(d) * 1.1;
    float line = 1.0 - smoothstep(0.0, w, d);
    vec2 q = p * 9.0;
    vec2 cell = floor(q);
    float r = hash(cell);
    vec2 f = fract(q) - 0.5;
    float speck = step(0.986, r) * (1.0 - smoothstep(0.0, fwidth(q.x) * 1.4, length(f) - 0.02));
    float v = line * 0.075 + speck * 0.32;
    gl_FragColor = vec4(vec3(v), 1.0);
  }
`;

export class DomeScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
  private group = new THREE.Group();
  private raycaster = new THREE.Raycaster();
  private lower: THREE.Mesh[] = [];
  private upper: THREE.Mesh[] = [];
  private textures: THREE.CanvasTexture[] = [];
  private images: (HTMLImageElement | null)[] = [];
  private n: number;
  private step: number;
  private yaw: number;
  private target: number;
  private active = -1;
  private k = 2.4;
  private f = FIGMA_F;
  private size = { w: 1, h: 1 };
  private look = { x: 0, y: 0, tx: 0, ty: 0 };
  private drag = { down: false, id: -1, x: 0, y: 0, yaw: 0, t: 0, moved: false, vel: 0, lx: 0, lt: 0 };
  private pointer = { x: 0, y: 0, inside: false };
  private hovering = false;
  private wheelTimer = 0;
  private running = false;
  private last = 0;
  private raf = 0;
  private disposed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private opts: Options,
  ) {
    this.n = opts.items.length;
    this.step = (Math.PI * 2) / this.n;
    this.target = opts.start * this.step;
    // Arrives turning in from the right and settles on the starting project.
    this.yaw = opts.reduced ? this.target : this.target - this.step * 2.2;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene.add(this.group);

    const hex = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 1.004, R * 1.004, 40, 120, 1, true),
      new THREE.ShaderMaterial({
        vertexShader: hexVertex,
        fragmentShader: hexFragment,
        uniforms: { uCols: { value: 15 }, uRadius: { value: R * 1.004 } },
        side: THREE.BackSide,
        depthWrite: false,
      }),
    );
    hex.renderOrder = -1;
    this.group.add(hex);

    const unit = R / FIGMA_F; // world units per px at the centre of the frame
    const width = this.step - GAP;
    const height = (CARD.img + CARD.cap) * unit;
    const lowerTop = LOWER_TOP * unit;
    const upperTop = UPPER_TOP * unit * Math.cos(this.step / 2);
    const k = window.innerWidth < 768 ? 1.5 : 2.1;

    opts.items.forEach((item, i) => {
      const tex = new THREE.CanvasTexture(drawCard(item, null, k, opts.font));
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      this.textures.push(tex);
      this.images.push(null);

      const make = (top: number, angle: number, row: 'lower' | 'upper') => {
        const mesh = new THREE.Mesh(wallGeometry(width, top, height), new THREE.MeshBasicMaterial({ map: tex, transparent: true, color: new THREE.Color().setRGB(DIM, DIM, DIM, THREE.SRGBColorSpace) }));
        mesh.rotation.y = -angle;
        if (row === 'lower') mesh.userData = { index: i };
        this.group.add(mesh);
        return mesh;
      };
      this.lower.push(make(lowerTop, i * this.step, 'lower'));
      this.upper.push(make(upperTop, ((i + UPPER_SHIFT) % this.n) * this.step, 'upper'));

      const img = new Image();
      img.decoding = 'async';
      img.src = `/_next/image?url=${encodeURIComponent(item.src)}&w=1080&q=80`;
      img
        .decode()
        .then(() => {
          if (this.disposed) return;
          this.images[i] = img;
          tex.image = drawCard(item, img, k, opts.font);
          tex.needsUpdate = true;
        })
        .catch(() => {});
    });

    canvas.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
    canvas.addEventListener('pointerleave', this.onLeave);
    canvas.addEventListener('wheel', this.onWheel, { passive: false });
  }

  setSize(w: number, h: number) {
    this.size = { w, h };
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h, false);
    // Desktop keeps the Figma's framing (scaled with the page); narrower screens bring the active card closer.
    const half = (this.step - GAP) / 2;
    const share = w >= 1024 ? (CARD.w / 1440) : w >= 768 ? 0.5 : 0.78;
    this.f = (share * w) / 2 / Math.tan(half);
    this.camera.aspect = w / h;
    this.camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(h / 2 / this.f));
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running || this.disposed) return;
    this.running = true;
    this.last = performance.now();
    const loop = (t: number) => {
      if (!this.running) return;
      this.raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.tick(dt);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  /** Move by whole projects (keyboard, buttons). */
  go(delta: number) {
    this.target = Math.round(this.target / this.step + delta) * this.step;
    this.k = 6;
  }

  open() {
    this.opts.onOpen(this.active);
  }

  private tick(dt: number) {
    const reduced = this.opts.reduced;
    this.yaw = reduced && !this.drag.down ? this.target : damp(this.yaw, this.target, this.drag.down ? 24 : this.k, dt);
    // The entrance eases in slowly; everything after settles at the site's usual rate.
    if (Math.abs(this.yaw - this.target) < 0.002) this.k = 6;
    this.group.rotation.y = this.yaw;

    // Leans a touch toward the cursor, like the mark.
    if (!reduced) {
      this.look.x = damp(this.look.x, this.look.tx, 3, dt);
      this.look.y = damp(this.look.y, this.look.ty, 3, dt);
      this.camera.rotation.set(this.look.y, this.look.x, 0);
    }

    const current = (((Math.round(this.yaw / this.step) % this.n) + this.n) % this.n);
    if (current !== this.active) {
      this.active = current;
      this.opts.onActive(current);
    }

    // The card nearest the centre of the lower row lights up as it arrives.
    this.lower.forEach((mesh, i) => {
      const d = Math.abs(wrap(i * this.step - this.yaw)) / this.step;
      const lit = THREE.MathUtils.smoothstep(1 - d * 1.6, 0, 1);
      const v = DIM + (1 - DIM) * lit;
      (mesh.material as THREE.MeshBasicMaterial).color.setRGB(v, v, v, THREE.SRGBColorSpace);
    });

    if (this.pointer.inside && !this.drag.down) this.updateHover();
    this.renderer.render(this.scene, this.camera);
  }

  private hit(clientX: number, clientY: number) {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    // Only the lower row is the index; the upper row is scenery.
    const [first] = this.raycaster.intersectObjects(this.lower, false);
    return first ? (first.object.userData.index as number) : null;
  }

  private updateHover() {
    const over = this.hit(this.pointer.x, this.pointer.y) !== null;
    if (over !== this.hovering) {
      this.hovering = over;
      this.opts.onHover(over);
    }
  }

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0) return;
    const now = performance.now();
    this.drag = { down: true, id: e.pointerId, x: e.clientX, y: e.clientY, yaw: this.yaw, t: now, moved: false, vel: 0, lx: e.clientX, lt: now };
    this.target = this.yaw;
  };

  private onMove = (e: PointerEvent) => {
    const r = this.canvas.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    this.pointer = { x: e.clientX, y: e.clientY, inside };
    if (inside && e.pointerType === 'mouse') {
      this.look.tx = -((e.clientX - r.left) / r.width - 0.5) * 0.035;
      this.look.ty = -((e.clientY - r.top) / r.height - 0.5) * 0.02;
    }
    const d = this.drag;
    if (!d.down || e.pointerId !== d.id) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.hypot(dx, e.clientY - d.y) > 6) {
      d.moved = true;
      this.canvas.setPointerCapture?.(e.pointerId);
      document.documentElement.classList.add('is-grabbing');
    }
    if (!d.moved) return;
    this.target = d.yaw - dx / this.f;
    const now = performance.now();
    const dtm = Math.max(1, now - d.lt);
    d.vel = d.vel * 0.6 + ((e.clientX - d.lx) / this.f / (dtm / 1000)) * 0.4;
    d.lx = e.clientX;
    d.lt = now;
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d.down || e.pointerId !== d.id) return;
    d.down = false;
    document.documentElement.classList.remove('is-grabbing');
    if (d.moved) {
      // Throw with the release velocity, then come to rest on a whole project.
      const fresh = performance.now() - d.lt < 80 ? d.vel : 0;
      const thrown = this.target - fresh * 0.32;
      this.target = Math.round(thrown / this.step) * this.step;
      this.k = 4;
      return;
    }
    const index = this.hit(e.clientX, e.clientY);
    if (index === null) return;
    if (index === this.active) {
      this.opts.onOpen(index);
      return;
    }
    // Bring the clicked project to the centre by the shortest way round.
    const delta = wrap(index * this.step - this.yaw);
    this.target = Math.round((this.yaw + delta) / this.step) * this.step;
    this.k = 5;
  };

  private onCancel = (e: PointerEvent) => {
    if (e.pointerId !== this.drag.id) return;
    this.drag.down = false;
    document.documentElement.classList.remove('is-grabbing');
    this.target = Math.round(this.target / this.step) * this.step;
  };

  private onLeave = () => {
    this.pointer.inside = false;
    this.look.tx = 0;
    this.look.ty = 0;
    if (this.hovering) {
      this.hovering = false;
      this.opts.onHover(false);
    }
  };

  // Sideways trackpad swipes turn the dome; vertical scrolling is left to the page.
  private onWheel = (e: WheelEvent) => {
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    this.target += e.deltaX / this.f;
    this.k = 10;
    window.clearTimeout(this.wheelTimer);
    this.wheelTimer = window.setTimeout(() => {
      this.target = Math.round(this.target / this.step) * this.step;
      this.k = 5;
    }, 140);
  };

  dispose() {
    this.disposed = true;
    this.stop();
    window.clearTimeout(this.wheelTimer);
    this.canvas.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    this.canvas.removeEventListener('pointerleave', this.onLeave);
    this.canvas.removeEventListener('wheel', this.onWheel);
    document.documentElement.classList.remove('is-grabbing');
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
    this.textures.forEach((t) => t.dispose());
    this.renderer.dispose();
  }
}
