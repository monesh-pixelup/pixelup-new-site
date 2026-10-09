import * as THREE from 'three';
import type { Exploration } from '@/content/explorations';

// Geometry constants — tuned so a 16-panel ring reads legibly on a 1440 viewport
// with the active panel sitting just under the eye line.
const RADIUS = 6.4;
const PANEL_W = 2.6;
const PANEL_H = 1.7;
const ANGLE_STEP = (Math.PI * 2) / 20; // spacing — ~18°; leaves a visible seam at the back of the room
const CAM_Y = 0.12;
// Alternating panels sit slightly higher/lower so the ring reads as a sculpted frieze, not a flat belt.
const PANEL_Y_OFFSET = 0.26;
const CAROUSEL_TILT = 0.09; // radians; a light downward lean to the whole ring
const CURL_SEGMENTS = 24;

type Opts = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  items: Exploration[];
  videos: HTMLVideoElement[];
  onActive: (index: number) => void;
  onReady: () => void;
  onProgress: (p: number) => void;
};

/** A single panel on the ring — its texture, mesh and the extra state we need to animate it. */
type Panel = {
  index: number;
  slug: string;
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  anchor: THREE.Object3D;
  texture: THREE.Texture;
  isVideo: boolean;
  focus: number; // 0..1, smoothed
};

const VERT = /* glsl */ `
  precision highp float;
  uniform float uFocus;
  uniform float uTime;
  varying vec2 vUv;
  varying float vFocus;
  varying vec3 vNormalW;

  void main() {
    vUv = uv;
    vFocus = uFocus;
    // Each sheet curls gently: edges lift away from the camera, like paper under light wind.
    // The curl eases out as the panel comes into focus, so the active card lies perfectly flat.
    float edge = abs(uv.x - 0.5) * 2.0;
    float sway = sin(uTime * 0.6 + uv.y * 2.2) * 0.05;
    float curl = pow(edge, 2.0) * (0.55 + sway);
    curl *= (1.0 - uFocus * 0.75); // active panel flattens almost to a plane
    vec3 p = position;
    // Push the edges away from the viewer so each sheet reads as a curved slab.
    p.z += curl * 0.35;
    vec3 nW = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vNormalW = nW;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform sampler2D uMap;
  uniform float uFocus;
  uniform vec3 uAccent;
  varying vec2 vUv;
  varying float vFocus;
  varying vec3 vNormalW;

  // Simple pseudo-random for grain.
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  void main() {
    vec4 tex = texture2D(uMap, vUv);
    vec3 base = tex.rgb;
    // Keep inactive panels readable; the active one gets the full gain.
    float dim = mix(0.68, 1.08, vFocus);
    base *= dim;
    // Accent-tinted rim on the active card ties it to the brand color.
    float rim = pow(1.0 - abs(vNormalW.z), 2.0) * uFocus;
    base += uAccent * rim * 0.22;
    // Subtle grain reads as print; it also masks compression artefacts in the thumbnails.
    float grain = (hash(gl_FragCoord.xy) - 0.5) * 0.03;
    base += grain;
    // Soft inner shadow only on the inactive panels so they recede into the room.
    float vignette = smoothstep(0.0, 0.6, 1.0 - length(vUv - 0.5));
    float vig = mix(0.75 + 0.3 * vignette, 1.0, vFocus);
    base *= vig;
    gl_FragColor = vec4(base, 1.0);
  }
`;

