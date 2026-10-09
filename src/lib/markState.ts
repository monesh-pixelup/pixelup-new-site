import type { DockStop } from '@/components/mark/types';

/** Scroll state written by the smooth scroller, read by the mark every frame. */
export const motion = {
  scroll: 0,
  velocity: 0,
  reduced: false,
};

/** Shared state between the page choreography (GSAP), the WebGL mark and the cursor. */
export const markState = {
  /** 0 → 1: the two halves assemble during the intro. */
  intro: 0,
  /** 0 → 1: selection handles around the mark. */
  handles: 0,
  /** Short-lived extra separation between the halves; decays every frame. */
  pulse: 0,
  hover: false,
  dragging: false,
  ready: false,
  failed: false,
  stops: [] as DockStop[],
};
