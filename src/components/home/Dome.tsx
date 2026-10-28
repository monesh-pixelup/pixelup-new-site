'use client';

import gsap from 'gsap';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { home, projects } from '@/content/site';
import { Scope } from '../ui';
import { Lines } from './parts';
import type { DomeCursor, DomeHandle, DomeItem } from './dome/hexDomeEngine';

/*
  The work dome, after the hex-dome-case-studies handoff (Figma: "Some highlights from our recent projects"): an
  infinite, draggable honeycomb of cards wrapped round the inside of a sphere. Drag or throw to explore, click a card
  (or Enter) to bring it forward with its panel, Esc to close. The WebGL side is dome/hexDomeEngine.ts.
*/

const items = projects
  .map((p) => ({
    ...p,
    scope: p.scope.slice(0, 4),
    src: p.cover?.kind === 'image' ? p.cover.src : p.gallery?.[0],
  }))
  .filter((p): p is typeof p & { src: string } => !!p.src);

const domeItems: DomeItem[] = items.map((p) => ({
  // Through the image optimizer: the engine cover-crops each one onto a 1280 × 768 canvas.
  media: { type: 'image', src: `/_next/image?url=${encodeURIComponent(p.src)}&w=1920&q=80` },
  label: p.client,
  tagline: p.summary,
  services: p.scope,
}));

const pad = (n: number) => String(n).padStart(2, '0');

