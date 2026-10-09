import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { Project } from '@/content/site';
import { Scope } from './ui';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// Image slots of the Figma hover cluster (674:265), in the order a project's media fills them:
// main square, wide sheet, type card, phone.
const SLOTS = ['a', 'd', 'b', 'c'] as const;

/** Figma "All / Projects" table. Hover: exclusion bars over each cell, a hairline under the row, and the project's cluster rising on glowing slabs. */
export default function ProjectIndex({ id, title, rows, dock }: { id: string; title: string; rows: Project[]; dock?: boolean }) {
  const count = String(rows.length).padStart(2, '0');
  return (
    <section className="index" id={id} aria-labelledby={`${id}-title`} data-dock={dock ? 'index' : undefined}>
      <div className="index__head">
        <h2 id={`${id}-title`} className="index__title">
          <span className="mask" data-reveal="rise">
            <span>
              {title}
              <sup>{count}</sup>
            </span>
          </span>
        </h2>
        <p className="index__kicker" aria-hidden="true">
          <span className="mask" data-reveal="rise">
            <span>Projects</span>
          </span>
        </p>
      </div>

      <div className="index__body">
        <div className="index__hover" aria-hidden="true">
          <i className="index__line" />
          {rows.map((p, i) => {
            const media = [...(p.video ? [p.video] : []), ...(p.gallery ?? [])].slice(0, 4);
            if (!media.length) return null;
            return (
              <div key={p.client} className="cluster" data-for={i} style={{ '--accent': p.accent ?? '#5e5e5e' } as Vars}>
                <i className="cluster__slab cluster__slab--1" />
                <i className="cluster__slab cluster__slab--2" />
                <i className="cluster__slab cluster__slab--3" />
                <i className="cluster__slab cluster__slab--4" />
                {media.map((src, k) => (
                  <div key={src} className={`cluster__img cluster__img--${SLOTS[k]}`} style={{ '--k': k } as Vars}>
                    {src.endsWith('.mp4') ? (
                      <video src={src} muted loop playsInline preload="none" />
                    ) : (
                      <Image src={src} alt="" fill sizes="220px" quality={80} draggable={false} />
                    )}
                  </div>
                ))}
              </div>
            );
          })}
        </div>

        <table className="index__table">
          <colgroup>
            <col className="index__col-client" />
            <col className="index__col-industry" />
            <col className="index__col-scope" />
            <col />
          </colgroup>
          <thead>
            <tr>
              <th scope="col">Client Name</th>
              <th scope="col">Industry</th>
              <th scope="col">Scope of Work</th>
              <th scope="col">Year</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => {
              const hasMedia = Boolean(p.video || p.gallery?.length);
              return (
                <tr key={p.client} className="index__row" data-preview={hasMedia ? i : undefined}>
                  <td>
                    <span className="index__cell">
                      {p.href ? (
                        <a
                          className="index__link"
                          href={p.href}
                          {...(p.href.startsWith('http') ? { target: '_blank', rel: 'noreferrer' } : {})}
                          data-cursor={p.caseStudy ? 'View case study' : 'Visit site'}
                        >
                          {p.client}
                        </a>
                      ) : (
                        p.client
                      )}
                    </span>
                  </td>
                  <td>
                    <span className="index__cell">{p.industry}</span>
                  </td>
                  <td>
                    <span className="index__cell index__scope">
                      <Scope items={p.scope} />
                    </span>
                  </td>
                  <td>
                    <span className="index__cell index__cell--year">
                      {p.year}
                      {p.caseStudy && <span className="index__tag">Case study</span>}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
