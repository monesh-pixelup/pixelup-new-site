import Image from 'next/image';
import type { CSSProperties } from 'react';
import { blogHref, formatDate, sanitySize, type Post } from '@/content/caseStudies';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Same table and hover system as the Work index: bars over each cell, hairline, and the cover rising beside the row. */
export default function BlogIndex({ id, title, posts, kicker = 'Articles' }: { id: string; title: string; posts: Post[]; kicker?: string }) {
  const count = String(posts.length).padStart(2, '0');
  return (
    <section className="index index--blog" id={id} aria-labelledby={`${id}-title`} data-dock="index">
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
            <span>{kicker}</span>
          </span>
        </p>
      </div>

      <div className="index__body">
        <div className="index__hover" aria-hidden="true">
          <i className="index__line" />
          {posts.map((p, i) => {
            const [w, h] = sanitySize(p.cover);
            return (
              <div key={p.slug} className="cluster cluster--cover" data-for={i}>
                <div className="cluster__img cluster__img--cover" style={{ '--k': 0 } as Vars}>
                  <Image src={p.cover} alt="" width={w} height={h} sizes="320px" quality={80} draggable={false} />
                </div>
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
              <th scope="col">Title</th>
              <th scope="col">Type</th>
              <th scope="col">Published</th>
              <th scope="col">Read</th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p, i) => (
              <tr key={p.slug} className="index__row" data-preview={i}>
                <td>
                  <span className="index__cell index__cell--title">
                    <a className="index__link" href={blogHref(p.slug)} data-cursor="Read">
                      {p.title}
                    </a>
                  </span>
                </td>
                <td>
                  <span className="index__cell">{p.kind}</span>
                </td>
                <td>
                  <span className="index__cell">{formatDate(p.date)}</span>
                </td>
                <td>
                  <span className="index__cell index__cell--year">{p.minutes} min</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
