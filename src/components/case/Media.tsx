import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { CaseMedia } from '@/content/caseStudies';

type Shape = 'full' | 'half' | 'portrait';
type Vars = CSSProperties & Record<`--${string}`, string | number>;

// Figma 674:317 frames: full 1392 × 835, pair 690 × 656, centred portrait 676 × 843.
const SIZES: Record<Shape, string> = {
  full: '(min-width: 768px) 97vw, 100vw',
  half: '(min-width: 768px) 48vw, 100vw',
  portrait: '(min-width: 768px) 47vw, 100vw',
};

export function MediaFrame({ media, shape, priority = false }: { media: CaseMedia; shape: Shape; priority?: boolean }) {
  const logo = media.src.endsWith('.svg');
  // Measured images set the frame's aspect ratio (and their share of a pair row); others keep the Figma shape.
  const style = media.w && media.h ? ({ '--ar': `${media.w} / ${media.h}`, '--grow': media.w / media.h } as Vars) : undefined;
  return (
    <figure className={`frame frame--${shape}${logo ? ' frame--logo' : ''}`} style={style} data-media>
      <div className="frame__zoom">
        {media.kind === 'video' ? (
          <video src={media.src} aria-label={media.alt} autoPlay muted loop playsInline preload="metadata" />
        ) : (
          <Image src={media.src} alt={media.alt} fill sizes={SIZES[shape]} quality={80} priority={priority} draggable={false} />
        )}
      </div>
    </figure>
  );
}

const landscape = (m: CaseMedia) => !!m.w && !!m.h && m.w / m.h > 1.3;

/**
 * Arranges a section's mocks with the Figma's three frame types, so any number of images keeps the same rhythm:
 * 1 → full · 2 → pair · 3 → full + pair · 4 → pair + portrait + full · 5+ → repeat.
 * A landscape image never goes in the centred portrait slot; it takes a full row instead.
 */
export function MediaGroup({ media }: { media: CaseMedia[] }) {
  const rows: { shape: Shape; items: CaseMedia[] }[] = [];
  const queue = [...media];
  while (queue.length) {
    const n = queue.length;
    if (n === 1) rows.push({ shape: 'full', items: queue.splice(0, 1) });
    else if (n === 2) rows.push({ shape: 'half', items: queue.splice(0, 2) });
    else if (n === 3) {
      rows.push({ shape: 'full', items: queue.splice(0, 1) });
      rows.push({ shape: 'half', items: queue.splice(0, 2) });
    } else {
      rows.push({ shape: 'half', items: queue.splice(0, 2) });
      const [single] = queue.splice(0, 1);
      rows.push({ shape: landscape(single) ? 'full' : 'portrait', items: [single] });
      rows.push({ shape: 'full', items: queue.splice(0, 1) });
    }
  }
  return (
    <div className="mocks">
      {rows.map((row, i) => (
        <div key={i} className={`mocks__row mocks__row--${row.shape}`}>
          {row.items.map((m) => (
            <MediaFrame key={m.src} media={m} shape={row.shape} />
          ))}
        </div>
      ))}
    </div>
  );
}
