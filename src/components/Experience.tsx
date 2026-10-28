'use client';

import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import { CustomEase } from 'gsap/CustomEase';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';
import { usePathname, useRouter } from 'next/navigation';
import { buildStops } from '@/lib/docks';
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
      // A page can opt out of smooth scrolling (e.g. a proposal) with data-smooth="off".
      const nativeScroll = reduced || !!$('[data-smooth="off"]');
      if (nativeScroll) {
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
      // Firefox ignores -webkit-user-drag: stop media (and links wrapping it) from being dragged off the page.
      const onDragStart = (e: DragEvent) => {
        const t = e.target as Element | null;
        if (t instanceof Element && (t.closest('img, svg, video, canvas, picture') || t.querySelector?.('img, svg, video, canvas, picture'))) e.preventDefault();
      };
      document.addEventListener('dragstart', onDragStart);
      document.addEventListener('click', onClick);
      window.addEventListener('menu:toggle', onMenu);
      window.addEventListener('resize', setUnits);
      ScrollTrigger.addEventListener('refresh', rebuildStops);

      // The mark assembles whenever it's ready; it loads after the page is interactive, so it doesn't gate the text.
      const markIntro = contextSafe!(() => {
        gsap
          .timeline()
          .fromTo(markState, { handles: 0 }, { handles: 1, duration: 1.1, ease: 'power2.out' }, 0)
          .fromTo(markState, { intro: 0 }, { intro: 1, duration: 1.8, ease: 'expo.out' }, 0.3)
          .call(() => void (markState.pulse = Math.max(markState.pulse, 0.11)), [], 0.82);
      });

      // Header and hero text animate in CSS from the first paint (base.css); this timeline only adds what CSS can't.
      const intro = contextSafe!(() => {
        const tl = gsap.timeline({
          defaults: { ease: 'pxl' },
          onComplete: () => {
            html.classList.add('is-ready');
            lenis?.start();
          },
        });
        tl.set({}, {}, 1.4);
        if ($('[data-count]')) {
          tl.from('[data-count]', { textContent: 0, snap: { textContent: 1 }, duration: 1.6, ease: 'power3.out', stagger: 0.15 }, 0.3);
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

            // Lines set on the Figma's breaks rise one after another out of their own masks; phones rewrap, so they fade.
            $$('[data-reveal="stack"]').forEach((el) => {
              const trigger = { trigger: el, start: 'top 90%', once: true };
              if (!desktop) {
                gsap.fromTo(el, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.2, ease: 'pxl', scrollTrigger: trigger });
                return;
              }
              gsap.fromTo(
                el.querySelectorAll('.ln > *'),
                { y: 0, yPercent: 160 },
                { yPercent: 0, duration: 1.3, ease: 'pxl', stagger: 0.08, scrollTrigger: trigger },
              );
            });
            $$('[data-reveal="list"]').forEach((el) => {
              gsap.fromTo(
                el.children,
                { autoAlpha: 0, y: 10 },
                { autoAlpha: 1, y: 0, duration: 1, ease: 'pxl', stagger: 0.035, scrollTrigger: { trigger: el, start: 'top 90%', once: true } },
              );
            });
            // Services glyph: brackets slide in, the dots pop, then the ring blinks round while on screen.
            $$('[data-reveal="hex"]').forEach((el) => {
              const ring = el.querySelectorAll('.hs__ring circle');
              const blink = gsap.timeline({ paused: true, repeat: -1 });
              ring.forEach((dot, i) => blink.to(dot, { opacity: 0.25, duration: 0.35, yoyo: true, repeat: 1, ease: 'sine.inOut' }, 0.22 * i));
              blink.to({}, { duration: 0.8 });
              gsap
                .timeline({ scrollTrigger: { trigger: el, start: 'top 92%', once: true } })
                .from(el.querySelectorAll('.hs__b--tl, .hs__b--bl'), { x: -10, autoAlpha: 0, duration: 1.1, ease: 'pxl' }, 0)
                .from(el.querySelectorAll('.hs__b--tr, .hs__b--br'), { x: 10, autoAlpha: 0, duration: 1.1, ease: 'pxl' }, 0)
                .from(el.querySelectorAll('.hs__top circle'), { scale: 0, transformOrigin: '50% 50%', duration: 0.7, ease: 'back.out(2)', stagger: 0.07 }, 0.35)
                .from(ring, { scale: 0, transformOrigin: '50% 50%', duration: 0.6, ease: 'back.out(2)', stagger: 0.05 }, 0.6)
                .call(() => blink.play(), [], 1.4);
              ScrollTrigger.create({
                trigger: el,
                start: 'top bottom',
                end: 'bottom top',
                onToggle: (self) => (self.isActive ? blink.progress() > 0 && blink.resume() : blink.pause()),
              });
            });
            $$('[data-draw]').forEach((el) => {
              gsap.fromTo(
                el,
                { scaleX: 0 },
                { scaleX: 1, duration: 1.8, ease: 'pxl-io', transformOrigin: '0% 50%', scrollTrigger: { trigger: el, start: 'top 95%', once: true } },
              );
            });

            // Home hero: the showreel settles a little slower than the page, so the wordmark slides off it.
            if ($('.hh')) {
              gsap.fromTo(
                '.hh__zoom',
                { yPercent: 0 },
                { yPercent: 9, ease: 'none', scrollTrigger: { trigger: '.hh', start: 'top top', end: 'bottom top', scrub: true } },
              );
            }

            // Home work grid: each image unmasks upward while its contents settle from a slight zoom.
            $$('[data-card]').forEach((card) => {
              const media = card.querySelector('.hw__media');
              const zoom = card.querySelector('.hw__zoom');
              const meta = card.querySelectorAll('.hw__label, .hw__index');
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
            });

            // Recognition: the 27 rises out of the floor, one figure after the other; the award rows follow their rules.
            const count = $('.hr__count');
            if (count) {
              const two = count.querySelector<HTMLElement>('.hr__two')!;
              const one = count.querySelector<HTMLElement>('.hr__one')!;
              const seven = count.querySelector('.hr__seven');
              const rise = { y: 0, yPercent: 104 };
              const riseTo = { yPercent: 0, duration: 1.6, ease: 'pxl', scrollTrigger: { trigger: count, start: 'top 85%', once: true } };
              gsap.fromTo(two, rise, riseTo);
              gsap.fromTo([one, seven], rise, { ...riseTo, delay: 0.12 });

              // Counts up from 10 as on /next, the typed second figure standing in for the drawn 7 until it lands.
              const final = Number(two.textContent! + one.textContent!);
              const show = (n: number) => {
                const s = String(n).padStart(2, '0');
                two.textContent = s[0];
                one.textContent = s[1];
              };
              const tally = { v: Math.min(10, final) };
              show(tally.v);
              gsap.set(one, { visibility: 'visible' });
              gsap.set(seven, { visibility: 'hidden' });
              const land = () => {
                show(final);
                gsap.set(one, { visibility: 'hidden' });
                gsap.set(seven, { visibility: 'visible' });
              };
              cleanups.push(land);
              gsap.to(tally, {
                v: final,
                duration: 2,
                ease: 'power3.out',
                onUpdate: () => show(Math.round(tally.v)),
                onComplete: land,
                scrollTrigger: { trigger: count, start: 'top 60%', once: true },
              });
              gsap.fromTo(count, { yPercent: 6 }, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: count, start: 'top bottom', end: 'bottom top', scrub: true } });
              // The statement lights up word by word as it crosses the screen (as on /next).
              const words = $$('.hr__text .w');
              if (words.length) {
                gsap.fromTo(
                  words,
                  { opacity: 0.16 },
                  { opacity: 1, ease: 'none', stagger: 0.1, scrollTrigger: { trigger: '.hr__text', start: 'top 80%', end: 'bottom 45%', scrub: 0.6 } },
                );
              }
              $$('.hr__row').forEach((row) => {
                gsap.fromTo(
                  row.querySelectorAll('.hr__left, .hr__right'),
                  { autoAlpha: 0, y: 18 },
                  { autoAlpha: 1, y: 0, duration: 1.2, ease: 'pxl', delay: 0.15, stagger: 0.06, scrollTrigger: { trigger: row, start: 'top 95%', once: true } },
                );
              });
            }

            // Clients (as on /next): the page flips from ink to paper as the section arrives, and the testimonials lift away.
            if ($('.hc') && $('.ht__in')) {
              gsap
                .timeline({ scrollTrigger: { trigger: '.hc', start: 'top 92%', end: 'top 22%', scrub: 0.7, invalidateOnRefresh: true } })
                .fromTo(['.ht', '.hc'], { '--flip': 0 }, { '--flip': 1, ease: 'sine.inOut', duration: 1 }, 0)
                .fromTo(
                  '.ht__in',
                  { autoAlpha: 1, y: 0, scale: 1 },
                  { autoAlpha: 0, y: () => -0.07 * window.innerHeight, scale: 0.965, transformOrigin: '50% 0%', ease: 'power1.in', duration: 0.5 },
                  0,
                );
            }
            // The names turn on a drum: each tips back and shrinks with its distance from the middle of the screen.
            const drum = $('[data-drum]');
            if (drum) {
              const rows = Array.from(drum.children) as HTMLElement[];
              let centres: number[] = [];
              // The last midpoint drawn: the rows are only rewritten when the page has actually moved.
              let drawn = NaN;
              const measure = () => {
                const top = drum.getBoundingClientRect().top + window.scrollY;
                centres = rows.map((r) => top + r.offsetTop + r.offsetHeight / 2);
                drawn = NaN;
              };
              measure();
              let near = false;
              const watch = ScrollTrigger.create({ trigger: drum, start: 'top bottom', end: 'bottom top', onToggle: (self) => (near = self.isActive), onRefresh: measure });
              const turn = () => {
                if (!near) return;
                const half = window.innerHeight / 2;
                const mid = window.scrollY + half;
                if (Math.abs(mid - drawn) < 0.1) return;
                drawn = mid;
                rows.forEach((row, i) => {
                  const o = gsap.utils.clamp(-1.25, 1.25, (centres[i] - mid) / half);
                  const a = Math.abs(o);
                  row.style.transform = `perspective(900px) rotateX(${(-58 * o).toFixed(2)}deg) scale(${(1 - 0.14 * a).toFixed(3)})`;
                  row.style.opacity = gsap.utils.clamp(0, 1, 1.15 - a * a * 0.7).toFixed(3);
                });
              };
              gsap.ticker.add(turn);
              window.addEventListener('resize', measure);
              cleanups.push(() => {
                gsap.ticker.remove(turn);
                watch.kill();
                window.removeEventListener('resize', measure);
                rows.forEach((r) => {
                  r.style.transform = '';
                  r.style.opacity = '';
                });
              });
            }
            // Over the coloured stretch of the field the difference blend would tint the header and cursor; keep them white.
            const field = $('.hc__field');
            if (field) {
              ScrollTrigger.create({
                trigger: field,
                start: () => `top+=${field.offsetHeight * 0.2} top`,
                end: 'bottom top',
                invalidateOnRefresh: true,
                onToggle: (self) => html.classList.toggle('on-foot', self.isActive),
              });
              cleanups.push(() => html.classList.remove('on-foot'));
            }

            // Home footer: the sign-off rises letter group by group; the columns follow their rule.
            if ($('.hf')) {
              gsap.fromTo(
                '.hf__mask > *',
                { y: 0, yPercent: 160 },
                { yPercent: 0, duration: 1.5, ease: 'pxl', stagger: 0.07, scrollTrigger: { trigger: '.hf__sign', start: 'top 92%', once: true } },
              );
              gsap.fromTo(
                '.hf__col',
                { autoAlpha: 0, y: 16 },
                { autoAlpha: 1, y: 0, duration: 1.2, ease: 'pxl', stagger: 0.08, scrollTrigger: { trigger: '.hf__cols', start: 'top 92%', once: true } },
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
              // The scatter is tuned on the 1440 canvas; phones get a proportionally shorter throw.
              const throwK = window.innerWidth < 768 ? 0.35 : 1;
              $$<HTMLElement>('[data-collage="outro"] .collage__item').forEach((fig, i) => {
                const depth = Number(fig.dataset.depth || 0.5);
                const cx = parseFloat(fig.style.getPropertyValue('--x')) + parseFloat(fig.style.getPropertyValue('--w')) / 2 - 720;
                const cy = parseFloat(fig.style.getPropertyValue('--y')) + parseFloat(fig.style.getPropertyValue('--h')) / 2 - 430;
                const len = Math.hypot(cx, cy) || 1;
                const push = (260 + depth * 260) * throwK;
                gsap.fromTo(
                  fig,
                  { x: (cx / len) * push, y: (cy / len) * push + 120 * throwK, rotation: (i % 2 ? 1 : -1) * (4 + depth * 4), autoAlpha: 0.2 },
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

            // Footer: the brand gradient rises from black to blue to white as the page bottoms out.
            if ($('.foot')) {
              ScrollTrigger.create({
                trigger: '.foot',
                start: 'top 60%',
                // Never reached (the footer is last), so the state holds at the very bottom of the page.
                end: 'bottom top',
                onToggle: (self) => html.classList.toggle('on-foot', self.isActive),
              });
              cleanups.push(() => html.classList.remove('on-foot'));
              gsap.fromTo(
                '.foot',
                { '--foot-rise': '0%' },
                { '--foot-rise': '100%', ease: 'none', scrollTrigger: { trigger: '.foot', start: 'top bottom', end: 'bottom bottom', scrub: 0.6 } },
              );
            }

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
      // Pages can go without the mark (home); it stays apart and hidden there.
      const markOff = !!$('[data-mark="off"]');
      if (markState.ready && !markOff) markIntro();
      else if (!markOff) window.addEventListener('mark:ready', () => alive && markState.ready && markIntro(), { once: true });

      Promise.race([fontsReady, wait(1200)]).then(() => {
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
        document.removeEventListener('dragstart', onDragStart);
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
