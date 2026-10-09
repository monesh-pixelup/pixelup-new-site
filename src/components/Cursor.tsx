'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { markState } from '@/lib/markState';

export default function Cursor() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const html = document.documentElement;
    const dot = el.querySelector<HTMLElement>('.cursor__dot')!;
    const label = el.querySelector<HTMLElement>('.cursor__label')!;
    const text = label.querySelector<HTMLElement>('span')!;
    html.classList.add('has-cursor');

    let x = -100;
    let y = -100;
    let lx = x;
    let ly = y;
    let shown = false;
    let target: Element | null = null;
    let mode = '';
    let words = '';

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      x = e.clientX;
      y = e.clientY;
      if (!shown) {
        shown = true;
        lx = x;
        ly = y;
        el.classList.add('is-visible');
      }
    };
    const onOver = (e: PointerEvent) => {
      target = (e.target as Element | null)?.closest?.('a, button, [data-cursor]') ?? null;
    };
    const onLeave = () => {
      shown = false;
      el.classList.remove('is-visible');
    };
    const onDown = () => el.classList.add('is-down');
    const onUp = () => el.classList.remove('is-down');

    const tick = (_t: number, deltaMs: number) => {
      const k = 1 - Math.exp(-(deltaMs / 1000) * 16);
      lx += (x - lx) * k;
      ly += (y - ly) * k;
      dot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      label.style.transform = `translate3d(${lx.toFixed(1)}px, ${ly.toFixed(1)}px, 0)`;

      let next = '';
      let copy = '';
      const custom = target?.getAttribute('data-cursor');
      if (markState.dragging) {
        next = 'label';
        copy = 'Spin';
      } else if (custom) {
        next = 'label';
        copy = custom;
      } else if (markState.hover) {
        next = 'label';
        copy = 'Drag';
      } else if (target) {
        next = 'link';
      }
      if (copy && copy !== words) {
        words = copy;
        text.textContent = copy;
      }
      if (next !== mode) {
        mode = next;
        el.dataset.mode = next;
      }
    };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerover', onOver, { passive: true });
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    html.addEventListener('pointerleave', onLeave);
    gsap.ticker.add(tick);

    return () => {
      gsap.ticker.remove(tick);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerover', onOver);
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      html.removeEventListener('pointerleave', onLeave);
      html.classList.remove('has-cursor');
    };
  }, []);

  return (
    <div ref={ref} className="cursor" aria-hidden="true">
      <span className="cursor__dot" />
      <span className="cursor__label">
        <span />
      </span>
    </div>
  );
}
