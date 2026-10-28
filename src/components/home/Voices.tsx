'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { ArrowSwap } from '@/components/ui';
import type { Vars } from './parts';

type Voice = { company: string; quote: string; highlight?: string; name: string; title: string; href?: string; plate: string };

const pad = (n: number) => String(n).padStart(2, '0');

function Quote({ v, i, n }: { v: Voice; i: number; n: number }) {
  const at = v.highlight ? v.quote.indexOf(v.highlight) : -1;
  const plate = (
    <span className="hv-q__wipe">
      <span className="hv-q__drift">
        <Image src={v.plate} alt="" fill draggable={false} sizes="(max-width: 767px) 88vw, (max-width: 1023px) 66vw, 39vw" />
      </span>
    </span>
  );
  return (
    <li className="hv-q" style={{ '--i': i } as Vars} aria-roledescription="slide" aria-label={`${i + 1} of ${n}: ${v.company}`}>
      <div className="hv-q__in">
        <p className="hv-q__slug" aria-hidden="true">
          <span className="hv-q__n">{pad(i + 1)}</span>
          <span className="hv-q__co">{v.company}</span>
        </p>
        <figure className="hv-q__say">
          <blockquote className="hv-q__quote">
            {v.highlight && at >= 0 ? (
              <p>
                “{v.quote.slice(0, at)}
                <mark className="hv-q__mark">
                  <span className="hv-q__lit">{v.highlight}</span>
                </mark>
                {v.quote.slice(at + v.highlight.length)}”
              </p>
            ) : (
              <p>“{v.quote}”</p>
            )}
          </blockquote>
          <figcaption className="hv-q__by">
            <span className="hv-q__who">
              <span className="hv-q__name">{v.name}</span>
              <span className="hv-q__title">{v.title}</span>
            </span>
            {v.href && (
              <a href={v.href} className="hv-q__more" aria-label={`${v.company} case study`} draggable={false}>
                <span>Case study</span>
                <ArrowSwap />
              </a>
            )}
          </figcaption>
        </figure>
        {v.href ? (
          <a href={v.href} className="hv-q__plate" tabIndex={-1} aria-hidden="true" data-pill="View case study" draggable={false}>
            {plate}
          </a>
        ) : (
          <span className="hv-q__plate">{plate}</span>
        )}
      </div>
    </li>
  );
}

/**
 * The testimonials carousel from /next. With a fine pointer the track is driven by hand (drag with a flick, sideways
 * wheel, arrows) and eases to the nearest card; on touch it is a native scroll-snap strip.
 */
