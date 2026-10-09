'use client';

import { useEffect, useRef } from 'react';
import type { Exploration } from '@/content/explorations';

type Props = {
  items: Exploration[];
  onActive: (index: number) => void;
  onReady: () => void;
  onProgress: (p: number) => void;
};

export default function ExplorationsCanvas({ items, onActive, onReady, onProgress }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoHostRef = useRef<HTMLDivElement>(null);
  // Latest-value refs so the scene can call fresh handlers without remounting on parent re-renders.
  const activeRef = useRef(onActive);
  const readyRef = useRef(onReady);
  const progressRef = useRef(onProgress);
  activeRef.current = onActive;
  readyRef.current = onReady;
  progressRef.current = onProgress;

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const host = videoHostRef.current;
    if (!root || !canvas || !host) return;

    let scene: { dispose(): void } | null = null;
    let cancelled = false;

    import('./ExplorationsScene')
      .then(({ ExplorationsScene }) => {
        if (cancelled) return;
        const videos = Array.from(host.querySelectorAll('video'));
        scene = new ExplorationsScene({
          root,
          canvas,
          items,
          videos,
          onActive: (i) => activeRef.current(i),
          onReady: () => readyRef.current(),
          onProgress: (p) => progressRef.current(p),
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
      scene?.dispose();
    };
    // Items is a module-level constant from content/explorations.ts; its reference is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  return (
    <div className="exp-stage" ref={rootRef}>
      <canvas className="exp-stage__canvas" ref={canvasRef} />
      {/* Hidden <video> elements that feed VideoTexture — kept in the DOM so autoplay works. */}
      <div className="exp-stage__videos" ref={videoHostRef} aria-hidden="true">
        {items.map((it) =>
          it.media.kind === 'video' ? (
            <video
              key={it.slug}
              data-slug={it.slug}
              src={it.media.src}
              muted
              loop
              playsInline
              preload="auto"
              crossOrigin="anonymous"
            />
          ) : null,
        )}
      </div>
      <div className="exp-stage__floor" aria-hidden="true" />
      <ul className="exp-stage__dots" role="list" aria-hidden="true">
        {items.map((it) => (
          <li key={it.slug} />
        ))}
      </ul>
    </div>
  );
}
