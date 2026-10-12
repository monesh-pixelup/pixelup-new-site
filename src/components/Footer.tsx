import type { ReactNode } from 'react';
import { site } from '@/content/site';
import CopyEmail from './CopyEmail';
import FooterGradient from './FooterGradient';
import { ArrowSwap, Roll, StatusDots } from './ui';

const echo = [
  'Brand, websites and motion for AI companies',
  `${site.email}, @dakshpixelup, pixeluplabs.com`,
  `PIXELUP LABS © ${new Date().getFullYear()}, all rights reserved`,
];

type Link = { label: string; href: string; icon?: ReactNode };

type Props = {
  /** Overrides for pages with their own ask (proposals). */
  eyebrow?: string;
  email?: string;
  note?: string;
  /** Replaces the big email address with a call to action (e.g. a payment link). */
  action?: Link;
  /** Extra links under the note (e.g. a payment link, a PDF). */
  links?: Link[];
};

export default function Footer({ eyebrow = 'New business', email = site.email, note = `${site.status} right now. Say hello anyway.`, action, links = [] }: Props = {}) {
  return (
    <footer className="foot" id="contact">
      <FooterGradient />
      <div className="foot__cta">
        <p className="foot__eyebrow" data-reveal="fade">
          {eyebrow}
        </p>
        {action ? (
          <a href={action.href} className="foot__email foot__action" data-bracket="email" data-cursor={action.label} target="_blank" rel="noreferrer">
            <span className="mask foot__email-mask" data-reveal="rise">
              <span className="foot__email-text">
                <Roll>{action.label}</Roll>
              </span>
            </span>
            <span className="foot__action-arrow">
              <ArrowSwap rotate={-45} />
            </span>
          </a>
        ) : (
          <CopyEmail email={email} />
        )}
        <p className="foot__note" data-reveal="fade">
          <StatusDots />
          <span>
            {note}
            {links.length > 0 && (
              <span className="foot__note-links">
                {links.map((l) => (
                  <a key={l.href} href={l.href} className="foot__note-link" target="_blank" rel="noreferrer">
                    {l.icon}
                    <span className="u-link">{l.label}</span>
                  </a>
                ))}
              </span>
            )}
          </span>
        </p>
      </div>

      <div className="foot__bar">
        <div className="foot__links">
          <a href={`mailto:${email}`} className="u-link">
            {email}
          </a>
          {site.socials.map((s) => (
            <a key={s.label} href={s.href} className="foot__social" target="_blank" rel="noreferrer">
              <span className="u-link">{s.label}</span>
              <ArrowSwap rotate={-45} />
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
