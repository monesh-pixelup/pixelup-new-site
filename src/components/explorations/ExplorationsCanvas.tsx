'use client';

import { useEffect, useRef } from 'react';
import type { Exploration } from '@/content/explorations';

type Props = {
  items: Exploration[];
  effect: 'Drift' | 'Smear';
  onActive: (index: number | null) => void;
  onReady: () => void;
};

export default function ExplorationsCanvas({ items, effect, onActive, onReady }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoHostRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ dispose(): void; setEffect(e: 'Drift' | 'Smear'): void } | null>(null);
  const activeRef = useRef(onActive);
  const readyRef = useRef(onReady);
  activeRef.current = onActive;
  readyRef.current = onReady;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const host = videoHostRef.current;
    if (!root || !canvas || !host) return;

    let cancelled = false;
    import('./ExplorationsScene')
      .then(({ ExplorationsScene }) => {
        if (cancelled) return;
        const videos = Array.from(host.querySelectorAll('video'));
        sceneRef.current = new ExplorationsScene({
          root,
          canvas,
          items,
          videos,
          onActive: (i) => activeRef.current(i),
          onReady: () => readyRef.current(),
        });
      })
      .catch((err) => {
        if (cancelled) return;
        console.warn('[explorations] WebGL failed, falling back', err);
        root.classList.add('is-fallback');
        readyRef.current();
      });

    return () => {
      cancelled = true;
      sceneRef.current?.dispose();
      sceneRef.current = null;
    };
  }, [items]);

  useEffect(() => {
    sceneRef.current?.setEffect(effect);
  }, [effect]);

  return (
    <div className="exp-stage" ref={rootRef}>
      <canvas className="exp-stage__canvas" ref={canvasRef} />
      <div className="exp-stage__videos" ref={videoHostRef} aria-hidden="true">
        {items.map((it) =>
          it.media.kind === 'video' ? (
            <video key={it.slug} data-slug={it.slug} src={it.media.src} muted loop playsInline preload="auto" />
          ) : null,
        )}
      </div>
    </div>
  );
}
