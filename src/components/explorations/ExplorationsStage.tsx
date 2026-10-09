'use client';

import { useEffect, useRef, useState } from 'react';
import type { Exploration } from '@/content/explorations';
import ExplorationsCanvas from './ExplorationsCanvas';

export default function ExplorationsStage({ items }: { items: Exploration[] }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [ready, setReady] = useState(false);
  const [progress, setProgress] = useState(0);
  const [mode, setMode] = useState<'canvas' | 'grid'>('canvas');

  // Pick the layout once on mount. Phones get the stacked grid: WebGL on a curved sheet
  // is too much heat for the payoff at that width.
  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 767px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMode(narrow || reduced ? 'grid' : 'canvas');
  }, []);

  const current = items[active] ?? items[0];

  return (
    <section
      ref={stageRef}
      className="exp"
      data-mode={mode}
      data-ready={ready ? 'true' : 'false'}
      aria-labelledby="exp-title"
    >
      <header className="exp__intro">
        <p className="exp__kicker" data-intro="fade">
          Explorations · {String(items.length).padStart(2, '0')}
        </p>
        <h1 id="exp-title" className="exp__title" data-intro="lines">
          A walk-through of the work and the research around it.
        </h1>
        <p className="exp__lede" data-intro="fade">
          Brand systems, product surfaces and type studies, drawn onto a curved stage. Scroll to turn the room, pick one to open it.
        </p>
      </header>

      {mode === 'canvas' ? (
        <ExplorationsCanvas
          items={items}
          onActive={setActive}
          onReady={() => setReady(true)}
          onProgress={setProgress}
        />
      ) : (
        <ExplorationsGrid items={items} onActive={setActive} />
      )}

      {mode === 'canvas' && (
        <div className="exp__ghost" aria-hidden="true">
          <span key={active} className="exp__ghost-num">
            {String(active + 1).padStart(2, '0')}
          </span>
        </div>
      )}

      <aside className="exp__meta" aria-live="polite">
        <div className="exp__meta-head">
          <span className="exp__meta-index">
            {String(active + 1).padStart(2, '0')} <i>/</i> {String(items.length).padStart(2, '0')}
          </span>
          <span className="exp__meta-kind">{current?.kind}</span>
        </div>
        <h2 className="exp__meta-title">
          {current?.href ? (
            <a href={current.href}>{current.title}</a>
          ) : (
            current?.title
          )}
        </h2>
        <p className="exp__meta-sum">{current?.summary}</p>
        <ul className="exp__meta-tags">
          {current?.tags.map((t) => (
            <li key={t}>{t}</li>
          ))}
          <li className="exp__meta-year">{current?.year}</li>
        </ul>
      </aside>

      {mode === 'canvas' && (
        <div className="exp__scrubber" aria-hidden="true">
          <i className="exp__scrubber-rail" />
          <i className="exp__scrubber-dot" style={{ transform: `translateX(${progress * 100}%)` }} />
          <span className="exp__scrubber-hint">Scroll to turn</span>
        </div>
      )}
    </section>
  );
}

function ExplorationsGrid({ items, onActive }: { items: Exploration[]; onActive: (i: number) => void }) {
  // Mobile — a stacked card deck, each card slightly rotated so the ribbon still reads.
  return (
    <ol className="exp-grid" role="list">
      {items.map((it, i) => (
        <li
          key={it.slug}
          className="exp-grid__item"
          style={{ ['--rot' as string]: `${((i % 2) * 2 - 1) * 1.5}deg` }}
          onPointerEnter={() => onActive(i)}
          onFocus={() => onActive(i)}
        >
          <a href={it.href ?? '#'} className="exp-grid__link">
            <figure className="exp-grid__media" style={{ background: it.accent ?? '#161616' }}>
              {it.media.kind === 'video' ? (
                <video
                  src={it.media.src}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label={it.media.alt}
                />
              ) : it.media.kind === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={it.media.src} alt={it.media.alt} loading="lazy" />
              ) : null}
            </figure>
            <div className="exp-grid__row">
              <span className="exp-grid__idx">{String(i + 1).padStart(2, '0')}</span>
              <span className="exp-grid__title">{it.title}</span>
              <span className="exp-grid__year">{it.year}</span>
            </div>
          </a>
        </li>
      ))}
    </ol>
  );
}
