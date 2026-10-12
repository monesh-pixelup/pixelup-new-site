'use client';

import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { DetailsHTMLAttributes, ReactNode } from 'react';

/** A native <details>: opening it changes the page height, so scroll scenes and mark docks are re-measured. */
export default function Collapse({ summary, children, ...rest }: { summary: ReactNode } & DetailsHTMLAttributes<HTMLDetailsElement> & Record<`data-${string}`, unknown>) {
  return (
    <details {...rest} onToggle={() => ScrollTrigger.refresh()}>
      <summary>{summary}</summary>
      {children}
    </details>
  );
}
