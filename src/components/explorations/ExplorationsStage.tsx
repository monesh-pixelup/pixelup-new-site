'use client';

import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';

gsap.registerPlugin(CustomEase);
import type { Exploration } from '@/content/explorations';
import { ArrowSwap } from '../ui';

// The camera flies down Z through a spiral of cards. Every card loops back to the far end
// once it passes the viewer, so the tunnel never runs out.
const SPACING = 150; // px between cards along Z
const MIN_CARDS = 36;
const PERSPECTIVE = 800; // must match the stage's CSS perspective
const FOCAL = 480; // distance ahead at which a card sits on the screen plane (translateZ 0)
const IDLE = 0.55; // forward drift in px per frame while nobody is steering
const WHEEL = 2;
const DRAG = 5;
const MAX_SPEED = 16; // px per frame: fast enough to streak, slow enough that cards stay readable
const MAX_LEAD = 1400; // how far the target may run ahead of the camera, so input can't bank up speed
const SPRING = 0.0065; // camera spring stiffness per frame²
const FLING = 12; // frames of drag velocity carried after release
const ENTER = 2600; // the camera starts this far back and dollies in
const EXIT = 3400; // and flies this far forward on the way out

// The site's house curves (Experience registers the same ones for GSAP).
CustomEase.create('pxl', '0.16, 1, 0.3, 1');
CustomEase.create('pxl-io', '0.76, 0, 0.24, 1');

