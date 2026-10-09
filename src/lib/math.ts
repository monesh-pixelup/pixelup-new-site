import type { Dock } from '@/components/mark/types';

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const smoothstep = (t: number) => t * t * (3 - 2 * t);
/** Frame-rate independent exponential approach. */
export const damp = (a: number, b: number, lambda: number, dt: number) => lerp(a, b, 1 - Math.exp(-lambda * dt));

export function lerpDock(a: Dock, b: Dock, t: number): Dock {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    g: lerp(a.g, b.g, t),
    gap: lerp(a.gap, b.gap, t),
    rx: lerp(a.rx, b.rx, t),
    ry: lerp(a.ry, b.ry, t),
    rz: lerp(a.rz, b.rz, t),
    dots: lerp(a.dots, b.dots, t),
  };
}