export default function Dome() {
  const { eyebrow, numeral, lines } = home.dome;
  const rootRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const domeRef = useRef<DomeHandle | null>(null);

  const [progress, setProgress] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [active, setActive] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [cursor, setCursor] = useState<DomeCursor>('idle');
  const [opened, setOpened] = useState<number | null>(null);

  // three.js loads once the dome is near; the fly-in waits until it is properly on screen.
  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    let cancelled = false;
    let booting = false;

    const boot = async () => {
      const { createHexDome } = await import('./dome/hexDomeEngine');
      if (cancelled) return;
      domeRef.current = createHexDome(canvas, domeItems, {
        onProgress: setProgress,
        onLoaded: () => setLoaded(true),
        onReady: () => setReady(true),
        onActive: setActive,
        onCursor: setCursor,
        onDragging: setDragging,
        onOpen: setOpened,
      });
    };
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || booting) return;
        booting = true;
        near.disconnect();
        boot().catch(() => setFailed(true));
      },
      { rootMargin: '100% 0px' },
    );
    near.observe(root);

    const onScreen = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        const play = () => {
          if (cancelled) return;
          if (domeRef.current) {
            domeRef.current.play();
            onScreen.disconnect();
          } else window.setTimeout(play, 100);
        };
        play();
      },
      { threshold: 0.35 },
    );
    onScreen.observe(root);

    return () => {
      cancelled = true;
      near.disconnect();
      onScreen.disconnect();
      domeRef.current?.destroy();
      domeRef.current = null;
    };
  }, []);

  // The dome's own cursor follows the pointer while it is over the canvas; the site cursor steps aside.
  useEffect(() => {
    const canvas = canvasRef.current;
    const el = cursorRef.current;
    if (!canvas || !el) return;
    const html = document.documentElement;
    const x = gsap.quickTo(el, 'x', { duration: 0.35, ease: 'power3' });
    const y = gsap.quickTo(el, 'y', { duration: 0.35, ease: 'power3' });
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const rect = canvas.getBoundingClientRect();
      x(e.clientX - rect.left);
      y(e.clientY - rect.top);
      el.style.opacity = '1';
      html.classList.add('is-dome-cursor');
    };
    const leave = () => {
      el.style.opacity = '0';
      html.classList.remove('is-dome-cursor');
    };
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerleave', leave);
    return () => {
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerleave', leave);
      html.classList.remove('is-dome-cursor');
    };
  }, []);

  // Headline intro once the cards start flying in.
  useEffect(() => {
    const title = rootRef.current?.querySelector<HTMLElement>('.hd__title');
    if (!ready || !title) return;
    const lift = parseFloat(getComputedStyle(title).fontSize);
    const tween = gsap.fromTo(title.querySelectorAll('.ln > .tb'), { y: lift }, { y: 0, duration: 1.4, stagger: 0.07, ease: 'expo.out', delay: 0.5 });
    return () => {
      tween.kill();
    };
  }, [ready]);

  // Panel copy reveal on open; Esc closes.
  useEffect(() => {
    if (opened === null || !panelRef.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-word]', { yPercent: 110 }, { yPercent: 0, duration: 1.1, stagger: 0.025, ease: 'expo.out', delay: 0.55 });
      gsap.fromTo('[data-rise]', { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.06, ease: 'expo.out', delay: 0.7 });
    }, panelRef.current);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      ctx.revert();
      window.removeEventListener('keydown', onKey);
    };
  }, [opened]);

  function close() {
    domeRef.current?.close();
    setOpened(null);
    canvasRef.current?.focus({ preventScroll: true });
  }

  const isOpen = opened !== null;
  const project = isOpen ? items[opened] : null;
  const external = !!project?.href?.startsWith('http');
  const current = items[active];
  const cls = ['hd', loaded && 'is-live', ready && 'is-ready', dragging && 'is-drag', isOpen && 'is-open', failed && 'is-fallback'].filter(Boolean).join(' ');

  return (
    <section className={cls} ref={rootRef} aria-labelledby="hd-title">
      <canvas
        ref={canvasRef}
        className="hd__canvas"
        tabIndex={0}
        aria-label="Interactive dome of PIXELUP LABS projects. Drag or use the arrow keys to explore, click or press Enter to open a project."
      />

      {/* The index as real links: the fallback without WebGL. */}
      <ul className="hd__list" aria-hidden={!failed || undefined}>
        {items.map((p) => {
          const ext = p.href?.startsWith('http');
          return (
            <li key={p.client} className="hd__item">
              <a
                className="hd__link"
                href={p.href ?? '#'}
                tabIndex={failed ? undefined : -1}
                data-cursor={ext ? 'Visit site' : 'View case study'}
                {...(ext ? { target: '_blank', rel: 'noreferrer' } : {})}
              >
                <span className="hd__img">
                  <Image src={p.src} alt="" fill sizes="(min-width: 768px) 30vw, 78vw" quality={80} />
                </span>
                <span className="hd__meta">
                  <span className="hd__name">{p.client}</span>
                  <span className="hd__scope">
                    <Scope items={p.scope} />
                  </span>
                  <span className="hd__sum">{p.summary}</span>
                </span>
              </a>
            </li>
          );
        })}
      </ul>

      {/* Depth: darkens behind the headline and around the edges. */}
      <div className="hd__shade" aria-hidden="true" />

      <div className="hd__head">
        <p className="hd__eb">
          <span>{eyebrow}</span>
          <sup>{numeral}</sup>
        </p>
        <Lines as="h2" id="hd-title" className="hd__title" lines={lines} reveal={false} />
      </div>

      <div className="hd__bar">
        <p className="hd__hint">
          <i aria-hidden="true" />
          <span>{ready || failed ? 'Drag to explore' : `Loading work ${String(Math.round(progress * 100)).padStart(3, '0')}%`}</span>
        </p>
        <p className="hd__count" aria-live="polite" aria-atomic="true">
          <span className="sr-only">
            Project {active + 1} of {items.length}: {current.client}
          </span>
          <span aria-hidden="true">{pad(active + 1)}</span>
          <span className="hd__ticks" aria-hidden="true">
            {items.map((p, i) => (
              <i key={p.client} className={i === active ? 'is-on' : undefined} />
            ))}
          </span>
          <span aria-hidden="true">{pad(items.length)}</span>
        </p>
        <p className="hd__name-now" aria-hidden="true">
          {current.client}
        </p>
      </div>

      {/* The open project. */}
      <div
        className="hd__open"
        aria-hidden={!isOpen}
        onClick={(e) => {
          if (e.target === e.currentTarget) close();
        }}
      >
        <div className="hd__open-shade" aria-hidden="true" />
        <button type="button" className="hd__close" onClick={close} aria-label="Close project" tabIndex={isOpen ? 0 : -1}>
          <span />
          <span />
        </button>

        {project && (
          <div className="hd__panel" ref={panelRef} key={project.client}>
            <div>
              <p className="hd__panel-index" data-rise>
                {pad((opened ?? 0) + 1)} / {project.client}
              </p>
              <h3 className="hd__panel-title">
                {project.summary.split(' ').map((word, i) => (
                  <span key={i}>
                    <span className="hd__word">
                      <span data-word>{word}</span>
                    </span>{' '}
                  </span>
                ))}
              </h3>
            </div>
            <dl className="hd__facts">
              {(
                [
                  ['Industry', project.industry],
                  ['What we did', project.scope.join(', ')],
                  ['Year', String(project.year)],
                ] as const
              )
                .filter(([, v]) => v)
                .map(([k, v]) => (
                  <div key={k} data-rise>
                    <dt>{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
            </dl>
            {project.href &&
              (external ? (
                <a data-rise className="hd__cta" href={project.href} target="_blank" rel="noopener noreferrer">
                  <span>Visit live site</span>
                  <span className="hd__cta-arrow">↗</span>
                </a>
              ) : (
                <Link data-rise className="hd__cta" href={project.href}>
                  <span>View case study</span>
                  <span className="hd__cta-arrow">↗</span>
                </Link>
              ))}
          </div>
        )}
      </div>

      {/* Cursor */}
      <div ref={cursorRef} className="hd__cursor" aria-hidden="true">
        <div className={`hd__cursor-disc is-${cursor}`}>
          <span>{cursor === 'drag' ? 'Drag' : 'View'}</span>
        </div>
      </div>
    </section>
  );
}
