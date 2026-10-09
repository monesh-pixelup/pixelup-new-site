import Image from 'next/image';
import { sanitySize, type BlogNode } from '@/content/caseStudies';

export const anchorFor = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);

/** Renders the scraped article: copy in the reading column, tables and images wider, all on the 16-column grid. */
export default function ArticleBody({ nodes }: { nodes: BlogNode[] }) {
  return (
    <div className="article__body">
      {nodes.map((n, i) => {
        switch (n.t) {
          case 'h2':
            return (
              <h2 key={i} id={anchorFor(n.x)} className="article__h2">
                {n.x}
              </h2>
            );
          case 'h3':
          case 'h4':
            return (
              <h3 key={i} className="article__h3">
                {n.x}
              </h3>
            );
          case 'p':
          case 'figcaption':
            return (
              <p key={i} className={n.x.startsWith('TL;DR') ? 'article__p article__tldr' : 'article__p'}>
                {n.x}
              </p>
            );
          case 'blockquote':
            return (
              <blockquote key={i} className="article__quote">
                {n.x}
              </blockquote>
            );
          case 'a':
            return (
              <p key={i} className="article__p">
                <a href={n.href} className="article__link" target={n.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer">
                  {n.x}
                </a>
              </p>
            );
          case 'ul':
          case 'ol': {
            const List = n.t;
            return (
              <List key={i} className={`article__list article__list--${n.t}`}>
                {n.items.map((it, k) => (
                  <li key={k}>{it}</li>
                ))}
              </List>
            );
          }
          case 'table': {
            const [head, ...rows] = n.rows;
            return (
              <div key={i} className="article__table-wrap" data-lenis-prevent-horizontal>
                <table className="article__table">
                  <thead>
                    <tr>
                      {head.map((c, k) => (
                        <th key={k} scope="col">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, k) => (
                      <tr key={k}>
                        {r.map((c, j) => (
                          <td key={j}>{c}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
          case 'img': {
            const [w, h] = sanitySize(n.src);
            return (
              <figure key={i} className="article__figure" data-media>
                <Image src={n.src} alt={n.alt ?? ''} width={w} height={h} sizes="(min-width: 1024px) 75vw, 100vw" quality={80} />
                {n.alt && <figcaption>{n.alt}</figcaption>}
              </figure>
            );
          }
          default:
            return null;
        }
      })}
    </div>
  );
}
