import Image from 'next/image';
import type { CSSProperties } from 'react';
import { work, workCanvasHeight, type Work as WorkItem } from '@/content/site';
import { Roll, Scope } from './ui';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// Columns drift at different rates on desktop; cards sharing a column share a rate so gaps never close.
function driftFor(x: number) {
  if (x < 300) return 22;
  if (x < 800) return 44;
  if (x < 1100) return 70;
  return 52;
}

function Media({ item }: { item: WorkItem }) {
  const { media, client } = item;
  if (media.kind === 'video') {
    return <video className="card__img card__video" src={media.src} aria-label={media.alt} autoPlay muted loop playsInline preload="metadata" />;
  }
  if (media.kind === 'image') {
    return (
      <Image
        className="card__img"
        src={media.src}
        alt={media.alt}
        fill
        quality={90}
        sizes="(min-width: 1024px) 34vw, (min-width: 768px) 50vw, 100vw"
        style={media.position ? { objectPosition: media.position } : undefined}
        draggable={false}
      />
    );
  }
  return (
    <>
      <span className="field" aria-hidden="true" />
      {media.kind === 'logo' ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="card__logo" src={media.src} width={media.width} height={media.height} alt={`${client} logo`} draggable={false} />
      ) : (
        <>
          <span className="card__frame-label" aria-hidden="true">
            {client.toLowerCase()} / cover
          </span>
          <span className="card__cross" aria-hidden="true" />
        </>
      )}
    </>
  );
}

function Card({ item }: { item: WorkItem }) {
  const [x, y, w, h] = item.frame;
  const style: Vars = { '--x': x, '--y': y, '--w': w, '--h': h };
  const external = item.href?.startsWith('http');
  const caseStudy = item.href?.includes('/case-studies/');
  const Tag = item.href ? 'a' : 'article';
  const link = item.href
    ? { href: item.href, 'data-cursor': caseStudy ? 'View case study' : 'Visit site', ...(external ? { target: '_blank', rel: 'noreferrer' } : {}) }
    : {};
  return (
    <Tag className="card" style={style} data-drift={driftFor(x)} data-field={item.media.kind === 'image' || item.media.kind === 'video' ? undefined : ''} {...link}>
      <div className="card__media">
        <div className="card__zoom">
          <Media item={item} />
        </div>
      </div>
      <div className="card__meta">
        <div className="card__text">
          <h3 className="card__title">
            <Roll>{item.client}</Roll>
          </h3>
          <p className="card__summary">{item.summary}</p>
        </div>
        <p className="card__scope">
          <Scope items={item.scope} />
        </p>
      </div>
    </Tag>
  );
}

export default function Work() {
  return (
    <section className="work" id="work" aria-labelledby="work-title">
      <h2 id="work-title" className="sr-only">
        Selected work
      </h2>
      <div className="work__grid" style={{ '--gh': workCanvasHeight } as Vars}>
        {work.map((item) => (
          <Card key={item.client} item={item} />
        ))}
      </div>
    </section>
  );
}
