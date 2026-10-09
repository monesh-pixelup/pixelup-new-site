'use client';

import { useEffect, useRef } from 'react';
import { markState } from '@/lib/markState';

const HANDLES = 8;

export default function MarkCanvas() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const uiRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const ui = uiRef.current;
    if (!root || !canvas || !ui) return;

    let scene: { dispose(): void } | null = null;
    let cancelled = false;

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
      scene?.dispose();
      markState.ready = false;
    };
  }, []);

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
          <span>pixelup / mark</span>
        </span>
        <span className="mark__size">
          <span>432 × 540</span>
        </span>
      </div>
    </div>
  );
}
