import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GLYPH_ASPECT } from '@/components/mark/glyph';
import type { Dock, DockStop, Viewport } from '@/components/mark/types';
import { clamp, lerpDock, smoothstep } from './math';

// The mark never scrolls away: it is docked to the viewport and only changes pose.
// Each section contributes a dock; between stops the pose is interpolated by scroll position.

const still = { rx: 0, ry: 0, rz: 0 };

/** Every page except the home hero: the original placement, bottom right of the first screen. */
function cornerDock(vp: Viewport): Dock {
  if (vp.mobile) {
    const g = Math.min(vp.h * 0.28, vp.w * 0.56);
    return { x: vp.w * 0.58, y: vp.h * 0.45, g, gap: 0, ...still, dots: 1 };
  }
  // Figma: the hero object sits in a 432 × 540 frame centred at x 1125 / 1440
  const g = Math.min(vp.h * 0.32, vp.w * 0.22);
  return { x: vp.w * 0.78125, y: vp.h * 0.55, g, gap: 0, ...still, dots: 1 };
}

/** Where the mark rests before any section has claimed it: centred on the home hero, in the corner elsewhere. */
export function restDock(vp: Viewport): Dock {
  return document.querySelector('.hero') ? heroDock(vp) : cornerDock(vp);
}

export function heroDock(vp: Viewport): Dock {
  // Home hero only: centred on the page, a touch above the middle so the hero copy below has room.
  if (vp.mobile) {
    const g = Math.min(vp.h * 0.26, vp.w * 0.52);
    return { x: vp.w * 0.5, y: vp.h * 0.4, g, gap: 0, ...still, dots: 1 };
  }
  // Tablets are tall and narrow: size by width more generously so the mark still owns the screen.
  const g = vp.w < 1024 ? Math.min(vp.h * 0.26, vp.w * 0.36) : Math.min(vp.h * 0.3, vp.w * 0.21);
  return { x: vp.w * 0.5, y: vp.h * 0.42, g, gap: 0, ...still, dots: 1 };
}

/** Work page: the mark floats over the collage, inverting the imagery beneath it. */
function collageDock(vp: Viewport): Dock {
  if (vp.mobile) {
    const g = Math.min(vp.h * 0.18, vp.w * 0.36);
    return { x: vp.w * 0.5, y: vp.h * 0.42, g, gap: 0, ...still, dots: 1 };
  }
  const g = Math.min(vp.h * 0.24, vp.w * 0.16);
  return { x: vp.w * 0.455, y: vp.h * 0.47, g, gap: 0, rx: 0, ry: 0.2, rz: 0, dots: 1 };
}

export function railDock(vp: Viewport): Dock {
  if (vp.mobile) {
    // Phones: a small badge parked in the bottom-right corner, clear of the text column.
    const g = Math.min(vp.h * 0.05, vp.w * 0.1);
    const half = (GLYPH_ASPECT * g) / 2;
    return { x: vp.w - 16 - half, y: vp.h - 20 - g / 2, g, gap: 0, rx: 0, ry: -0.3, rz: 0, dots: 0 };
  }
  const g = Math.min(vp.h * 0.19, vp.w * 0.14);
  return { x: vp.w * 0.88, y: vp.h * 0.54, g, gap: 0, rx: 0, ry: -0.24, rz: 0, dots: 0.45 };
}

/** Stands beside the pinned statement: unfolded and turned at first, assembled once the last word lands. */
function statementDock(section: HTMLElement, statement: HTMLElement, start: number, end: number) {
  const top = section.getBoundingClientRect().top;
  const range = document.createRange();
  range.selectNodeContents(statement);
  const r = range.getBoundingClientRect();
  const block = { right: r.right, y: r.top - top + r.height / 2, h: r.height };
  const span = Math.max(1, end - start);
  return (vp: Viewport, scroll: number): Dock => {
    const open = 1 - smoothstep(clamp((scroll - start) / span / 0.85, 0, 1));
    const g = Math.min(block.h * (vp.mobile ? 0.42 : 0.62), vp.h * 0.5);
    const half = (GLYPH_ASPECT * g) / 2;
    const x = vp.mobile ? vp.w - half - 12 : Math.min(block.right + g * 0.3 + half, vp.w - half - 16);
    const y = vp.mobile ? block.y - block.h / 2 - g * 0.7 : block.y;
    return { x, y, g, gap: 0.45 * open, rx: 0.12 * open, ry: -0.75 * open, rz: 0, dots: 1 };
  };
}

type Anchor = { right: number; viewY: number; cap: number };

