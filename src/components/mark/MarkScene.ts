import * as THREE from 'three';
import { toCreasedNormals } from 'three/addons/utils/BufferGeometryUtils.js';
import gsap from 'gsap';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import {
  ASCII,
  FINISHES,
  FIRE,
  applyFinish,
  createAsciiShader,
  createEmbers,
  createFinishUniforms,
  createFlames,
  createHalo,
  type FinishUniforms,
} from './finishes';
import { GLYPH_ASPECT, GLYPH_BOTTOM, GLYPH_SEAM, GLYPH_TOP } from './glyph';
import type { Dock, Viewport } from './types';
import { restDock } from '@/lib/docks';
import { markState, motion } from '@/lib/markState';
import { clamp, damp, lerpDock, smoothstep } from '@/lib/math';

// Selection frame: the mark's bounds with breathing room, like a selected layer in Figma.
const BOX_W = GLYPH_ASPECT + 0.36;
const BOX_H = 1.36;
const BOX_X = 0;
const [SEAM_X, SEAM_Y] = GLYPH_SEAM;
// Press and hold: a short grace period so taps stay taps, then the charge builds; holding on keeps cycling.
const HOLD_DELAY = 0.16;
const HOLD_TIME = 0.7;
const HOLD_COOLDOWN = 650; // ms after a switch before the next charge starts, so burns never overlap
const BURN = 1.25; // seconds for one finish to burn into the next
// The mark is drawn on a 60° grid; the two pieces part along it.
const SPLIT_X = Math.cos(Math.PI / 3);
const SPLIT_Y = Math.sin(Math.PI / 3);
const DEPTH = 0.12;
const TAU = Math.PI * 2;
// After tone mapping, glow outside the mark has colour but almost no alpha. The canvas is premultiplied,
// so lift alpha to the brightest channel: the glow then composites over the page instead of vanishing.
const AlphaFromLight = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      gl_FragColor = vec4(c.rgb, max(c.a, max(c.r, max(c.g, c.b))));
    }
  `,
};

/** The glyph outline of one half, in the same coordinates as its mesh (centred on the seam). */
const seamOutline = (flat: number[]): [number, number][] => {
  const pts: [number, number][] = [];
  for (let i = 0; i < flat.length; i += 2) pts.push([flat[i] - SEAM_X, flat[i + 1] - SEAM_Y]);
  return pts;
};

const HANDLE_UV: ReadonlyArray<readonly [number, number]> = [
  [0, 0], [0.5, 0], [1, 0], [1, 0.5], [1, 1], [0.5, 1], [0, 1], [0, 0.5],
];

export type MarkUI = {
  root: HTMLElement;
  handles: HTMLElement[];
  frame: SVGPolygonElement;
  label: HTMLElement;
  size: HTMLElement;
  sizeText: HTMLElement;
};

function outline(flat: number[]) {
  const shape = new THREE.Shape();
  shape.moveTo(flat[0], flat[1]);
  for (let i = 2; i < flat.length; i += 2) shape.lineTo(flat[i], flat[i + 1]);
  shape.closePath();
  return shape;
}

function half(flat: number[], materials: THREE.Material[]) {
  const geometry = new THREE.ExtrudeGeometry(outline(flat), {
    depth: DEPTH,
    steps: 1,
    curveSegments: 1,
    bevelEnabled: true,
    bevelThickness: 0.012,
    bevelSize: 0.006,
    bevelOffset: -0.006,
    bevelSegments: 3,
  });
  // Smooth the walls along the curves but keep the corners crisp. The crease hash works at 0.01 precision,
  // so do it at a scale where neighbouring outline points stay distinct.
  geometry.scale(1000, 1000, 1000);
  toCreasedNormals(geometry, THREE.MathUtils.degToRad(40));
  geometry.scale(0.001, 0.001, 0.001);
  // Pivot both pieces on the point where they meet so the mark unfolds around it.
  geometry.translate(-SEAM_X, -SEAM_Y, -DEPTH / 2);
  return new THREE.Mesh(geometry, materials);
}

/** A dark photo studio: softboxes and strip lights the metal can reflect. Values above 1 are HDR. */
function studioEnvironment(renderer: THREE.WebGLRenderer) {
  const scene = new THREE.Scene();
  const disposables: { dispose(): void }[] = [];
  const add = (
    geo: THREE.BufferGeometry,
    color: number | [number, number, number],
    pos: [number, number, number],
    side: THREE.Side = THREE.FrontSide,
  ) => {
    const c = typeof color === 'number' ? new THREE.Color().setScalar(color) : new THREE.Color(...color);
    const mat = new THREE.MeshBasicMaterial({ color: c, side });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...pos);
    mesh.lookAt(0, 0, 0);
    scene.add(mesh);
    disposables.push(geo, mat);
  };
  add(new THREE.BoxGeometry(12, 12, 12), 0.05, [0, 0, 0], THREE.BackSide);
  add(new THREE.PlaneGeometry(9, 6), 2.6, [0.5, 0.8, 5.6]); // big softbox behind the viewer: what the faces reflect
  add(new THREE.PlaneGeometry(1.2, 9), 6, [-1.8, 0, 5.5]); // hot strip inside it — sweeps across the faces as the studio turns
  add(new THREE.PlaneGeometry(5, 2.4), 4.2, [-2.4, 3.8, 3]); // key softbox, high left
  add(new THREE.PlaneGeometry(0.5, 7), 2.6, [5.2, 0.4, 1.4]); // tall strip, right
  add(new THREE.PlaneGeometry(0.4, 6), 1.4, [-5.4, -0.6, -1]); // fill strip, left
  add(new THREE.PlaneGeometry(7, 0.6), [1.3, 1.7, 2.6], [0, 1.2, -5.4]); // cool rim behind: blue edge light on the chrome
  add(new THREE.PlaneGeometry(5, 5), 0.18, [0, -5.4, 2]); // floor bounce
  // Razor-thin line lights: the polished bevels pick these up as crisp glints when the mark turns.
  add(new THREE.PlaneGeometry(10, 0.07), 9, [0, 2.8, 4.6]);
  add(new THREE.PlaneGeometry(0.06, 9), 8, [3.4, 0, 4.9]);
  add(new THREE.PlaneGeometry(0.05, 8), 5, [-4.2, 0.4, 3.6]);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(scene, 0.03).texture;
  pmrem.dispose();
  disposables.forEach((d) => d.dispose());
  return texture;
}

/** Brushed-metal grain: long horizontal streaks, as a normal map (visible texture) and a roughness map. */
function brushedGrain() {
  const size = 512;
  const height = new Float32Array(size * size);
  for (let i = 0; i < 2600; i++) {
    const y = Math.floor(Math.random() * size);
    const x0 = Math.random() * size;
    const len = 30 + Math.random() * 320;
    const amp = (Math.random() - 0.5) * 0.9;
    for (let x = 0; x < len; x++) {
      const fade = Math.sin((x / len) * Math.PI);
      height[y * size + (Math.floor(x0 + x) % size)] += amp * fade;
    }
  }
  const normal = document.createElement('canvas');
  const rough = document.createElement('canvas');
  normal.width = normal.height = rough.width = rough.height = size;
  const n = normal.getContext('2d')!.createImageData(size, size);
  const r = rough.getContext('2d')!.createImageData(size, size);
  const at = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = at(x + 1, y) - at(x - 1, y);
      const dy = at(x, y + 1) - at(x, y - 1);
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      n.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      n.data[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      n.data[o + 2] = (1 / len) * 0.5 * 255 + 127.5;
      n.data[o + 3] = 255;
      const g = THREE.MathUtils.clamp(128 + at(x, y) * 70, 60, 200);
      r.data[o] = r.data[o + 1] = r.data[o + 2] = g;
      r.data[o + 3] = 255;
    }
  }
  normal.getContext('2d')!.putImageData(n, 0, 0);
  rough.getContext('2d')!.putImageData(r, 0, 0);
  const wrap = (c: HTMLCanvasElement) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(1.6, 1.6);
    t.anisotropy = 8;
    return t;
  };
  return { normal: wrap(normal), roughness: wrap(rough) };
}

export class MarkScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(20, 1, 1, 10000);
  private root = new THREE.Group();
  private spin = new THREE.Group();
  /** Same pose as `spin` minus the intro twist: the selection frame is projected from this. */
  private frame = new THREE.Object3D();
  private top = new THREE.Group();
  private bottom = new THREE.Group();
  private materials: THREE.Material[];
  private environment: THREE.Texture;
  private grain: { normal: THREE.Texture; roughness: THREE.Texture };
  /** Press-and-hold finishes: which one is showing, the shared shader uniforms, and the hold gesture. */
  private finish: FinishUniforms = createFinishUniforms(0);
  private current = 0;
  private halo: THREE.Mesh;
  private haloMaterial: THREE.ShaderMaterial;
  private hold = { start: 0, charge: 0, fired: false };
  private lit = 0;
  private squeeze = { value: 1, vel: 0 };
  /** Rendering: HDR scene → bloom → tone map → alpha fix. Fire extras fade with `uFire`. */
  private composer: EffectComposer;
  private bloom: UnrealBloomPass;
  private ascii: ShaderPass;
  private asciiAmount = { value: 0 };
  private fx = { uFire: { value: 0 } };
  private embers: THREE.Points;
  private flameMeshes: THREE.Mesh[] = [];
  private frameCount = 0;
  private visible = true;
  private vp: Viewport = { w: 1, h: 1, mobile: false };
  private dock: Dock | null = null;
  private rot = new THREE.Vector3();
  private vel = new THREE.Vector3();
  private gap = 0;
  private gapVel = 0;
  private twist = 0;
  private time = 0;
  private active = false;
  private pointer = { x: -1e4, y: -1e4, inside: false, mouse: true, present: false };
  private drag = { down: false, moved: false, touch: false, sx: 0, sy: 0, x: 0, y: 0, t: 0 };
  private corners = HANDLE_UV.map(() => new THREE.Vector2());
  private v3 = new THREE.Vector3();
  private sizeLabel = '';
  private coordsLabel = '';
  private coords: HTMLElement | null;

  constructor(canvas: HTMLCanvasElement, private ui: MarkUI) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.environment = studioEnvironment(this.renderer);
    this.scene.environment = this.environment;
    this.grain = brushedGrain();

    // Faces carry the brushed grain (used by the chrome finish); the bevelled walls are polished mirror.
    // Every finish is computed in the shader on top of these materials — see finishes.ts.
    const caps = new THREE.MeshPhysicalMaterial({
      metalness: 1,
      roughness: 0.34,
      roughnessMap: this.grain.roughness,
      normalMap: this.grain.normal,
      normalScale: new THREE.Vector2(0.3, 0.3),
      anisotropy: 0.6,
      anisotropyRotation: Math.PI / 2,
      envMapIntensity: 1.25,
    });
    const sides = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.05, envMapIntensity: 1.4 });
    applyFinish(caps, this.finish, false);
    applyFinish(sides, this.finish, true);
    this.materials = [caps, sides];

    this.halo = createHalo();
    this.halo.position.z = -0.9;
    this.haloMaterial = this.halo.material as THREE.ShaderMaterial;

    // Fire extras: flames off each half's outline (behind it, so they move with the halves) and rising embers.
    const fireUniforms = { uTime: this.finish.uTime, uFire: this.fx.uFire };
    const topFlames = createFlames(seamOutline(GLYPH_TOP), fireUniforms);
    const bottomFlames = createFlames(seamOutline(GLYPH_BOTTOM), fireUniforms);
    topFlames.position.z = bottomFlames.position.z = -DEPTH / 2 - 0.02;
    this.flameMeshes = [topFlames, bottomFlames];
    this.embers = createEmbers(90, fireUniforms);

    this.top.add(half(GLYPH_TOP, this.materials), topFlames);
    this.bottom.add(half(GLYPH_BOTTOM, this.materials), bottomFlames);
    this.spin.add(this.top, this.bottom);
    this.root.add(this.halo, this.spin, this.frame, this.embers);
    this.setLabel(FINISHES[0].name);

    // HDR pipeline. MSAA on the scene target at 1x screens; at 2x the pixel density does the antialiasing.
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: pixelRatio < 1.5 ? 4 : 0 });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.ascii = new ShaderPass(createAsciiShader());
    this.ascii.enabled = false;
    this.composer.addPass(this.ascii);
    const b = FINISHES[0].bloom;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), b.strength, b.radius, b.threshold);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.composer.addPass(new ShaderPass(AlphaFromLight));
    this.root.visible = false;
    this.scene.add(this.root);

    this.coords = document.querySelector('[data-mark-coords]');

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('pointermove', this.onMove, { passive: true });
    window.addEventListener('pointerdown', this.onDown);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('pointercancel', this.onCancel);
    window.addEventListener('dragstart', this.onDragStart);
    window.addEventListener('contextmenu', this.onContextMenu);
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    gsap.ticker.add(this.tick);
  }

  private resize = () => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.vp = { w, h, mobile: w < 768 };
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(pixelRatio);
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(pixelRatio);
    this.composer?.setSize(w, h);
    if (this.embers) (this.embers.material as THREE.ShaderMaterial).uniforms.uPixelRatio.value = pixelRatio;
    // One world unit = one CSS pixel on the z = 0 plane.
    const distance = h / 2 / Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
    this.camera.aspect = w / h;
    this.camera.position.set(0, 0, distance);
    this.camera.near = distance * 0.1;
    this.camera.far = distance * 4;
    this.camera.updateProjectionMatrix();
  };

  private target(scroll: number): Dock {
    const stops = markState.stops;
    const vp = this.vp;
    if (!stops.length) return restDock(vp);
    if (scroll <= stops[0].at) return stops[0].dock(vp, scroll);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (scroll < b.at) {
        const t = smoothstep(clamp((scroll - a.at) / (b.at - a.at), 0, 1));
        return lerpDock(a.dock(vp, scroll), b.dock(vp, scroll), t);
      }
    }
    return stops[stops.length - 1].dock(vp, scroll);
  }

  private inside(x: number, y: number) {
    const c = this.corners;
    const quad = [c[0], c[2], c[4], c[6]];
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = quad[i];
      const b = quad[(i + 1) % 4];
      const cross = (b.x - a.x) * (y - a.y) - (b.y - a.y) * (x - a.x);
      if (cross === 0) continue;
      const s = Math.sign(cross);
      if (!sign) sign = s;
      else if (s !== sign) return false;
    }
    return sign !== 0;
  }

  private onMove = (e: PointerEvent) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.mouse = e.pointerType !== 'touch';
    this.pointer.present = true;

    const d = this.drag;
    if (!d.down) return;
    if (!d.moved) {
      if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) < 5) return;
      if (d.touch) {
        // Touch scrolls the page; only taps spin the mark.
        d.down = false;
        return;
      }
      d.moved = true;
      markState.dragging = true;
      document.documentElement.classList.add('is-grabbing');
      window.getSelection()?.removeAllRanges();
    }
    const now = performance.now();
    const dt = Math.max(8, now - d.t) / 1000;
    const ay = (e.clientX - d.x) * 0.0105;
    const ax = (e.clientY - d.y) * 0.0085;
    this.rot.y += ay;
    this.rot.x += ax;
    this.vel.y = this.vel.y * 0.4 + (ay / dt) * 0.6;
    this.vel.x = this.vel.x * 0.4 + (ax / dt) * 0.6;
    d.x = e.clientX;
    d.y = e.clientY;
    d.t = now;
  };

  private onDown = (e: PointerEvent) => {
    if (e.button !== 0 || markState.intro < 0.95) return;
    if ((e.target as Element | null)?.closest?.('.hdr, .menu')) return;
    if (!this.inside(e.clientX, e.clientY)) return;
    const now = performance.now();
    this.drag = { down: true, moved: false, touch: e.pointerType === 'touch', sx: e.clientX, sy: e.clientY, x: e.clientX, y: e.clientY, t: now };
    this.hold = { start: now, charge: 0, fired: false };
    // A long press must not select text or open the touch callout underneath the mark.
    document.documentElement.classList.add('is-holding');
  };

  private onContextMenu = (e: Event) => {
    if (this.drag.down) e.preventDefault();
  };

  private onUp = (e: PointerEvent) => {
    const d = this.drag;
    if (!d.down) return;
    d.down = false;
    document.documentElement.classList.remove('is-holding');
    // A press that charged or switched the finish was a hold, not a tap.
    const wasHold = this.hold.fired || this.hold.charge > 0.12;
    if (d.moved) {
      markState.dragging = false;
      document.documentElement.classList.remove('is-grabbing');
      // A drag should never also count as a click on whatever sits under the mark.
      const swallow = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      window.addEventListener('click', swallow, { capture: true, once: true });
      window.setTimeout(() => window.removeEventListener('click', swallow, { capture: true }), 0);
      return;
    }
    if (wasHold || !this.inside(e.clientX, e.clientY)) return;
    // Tap: flick it around, away from the side that was pressed.
    const dir = this.dock && e.clientX < this.dock.x ? 1 : -1;
    this.vel.y += 8.5 * dir;
    markState.pulse = Math.max(markState.pulse, 0.12);
  };

  private onCancel = () => {
    if (this.drag.moved) {
      markState.dragging = false;
      document.documentElement.classList.remove('is-grabbing');
    }
    this.drag.down = false;
    document.documentElement.classList.remove('is-holding');
  };

  private setLabel(name: string) {
    const text = this.ui.label.firstElementChild;
    if (text) text.textContent = `pixelup / ${name}`;
  }

  /** Burn the next finish in: a noise-driven dissolve with a glowing front, a pop, and the halo re-tinting. */
  private cycle() {
    const u = this.finish;
    gsap.killTweensOf(u.uMix);
    // Mid-burn, settle on whichever finish covers more of the mark so the next burn starts from it.
    if (u.uMix.value > 0) u.uFrom.value = u.uMix.value > 0.5 ? u.uTo.value : u.uFrom.value;
    const next = (this.current + 1) % FINISHES.length;
    this.current = next;
    u.uTo.value = next;
    u.uNext.value = (next + 1) % FINISHES.length;
    u.uMix.value = 0.0001;
    gsap.to(u.uMix, {
      value: 1,
      duration: BURN,
      ease: 'power2.inOut',
      onComplete: () => {
        u.uFrom.value = next;
        u.uMix.value = 0;
      },
    });
    const f = FINISHES[next];
    gsap.to(this.haloMaterial.uniforms.uColor.value, { r: f.halo[0], g: f.halo[1], b: f.halo[2], duration: BURN, ease: 'power2.inOut' });
    gsap.to(this.haloMaterial.uniforms.uStrength, { value: f.haloStrength, duration: BURN, ease: 'power2.inOut' });
    const after = FINISHES[(next + 1) % FINISHES.length].halo;
    (this.haloMaterial.uniforms.uBoostColor.value as THREE.Color).setRGB(after[0], after[1], after[2]);
    gsap.to(this.fx.uFire, { value: next === FIRE ? 1 : 0, duration: next === FIRE ? BURN : BURN * 0.6, ease: 'power2.inOut' });
    gsap.to(this.asciiAmount, { value: next === ASCII ? 1 : 0, duration: BURN, ease: 'power1.inOut' });
    gsap.to(this.bloom, { ...f.bloom, duration: BURN, ease: 'power2.inOut' });
    this.squeeze.vel += 2.6;
    markState.pulse = Math.max(markState.pulse, 0.16);
    this.setLabel(f.name);
  }

  private onDragStart = (e: DragEvent) => {
    if (this.drag.down) e.preventDefault();
  };

  private onLeave = () => {
    this.pointer.present = false;
  };

  private tick = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs / 1000, 1 / 20);
    const vp = this.vp;
    const reduced = motion.reduced;
    this.time += dt;

    // Dock: follow the scroll-driven target with a soft lag so the mark feels like it floats.
    const target = this.target(motion.scroll);
    if (!this.dock) this.dock = { ...target };
    const d = this.dock;
    const k = reduced ? 40 : 6;
    d.x = damp(d.x, target.x, k, dt);
    d.y = damp(d.y, target.y, k, dt);
    d.g = damp(d.g, target.g, k, dt);
    d.gap = damp(d.gap, target.gap, k, dt);
    d.rx = damp(d.rx, target.rx, k, dt);
    d.ry = damp(d.ry, target.ry, k, dt);
    d.rz = damp(d.rz, target.rz, k, dt);
    d.dots = damp(d.dots, target.dots, k, dt);

    const intro = markState.intro;
    const ready = intro > 0.95;

    // Hover is evaluated every frame: the mark moves under a still cursor while scrolling.
    const hovering = ready && this.pointer.present && this.pointer.mouse && this.inside(this.pointer.x, this.pointer.y);
    markState.hover = hovering && !this.drag.moved;

    // Look toward the cursor.
    let tiltX = 0;
    let tiltY = 0;
    if (this.pointer.present && this.pointer.mouse && !reduced) {
      const strength = hovering ? 1.4 : 1;
      tiltY = clamp((this.pointer.x - d.x) / (vp.w * 0.5), -1, 1) * 0.36 * strength;
      tiltX = clamp((this.pointer.y - d.y) / (vp.h * 0.5), -1, 1) * 0.24 * strength;
    }

    // Scroll speed twists the mark and pulls the halves apart; both spring back at rest.
    const v = reduced ? 0 : clamp(motion.velocity, -90, 90);
    this.twist = damp(this.twist, v * 0.011, 8, dt);

    const floatY = reduced ? 0 : Math.sin(this.time * 0.9) * 0.012;
    const floatX = reduced ? 0 : Math.sin(this.time * 0.7 + 0.6) * 0.035;
    const floatZ = reduced ? 0 : Math.sin(this.time * 0.55 + 1.1) * 0.022;

    const tx = d.rx + tiltX + floatX;
    const ty = d.ry + tiltY + this.twist;
    const tz = d.rz + floatZ;

    if (!markState.dragging) {
      const free = Math.abs(this.vel.y) > 2.4 || Math.abs(this.vel.x) > 2.4;
      const stiffness = free ? 0 : 42;
      const friction = free ? 1.15 : 7.5;
      // Settle on the nearest full turn so a spin never unwinds backwards.
      const ny = ty + Math.round((this.rot.y - ty) / TAU) * TAU;
      const nx = tx + Math.round((this.rot.x - tx) / TAU) * TAU;
      this.vel.y += (ny - this.rot.y) * stiffness * dt;
      this.vel.x += (nx - this.rot.x) * stiffness * dt;
      this.vel.y *= Math.exp(-friction * dt);
      this.vel.x *= Math.exp(-friction * dt);
      this.rot.y += this.vel.y * dt;
      this.rot.x += this.vel.x * dt;
    }
    this.rot.z = damp(this.rot.z, tz, 6, dt);

    const gapTarget =
      d.gap +
      (hovering ? 0.03 : 0) +
      (markState.dragging ? 0.06 : 0) +
      Math.min(Math.abs(v) * 0.0024, 0.14) +
      markState.pulse;
    this.gapVel += (gapTarget - this.gap) * 150 * dt;
    this.gapVel *= Math.exp(-13 * dt);
    this.gap += this.gapVel * dt;
    markState.pulse *= Math.exp(-5 * dt);

    // Intro: the two pieces arrive along the mark's own diagonal and lock together.
    const settle = 1 - intro;
    const travel = (settle * vp.h * 0.85) / d.g;
    const part = this.gap / 2 + travel;
    const jaw = Math.max(0, this.gap) * 0.55 + settle * 0.7;

    // Press and hold: after a short grace period the charge builds; at full charge the next finish burns in.
    // Holding on keeps cycling, with a cooldown so one burn finishes before the next charge starts.
    const holding = this.drag.down && !this.drag.moved && ready;
    if (holding) {
      const held = (performance.now() - this.hold.start) / 1000 - HOLD_DELAY;
      this.hold.charge = clamp(held / HOLD_TIME, 0, 1);
      if (this.hold.charge >= 1) {
        this.cycle();
        this.hold = { start: performance.now() + HOLD_COOLDOWN, charge: 0, fired: true };
      }
    } else {
      this.hold.charge = damp(this.hold.charge, 0, 9, dt);
    }
    const charge = this.hold.charge;
    this.finish.uCharge.value = charge;
    this.finish.uTime.value += dt * (reduced ? 0.25 : 1);

    // The mark tenses as it charges (a slight squeeze and tremble) and springs back with a pop on each switch.
    this.squeeze.vel += (1 - 0.06 * charge * charge - this.squeeze.value) * 220 * dt;
    this.squeeze.vel *= Math.exp(-11 * dt);
    this.squeeze.value += this.squeeze.vel * dt;
    const tremble = reduced ? 0 : Math.sin(this.time * 46) * 0.014 * charge * charge;

    this.root.visible = intro > 0.001;
    this.root.position.set(d.x - vp.w / 2, vp.h / 2 - d.y + floatY * d.g, 0);
    this.root.scale.setScalar(d.g);
    this.spin.scale.setScalar(this.squeeze.value);
    this.spin.rotation.set(this.rot.x, this.rot.y - settle * 1.6, this.rot.z + tremble);
    // The halo swells toward the next finish's colour as the charge builds.
    this.halo.scale.setScalar(1 + charge * 0.25);
    this.haloMaterial.uniforms.uBoost.value = charge * charge * 0.45;
    this.frame.rotation.set(this.rot.x, this.rot.y, this.rot.z);
    this.top.position.set(SEAM_X + SPLIT_X * part, SEAM_Y + SPLIT_Y * part, 0);
    this.top.rotation.z = jaw;
    this.bottom.position.set(SEAM_X - SPLIT_X * part, SEAM_Y - SPLIT_Y * part, 0);
    this.bottom.rotation.z = -jaw;

    // The studio slowly turns around the mark and leans toward the cursor, so highlights sweep the metal even at rest.
    const lean = this.pointer.present && !reduced ? clamp((this.pointer.x - d.x) / vp.w, -1, 1) : 0;
    this.scene.environmentRotation.set(tiltX * 0.8, (reduced ? 0 : this.time * 0.12) + lean * 0.9, 0);

    // Embers are sized in screen pixels relative to the mark; the flame planes only draw while there's fire.
    (this.embers.material as THREE.ShaderMaterial).uniforms.uSize.value = d.g * 0.022;
    const burning = this.fx.uFire.value > 0.001;
    this.embers.visible = burning;
    this.flameMeshes.forEach((m) => (m.visible = burning));

    // ASCII grid: cells scale with the mark so it reads as type at any dock size.
    const amount = this.asciiAmount.value;
    this.ascii.enabled = amount > 0.001;
    if (this.ascii.enabled) {
      const pr = this.renderer.getPixelRatio();
      const au = this.ascii.uniforms;
      au.uAmount.value = amount;
      au.uTime.value = this.finish.uTime.value;
      au.uCell.value = clamp(d.g * 0.042, 7, 16) * pr;
      (au.uResolution.value as THREE.Vector2).set(vp.w * pr, vp.h * pr);
    }

    // The composer is the expensive part; skip it while the mark is hidden (e.g. the explorations page).
    if (this.frameCount++ % 20 === 0) this.visible = this.renderer.domElement.offsetParent !== null;
    if (this.visible) this.composer.render(dt);
    this.updateUI(d, hovering);
  };

  private updateUI(d: Dock, hovering: boolean) {
    const { ui, vp } = this;
    this.frame.updateWorldMatrix(true, false);
    const open = Math.max(0, this.gap);
    const height = BOX_H + open * SPLIT_Y;
    const width = BOX_W + open * SPLIT_X;

    for (let i = 0; i < HANDLE_UV.length; i++) {
      const [u, v] = HANDLE_UV[i];
      this.v3.set(BOX_X + (u - 0.5) * width, (0.5 - v) * height, 0).applyMatrix4(this.frame.matrixWorld).project(this.camera);
      const x = (this.v3.x + 1) * 0.5 * vp.w;
      const y = (1 - this.v3.y) * 0.5 * vp.h;
      this.corners[i].set(x, y);
      ui.handles[i].style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }

    const c = this.corners;
    const active = (hovering || markState.dragging) && markState.intro > 0.95;
    if (active !== this.active) {
      this.active = active;
      ui.root.classList.toggle('is-active', active);
    }
    ui.root.style.setProperty('--dots', (markState.handles * d.dots).toFixed(3));
    ui.frame.setAttribute('points', `${c[0].x},${c[0].y} ${c[2].x},${c[2].y} ${c[4].x},${c[4].y} ${c[6].x},${c[6].y}`);
    ui.label.style.transform = `translate3d(${c[0].x.toFixed(1)}px, ${c[0].y.toFixed(1)}px, 0)`;
    ui.size.style.transform = `translate3d(${c[5].x.toFixed(1)}px, ${c[5].y.toFixed(1)}px, 0)`;

    // While charging, the handles light up one by one around the frame.
    const charge = this.hold.charge;
    const lit = Math.min(HANDLE_UV.length, Math.floor(charge * HANDLE_UV.length + 0.001));
    if (lit !== this.lit) {
      this.lit = lit;
      ui.handles.forEach((h, i) => h.classList.toggle('is-lit', i < lit));
      ui.root.classList.toggle('is-charging', lit > 0);
    }

    const deg = Math.round(THREE.MathUtils.radToDeg(Math.atan2(Math.sin(this.rot.y), Math.cos(this.rot.y))));
    const next = FINISHES[(this.current + 1) % FINISHES.length].name;
    const size =
      charge > 0.02
        ? `${Math.round(charge * 100)}%  → ${next}`
        : `${Math.round(width * d.g)} × ${Math.round(height * d.g)}${markState.dragging ? `  ↻ ${deg}°` : ''}`;
    if (size !== this.sizeLabel) {
      this.sizeLabel = size;
      ui.sizeText.textContent = size;
    }
    if (!this.coords?.isConnected) {
      this.coords = document.querySelector('[data-mark-coords]');
      this.coordsLabel = '';
    }
    if (this.coords) {
      const text = `X ${Math.round(d.x)}  Y ${Math.round(d.y)}  R ${deg}°`;
      if (text !== this.coordsLabel) {
        this.coordsLabel = text;
        this.coords.textContent = text;
      }
    }
  }

  dispose() {
    gsap.ticker.remove(this.tick);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('pointermove', this.onMove);
    window.removeEventListener('pointerdown', this.onDown);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('pointercancel', this.onCancel);
    window.removeEventListener('dragstart', this.onDragStart);
    window.removeEventListener('contextmenu', this.onContextMenu);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    document.documentElement.classList.remove('is-grabbing', 'is-holding');
    gsap.killTweensOf([this.finish.uMix, this.haloMaterial.uniforms.uColor.value, this.haloMaterial.uniforms.uStrength, this.fx.uFire, this.bloom, this.asciiAmount]);
    (this.ascii.uniforms.tGlyphs.value as THREE.Texture).dispose();
    this.ascii.dispose();
    this.halo.geometry.dispose();
    this.haloMaterial.dispose();
    this.flameMeshes.forEach((m) => (m.material as THREE.Material).dispose());
    this.embers.geometry.dispose();
    (this.embers.material as THREE.Material).dispose();
    this.bloom.dispose();
    this.composer.dispose();
    markState.hover = false;
    markState.dragging = false;
    this.scene.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.materials.forEach((m) => m.dispose());
    this.environment.dispose();
    this.grain.normal.dispose();
    this.grain.roughness.dispose();
    this.renderer.dispose();
  }
}
