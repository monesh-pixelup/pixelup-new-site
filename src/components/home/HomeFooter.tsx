import { blog } from '@/content/caseStudies';
import { home, projects, site } from '@/content/site';
import { Arrow, ArrowSwap, Roll, StatusDots } from '../ui';

const index = [
  { label: 'Work', href: '/work', count: projects.length },
  { label: 'About', href: '#about' },
  { label: 'News', href: '/blog', count: blog.length },
  { label: 'Showreel', href: '#showreel' },
];

/** Figma "Footer / 01 Monolith" (1524:1259). */
export default function HomeFooter() {
  const f = home.footer;
  return (
    <footer className="hf" id="contact">
      <div className="hf__top">
        <p className="hf__ask" data-reveal="fade">
          {f.eyebrow}
        </p>
        <div className="hf__meta" data-reveal="fade">
          <p className="hf__status">
            <StatusDots />
            <i className="hf__line" aria-hidden="true" />
            <span>{site.status}</span>
          </p>
          <a href={`mailto:${site.email}`} className="hf__contact">
            <Roll>Contact</Roll>
            <ArrowSwap rotate={-45} />
          </a>
        </div>
      </div>

      <a href={`mailto:${site.email}`} className="hf__sign" aria-label={`${site.name} × you? Email ${site.email}`} data-cursor="Say hello">
        <span className="hf__mask hf__px" aria-hidden="true">
          <span className="tb">PXLUP</span>
        </span>
        <span className="hf__mask hf__reg" aria-hidden="true">
          <span className="tb">®</span>
        </span>
        <span className="hf__mask hf__x" aria-hidden="true">
          <span className="tb">×</span>
        </span>
        <span className="hf__mask hf__arrow" aria-hidden="true">
          <span>
            <Arrow />
          </span>
        </span>
        <span className="hf__mask hf__you" aria-hidden="true">
          <span className="tb">YOU?</span>
        </span>
      </a>

      <div className="hf__cols">
        <i className="hf__rule" data-draw aria-hidden="true" />
        <div className="hf__col hf__col--studio">
          <h2 className="hf__label">Studio</h2>
          <p className="hf__studio">
            {f.studio.map((line, i) => (
              <span key={i}>{line} </span>
            ))}
          </p>
        </div>
        <nav className="hf__col" aria-label="Index">
          <h2 className="hf__label">Index</h2>
          <ul className="hf__list">
            {index.map((l) => (
              <li key={l.label}>
                <a href={l.href}>
                  <Roll>{l.label}</Roll>
                  {l.count !== undefined && <sup>{l.count}</sup>}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="hf__col">
          <h2 className="hf__label">Elsewhere</h2>
          <ul className="hf__list">
            {f.elsewhere.map((l) => (
              <li key={l.label}>
                <a href={l.href} target={l.href.startsWith('http') ? '_blank' : undefined} rel={l.href.startsWith('http') ? 'noreferrer' : undefined}>
                  <Roll>{l.label}</Roll>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="hf__col">
          <h2 className="hf__label">New business</h2>
          <ul className="hf__list">
            <li>
              <a href={`mailto:${site.email}`}>
                <Roll>{site.email}</Roll>
              </a>
            </li>
            <li className="hf__place">{f.location}</li>
          </ul>
        </div>
      </div>

      <div className="hf__bar">
        <i className="hf__rule" data-draw aria-hidden="true" />
        <p>{f.legal}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hf__mark" src="/mark.svg" width={18} height={15.59} alt="" />
        <a href="#top" className="hf__top-link">
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
