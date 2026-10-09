'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { usePathname, useRouter } from 'next/navigation';
import { buildStops, phase } from '@/lib/docks';
import { markState, motion } from '@/lib/markState';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase, useGSAP);
  CustomEase.create('pxl', '0.16, 1, 0.3, 1');
  CustomEase.create('pxl-io', '0.76, 0, 0.24, 1');
}

const quintInOut = (t: number) => (t < 0.5 ? 16 * t ** 5 : 1 - (-2 * t + 2) ** 5 / 2);
const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
const $ = <T extends Element = HTMLElement>(sel: string) => document.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string) => gsap.utils.toArray<T>(sel);

// Footer echo: horizontal offsets of the three repeated blocks on the 1440 canvas (from the Figma vector).
const ECHO_OFFSETS = [16, -62, 62];

export default function Experience() {
  const pathname = usePathname();
  const router = useRouter();

  useGSAP(
    (_context, contextSafe) => {
      const html = document.documentElement;
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let alive = true;
      let leaving = false;
      motion.reduced = reduced;
      html.classList.add('motion-live');

      const setUnits = () => html.style.setProperty('--vw', `${html.clientWidth}px`);
      setUnits();

      if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
      const arrivalHash = window.location.hash;
      window.scrollTo(0, 0);
      ScrollTrigger.config({ ignoreMobileResize: true });

      // Smooth scroll, driven by the same ticker as every animation and the WebGL mark.
      let lenis: Lenis | null = null;
      const raf = (time: number) => {
        if (!lenis) return;
        lenis.raf(time * 1000);
        motion.scroll = lenis.scroll;
        motion.velocity = lenis.velocity;
      };
      const onNativeScroll = () => {
        motion.scroll = window.scrollY;
      };
      if (reduced) {
        window.addEventListener('scroll', onNativeScroll, { passive: true });
      } else {
        lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.95, touchMultiplier: 1.4 });
        lenis.on('scroll', ScrollTrigger.update);
        gsap.ticker.add(raf);
        gsap.ticker.lagSmoothing(0);
        lenis.stop();
      }
      motion.scroll = 0;

      const scrollToTarget = (target: HTMLElement | 0, immediate = false) => {
        if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: quintInOut, force: true, immediate });
        else if (target === 0) window.scrollTo({ top: 0 });
        else target.scrollIntoView();
      };

      // Leaving the page: the mark comes apart and the page lifts away before the route changes.
      const leave = contextSafe!((href: string) => {
        if (leaving) return;
        leaving = true;
        lenis?.stop();
        window.dispatchEvent(new CustomEvent('page:leave', { detail: href }));
        if (reduced) {
          router.push(href);
          return;
        }
        gsap
          .timeline({ onComplete: () => router.push(href) })
          .to(markState, { intro: 0, duration: 0.75, ease: 'expo.in' }, 0)
          .to(markState, { handles: 0, duration: 0.35, ease: 'power2.in' }, 0.15)
          .to(['main', '.foot', '.hdr'], { autoAlpha: 0, y: -18, duration: 0.55, ease: 'power2.in', stagger: 0.04 }, 0.1);
      });

      const onClick = (e: MouseEvent) => {
        if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        const link = (e.target as Element | null)?.closest?.('a[href]') as HTMLAnchorElement | null;
        if (!link || link.target === '_blank' || link.hasAttribute('download')) return;
        const raw = link.getAttribute('href') ?? '';
        if (raw === '#') {
          e.preventDefault();
          return;
        }
        const url = new URL(link.href, window.location.href);
        if (url.origin !== window.location.origin) return;
        e.preventDefault();
        if (url.pathname !== window.location.pathname) {
          leave(url.pathname + url.hash);
          return;
        }
        const target = url.hash && url.hash !== '#top' ? $(url.hash) : 0;
        if (target !== null) scrollToTarget(target);
      };
      const onMenu = (e: Event) => {
        if (!lenis) return;
        if ((e as CustomEvent<boolean>).detail) lenis.stop();
        else if (html.classList.contains('is-ready') && !leaving) lenis.start();
      };
      const rebuildStops = () => {
        markState.stops = buildStops({ w: window.innerWidth, h: window.innerHeight, mobile: window.innerWidth < 768 });
      };
      document.addEventListener('click', onClick);
      window.addEventListener('menu:toggle', onMenu);
      window.addEventListener('resize', setUnits);
      ScrollTrigger.addEventListener('refresh', rebuildStops);

      const intro = contextSafe!(() => {
        const heroSplits = $$('[data-intro="lines"]').map((el) => {
          const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
          gsap.set(el, { visibility: 'visible' });
          return split;
        });

        const tl = gsap.timeline({
          defaults: { ease: 'pxl' },
          onComplete: () => {
            html.classList.add('is-ready');
            heroSplits.forEach((s) => s.revert());
            lenis?.start();
          },
        });

        tl.fromTo(markState, { handles: 0 }, { handles: 1, duration: 1.1, ease: 'power2.out' }, 0)
          .fromTo(markState, { intro: 0 }, { intro: 1, duration: 1.8, ease: 'expo.out' }, 0.3)
          .call(() => void (markState.pulse = Math.max(markState.pulse, 0.11)), [], 0.82)
          .fromTo('[data-intro="rise"] > *', { y: 0, yPercent: 130 }, { yPercent: 0, duration: 1.25, stagger: 0.045 }, 0.7);
        if ($('.hdr__line')) {
          tl.fromTo('.hdr__line', { scaleX: 0 }, { scaleX: 1, duration: 1.4, ease: 'pxl-io', transformOrigin: '0% 50%' }, 1);
        }
        if ($('[data-count]')) {
          tl.from('[data-count]', { textContent: 0, snap: { textContent: 1 }, duration: 1.6, ease: 'power3.out', stagger: 0.15 }, 0.9);
        }
        heroSplits.forEach((s, i) => {
          tl.fromTo(s.lines, { yPercent: 115 }, { yPercent: 0, duration: 1.3, stagger: 0.08 }, 1.05 + i * 0.12);
        });
        if ($('[data-intro="fade"]')) {
          tl.fromTo('[data-intro="fade"]', { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 1.3, stagger: 0.1 }, 1.3);
        }

        // Work page: the collage frames unmask one after another, each from its own edge.
        const frames = $$('[data-collage="intro"] .collage__media');
        if (frames.length) {
          const edges = ['inset(0% 0% 100% 0%)', 'inset(0% 100% 0% 0%)', 'inset(100% 0% 0% 0%)', 'inset(0% 0% 0% 100%)'];
          frames.forEach((media, i) => {
            tl.fromTo(media, { clipPath: edges[i % 4] }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'pxl-io' }, 0.25 + i * 0.09);
            const img = media.querySelector('img');
            if (img) tl.fromTo(img, { scale: 1.25 }, { scale: 1, duration: 2, ease: 'pxl', clearProps: 'scale' }, 0.25 + i * 0.09);
          });
        }

        if (reduced) tl.progress(1);
      });

      const scenes = contextSafe!(() => {
        const mm = gsap.matchMedia();
        mm.add(
          { motionOK: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 1024px)' },
          (ctx) => {
            const { motionOK, desktop } = ctx.conditions as { motionOK: boolean; desktop: boolean };
            if (!motionOK) return;
            const cleanups: Array<() => void> = [];
            const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement | Window, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
              el.addEventListener(type, fn as EventListener);
              cleanups.push(() => el.removeEventListener(type, fn as EventListener));
            };

            ScrollTrigger.create({ start: 0, end: 'max', onUpdate: (self) => html.classList.toggle('is-scrolled', self.scroll() > 60) });

            $$('[data-reveal="rise"]').forEach((el) => {
              gsap.fromTo(
                el.children,
                { y: 0, yPercent: 130 },
                { yPercent: 0, duration: 1.4, ease: 'pxl', stagger: 0.06, scrollTrigger: { trigger: el, start: 'top 92%', once: true } },
              );
            });
            // Headings and quotes rise line by line; the split is undone afterwards so text reflows on resize.
            $$('[data-reveal="lines"]').forEach((el) => {
              const split = SplitText.create(el, { type: 'lines', mask: 'lines', linesClass: 'line' });
              gsap.set(el, { visibility: 'visible' });
              gsap.fromTo(
                split.lines,
                { yPercent: 115 },
                { yPercent: 0, duration: 1.3, ease: 'pxl', stagger: 0.08, scrollTrigger: { trigger: el, start: 'top 90%', once: true }, onComplete: () => split.revert() },
              );
              cleanups.push(() => split.revert());
            });
            // Case-study and blog mocks unmask upward with a settle, like the home cards.
            $$('[data-media]').forEach((fig) => {
              const zoom = fig.querySelector('.frame__zoom') ?? fig.querySelector('img');
              gsap
                .timeline({ defaults: { ease: 'pxl' }, scrollTrigger: { trigger: fig, start: 'top 94%', once: true } })
                .fromTo(fig, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5 })
                .fromTo(zoom, { scale: 1.2 }, { scale: 1, duration: 2 }, 0);
            });
            $$('[data-reveal="fade"]').forEach((el) => {
              gsap.fromTo(
                el,
                { autoAlpha: 0, y: 14 },
                { autoAlpha: 1, y: 0, duration: 1.2, ease: 'pxl', scrollTrigger: { trigger: el, start: 'top 95%', once: true } },
              );
            });

            // Home work grid: each image unmasks upward while its contents settle from a slight zoom.
            $$('.card').forEach((card) => {
              const media = card.querySelector('.card__media');
              const zoom = card.querySelector('.card__zoom');
              const meta = card.querySelectorAll('.card__title, .card__summary, .card__scope');
              gsap
                .timeline({ defaults: { ease: 'pxl' }, scrollTrigger: { trigger: card, start: 'top 94%', once: true } })
                .fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.5 })
                .fromTo(zoom, { scale: 1.35 }, { scale: 1, duration: 2.1 }, 0)
                .fromTo(meta, { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.07 }, 0.35);

              if (desktop) {
                const drift = Number(card.dataset.drift || 0);
                const px = () => (drift * window.innerWidth) / 1440;
                gsap.fromTo(
                  card,
                  { y: () => px() },
                  { y: () => -px(), ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } },
                );
              }

              if (card.hasAttribute('data-field') && media instanceof HTMLElement) {
                on(card, 'pointermove', (e) => {
                  const r = media.getBoundingClientRect();
                  media.style.setProperty('--mx', `${e.clientX - r.left}px`);
                  media.style.setProperty('--my', `${e.clientY - r.top}px`);
                });
              }
            });

            if ($('.clients')) {
              const clients = { trigger: '.clients', start: 'top 88%', once: true };
              gsap.fromTo('.clients__rule', { scaleX: 0 }, { scaleX: 1, duration: 1.8, ease: 'pxl-io', transformOrigin: '0% 50%', scrollTrigger: clients });
              gsap.fromTo(
                '.clients__logos li',
                { autoAlpha: 0, y: 16, filter: 'blur(8px)' },
                { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'pxl', stagger: 0.07, delay: 0.25, clearProps: 'filter', scrollTrigger: clients },
              );
              gsap.fromTo('.clients__label', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2, delay: 0.6, scrollTrigger: clients });
            }

            // About: pinned while the statement lights up word by word; the mark assembles beside it.
            const statementEl = $('.about__statement');
            if (statementEl) {
              const statement = SplitText.create(statementEl, { type: 'words', wordsClass: 'w' });
              cleanups.push(() => statement.revert());
              gsap
                .timeline({
                  scrollTrigger: {
                    id: 'stage',
                    trigger: '.about',
                    start: 'top top',
                    end: () => `+=${window.innerHeight * 1.4}`,
                    pin: true,
                    scrub: 0.6,
                    invalidateOnRefresh: true,
                  },
                })
                .fromTo(statement.words, { opacity: 0.12 }, { opacity: 1, duration: 0.5, stagger: 0.12, ease: 'none' })
                .fromTo('.about__body', { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.8, ease: 'power2.out' }, '-=0.45')
                .to({}, { duration: 0.5 });
              gsap.fromTo('.about__eyebrow', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1, scrollTrigger: { trigger: '.about', start: 'top 70%', once: true } });
            }

            // Services: pinned; titles roll through a mask and the mark signs whichever one is live.
            const items = $$('.svc');
            if (items.length) {
              const index = $$('.services__index li');
              const titles = items.map((i) => i.querySelector('.svc__title-inner'));
              const bodies = items.map((i) => i.querySelector('.svc__body'));
              const n = items.length;
              let live = 0;
              gsap.set(titles[0], { y: 0, yPercent: 0 });
              gsap.set(titles.slice(1), { y: 0, yPercent: 130 });
              gsap.set(bodies[0], { autoAlpha: 1, y: 0 });
              gsap.set(bodies.slice(1), { autoAlpha: 0, y: 12 });
              // Entrance on the outer mask so it never competes with the scrubbed title positions below.
              gsap.fromTo(
                items[0].querySelector('.svc__title'),
                { clipPath: 'inset(0% 0% 100% 0%)' },
                { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.4, ease: 'pxl-io', clearProps: 'clipPath', scrollTrigger: { trigger: '.services', start: 'top 55%', once: true } },
              );
              const svc = gsap.timeline({
                defaults: { ease: 'none' },
                scrollTrigger: {
                  id: 'services',
                  trigger: '.services',
                  start: 'top top',
                  end: () => `+=${window.innerHeight * 0.45 * (2 * n - 1)}`,
                  pin: true,
                  scrub: 0.5,
                  invalidateOnRefresh: true,
                  onUpdate: (self) => {
                    const { i, t } = phase(self.progress, n);
                    const next = t > 0.5 ? i + 1 : i;
                    if (next === live) return;
                    index[live]?.classList.remove('is-active');
                    index[next]?.classList.add('is-active');
                    live = next;
                  },
                },
              });
              for (let k = 1; k < n; k++) {
                const at = 2 * k - 1;
                // Explicit start and end values on every step: scrubbing in either direction always lands exactly.
                svc
                  .fromTo(titles[k - 1], { y: 0, yPercent: 0 }, { y: 0, yPercent: -130, duration: 1, ease: 'power3.inOut', immediateRender: false }, at)
                  .fromTo(titles[k], { y: 0, yPercent: 130 }, { y: 0, yPercent: 0, duration: 1, ease: 'power3.inOut', immediateRender: false }, at)
                  .fromTo(bodies[k - 1], { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -12, duration: 0.4, ease: 'power2.in', immediateRender: false }, at)
                  .fromTo(bodies[k], { autoAlpha: 0, y: 12 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, at + 0.5);
              }
              svc.to({}, { duration: 1 }, 2 * n - 2);
            }

            if ($('.news__row')) {
              gsap.fromTo(
                '.news__row',
                { autoAlpha: 0, y: 26 },
                { autoAlpha: 1, y: 0, duration: 1.2, ease: 'pxl', stagger: 0.08, scrollTrigger: { trigger: '.news__list', start: 'top 90%', once: true } },
              );
            }

            // Work page collage: frames drift with the cursor by depth and peel away at different rates on scroll.
            const introCollage = $('[data-collage="intro"]');
            if (introCollage) {
              const figures = $$<HTMLElement>('[data-collage="intro"] .collage__item');
              figures.forEach((fig) => {
                const depth = Number(fig.dataset.depth || 0.5);
                gsap.to(fig, {
                  yPercent: -depth * 38,
                  ease: 'none',
                  scrollTrigger: { trigger: introCollage, start: 'top top', end: 'bottom top', scrub: true },
                });
              });
              if (desktop) {
                const movers = figures.map((fig) => {
                  const media = fig.querySelector<HTMLElement>('.collage__media')!;
                  return {
                    depth: Number(fig.dataset.depth || 0.5),
                    x: gsap.quickTo(media, 'x', { duration: 1.2, ease: 'power3' }),
                    y: gsap.quickTo(media, 'y', { duration: 1.2, ease: 'power3' }),
                  };
                });
                on(window, 'pointermove', (e: PointerEvent) => {
                  const nx = e.clientX / window.innerWidth - 0.5;
                  const ny = e.clientY / window.innerHeight - 0.5;
                  movers.forEach((m) => {
                    m.x(-nx * 34 * m.depth);
                    m.y(-ny * 22 * m.depth);
                  });
                });
              }
            }

            // Outro collage: frames start scattered and assemble as the page bottoms out.
            const outro = $('[data-collage="outro"]');
            if (outro) {
              $$<HTMLElement>('[data-collage="outro"] .collage__item').forEach((fig, i) => {
                const depth = Number(fig.dataset.depth || 0.5);
                const cx = parseFloat(fig.style.getPropertyValue('--x')) + parseFloat(fig.style.getPropertyValue('--w')) / 2 - 720;
                const cy = parseFloat(fig.style.getPropertyValue('--y')) + parseFloat(fig.style.getPropertyValue('--h')) / 2 - 430;
                const len = Math.hypot(cx, cy) || 1;
                const push = 260 + depth * 260;
                gsap.fromTo(
                  fig,
                  { x: (cx / len) * push, y: (cy / len) * push + 120, rotation: (i % 2 ? 1 : -1) * (4 + depth * 4), autoAlpha: 0.2 },
                  {
                    x: 0,
                    y: 0,
                    rotation: 0,
                    autoAlpha: 1,
                    ease: 'none',
                    scrollTrigger: { trigger: outro, start: 'top bottom', end: 'center 55%', scrub: 0.9 },
                  },
                );
              });
            }

            // Project index: rows cascade in; hovering a row raises its images beside it.
            $$('.index').forEach((section) => {
              const rows = section.querySelectorAll('.index__row');
              gsap.fromTo(
                rows,
                { autoAlpha: 0, y: 8 },
                { autoAlpha: 1, y: 0, duration: 0.9, ease: 'pxl', stagger: 0.025, scrollTrigger: { trigger: section.querySelector('.index__table'), start: 'top 88%', once: true } },
              );
              gsap.fromTo(
                section.querySelectorAll('thead th'),
                { autoAlpha: 0 },
                { autoAlpha: 1, duration: 1, stagger: 0.06, scrollTrigger: { trigger: section, start: 'top 85%', once: true } },
              );

              const body = section.querySelector<HTMLElement>('.index__body');
              const layer = section.querySelector<HTMLElement>('.index__hover');
              if (!body || !layer || !desktop) return;
              // The layer glides between rows; the hairline and cluster animate in CSS.
              const moveY = gsap.quickTo(layer, 'y', { duration: 0.55, ease: 'power3' });
              let current: HTMLElement | null = null;
              let entered = false;
              const show = (el: HTMLElement | null, visible: boolean) => {
                if (!el) return;
                el.classList.toggle('is-on', visible);
                el.querySelectorAll('video').forEach((v) => (visible ? v.play().catch(() => {}) : v.pause()));
              };
              on(body, 'pointerover', (e) => {
                const row = (e.target as Element | null)?.closest?.('.index__row') as HTMLElement | null;
                if (!row) return;
                const y = row.getBoundingClientRect().top - body.getBoundingClientRect().top;
                if (!entered) {
                  gsap.set(layer, { y });
                  entered = true;
                } else {
                  moveY(y);
                }
                layer.classList.add('is-active');
                const key = row.dataset.preview;
                const next = key ? layer.querySelector<HTMLElement>(`.cluster[data-for="${key}"]`) : null;
                if (next === current) return;
                show(current, false);
                show(next, true);
                current = next;
              });
              on(body, 'pointerleave', () => {
                layer.classList.remove('is-active');
                show(current, false);
                current = null;
                entered = false;
              });
            });

            // Footer: the stacked echo lines fan out into the Figma stagger as the page bottoms out.
            $$('.echo__block').forEach((block, i) => {
              gsap.fromTo(
                block,
                { x: 0 },
                {
                  x: () => (ECHO_OFFSETS[i] * Math.min(window.innerWidth, 1920)) / 1440,
                  ease: 'none',
                  scrollTrigger: { trigger: '.foot', start: 'top 80%', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
                },
              );
            });

            return () => cleanups.forEach((fn) => fn());
          },
        );
      });

      const fontsReady = document.fonts?.ready ?? Promise.resolve();
      const markReady =
        markState.ready || markState.failed
          ? Promise.resolve()
          : new Promise<void>((resolve) => window.addEventListener('mark:ready', () => resolve(), { once: true }));

      Promise.race([Promise.all([fontsReady, markReady]), wait(2500)]).then(() => {
        if (!alive) return;
        scenes();
        ScrollTrigger.refresh();
        rebuildStops();
        intro();
        // Arriving on a section link from another page, e.g. /#about.
        const target = arrivalHash ? $(arrivalHash) : null;
        if (target) window.setTimeout(() => alive && scrollToTarget(target, true), 60);
      });

      return () => {
        alive = false;
        document.removeEventListener('click', onClick);
        window.removeEventListener('menu:toggle', onMenu);
        window.removeEventListener('resize', setUnits);
        window.removeEventListener('scroll', onNativeScroll);
        ScrollTrigger.removeEventListener('refresh', rebuildStops);
        gsap.ticker.remove(raf);
        lenis?.destroy();
        html.classList.remove('is-ready', 'is-scrolled', 'motion-live', 'menu-open');
        markState.intro = 0;
        markState.handles = 0;
        markState.stops = [];
      };
    },
    { dependencies: [pathname], revertOnUpdate: true },
  );

  return null;
}