export class ExplorationsScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private carousel = new THREE.Group();
  private panels: Panel[] = [];
  private items: Exploration[];
  private videos: HTMLVideoElement[];
  private videoTextures = new Map<string, THREE.VideoTexture>();
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2(0, 0);
  private pointerFocus = new THREE.Vector2(0, 0);
  private pointerActive = false;
  private rotation = 0;
  private targetRotation = 0;
  private activeIndex = -1;
  private last = performance.now();
  private rafId = 0;
  private disposed = false;
  private root: HTMLElement;
  private canvas: HTMLCanvasElement;
  private onActive: Opts['onActive'];
  private onReady: Opts['onReady'];
  private onProgress: Opts['onProgress'];
  private ro: ResizeObserver;
  private wheelCapture: (e: WheelEvent) => void;
  private scrollListener: () => void;
  private pointerListener: (e: PointerEvent) => void;
  private pointerLeaveListener: () => void;
  private clickListener: (e: PointerEvent) => void;
  private visibilityListener: () => void;

  constructor({ root, canvas, items, videos, onActive, onReady, onProgress }: Opts) {
    this.root = root;
    this.canvas = canvas;
    this.items = items;
    this.videos = videos;
    this.onActive = onActive;
    this.onReady = onReady;
    this.onProgress = onProgress;

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
    this.camera.position.set(0, CAM_Y, 0);
    // Default forward is -Z — the camera sits at the ring's heart and looks ahead.

    this.carousel.rotation.x = CAROUSEL_TILT;
    this.scene.add(this.carousel);

    const ambient = new THREE.AmbientLight(0xffffff, 0.9);
    this.scene.add(ambient);

    this.buildPanels();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(root);
    this.resize();

    // Scroll-driven rotation: progress through the parent section controls the ring angle.
    this.scrollListener = () => this.onScroll();
    this.scrollListener();
    window.addEventListener('scroll', this.scrollListener, { passive: true });

    // Wheel inside the stage adds a nudge, so hovering with the mouse still turns the ring
    // once the sticky ride has started.
    this.wheelCapture = (e: WheelEvent) => {
      // Don't swallow — let the page keep scrolling; just use the delta as a rotation hint.
      const delta = (e.deltaY || e.deltaX) * 0.0012;
      this.targetRotation += delta;
    };
    root.addEventListener('wheel', this.wheelCapture, { passive: true });

    this.pointerListener = (e: PointerEvent) => {
      const r = root.getBoundingClientRect();
      this.pointer.x = ((e.clientX - r.left) / r.width) * 2 - 1;
      this.pointer.y = -(((e.clientY - r.top) / r.height) * 2 - 1);
      this.pointerActive = true;
    };
    root.addEventListener('pointermove', this.pointerListener, { passive: true });

    this.pointerLeaveListener = () => {
      this.pointerActive = false;
    };
    root.addEventListener('pointerleave', this.pointerLeaveListener);

    this.clickListener = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return; // tap handled by browser via overlay anchor
      const hit = this.pick();
      if (!hit) return;
      const it = this.items[hit.index];
      if (it.href) {
        window.location.assign(it.href);
      }
    };
    root.addEventListener('click', this.clickListener);

    this.visibilityListener = () => {
      if (document.hidden) {
        this.videos.forEach((v) => v.pause());
      } else {
        this.videos.forEach((v) => void v.play().catch(() => {}));
      }
    };
    document.addEventListener('visibilitychange', this.visibilityListener);

    // Start the loop.
    this.rafId = requestAnimationFrame(this.frame);
    // Kick videos.
    this.videos.forEach((v) => void v.play().catch(() => {}));
    // Report ready after one frame so the overlay can fade in.
    requestAnimationFrame(() => this.onReady());
  }

  private buildPanels() {
    const loader = new THREE.TextureLoader();
    this.items.forEach((it, i) => {
      const angle = i * ANGLE_STEP;
      const anchor = new THREE.Object3D();
      // Place the panel on the ring and turn it to face the camera at the center.
      const y = (i % 2 === 0 ? -1 : 1) * PANEL_Y_OFFSET;
      anchor.position.set(Math.sin(angle) * RADIUS, y, -Math.cos(angle) * RADIUS);
      anchor.rotation.y = -angle;
      // Odd panels get a small counter-tilt so the frieze reads as hand-arranged, not stamped.
      anchor.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.04;
      this.carousel.add(anchor);

      const geom = new THREE.PlaneGeometry(PANEL_W, PANEL_H, CURL_SEGMENTS, Math.ceil(CURL_SEGMENTS * 0.6));
      const accent = new THREE.Color(it.accent ?? '#8a8a8a');

      let texture: THREE.Texture;
      let isVideo = false;
      if (it.media.kind === 'video') {
        const vid = this.videos.find((v) => v.getAttribute('data-slug') === it.slug);
        if (vid) {
          const vt = new THREE.VideoTexture(vid);
          vt.colorSpace = THREE.SRGBColorSpace;
          vt.minFilter = THREE.LinearFilter;
          vt.magFilter = THREE.LinearFilter;
          this.videoTextures.set(it.slug, vt);
          texture = vt;
          isVideo = true;
        } else {
          texture = this.makePlaceholder(accent);
        }
      } else if (it.media.kind === 'image') {
        texture = loader.load(it.media.src, (t) => {
          t.colorSpace = THREE.SRGBColorSpace;
          t.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
        });
        texture.colorSpace = THREE.SRGBColorSpace;
      } else {
        texture = this.makePlaceholder(accent);
      }

      const material = new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: {
          uMap: { value: texture },
          uFocus: { value: 0 },
          uTime: { value: 0 },
          uAccent: { value: new THREE.Color(it.accent ?? '#dfdfdf') },
        },
        side: THREE.FrontSide,
      });

      const mesh = new THREE.Mesh(geom, material);
      mesh.userData.index = i;
      anchor.add(mesh);

      this.panels.push({ index: i, slug: it.slug, mesh, anchor, texture, isVideo, focus: 0 });
    });
  }

  private makePlaceholder(color: THREE.Color): THREE.Texture {
    const c = document.createElement('canvas');
    c.width = c.height = 2;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = `#${color.getHexString()}`;
    ctx.fillRect(0, 0, 2, 2);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  private resize() {
    const r = this.root.getBoundingClientRect();
    const w = Math.max(1, r.width);
    const h = Math.max(1, this.canvas.clientHeight || r.height);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Narrower viewports get a wider lens so the ring doesn't crop in from the sides.
    const narrow = w < 1024;
    this.camera.fov = narrow ? 46 : 36;
    this.camera.updateProjectionMatrix();
  }

  private onScroll() {
    // The section is tall; we map its visible position to a target rotation.
    const parent = this.root.closest<HTMLElement>('.exp') ?? this.root;
    const rect = parent.getBoundingClientRect();
    const vh = window.innerHeight;
    const total = parent.offsetHeight - vh;
    const raw = total <= 0 ? 0 : -rect.top / total;
    const clamped = Math.max(0, Math.min(1, raw));
    // Full travel = one revolution + a touch so the last and first items don't collide at the ends.
    const span = Math.PI * 2;
    this.targetRotation = clamped * span;
    this.onProgress(clamped);
  }

  private pick(): { index: number } | null {
    if (!this.pointerActive) return null;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const meshes = this.panels.map((p) => p.mesh);
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (!hits.length) return null;
    const index = hits[0].object.userData.index as number;
    return { index };
  }

  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;

    // Rotation damping.
    const ease = 1 - Math.pow(0.001, dt);
    this.rotation += (this.targetRotation - this.rotation) * ease;
    this.carousel.rotation.y = this.rotation;

    // Pointer parallax — the camera sways with the cursor, really subtle, no re-orientation.
    const tx = this.pointer.x * 0.12;
    const ty = this.pointer.y * 0.08;
    this.pointerFocus.x += (tx - this.pointerFocus.x) * ease;
    this.pointerFocus.y += (ty - this.pointerFocus.y) * ease;
    this.camera.position.set(this.pointerFocus.x, CAM_Y + this.pointerFocus.y, 0);

    // Compute each panel's focus — 1 for the one closest to the camera's forward ray,
    // falling off with angular distance.
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
    const camPos = this.camera.position;
    let best = 0;
    let bestIdx = -1;
    this.panels.forEach((p) => {
      const world = new THREE.Vector3();
      p.mesh.getWorldPosition(world);
      const dir = world.sub(camPos).normalize();
      const dot = dir.dot(forward); // 1 = dead ahead
      // sharpen: anything behind (dot < 0) is 0
      const raw = Math.max(0, dot);
      const focus = Math.pow(raw, 6); // moderate falloff — center pops, neighbours fade
      p.focus += (focus - p.focus) * ease;
      p.mesh.material.uniforms.uFocus.value = p.focus;
      p.mesh.material.uniforms.uTime.value = now * 0.001;
      // Scale: active panel sits proudly, far ones recede a bit.
      const s = 0.86 + 0.22 * p.focus;
      p.mesh.scale.set(s, s, 1);
      if (focus > best) {
        best = focus;
        bestIdx = p.index;
      }
    });

    if (bestIdx !== -1 && bestIdx !== this.activeIndex) {
      this.activeIndex = bestIdx;
      this.onActive(bestIdx);
    }

    this.renderer.render(this.scene, this.camera);
    this.rafId = requestAnimationFrame(this.frame);
  };

  dispose() {
    this.disposed = true;
    cancelAnimationFrame(this.rafId);
    this.ro.disconnect();
    window.removeEventListener('scroll', this.scrollListener);
    this.root.removeEventListener('wheel', this.wheelCapture);
    this.root.removeEventListener('pointermove', this.pointerListener);
    this.root.removeEventListener('pointerleave', this.pointerLeaveListener);
    this.root.removeEventListener('click', this.clickListener);
    document.removeEventListener('visibilitychange', this.visibilityListener);
    this.panels.forEach((p) => {
      p.mesh.geometry.dispose();
      p.mesh.material.dispose();
    });
    this.videoTextures.forEach((t) => t.dispose());
    this.renderer.dispose();
  }
}
