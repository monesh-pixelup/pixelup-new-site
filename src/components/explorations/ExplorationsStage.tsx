'use client';

import { useEffect, useRef, useState } from 'react';
import type { Exploration } from '@/content/explorations';
import ExplorationsCanvas from './ExplorationsCanvas';

const EFFECTS = ['Drift', 'Smear'] as const;
type Effect = (typeof EFFECTS)[number];

export default function ExplorationsStage({ items }: { items: Exploration[] }) {
  const stageRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [effect, setEffect] = useState<Effect>('Drift');
  const [mode, setMode] = useState<'canvas' | 'grid'>('canvas');

  useEffect(() => {
    const narrow = window.matchMedia('(max-width: 767px)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    setMode(narrow || reduced ? 'grid' : 'canvas');
  }, []);

  const current = active != null ? items[active] : null;

  return (
    <section ref={stageRef} className="exp" data-mode={mode} data-ready={ready ? 'true' : 'false'} aria-labelledby="exp-title">
      <h1 id="exp-title" className="sr-only">
        Explorations
      </h1>

      {mode === 'canvas' ? (
        <>
          <ExplorationsCanvas items={items} effect={effect} onActive={setActive} onReady={() => setReady(true)} />
          <div className="exp__chrome" aria-hidden="true">
            <div className="exp__scan" />
            <div className="exp__frame" />
          </div>
          <header className="exp__intro">
            <p className="exp__kicker">PIXELUP · Explorations</p>
            <p className="exp__title">
              Concepts we killed — and the ones that pushed everything forward.
            </p>
          </header>
          <footer className="exp__hud">
            <span className="exp__hud-slot">Scroll / drag to move</span>
            <span className="exp__hud-sep" aria-hidden="true">
              /
            </span>
            {EFFECTS.map((e) => (
              <button
                key={e}
                type="button"
                className="exp__hud-btn"
                aria-pressed={effect === e}
                onClick={() => setEffect(e)}
              >
                {e}
              </button>
            ))}
          </footer>
          {current && (
            <div className="exp__card" aria-live="polite">
              <span className="exp__card-idx">
                {String(active! + 1).padStart(2, '0')} <i>/</i> {String(items.length).padStart(2, '0')}
              </span>
              <strong className="exp__card-title">
                {current.href ? <a href={current.href}>{current.title}</a> : current.title}
              </strong>
              <span className="exp__card-meta">
                {current.kind} · {current.year}
              </span>
            </div>
          )}
        </>
      ) : (
        <ExplorationsGrid items={items} />
      )}
    </section>
  );
}

function ExplorationsGrid({ items }: { items: Exploration[] }) {
  return (
    <>
      <header className="exp-grid__intro">
        <p className="exp-grid__kicker">PIXELUP · Explorations</p>
        <h2 className="exp-grid__title">Concepts we killed — and the ones that pushed everything forward.</h2>
      </header>
      <ol className="exp-grid" role="list">
        {items.map((it, i) => (
          <li
            key={it.slug}
            className="exp-grid__item"
            style={{ ['--rot' as string]: `${((i % 2) * 2 - 1) * 1.5}deg` }}
          >
            <a href={it.href ?? '#'} className="exp-grid__link">
              <figure className="exp-grid__media" style={{ background: it.accent ?? '#161616' }}>
                {it.media.kind === 'video' ? (
                  <video src={it.media.src} autoPlay muted loop playsInline preload="metadata" aria-label={it.media.alt} />
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
    </>
  );
}