export default function Voices({ voices }: { voices: Voice[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLOListElement>(null);
  const rangeRef = useRef<HTMLSpanElement>(null);
  const step = useRef<(dir: number) => void>(() => {});
  const [ends, setEnds] = useState({ start: true, end: false });
  const [fine, setFine] = useState(false);
  const [live, setLive] = useState('');

  useEffect(() => {
    const root = rootRef.current;
    const view = viewRef.current;
    const track = trackRef.current;
    const range = rangeRef.current;
    if (!root || !view || !track || !range) return;
    const cards = Array.from(track.children) as HTMLElement[];
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const isFine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    setFine(isFine);

    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          root.classList.add('is-in');
          io.disconnect();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(root);

    let max = 0;
    let stops = [0];
    let target = 0;
    let pos = 0;
    let last = 0;
    let raf = 0;
    let then = 0;
    let wheelT = 0;
    let wheelFrom = 0;
    let swallow = false;
    let shown = '';
    let drag: { x: number; from: number; lx: number; lt: number; v: number; moved: boolean; id: number } | null = null;

    const clamp = (x: number) => Math.min(max, Math.max(0, x));
    const nearest = (x: number) => stops.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a), 0);
    const flag = (x: number) =>
      setEnds((s) => (s.start === x <= 1 && s.end === x >= max - 1 ? s : { start: x <= 1, end: x >= max - 1 }));
    const measure = () => {
      const left = parseFloat(getComputedStyle(track).paddingLeft) || 0;
      const tail = cards[cards.length - 1];
      max = Math.max(0, Math.round(tail.offsetLeft + tail.offsetWidth + left - view.clientWidth));
      stops = [...new Set(cards.map((c) => Math.min(max, Math.round(c.offsetLeft - left))))];
      root.style.setProperty('--thumb', max ? (view.clientWidth / (view.clientWidth + max)).toFixed(4) : '1');
    };
    const visible = (x: number) => {
      const w = view.clientWidth;
      const seen = cards
        .map((c, i) => [c.offsetLeft - x, c.offsetLeft - x + c.offsetWidth, i])
        .filter(([l, r]) => l >= -1 && r <= w + 1);
      if (!seen.length) return { text: shown || '01', a: 0, b: 0 };
      const a = seen[0][2];
      const b = seen[seen.length - 1][2];
      return { text: a === b ? pad(a + 1) : `${pad(a + 1)}–${pad(b + 1)}`, a, b };
    };
    const announce = (x: number) => {
      const { a, b } = visible(x);
      setLive(`Testimonials ${a + 1}${a === b ? '' : ` to ${b + 1}`} of ${cards.length}`);
    };
    // The range rolls figure by figure: the old one up and out, the new one up and in.
    const roll = (text: string) => {
      if (text === shown) return;
      const prev = shown;
      shown = text;
      if (!prev || reduced || !range.animate) {
        range.textContent = text;
        return;
      }
      const make = (t: string, cls: string) => {
        const s = document.createElement('span');
        s.className = cls;
        s.innerHTML = Array.from(t).map((ch) => `<span>${ch}</span>`).join('');
        return s;
      };
      const out = make(prev, 'hv__roll is-out');
      const into = make(text, 'hv__roll');
      range.replaceChildren(out, into);
      const easing = 'cubic-bezier(0.76, 0, 0.24, 1)';
      Array.from(out.children).forEach((el, i) =>
        el.animate([{ transform: 'translateY(0)' }, { transform: 'translateY(-100%)' }], { duration: 550, delay: 16 * i, easing, fill: 'forwards' }),
      );
      Promise.all(
        Array.from(into.children)
          .map((el, i) => el.animate([{ transform: 'translateY(100%)' }, { transform: 'translateY(0)' }], { duration: 550, delay: 16 * i, easing, fill: 'backwards' }))
          .map((a) => a.finished),
      )
        .then(() => {
          if (shown === text) range.textContent = text;
        })
        .catch(() => {});
    };
    const paint = (x: number, vel: number) => {
      if (isFine) track.style.transform = `translate3d(${(-x).toFixed(2)}px, 0, 0)`;
      track.style.setProperty('--v', reduced ? '0' : vel.toFixed(3));
      root.style.setProperty('--prog', max ? Math.min(1, Math.max(0, x / max)).toFixed(4) : '0');
      const w = view.clientWidth;
      for (const c of cards) {
        const p = reduced ? 0 : Math.max(-1, Math.min(1, (c.offsetLeft - x + c.offsetWidth / 2 - w / 2) / w));
        c.style.setProperty('--p', p.toFixed(3));
      }
      roll(visible(x).text);
    };
    const tick = (now: number) => {
      const dt = Math.min(64, now - then);
      then = now;
      const k = reduced ? 1 : drag ? 0.5 : 1 - Math.pow(0.915, dt / 16.67);
      pos += (target - pos) * k;
      const settled = !drag && Math.abs(target - pos) < 0.05;
      if (settled) pos = target;
      paint(pos, Math.max(-1, Math.min(1, (pos - last) / 40)));
      last = pos;
      if (settled) {
        raf = 0;
        root.classList.remove('is-moving');
        announce(pos);
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    const run = () => {
      if (raf) return;
      root.classList.add('is-moving');
      then = performance.now();
      raf = requestAnimationFrame(tick);
    };
    const go = (x: number) => {
      target = clamp(x);
      flag(target);
      run();
    };

    if (isFine) {
      const down = (e: PointerEvent) => {
        if (e.pointerType !== 'mouse' || e.button !== 0) return;
        drag = { x: e.clientX, from: target, lx: e.clientX, lt: e.timeStamp, v: 0, moved: false, id: e.pointerId };
      };
      const move = (e: PointerEvent) => {
        if (!drag) return;
        const dx = e.clientX - drag.x;
        if (!drag.moved && Math.abs(dx) > 5) {
          drag.moved = true;
          root.classList.add('is-drag');
          view.setPointerCapture(drag.id);
        }
        if (!drag.moved) return;
        // Past either end the track gives at a third of the pull.
        let x = drag.from - dx;
        if (x < 0) x *= 0.35;
        else if (x > max) x = max + (x - max) * 0.35;
        target = x;
        const dt = e.timeStamp - drag.lt;
        if (dt > 0) drag.v = 0.6 * drag.v + ((e.clientX - drag.lx) / dt) * 0.4;
        drag.lx = e.clientX;
        drag.lt = e.timeStamp;
        run();
      };
      const up = () => {
        if (!drag) return;
        const d = drag;
        drag = null;
        root.classList.remove('is-drag');
        if (d.moved) {
          swallow = true;
          window.setTimeout(() => (swallow = false), 0);
          go(nearest(clamp(target - 260 * d.v)));
        }
      };
      const click = (e: MouseEvent) => {
        if (swallow) {
          e.preventDefault();
          e.stopPropagation();
        }
      };
      const wheel = (e: WheelEvent) => {
        if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
        e.preventDefault();
        e.stopPropagation();
        if (!wheelT) wheelFrom = target;
        target = clamp(target + e.deltaX);
        flag(target);
        run();
        window.clearTimeout(wheelT);
        // Settle on the next card in the direction of the swipe; snapping to the nearest pulled short swipes back.
        wheelT = window.setTimeout(() => {
          wheelT = 0;
          const moved = target - wheelFrom;
          if (Math.abs(moved) < 8) go(nearest(target));
          else if (moved > 0) go(stops.find((s) => s >= target - 1) ?? max);
          else go([...stops].reverse().find((s) => s <= target + 1) ?? 0);
        }, 180);
      };
      view.addEventListener('pointerdown', down);
      window.addEventListener('pointermove', move, { passive: true });
      window.addEventListener('pointerup', up);
      window.addEventListener('pointercancel', up);
      view.addEventListener('click', click, true);
      view.addEventListener('wheel', wheel, { passive: false });
      step.current = (dir) =>
        go(dir > 0 ? (stops.find((s) => s > target + 1) ?? max) : ([...stops].reverse().find((s) => s < target - 1) ?? 0));
      // Tabbing to a card that is out of view brings it in.
      const focus = (e: FocusEvent) => {
        const card = (e.target as HTMLElement).closest<HTMLElement>('.hv-q');
        if (!card) return;
        view.scrollLeft = 0;
        const left = parseFloat(getComputedStyle(track).paddingLeft) || 0;
        const x = card.offsetLeft - target;
        if (x < 0 || x + card.offsetWidth > view.clientWidth) go(nearest(card.offsetLeft - left));
      };
      track.addEventListener('focusin', focus);
      const resize = () => {
        measure();
        target = pos = last = nearest(clamp(target));
        paint(pos, 0);
        flag(target);
      };
      measure();
      paint(0, 0);
      flag(0);
      announce(0);
      window.addEventListener('resize', resize);
      return () => {
        io.disconnect();
        cancelAnimationFrame(raf);
        window.clearTimeout(wheelT);
        view.removeEventListener('pointerdown', down);
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        window.removeEventListener('pointercancel', up);
        view.removeEventListener('click', click, true);
        view.removeEventListener('wheel', wheel);
        track.removeEventListener('focusin', focus);
        window.removeEventListener('resize', resize);
      };
    }

    // Touch: the view scrolls natively and snaps; the rail, range and parallax follow it.
    let frame = 0;
    let settleT = 0;
    const scroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        pos = view.scrollLeft;
        flag(pos);
        paint(pos, 0);
      });
      window.clearTimeout(settleT);
      settleT = window.setTimeout(() => announce(view.scrollLeft), 120);
    };
    step.current = (dir) => {
      const x = view.scrollLeft;
      const to = dir > 0 ? (stops.find((s) => s > x + 1) ?? max) : ([...stops].reverse().find((s) => s < x - 1) ?? 0);
      view.scrollTo({ left: to, behavior: reduced ? 'auto' : 'smooth' });
    };
    const resize = () => {
      measure();
      pos = view.scrollLeft;
      flag(pos);
      paint(pos, 0);
    };
    resize();
    announce(0);
    view.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', resize);
    return () => {
      io.disconnect();
      cancelAnimationFrame(frame);
      window.clearTimeout(settleT);
      view.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className="hv"
      role="region"
      aria-roledescription="carousel"
      aria-label="What clients say"
      onKeyDown={(e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
        e.preventDefault();
        step.current(e.key === 'ArrowRight' ? 1 : -1);
      }}
    >
      <div className="hv__bar">
        <p className="hv__count" aria-hidden="true">
          <span ref={rangeRef} className="hv__range">
            01–02
          </span>
          <span className="hv__of"> / {pad(voices.length)}</span>
        </p>
        <p className="sr-only" aria-live="polite">
          {live}
        </p>
        <div className="hv__nav">
          <button type="button" className="hv__btn" aria-label="Previous testimonials" disabled={ends.start} onClick={() => step.current(-1)}>
            <ArrowSwap rotate={180} />
          </button>
          <button type="button" className="hv__btn" aria-label="Next testimonials" disabled={ends.end} onClick={() => step.current(1)}>
            <ArrowSwap />
          </button>
        </div>
      </div>
      <span className="hv__rail" aria-hidden="true">
        <i />
      </span>
      <div ref={viewRef} className="hv__view" data-pill={fine ? 'Drag' : undefined} data-pill-arrow={fine ? 'none' : undefined}>
        <ol ref={trackRef} className="hv__track">
          {voices.map((v, i) => (
            <Quote key={v.company} v={v} i={i} n={voices.length} />
          ))}
        </ol>
      </div>
    </div>
  );
}