/** Signs a line of display type with the mark, set just after its last letter. */
function bracketDock(a: Anchor, vp: Viewport): Dock {
  let g = a.cap * 1.35;
  let half = (GLYPH_ASPECT * g) / 2;
  let x = a.right + g * 0.32 + half;
  let y = a.viewY;
  if (x + half > vp.w - 12) {
    // No room on the line: sit above its end instead.
    g *= 0.8;
    half = (GLYPH_ASPECT * g) / 2;
    x = vp.w - half - 14;
    y = a.viewY - a.cap * 0.5 - g * 0.85;
  }
  return { x, y, g, gap: 0, ...still, dots: 1 };
}

// Cap height of Switzer relative to the font size, and where the caps sit inside a line box of line-height 1.
const CAP = 0.7;
const CAP_CENTER = 0.53;

function anchorFor(el: HTMLElement, viewTop: number): Anchor {
  const r = el.getBoundingClientRect();
  const fs = parseFloat(getComputedStyle(el).fontSize);
  return { right: r.right, viewY: r.top - viewTop + fs * CAP_CENTER, cap: fs * CAP };
}

/** Maps pinned progress to [index, blend] using hold / transition segments: 2n - 1 units. */
export function phase(progress: number, n: number) {
  const u = clamp(progress, 0, 1) * (2 * n - 1);
  const seg = Math.min(Math.floor(u), 2 * n - 2);
  const i = Math.floor(seg / 2);
  return seg % 2 === 0 ? { i, t: 0 } : { i, t: u - seg };
}

/** Case studies and articles on phones: the title owns the screen, so the mark starts small in the corner. */
function introDock(vp: Viewport): Dock {
  if (!vp.mobile) return cornerDock(vp);
  const g = Math.min(vp.h * 0.1, vp.w * 0.22);
  return { x: vp.w - g * 0.75, y: vp.h * 0.15, g, gap: 0, ...still, dots: 0.6 };
}

export function buildStops(vp: Viewport): DockStop[] {
  const collage = document.querySelector('[data-dock="collage"]');
  const intro = document.querySelector('.cs-intro, .blog-intro');
  const home = document.querySelector('.hero');
  const stops: DockStop[] = [{ at: 0, dock: collage ? collageDock : intro ? introDock : home ? heroDock : cornerDock }];
  const scrollY = window.scrollY;
  const work = document.getElementById('work');
  const news = document.getElementById('news');
  const stage = ScrollTrigger.getById('stage');
  const services = ScrollTrigger.getById('services');
  const limit = ScrollTrigger.maxScroll(window);

  if (work) stops.push({ at: work.getBoundingClientRect().top + scrollY - vp.h * 0.35, dock: railDock });
  const index = document.querySelector('[data-dock="index"]');
  if (index) stops.push({ at: index.getBoundingClientRect().top + scrollY - vp.h * 0.4, dock: railDock });

  const about = document.getElementById('about');
  const statement = document.querySelector<HTMLElement>('.about__statement');
  if (stage && about && statement) {
    const dock = statementDock(about, statement, stage.start, stage.end);
    stops.push({ at: stage.start - vp.h * 0.8, dock: railDock });
    stops.push({ at: stage.start, dock });
    stops.push({ at: stage.end, dock });
  }

  const section = document.getElementById('services');
  const titles = Array.from(document.querySelectorAll<HTMLElement>('[data-bracket="service"]'));
  if (services && section && titles.length) {
    // Measured relative to the section: while pinned its top sits at the top of the viewport.
    const top = section.getBoundingClientRect().top;
    const anchors = titles.map((t) => anchorFor(t, top));
    const span = services.end - services.start;
    const dock = (v: Viewport, scroll: number) => {
      const { i, t } = phase((scroll - services.start) / span, anchors.length);
      const a = bracketDock(anchors[i], v);
      const b = bracketDock(anchors[Math.min(i + 1, anchors.length - 1)], v);
      const d = lerpDock(a, b, smoothstep(t));
      d.gap += Math.sin(t * Math.PI) * 0.16;
      return d;
    };
    stops.push({ at: services.start, dock });
    stops.push({ at: services.end, dock });
  }

  if (news) stops.push({ at: news.getBoundingClientRect().top + scrollY - vp.h * 0.5, dock: railDock });

  const email = document.querySelector<HTMLElement>('[data-bracket="email"]');
  if (email) {
    // The footer is the last screen: measure where the address sits once the page is fully scrolled.
    const a = anchorFor(email, 0);
    a.viewY += scrollY - limit;
    stops.push({ at: limit - vp.h * 0.75, dock: railDock });
    stops.push({ at: limit, dock: (v) => (v.mobile ? emailDockMobile(a, v) : bracketDock(a, v)) });
  }

  for (let i = 1; i < stops.length; i++) stops[i].at = Math.max(stops[i].at, stops[i - 1].at + 1);
  return stops;
}

function emailDockMobile(a: Anchor, vp: Viewport): Dock {
  const g = Math.min(vp.h * 0.13, vp.w * 0.28);
  return { x: vp.w - g * 0.75, y: a.viewY - g * 1.05, g, gap: 0, ...still, dots: 1 };
}