type Card = { item: number; nx: number; ny: number; z: number; size: number; rx: number; ry: number };

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function layout(count: number) {
  const rand = mulberry32(2026 + count * 7919);
  const n = Math.max(count, MIN_CARDS);
  const cards: Card[] = Array.from({ length: n }, (_, i) => {
    // Golden-angle spiral keeps consecutive cards on opposite sides; the radius floor leaves a clear flight path.
    const angle = 2.39996 * i + 0.5 * rand();
    const radius = 0.34 + 0.66 * Math.sqrt(rand());
    return {
      item: i % count,
      nx: Math.cos(angle) * radius,
      ny: Math.sin(angle) * radius,
      z: SPACING * i,
      size: 0.72 + 0.56 * rand(),
      rx: (rand() * 2 - 1) * 9,
      ry: (rand() * 2 - 1) * 12,
    };
  });
  return { cards, length: SPACING * n };
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const wrap = (v: number, m: number) => ((v % m) + m) % m;

export default function ExplorationsStage({ items }: { items: Exploration[] }) {
  const { cards, length } = useMemo(() => layout(items.length), [items.length]);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const nav = useRef({
    current: 0,
    target: 0,
    speed: 0, // camera velocity along Z, px per frame
    idle: 0, // eased idle drift, so the tunnel glides to a stop on hover rather than braking
    offset: 0, // added to the camera by the enter / exit tweens
    hover: -1, // focused card (index into cards), decided in the frame loop
    pending: -1, // focus candidate waiting out the hysteresis
    pendingFrames: 0,
    keyboard: -1, // card focused by Tab, overrides the pointer
    client: { x: 0, y: 0, inside: false, mouse: true },
    pointer: { x: 0.5, y: 0.5 },
    pointerTarget: { x: 0.5, y: 0.5 },
    drag: { active: false, x: 0, y: 0, origin: 0, moved: 0, lastT: 0, lastTarget: 0, fling: 0 },
  });
  const captionRef = useRef<HTMLDivElement>(null);
  const captionTitleRef = useRef<HTMLSpanElement>(null);
  const captionMetaRef = useRef<HTMLSpanElement>(null);
  const [nearest, setNearest] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Frame loop: writes transforms straight to the DOM, React only hears about the HUD index.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = cards.length;
    const prevPos = new Float32Array(n * 2);
    const prevU = new Float32Array(n).fill(NaN);
    const vel = new Float32Array(n * 2);
    const filters: string[] = [];
    const hidden: boolean[] = new Array(n).fill(true); // matches the CSS default of visibility: hidden
    const focus = new Float32Array(n);
    const widths = new Float32Array(n);
    const measure = () => cards.forEach((_, i) => (widths[i] = cardRefs.current[i]?.offsetWidth ?? 0));
    measure();
    let size = { w: stage.clientWidth, h: stage.clientHeight };
    const caption = { x: 0, y: 0, shown: false };
    let shownNearest = -1;
    let last = performance.now();
    let raf = 0;

    const ro = new ResizeObserver(() => {
      size = { w: stage.clientWidth, h: stage.clientHeight };
      measure();
    });
    ro.observe(stage);

    // Caption text resolves left to right out of scrambled glyphs, the way type settles on a split-flap board.
    const GLYPHS = '/<>=?;:-.@#';
    let scramble = 0;
    const decode = (el: HTMLElement | null, text: string, startAt: number) => {
      if (!el) return;
      const t0 = performance.now() + startAt;
      const step = (t: number) => {
        const p = clamp01((t - t0) / 380);
        const fixed = Math.floor(p * text.length);
        el.textContent = [...text]
          .map((ch, k) => (k < fixed || ch === ' ' ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
          .join('');
        if (p < 1) scramble = requestAnimationFrame(step);
      };
      scramble = requestAnimationFrame(step);
    };

    const setFocus = (i: number) => {
      const s = nav.current;
      if (s.hover >= 0) cardRefs.current[s.hover]?.classList.remove('is-focus');
      s.hover = i;
      s.pendingFrames = 0;
      const cap = captionRef.current;
      stage.classList.toggle('has-focus', i >= 0);
      if (i < 0) {
        cap?.classList.remove('is-shown');
        return;
      }
      cardRefs.current[i]?.classList.add('is-focus');
      const it = items[cards[i].item];
      cancelAnimationFrame(scramble);
      decode(captionTitleRef.current, it.title, 0);
      decode(captionMetaRef.current, `${it.kind} · ${it.year}`, 60);
      cap?.classList.add('is-shown');
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const { w, h } = size;
      if (!w || !h) return;
      const d = Math.min((now - last) / (1000 / 60), 4);
      last = now;
      const s = nav.current;

      const idleGoal = !reduced && !s.drag.active && s.hover < 0 ? IDLE : 0;
      s.idle += (idleGoal - s.idle) * (1 - Math.pow(0.95, d));
      s.target += s.idle * d;
      // However much input arrives, the target never runs more than MAX_LEAD ahead of (or behind) the camera.
      s.target = s.current + Math.max(-MAX_LEAD, Math.min(MAX_LEAD, s.target - s.current));
      // Critically damped spring: moves ease in and out and carry momentum, instead of a lerp's hard start,
      // with the travel speed capped so nobody can rip through the tunnel.
      const k = reduced ? 0.2 : SPRING;
      const damping = 2 * Math.sqrt(k);
      for (let step = 0; step < Math.ceil(d); step++) {
        const h = d / Math.ceil(d);
        s.speed += ((s.target - s.current) * k - s.speed * damping) * h;
        s.speed = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, s.speed));
        s.current += s.speed * h;
      }
      const camera = s.current + s.offset;

      // Focus is decided here, from what is actually under the pointer, not from pointerenter: cards fly past a
      // still cursor, and event-driven hover would flip many times a second. A candidate must hold for a few
      // frames before it takes focus, and focus survives a few frames of nothing, so passing cards can't steal it.
      let candidate = s.keyboard;
      if (candidate < 0 && s.client.inside && s.client.mouse && !s.drag.active) {
        const hit = (document.elementFromPoint(s.client.x, s.client.y) as HTMLElement | null)?.closest<HTMLElement>('.tcard');
        candidate = hit ? Number(hit.dataset.i) : -1;
      }
      if (candidate === s.hover) {
        s.pendingFrames = 0;
      } else {
        s.pendingFrames = candidate === s.pending ? s.pendingFrames + d : d;
        s.pending = candidate;
        if (s.pendingFrames >= (candidate < 0 ? 8 : 4)) setFocus(candidate);
      }
      const follow = 1 - Math.pow(0.95, d);
      s.pointer.x += (s.pointerTarget.x - s.pointer.x) * follow;
      s.pointer.y += (s.pointerTarget.y - s.pointer.y) * follow;
      const sway = reduced ? 0 : 0.12;
      const px = -(s.pointer.x - 0.5) * w * sway;
      const py = -(s.pointer.y - 0.5) * h * sway;
      const velEase = 1 - Math.pow(0.7, d);

      let best = -1;
      let bestDist = Infinity;

      for (let i = 0; i < n; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;
        const c = cards[i];
        const u = wrap(c.z - camera, length); // how far ahead of the camera
        focus[i] += ((i === s.hover ? 1 : 0) - focus[i]) * (1 - Math.pow(0.86, d));
        const f = focus[i];
        // The focused card is drawn out of the stream toward the viewer.
        const tz = FOCAL - u + f * 120;
        const alpha = clamp01((length - u) / (0.2 * length)) * clamp01(u / 260);

        if (alpha <= 0.001) {
          if (!hidden[i]) {
            hidden[i] = true;
            el.style.visibility = 'hidden';
            el.querySelector('video')?.pause();
          }
          prevU[i] = NaN;
          vel[2 * i] = vel[2 * i + 1] = 0;
          continue;
        }
        if (hidden[i]) {
          hidden[i] = false;
          el.style.visibility = 'visible';
          void el.querySelector('video')?.play().catch(() => {});
        }

        const x = w / 2 + c.nx * w * 0.55 + px;
        const y = h / 2 + c.ny * h * 0.55 + py;
        const scale = PERSPECTIVE / (PERSPECTIVE - tz);
        // Far cards project to a few pixels: too small to read or tap, so they drop out instead of clustering.
        if (widths[i] * scale < 44 && f < 0.01) {
          if (!hidden[i]) {
            hidden[i] = true;
            el.style.visibility = 'hidden';
          }
          prevU[i] = NaN;
          continue;
        }
        const sx = (x - w / 2) * scale;
        const sy = (y - h / 2) * scale;

        // Screen-space velocity of this card, so nearer cards streak harder than distant ones.
        let vx = 0;
        let vy = 0;
        if (!Number.isNaN(prevU[i]) && Math.abs(u - prevU[i]) < length / 2) {
          vx = (sx - prevPos[2 * i]) / Math.max(d, 0.001);
          vy = (sy - prevPos[2 * i + 1]) / Math.max(d, 0.001);
        }
        prevPos[2 * i] = sx;
        prevPos[2 * i + 1] = sy;
        prevU[i] = u;
        vel[2 * i] += (vx - vel[2 * i]) * velEase;
        vel[2 * i + 1] += (vy - vel[2 * i + 1]) * velEase;
        const speed = reduced ? 0 : Math.hypot(vel[2 * i], vel[2 * i + 1]);

        // Motion smear: stretch the card along its direction of travel.
        let smear = '';
        const k = Math.min(0.16, 0.006 * speed);
        if (k > 0.002) {
          const ex = vel[2 * i] / speed;
          const ey = vel[2 * i + 1] / speed;
          const shear = (k * ex * ey).toFixed(4);
          smear = ` matrix(${(1 + k * ex * ex).toFixed(4)}, ${shear}, ${shear}, ${(1 + k * ey * ey).toFixed(4)}, 0, 0)`;
        }

        el.style.opacity = alpha.toFixed(3);
        el.style.zIndex = String(Math.round(length - u));
        // ...and turns to face them square.
        const rx = (c.rx * (1 - f)).toFixed(2);
        const ry = (c.ry * (1 - f)).toFixed(2);
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, ${tz.toFixed(2)}px) rotateX(${rx}deg) rotateY(${ry}deg)${smear}`;

        // Depth of field on the far cards plus motion blur, quantised so the filter isn't rebuilt every frame.
        const far = clamp01((u - 900) / (0.85 * length - 900));
        const dof = 3 * far * far * (3 - 2 * far);
        const amount = (Math.min(10, Math.hypot(dof, Math.min(6, 0.25 * speed)) / scale)) * (1 - f);
        const q = amount < 0.3 ? 0 : Math.pow(1.2, Math.round(Math.log(amount) / Math.log(1.2)));
        const filter = q > 0 ? `blur(${q.toFixed(2)}px)` : '';
        if (filters[i] !== filter) {
          filters[i] = filter;
          el.style.filter = filter;
        }

        if (Math.abs(tz) < bestDist) {
          bestDist = Math.abs(tz);
          best = c.item;
        }
      }

      // Caption trails the cursor on a soft spring.
      const cap = captionRef.current;
      if (cap) {
        const follow2 = 1 - Math.pow(0.78, d);
        const r = stage.getBoundingClientRect();
        caption.x += (s.client.x - r.left + 18 - caption.x) * follow2;
        caption.y += (s.client.y - r.top + 20 - caption.y) * follow2;
        cap.style.transform = `translate3d(${caption.x.toFixed(1)}px, ${caption.y.toFixed(1)}px, 0)`;
      }

      if (best !== shownNearest && best >= 0) {
        shownNearest = best;
        setNearest(best);
      }
    };
    raf = requestAnimationFrame(tick);

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 100 / 6 : e.deltaMode === 2 ? window.innerHeight : 1;
      const delta = (Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX) * unit;
      nav.current.target += WHEEL * delta;
    };
    const point = (e: PointerEvent) => {
      const r = stage.getBoundingClientRect();
      const c = nav.current.client;
      c.x = e.clientX;
      c.y = e.clientY;
      c.mouse = e.pointerType === 'mouse' || e.pointerType === 'pen';
      c.inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
      nav.current.pointerTarget.x = clamp01((e.clientX - r.left) / r.width);
      nav.current.pointerTarget.y = clamp01((e.clientY - r.top) / r.height);
    };
    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const s = nav.current;
      s.drag = { active: true, x: e.clientX, y: e.clientY, origin: s.target, moved: 0, lastT: e.timeStamp, lastTarget: s.target, fling: 0 };
      point(e);
    };
    const onMove = (e: PointerEvent) => {
      point(e);
      const s = nav.current;
      if (!s.drag.active) return;
      const dx = e.clientX - s.drag.x;
      const dy = e.clientY - s.drag.y;
      s.drag.moved = Math.max(s.drag.moved, Math.hypot(dx, dy));
      if (s.drag.moved > 6) setDragging(true);
      s.target = s.drag.origin - DRAG * (Math.abs(dy) >= Math.abs(dx) ? dy : dx);
      // Track release velocity (px of travel per 60fps frame) for the fling.
      const dt = Math.max(1, e.timeStamp - s.drag.lastT) / (1000 / 60);
      s.drag.fling = s.drag.fling * 0.6 + ((s.target - s.drag.lastTarget) / dt) * 0.4;
      s.drag.lastT = e.timeStamp;
      s.drag.lastTarget = s.target;
    };
    const onUp = (e: PointerEvent) => {
      const s = nav.current;
      if (!s.drag.active) return;
      s.drag.active = false;
      // A flick keeps travelling; a drag that stopped before release doesn't.
      if (e.timeStamp - s.drag.lastT < 80) s.target += s.drag.fling * FLING;
      setDragging(false);
      // Let the click that ends a drag see `moved` before it resets.
      setTimeout(() => (s.drag.moved = 0), 0);
    };
    const onKey = (e: KeyboardEvent) => {
      const step = { ArrowDown: 1, ArrowRight: 1, PageDown: 3, ArrowUp: -1, ArrowLeft: -1, PageUp: -3 }[e.key];
      if (!step) return;
      e.preventDefault();
      nav.current.target += step * SPACING;
    };

    // Enter: dolly in from deep in the tunnel on the house ease. Exit: accelerate past the viewer.
    const enter = reduced
      ? null
      : gsap.fromTo(nav.current, { offset: -ENTER }, { offset: 0, duration: 2.6, ease: 'pxl', delay: 0.1 });
    const onLeave = () => {
      enter?.kill();
      if (reduced) return;
      gsap.to(nav.current, { offset: `+=${EXIT}`, duration: 0.8, ease: 'power3.in' });
      stage.closest('.exp')?.classList.add('is-leaving');
    };
    window.addEventListener('page:leave', onLeave);

    stage.addEventListener('wheel', onWheel, { passive: false });
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('keydown', onKey);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);

    const onFocusIn = (e: FocusEvent) => {
      const card = (e.target as HTMLElement).closest<HTMLElement>('.tcard');
      if (!card) return;
      const i = Number(card.dataset.i);
      nav.current.keyboard = i;
      nav.current.target += wrap(cards[i].z - nav.current.target, length) - FOCAL; // fly to it
    };
    const onFocusOut = () => (nav.current.keyboard = -1);
    stage.addEventListener('focusin', onFocusIn);
    stage.addEventListener('focusout', onFocusOut);

    return () => {
      cancelAnimationFrame(raf);
      cancelAnimationFrame(scramble);
      stage.removeEventListener('focusin', onFocusIn);
      stage.removeEventListener('focusout', onFocusOut);
      ro.disconnect();
      enter?.kill();
      gsap.killTweensOf(nav.current);
      window.removeEventListener('page:leave', onLeave);
      stage.removeEventListener('wheel', onWheel);
      stage.removeEventListener('pointerdown', onDown);
      stage.removeEventListener('keydown', onKey);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [cards, length, items]);

  const swallowDragClick = (e: React.MouseEvent) => {
    if (nav.current.drag.moved > 6) {
      e.preventDefault();
      e.stopPropagation();
    }
  };


  return (
    <section className="exp" aria-labelledby="exp-title">
      <h1 id="exp-title" className="sr-only">
        Explorations — concepts we killed and the ones we shipped, from PIXELUP LABS
      </h1>

      <div
        ref={stageRef}
        className={`exp-stage${dragging ? ' is-dragging' : ''}`}
        data-lenis-prevent
        tabIndex={-1}
        onClickCapture={swallowDragClick}
      >
        {cards.map((c, i) => {
          const it = items[c.item];
          const { media } = it;
          const Tag = it.href ? 'a' : 'div';
          // Server-rendered opening frame: where the dolly starts, in CSS units, so the tunnel paints before
          // any JavaScript runs. The frame loop picks up from exactly this pose.
          const u0 = wrap(c.z + ENTER, length);
          const alpha0 = clamp01((length - u0) / (0.2 * length)) * clamp01(u0 / 260);
          const scale0 = PERSPECTIVE / (PERSPECTIVE - (FOCAL - u0));
          const minWidth = Math.min(190 * c.size, 190 * 1.3 * (media.w / media.h));
          const visible0 = alpha0 > 0.001 && minWidth * scale0 >= 44;
          return (
            <Tag
              key={i}
              data-i={i}
              ref={(el: HTMLElement | null) => {
                cardRefs.current[i] = el;
              }}
              className="tcard"
              style={
                {
                  '--size': c.size,
                  '--ar': media.w / media.h,
                  '--delay': `${Math.min(i, 10) * 25}ms`,
                  transform: `translate3d(calc(50vw + ${(c.nx * 55).toFixed(3)}vw), calc(50svh + ${(c.ny * 55).toFixed(3)}svh), ${(FOCAL - u0).toFixed(2)}px) rotateX(${c.rx}deg) rotateY(${c.ry}deg)`,
                  opacity: alpha0.toFixed(3),
                  zIndex: Math.round(length - u0),
                  visibility: visible0 ? 'visible' : 'hidden',
                } as React.CSSProperties
              }
              {...(it.href
                ? {
                    href: it.href,
                    target: it.external ? '_blank' : undefined,
                    rel: it.external ? 'noreferrer' : undefined,
                    'aria-label': `${it.title}, ${it.kind}, ${it.year}${it.external ? ' (opens in a new tab)' : ''}`,
                  }
                : { 'aria-label': `${it.title}, ${it.kind}, ${it.year}` })}
              draggable={false}
            >
              <span className="tcard__in">
                {media.kind === 'video' ? (
                  <video src={media.src} muted loop playsInline autoPlay preload="metadata" aria-label={media.alt} />
                ) : (
                  <Image
                    src={media.src}
                    alt={media.alt}
                    width={media.w}
                    height={media.h}
                    sizes="(max-width: 767px) 70vw, 34vw"
                    quality={75}
                    draggable={false}
                    loading={i < 14 ? 'eager' : 'lazy'}
                  />
                )}
              </span>
            </Tag>
          );
        })}
      </div>

      <div className="exp__chrome" aria-hidden="true">
        <div className="exp__scan" />
        <div className="exp__frame" />
      </div>

      {/* Cursor caption: small, only while a card has focus. Names are on the cards for assistive tech. */}
      <div ref={captionRef} className="exp__caption" aria-hidden="true">
        <span ref={captionTitleRef} className="exp__caption-title" />
        <span className="exp__caption-meta">
          <span ref={captionMetaRef} />
          <ArrowSwap rotate={-45} />
        </span>
      </div>

      <p className="exp__hud" aria-hidden="true">
        <span>Scroll / drag to fly</span>
        <span className="exp__hud-sep">/</span>
        <span className="exp__hud-count">
          <span key={nearest} className="exp__hud-num">
            {String(nearest + 1).padStart(2, '0')}
          </span>{' '}
          — {String(items.length).padStart(2, '0')}
        </span>
      </p>
    </section>
  );
}
