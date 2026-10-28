'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { markState } from '@/lib/markState';

const HANDLES = 8;

export default function MarkCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  // Pages marked data-mark="off" (home) go without the mark; it loads on the first page that shows it, then stays.
  const [wanted, setWanted] = useState(false);

  useEffect(() => {
    setWanted((w) => w || !document.querySelector('[data-mark="off"]'));
  }, [pathname]);

  useEffect(() => {
    if (!wanted) return;
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ui = uiRef.current;
    if (!root || !canvas || !ui) return;

    let scene: { dispose(): void } | null = null;
    let cancelled = false;
    let started = false;

    // three.js and the shader compile are the heaviest work on the site. Start them once the page is usable:
    // on the first interaction, or a few seconds after load if nobody interacts. The mark then assembles in.
    const triggers = ['pointermove', 'pointerdown', 'touchstart', 'wheel', 'keydown', 'scroll'] as const;
    let timer = 0;
    const onLoad = () => {
      timer = window.setTimeout(start, 3500);
    };
    const release = () => {
      triggers.forEach((t) => window.removeEventListener(t, start));
      window.removeEventListener('load', onLoad);
      window.clearTimeout(timer);
    };
    function start() {
      if (started || cancelled) return;
      started = true;
      release();
      load();
    }
    triggers.forEach((t) => window.addEventListener(t, start, { passive: true }));
    if (document.readyState === 'complete') onLoad();
    else window.addEventListener('load', onLoad);

    const load = () =>
      import('./MarkScene')
        .then(({ MarkScene }) => {
          if (cancelled) return;
          scene = new MarkScene(canvas, {
            root: ui,
            handles: Array.from(ui.querySelectorAll<HTMLElement>('.mark__handle')),
            frame: ui.querySelector('polygon') as SVGPolygonElement,
            label: ui.querySelector('.mark__label') as HTMLElement,
            size: ui.querySelector('.mark__size') as HTMLElement,
            sizeText: ui.querySelector('.mark__size span') as HTMLElement,
          });
          markState.ready = true;
          window.dispatchEvent(new Event('mark:ready'));
        })
        .catch(() => {
          if (cancelled) return;
          markState.failed = true;
          root.classList.add('is-fallback');
          window.dispatchEvent(new Event('mark:ready'));
        });

    return () => {
      cancelled = true;
      release();
      scene?.dispose();
      markState.ready = false;
    };
  }, [wanted]);

  return (
    <div className="mark" ref={rootRef} aria-hidden="true">
      <canvas className="mark__canvas" ref={canvasRef} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className="mark__fallback" src="/mark.svg" alt="" />
      <div className="mark__ui" ref={uiRef}>
        <svg className="mark__frame">
          <polygon points="0,0 0,0 0,0 0,0" />
        </svg>
        {Array.from({ length: HANDLES }, (_, i) => (
          <i className="mark__handle" key={i} />
        ))}
        <span className="mark__label">
          <span>pixelup / chrome</span>
        </span>
        <span className="mark__size">
          <span>432 × 540</span>
        </span>
      </div>
    </div>
  );
}
