import Image from 'next/image';
import { caseHref, nextCase, type CaseSection, type CaseStudy } from '@/content/caseStudies';
import { ArrowSwap, Roll } from '../ui';
import { MediaFrame, MediaGroup } from './Media';

function Section({ s }: { s: CaseSection }) {
  const hasText = s.heading || s.items.length || s.paragraphs.length || s.metrics.length || s.stats.length || s.quote;
  return (
    <section className="cs-section">
      {hasText && (
        <div className="cs-text">
          <div className="cs-text__head">
            {s.challenge && (
              <p className="cs-eyebrow" data-reveal="fade">
                Critical challenge <span>{s.challenge}</span>
              </p>
            )}
            {s.heading && (
              <h2 className="cs-heading" data-reveal="lines">
                {s.heading}
              </h2>
            )}
          </div>

          <div className="cs-text__body">
            {s.paragraphs.map((p) => (
              <p key={p} className="cs-para" data-reveal="fade">
                {p}
              </p>
            ))}
            {s.items.length > 0 && (
              <dl className="cs-items">
                {s.items.map((it) => (
                  <div key={it.label + it.text.slice(0, 12)} className="cs-item" data-reveal="fade">
                    <dt>{it.label}</dt>
                    <dd>{it.text}</dd>
                  </div>
                ))}
              </dl>
            )}
            {s.metrics.length > 0 && (
              <dl className="cs-metrics">
                {s.metrics.map((m) => (
                  <div key={m.label} className="cs-metric" data-reveal="fade">
                    <dt>{m.label}</dt>
                    <dd>{m.text}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {s.stats.length > 0 && <Stats stats={s.stats} />}

          {s.quote && (
            <figure className="cs-quote">
              <blockquote data-reveal="lines">{s.quote.text}</blockquote>
              <figcaption data-reveal="fade">
                {s.quote.avatar && <Image src={s.quote.avatar} alt="" width={36} height={36} />}
                <span>{s.quote.author}</span>
                <span className="cs-quote__role">{s.quote.role}</span>
              </figcaption>
            </figure>
          )}
        </div>
      )}
      {s.media.length > 0 && <MediaGroup media={s.media} />}
    </section>
  );
}

function Stats({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <dl className="cs-stats">
      {stats.map((s) => (
        <div key={s.label} className="cs-stat" data-reveal="fade">
          <dt>{s.label}</dt>
          <dd>{s.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function CaseStudyView({ cs }: { cs: CaseStudy }) {
  const next = nextCase(cs.slug);
  const p = cs.project;
  const site = p.site ?? (p.href && !p.href.startsWith('/') ? p.href : undefined);
  return (
    <>
      <section className="cs-intro" aria-labelledby="cs-title">
        <p className="cs-kicker" data-intro="fade">
          {cs.kicker ?? `${p.industry} · ${p.client}`}
        </p>
        <h1 id="cs-title" className="cs-title" data-intro="lines">
          {cs.title}
        </h1>
        <p className="cs-lede" data-intro="fade">
          {cs.description}
        </p>

        <dl className="cs-meta" data-intro="fade">
          <div className="cs-meta__cell cs-meta__cell--client">
            <dt>Client</dt>
            <dd>{p.client}</dd>
          </div>
          <div className="cs-meta__cell cs-meta__cell--year">
            <dt>Year</dt>
            <dd>{p.year}</dd>
          </div>
          <div className="cs-meta__cell cs-meta__cell--scope">
            <dt>Involvement</dt>
            <dd>{cs.involvement.join(', ')}</dd>
          </div>
          <div className="cs-meta__cell cs-meta__cell--link">
            <dt>Link</dt>
            <dd>
              {site ? (
                <a href={site} target="_blank" rel="noreferrer" className="u-link">
                  {new URL(site).hostname.replace(/^www\./, '')}
                </a>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </section>

      <div className="cs-body" data-dock="index">
        {cs.hero && (
          <div className="mocks">
            <div className="mocks__row mocks__row--full">
              <MediaFrame media={cs.hero} shape="full" priority />
            </div>
          </div>
        )}
        {cs.stats.length > 0 && (
          <div className="cs-text cs-text--stats">
            <Stats stats={cs.stats} />
          </div>
        )}
        {cs.sections.map((s, i) => (
          <Section key={i} s={s} />
        ))}
      </div>

      <section className="cs-next" aria-label="Next case study">
        <p className="cs-next__label" data-reveal="fade">
          Next case study
        </p>
        <a href={caseHref(next.slug)} className="cs-next__link" data-cursor="Next case">
          <span className="cs-next__title">
            <Roll>{next.project.client}</Roll>
          </span>
          <span className="cs-next__sub">{next.project.summary}</span>
          <ArrowSwap />
        </a>
      </section>
    </>
  );
}
