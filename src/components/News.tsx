import { blog, blogHref, formatDate } from '@/content/caseStudies';
import { ArrowSwap } from './ui';

export default function News() {
  const latest = blog.slice(0, 5);
  return (
    <section className="news" id="news" aria-labelledby="news-title">
      <div className="news__head">
        <h2 id="news-title" className="news__title">
          <span className="mask" data-reveal="rise">
            <span>
              Blog<sup>{blog.length}</sup>
            </span>
          </span>
        </h2>
        <p className="news__intro" data-reveal="fade">
          Design strategies that work for enterprise companies, written by Daksh. <a href="/blog" className="u-link">All articles</a>
        </p>
      </div>
      <ul className="news__list">
        {latest.map((n) => (
          <li key={n.slug} className="news__row">
            <a href={blogHref(n.slug)} className="news__link">
              <span className="news__type">{n.kind}</span>
              <span className="news__name">{n.title}</span>
              <span className="news__meta">{formatDate(n.date)}</span>
              <span className="news__go">
                <ArrowSwap />
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
