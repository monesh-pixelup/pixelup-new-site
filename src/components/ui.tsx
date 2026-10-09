import type { CSSProperties } from 'react';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Text that rolls letter by letter on hover of its closest `.roll-host`, link or button. */
export function Roll({ children, className = '' }: { children: string; className?: string }) {
  const chars = Array.from(children);
  return (
    <span className={`roll ${className}`}>
      <span className="sr-only">{children}</span>
      <span className="roll__track" aria-hidden="true">
        {chars.map((c, i) => {
          const ch = c === ' ' ? ' ' : c;
          return (
            <span key={i} className="roll__c" data-c={ch} style={{ '--i': i } as Vars}>
              {ch}
            </span>
          );
        })}
      </span>
    </span>
  );
}

/** Circled index, drawn in CSS so it always matches the text face (Figma used ① ②). */
export function Circ({ n }: { n: number }) {
  return (
    <span className="circ" aria-hidden="true">
      {n}
    </span>
  );
}

const CIRCLED = ['①', '②', '③', '④', '⑤', '⑥'];

/** Scope of work exactly as the Figma sets it: one text run, "①Brand, ②Web", underlined as a whole. */
export function Scope({ items }: { items: string[] }) {
  return <>{items.map((s, i) => `${CIRCLED[i] ?? ''}${s}`).join(', ')}</>;
}

/** The one arrow used across the site (Figma PIXELUP Brand 2026, node 756:1746). Use via ArrowSwap, which sizes it to 1em. */
export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg className={className} width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path
        d="M4.848 2.39062H5.672L7.824 5.23863L5.672 8.08663H4.848L5.856 6.76662C6.21333 6.29196 6.528 5.88129 6.8 5.53463H2V4.92663H6.792C6.62667 4.71329 6.46933 4.51062 6.32 4.31862C6.17067 4.12129 6.05867 3.97462 5.984 3.87862C5.90933 3.78262 5.86667 3.72662 5.856 3.71062L4.848 2.39062Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Arrow that slides out and back in on hover. */
export function ArrowSwap({ rotate = 0 }: { rotate?: number }) {
  return (
    <span className="arrow-swap" style={{ '--r': `${rotate}deg` } as Vars} aria-hidden="true">
      <Arrow />
      <Arrow />
    </span>
  );
}

export function StatusDots() {
  return (
    <span className="status__dots" aria-hidden="true">
      <i />
      <i />
    </span>
  );
}
