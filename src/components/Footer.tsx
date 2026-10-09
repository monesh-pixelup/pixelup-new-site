import { site } from '@/content/site';
import CopyEmail from './CopyEmail';
import { Hook, StatusDots } from './ui';

const echo = [
  'Brand, websites and motion for AI companies',
  `${site.email}, @dakshpixelup, pixeluplabs.com`,
  `PIXELUP Labs © ${new Date().getFullYear()}, all rights reserved`,
];

export default function Footer() {
  return (
    <footer className="foot" id="contact">
      <div className="foot__cta">
        <p className="foot__eyebrow" data-reveal="fade">
          New business
        </p>
        <CopyEmail email={site.email} />
        <p className="foot__note" data-reveal="fade">
          <StatusDots />
          <span>{site.status} right now. Say hello anyway.</span>
        </p>
      </div>

      <div className="foot__bar">
        <div className="foot__links">
          <a href={`mailto:${site.email}`} className="u-link">
            {site.email}
          </a>
          {site.socials.map((s) => (
            <a key={s.label} href={s.href} className="foot__social" target="_blank" rel="noreferrer">
              <Hook />
              <span className="u-link">{s.label}</span>
            </a>
          ))}
        </div>

        <div className="foot__echo" aria-hidden="true">
          {[0, 1, 2].map((b) => (
            <span className="echo__block" key={b}>
              {echo.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </span>
          ))}
        </div>

        <div className="foot__legal">
          {site.legal.map((l) => (
            <a key={l.label} href={l.href} className="u-link">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
