'use client';

import { useEffect, useRef } from 'react';

/**
 * A small card that follows the cursor over [data-logo] items (the home clients drum) and shows that client's logo.
 * It leans into the direction of travel, and a new logo rolls up as the old one leaves.
 */
export default function LogoPop() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const html = document.documentElement;
    const card = el.querySelector<HTMLElement>('.pop__card')!;
    const stack = el.querySelector<HTMLElement>('.pop__stack')!;

    let tx = -300;
    let ty = -300;
    let x = -300;
    let y = -300;
    let vx = 0;
    let tilt = 0;
    let shown = '';
    let on = false;
    let raf = 0;
    let last = performance.now();
    let swapped = 0;
    let hideTimer = 0;
    let moused = false;
    const cache = new Map<string, HTMLImageElement>();

    const frame = (t: number) => {
      const f = Math.min(4, (t - last) / 16.67);
      last = t;
      const k = 1 - Math.pow(0.8, f);
      const nx = x + (tx - x) * k;
      vx += ((nx - x) / Math.max(f, 0.25) - vx) * 0.25;
      x = nx;
      y += (ty - y) * k;
      tilt += (Math.max(-7, Math.min(7, vx * 0.35)) - tilt) * 0.18;
      el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0) rotate(${tilt.toFixed(2)}deg)`;
      const moving = Math.abs(tx - x) > 0.1 || Math.abs(ty - y) > 0.1 || Math.abs(tilt) > 0.05;
      raf = moving ? requestAnimationFrame(frame) : 0;
    };
    const image = (src: string) => {
      let img = cache.get(src);
      if (!img) {
        img = new Image();
        img.src = src;
        img.alt = '';
        img.decode?.().catch(() => {});
        cache.set(src, img);
      }
      return img;
    };
    // Warm the logos shortly after load so the first hover is instant.
    const preload = window.setTimeout(() => document.querySelectorAll<HTMLElement>('[data-logo]').forEach((n) => image(n.dataset.logo!)), 1800);

    const swap = (src: string, ratio: number, name: string) => {
      if (src === shown) return;
      const now = performance.now();
      const roll = on && now - swapped > 320;
      swapped = now;
      card.style.setProperty('--ar', String(ratio || 3));
      const logo = document.createElement('span');
      logo.className = roll ? 'pop__logo is-in' : 'pop__logo';
      logo.style.setProperty('--ar', String(ratio || 3));
      logo.setAttribute('aria-label', name);
      logo.appendChild(image(src).cloneNode());
      const old = Array.from(stack.querySelectorAll('.pop__logo'));
      stack.appendChild(logo);
      old.forEach((o, i) => {
        if (!roll || i < old.length - 1) return o.remove();
        o.classList.add('is-out');
        window.setTimeout(() => o.remove(), 650);
      });
      if (roll) requestAnimationFrame(() => requestAnimationFrame(() => logo.classList.remove('is-in')));
      shown = src;
    };
    const show = (visible: boolean) => {
      if (visible === on) return;
      on = visible;
      if (on) {
        x = tx;
        y = ty;
        vx = tilt = 0;
        el.style.transform = `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)`;
      }
      el.classList.toggle('is-on', on);
      html.classList.toggle('pop-on', on);
    };
    const evaluate = (target: Element | null) => {
      const host = target?.closest?.<HTMLElement>('[data-logo]');
      if (host) {
        window.clearTimeout(hideTimer);
        hideTimer = 0;
        swap(host.dataset.logo!, Number(host.dataset.logoRatio), host.dataset.logoName || '');
        show(true);
      } else if (on && !hideTimer) {
        hideTimer = window.setTimeout(() => {
          hideTimer = 0;
          show(false);
        }, 130);
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      moused = true;
      tx = e.clientX;
      ty = e.clientY;
      evaluate(e.target as Element | null);
    };
    const onScroll = () => moused && evaluate(document.elementFromPoint(tx, ty));
    const hide = () => {
      window.clearTimeout(hideTimer);
      hideTimer = 0;
      show(false);
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    html.addEventListener('pointerleave', hide);
    window.addEventListener('page:leave', hide);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(preload);
      window.clearTimeout(hideTimer);
      html.classList.remove('pop-on');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('scroll', onScroll);
      html.removeEventListener('pointerleave', hide);
      window.removeEventListener('page:leave', hide);
    };
  }, []);

  return (
    <div ref={ref} className="pop" aria-hidden="true">
      <span className="pop__card">
        <span className="pop__stack" />
      </span>
    </div>
  );
}
