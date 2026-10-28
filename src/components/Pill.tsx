'use client';

import { useEffect, useRef } from 'react';

/**
 * A label pill that replaces the cursor over any [data-pill] element (the home hero: "See our work").
 * It trails the pointer, rolls its letters when the label changes, and follows keyboard focus too.
 * data-pill-arrow: '' (→), 'out' (↗) or 'none'.
 */
export default function Pill() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const html = document.documentElement;
    const track = el.querySelector<HTMLElement>('.pill__track')!;

    let tx = -200;
    let ty = -200;
    let x = -200;
    let y = -200;
    let label = '';
    let on = false;
    let raf = 0;
    let last = performance.now();
    let hideTimer = 0;
    let moused = false;
    let focused: HTMLElement | null = null;
    let watched: HTMLElement | null = null;

    const place = () => (el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`);
    const frame = (t: number) => {
      const k = 1 - Math.pow(0.78, Math.min(4, (t - last) / 16.67));
      last = t;
      x += (tx - x) * k;
      y += (ty - y) * k;
      place();
      raf = Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1 ? requestAnimationFrame(frame) : 0;
    };
    const run = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };

    // A new label rolls in letter by letter while the old one rolls out.
    const setLabel = (text: string, arrow: string) => {
      el.dataset.arrow = arrow;
      if (text === label) return;
      const prev = track.querySelector('.pill__t:not(.is-leaving)');
      const next = document.createElement('span');
      next.className = on ? 'pill__t is-entering' : 'pill__t';
      Array.from(text).forEach((c, i) => {
        const s = document.createElement('span');
        s.style.setProperty('--i', String(i));
        s.textContent = c === ' ' ? ' ' : c;
        next.appendChild(s);
      });
      track.appendChild(next);
      if (prev && label && on) {
        prev.classList.add('is-leaving');
        window.setTimeout(() => prev.remove(), 700);
      } else {
        track.querySelectorAll('.pill__t').forEach((t) => t !== next && t.remove());
      }
      if (on) requestAnimationFrame(() => requestAnimationFrame(() => next.classList.remove('is-entering')));
      label = text;
    };

    const show = (visible: boolean) => {
      if (visible === on) return;
      on = visible;
      if (on) {
        // Appear where the pointer is, not sliding in from the last spot.
        x = tx;
        y = ty;
        place();
      }
      el.classList.toggle('is-on', on);
      html.classList.toggle('pill-on', on);
    };

    // Labels can change while hovered.
    const observer = new MutationObserver(() => watched && on && setLabel(watched.dataset.pill || '', watched.dataset.pillArrow || ''));
    const watch = (target: HTMLElement) => {
      if (target === watched) return;
      watched = target;
      observer.disconnect();
      observer.observe(target, { attributes: true, attributeFilter: ['data-pill', 'data-pill-arrow'] });
    };

    const evaluate = (target: Element | null) => {
      const host = target?.closest?.<HTMLElement>('[data-pill]') ?? null;
      const inner = target?.closest?.('button, a');
      // A link nested inside a pill area keeps the normal cursor.
      const nested = !!inner && !!host && inner !== host && host.contains(inner);
      if (host && !nested) {
        window.clearTimeout(hideTimer);
        hideTimer = 0;
        setLabel(host.dataset.pill || '', host.dataset.pillArrow || '');
        watch(host);
        show(true);
      } else if (on) {
        if (nested) {
          window.clearTimeout(hideTimer);
          hideTimer = 0;
          show(false);
        } else if (!hideTimer) {
          // A short grace period so crossing a gap doesn't flicker.
          hideTimer = window.setTimeout(() => {
            hideTimer = 0;
            show(false);
          }, 130);
        }
      }
      run();
    };

    const centreOn = (target: HTMLElement) => {
      const r = target.getBoundingClientRect();
      tx = (Math.max(r.left, 0) + Math.min(r.right, html.clientWidth)) / 2;
      ty = (Math.max(r.top, 0) + Math.min(r.bottom, window.innerHeight)) / 2;
    };
    const onFocusIn = (e: FocusEvent) => {
      const host = (e.target as Element | null)?.closest?.<HTMLElement>('[data-pill]');
      if (!host || !host.matches(':focus-visible')) return;
      focused = host;
      window.clearTimeout(hideTimer);
      hideTimer = 0;
      requestAnimationFrame(() => {
        if (focused !== host) return;
        centreOn(host);
        setLabel(host.dataset.pill || '', host.dataset.pillArrow || '');
        watch(host);
        show(true);
        run();
      });
    };
    const onFocusOut = (e: FocusEvent) => {
      if (!focused || (e.relatedTarget as Element | null)?.closest?.('[data-pill]')) return;
      focused = null;
      show(false);
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      moused = true;
      focused = null;
      tx = e.clientX;
      ty = e.clientY;
      evaluate(e.target as Element | null);
    };
    // Content moves under a still pointer while scrolling.
    const onScroll = () => {
      if (focused) {
        centreOn(focused);
        run();
      } else if (moused) evaluate(document.elementFromPoint(tx, ty));
    };
    const hide = () => {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
      show(false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('focusin', onFocusIn);
    window.addEventListener('focusout', onFocusOut);
    html.addEventListener('pointerleave', hide);
    window.addEventListener('page:leave', hide);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer);
      observer.disconnect();
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('focusin', onFocusIn);
      window.removeEventListener('focusout', onFocusOut);
      html.removeEventListener('pointerleave', hide);
      window.removeEventListener('page:leave', hide);
      html.classList.remove('pill-on');
    };
  }, []);

  return (
    <div ref={ref} className="pill" aria-hidden="true">
      <span className="pill__body">
        <span className="pill__track" />
        <svg className="pill__arrow" viewBox="0 0 10 10">
          <path d="M1.5 5h7M5.5 2l3 3-3 3" />
        </svg>
      </span>
    </div>
  );
}
