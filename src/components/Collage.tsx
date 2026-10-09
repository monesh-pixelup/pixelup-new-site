import Image from 'next/image';
import type { CSSProperties } from 'react';
import { collage } from '@/content/site';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Overlapping project frames from the Figma Work page. Hovering one brings it forward like a selected layer. */
export default function Collage({ variant }: { variant: 'intro' | 'outro' }) {
  return (
    <div className={`collage collage--${variant}`} data-collage={variant}>
      <div className="collage__inner">
        {collage.map((c, i) => {
          const [x, y, w, h] = c.frame;
          const style: Vars = { '--x': x, '--y': y, '--w': w, '--h': h, '--z': i + 1 };
          return (
            <figure key={c.label} className="collage__item" style={style} data-depth={c.depth}>
              <div className="collage__media">
                {c.src ? (
                  <Image
                    className="collage__img"
                    src={c.src}
                    alt={c.label.replace(' / ', ', ')}
                    fill
                    quality={90}
                    priority={variant === 'intro' && i < 3}
                    sizes={`(min-width: 1024px) ${Math.round((w / 1440) * 100)}vw, 90vw`}
                    style={{ objectPosition: c.position, '--zoom': c.zoom ?? 1 } as Vars}
                    draggable={false}
                  />
                ) : (
                  <span className="collage__blank" />
                )}
                {c.caption && <span className="collage__caption">{c.caption}</span>}
              </div>
              <figcaption className="collage__label" aria-hidden="true">
                {c.label}
              </figcaption>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
