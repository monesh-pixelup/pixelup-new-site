import Image from 'next/image';
import type { CaseMedia } from '@/content/caseStudies';

type Shape = 'full' | 'half' | 'portrait';

// Figma 674:317 frames: full 1392 × 835, pair 690 × 656, centred portrait 676 × 843.
const SIZES: Record<Shape, string> = {
  full: '(min-width: 768px) 97vw, 100vw',
  half: '(min-width: 768px) 48vw, 100vw',
  portrait: '(min-width: 768px) 47vw, 100vw',
};

export function MediaFrame({ media, shape, priority = false }: { media: CaseMedia; shape: Shape; priority?: boolean }) {
  const logo = media.src.endsWith('.svg');
  return (
    <figure className={`frame frame--${shape}${logo ? ' frame--logo' : ''}`} data-media>
      <div className="frame__zoom">
        {media.kind === 'video' ? (
          <video src={media.src} aria-label={media.alt} autoPlay muted loop playsInline preload="metadata" />
        ) : (
          <Image src={media.src} alt={media.alt} fill sizes={SIZES[shape]} quality={85} priority={priority} draggable={false} />
        )}
      </div>
    </figure>
  );
}

/**
 * Arranges a section's mocks with the Figma's three frame types, so any number of images keeps the same rhythm:
 * 1 → full · 2 → pair · 3 → full + pair · 4 → pair + portrait + full · 5+ → repeat.
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
      rows.push({ shape: 'portrait', items: queue.splice(0, 1) });
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
