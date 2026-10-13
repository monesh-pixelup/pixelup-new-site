import Image from 'next/image';
import { Fragment } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Proposal, ProposalDeliverable, ProposalSection } from '@/content/proposals';

const DEFAULT_ORDER: ProposalSection[] = ['week', 'split', 'schedule', 'deliverables', 'rules', 'investment', 'proof'];
import { ArrowSwap } from '../ui';
import Collapse from './Collapse';
import { Icon } from './icons';

type Vars = CSSProperties & Record<`--${string}`, string | number>;

// The meta row reuses the case-study cells, which sit on the header's columns.
const META_CELLS = ['client', 'year', 'scope', 'link'];
const pad = (n: number) => String(n).padStart(2, '0');
const hourLabel = (h: number) => `${pad(h % 24)}:00`;

function Head({ n, label, heading }: { n: number; label: string; heading: string }) {
  return (
    <div className="cs-text__head">
      <p className="cs-eyebrow" data-reveal="fade">
        {label} <span>{pad(n)}</span>
      </p>
      <h2 className="cs-heading" data-reveal="lines">
        {heading}
      </h2>
    </div>
  );
}

type ItemList = NonNullable<Proposal['run']>;

/** A titled section with an intro and an icon list: used for the approach, the run and the next steps. */
function ItemSection({ n, label, list }: { n: number; label: string; list: ItemList }) {
  return (
    <section className="cs-section">
      <div className="cs-text">
        <Head n={n} label={label} heading={list.heading} />
        <div className="cs-text__body">
          {list.intro && (
            <p className="cs-para" data-reveal="fade">
              {list.intro}
            </p>
          )}
          <dl className="cs-items prop-rules">
            {list.items.map((it) => (
              <div key={it.label} className="cs-item" data-reveal="fade">
                <dt>
                  <Icon name={it.icon} />
                  {it.label}
                </dt>
                <dd>{it.text}</dd>
              </div>
            ))}
          </dl>
          {list.line && (
            <p className="prop-line" data-reveal="fade">
              {list.line}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/** A deliverable with a piece of past work beside it, so "a design system" has a picture. */
function Deliverable({ item }: { item: Exclude<ProposalDeliverable, string> }) {
  const { reference: ref } = item;
  const body = (
    <>
      <span className="pr__thumb">
        <Image src={ref.src} alt={ref.alt} fill sizes="160px" quality={80} draggable={false} />
      </span>
      <span className="pr__text">
        <span className="pr__kind">Reference</span>
        <span className="pr__label">{ref.label}</span>
      </span>
      {ref.href && <ArrowSwap rotate={-45} />}
    </>
  );
  return (
    <>
      {item.text}
      {ref.href ? (
        <a className="pr" href={ref.href} target="_blank" rel="noreferrer" data-cursor="View">
          {body}
        </a>
      ) : (
        <span className="pr">{body}</span>
      )}
    </>
  );
}

/** The booking window as a headline, with the two parts of the weekly ask under it. No slot is placed: the client picks it. */
function WeekWindow({ week }: { week: NonNullable<Proposal['week']> }) {
  return (
    <figure className="pw" data-reveal="fade">
      <p className="pw__title">
        <span>Your window · Mon–Fri</span>
        {hourLabel(week.window[0])}–{hourLabel(week.window[1])} {week.tz}
      </p>
      <figcaption className="pw__legend">
        <span>Book the {week.call}-min review call in any slot in this window</span>
        <span>+ {week.review} min async review, whenever suits you</span>
        <span className="pw__caption">{week.caption}</span>
      </figcaption>
    </figure>
  );
}

/** Both sprints on one week axis, so the overlap and the decision point read at a glance. */
function Timeline({ schedule }: { schedule: Proposal['schedule'] }) {
  const dates = new Map<number, string | undefined>();
  schedule.sprints.forEach((s) => s.weeks.forEach((w) => dates.set(w.week, w.date)));
  const weeks = Array.from(dates.keys()).sort((a, b) => a - b);
  return (
    <div className="pt" style={{ '--weeks': weeks.length } as Vars} data-reveal="fade" aria-hidden="true">
      {weeks.map((w) => (
        <span key={w} className="pt__week" style={{ gridColumn: w + 1 }}>
          <b>W{w}</b> {dates.get(w) ?? ''}
        </span>
      ))}
      {schedule.sprints.map((s, i) => (
        <div key={s.name} className="pt__lane">
          <span className="pt__name" style={{ gridRow: i + 2 }}>
            {s.name}
          </span>
          <span className="pt__bar" data-optional={s.optional || undefined} style={{ gridRow: i + 2, gridColumn: `${s.from + 1} / ${s.to + 2}` }}>
            {s.optional ? 'Optional' : `${s.to - s.from + 1} weeks`}
          </span>
        </div>
      ))}
      {schedule.decideBy && (
        <span className="pt__decide" style={{ gridColumn: schedule.decideBy.week + 1, gridRow: `2 / span ${schedule.sprints.length}` }}>
          <span>{schedule.decideBy.label}</span>
        </span>
      )}
    </div>
  );
}

export default function ProposalView({ p }: { p: Proposal }) {
  const order = p.order ?? DEFAULT_ORDER;
  const num = (k: ProposalSection) => order.indexOf(k) + 1;
  const label = (k: ProposalSection, d: string) => p.labels?.[k] ?? d;
  const sections: Record<ProposalSection, ReactNode> = {
    week: p.week && ((week) => (      <section className="cs-section prop-week" data-dock="badge">
        <div className="cs-text">
          <Head n={num('week')} label={label('week', 'Your week')} heading={week.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {week.body}
            </p>
          </div>
        </div>
        <WeekWindow week={week} />
      </section>
    ))(p.week),
    split: (
      <section className="cs-section">
        <div className="cs-text">
          <Head n={num('split')} label={label('split', 'How we split it')} heading={p.split.heading} />
          <div className="cs-text__body">
            {p.split.intro && (
              <p className="cs-para" data-reveal="fade">
                {p.split.intro}
              </p>
            )}
            <dl className="cs-items prop-split">
              {p.split.items.map((it) => (
                <div key={it.label} className="cs-item" data-reveal="fade">
                  <dt>{it.label}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            {p.split.line && (
              <p className="prop-line" data-reveal="fade">
                {p.split.line}
              </p>
            )}
          </div>
        </div>
      </section>
    ),
    schedule: (
      <section className="cs-section prop-schedule">
        <div className="cs-text">
          <Head n={num('schedule')} label={label('schedule', 'How the weeks run')} heading={p.schedule.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {p.schedule.body}
            </p>
          </div>
        </div>

        <Timeline schedule={p.schedule} />

        {!p.schedule.hideRows && (
        <div className="ps">
          {p.schedule.sprints.map((s) => {
            // An optional sprint starts collapsed to its header; its rows skip the scroll reveal,
            // which would measure them while hidden.
            const reveal = s.optional ? undefined : 'fade';
            const head = (
              <div className="ps__head" data-reveal={reveal}>
                <span className="ps__title">
                  <h3 className="ps__name">{s.name}</h3>
                  <span className="ps__badge">{s.note}</span>
                </span>
                <span className="ps__sum">
                  <Icon name="clock" />
                  {s.sum ?? `${s.weeks.length} calls · ~${(s.weeks.length * 45) / 60} hours of your time`}
                  {s.detail && <span className="ps__detail">{s.detail}</span>}
                </span>
                {s.optional && (
                  <span className="ps__toggle" aria-hidden="true">
                    <span className="ps__toggle-open">Show the {s.weeks.length} weeks</span>
                    <span className="ps__toggle-close">Hide the weeks</span>
                    <i className="ps__plus" />
                  </span>
                )}
              </div>
            );
            const list = (
              <ol className="ps__list">
                {s.weeks.map((w) => (
                  <li key={w.week} className="ps__row" data-reveal={reveal}>
                    <span className="ps__wk">
                      <span className="ps__num">{pad(w.week)}</span>
                      <span className="ps__date">{w.date ? `Week · ${w.date}` : `Week ${w.week}`}</span>
                    </span>
                    <div className="ps__bring">
                      <span className="ps__label">{p.schedule.labels?.bring ?? 'We bring'}</span>
                      <p>{w.bring}</p>
                    </div>
                    <div className="ps__decide">
                      <span className="ps__label">{p.schedule.labels?.decide ?? 'You decide'}</span>
                      <p className="ps__decision">{w.decide}</p>
                      {w.flag && (
                        <p className="ps__flag">
                          <Icon name="flag" />
                          {w.flag}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            );
            return s.optional ? (
              <Collapse key={s.name} className="ps__group" data-optional summary={head}>
                {list}
              </Collapse>
            ) : (
              <div key={s.name} className="ps__group">
                {head}
                {list}
              </div>
            );
          })}
          <p className="prop-line ps__line" data-reveal="fade">
            {p.schedule.line}
          </p>
        </div>
        )}
        {p.schedule.hideRows && (
          <p className="prop-line ps__line" data-reveal="fade">
            {p.schedule.line}
          </p>
        )}
      </section>
    ),
    deliverables: p.deliverables && ((deliverables) => (      <section className="cs-section">
        <div className="cs-text">
          <Head n={num('deliverables')} label={label('deliverables', 'Deliverables')} heading={deliverables.heading} />
          <div className="cs-text__body prop-get">
            {deliverables.groups.map((g) => (
              <div key={g.name} className="prop-get__group" data-optional={g.optional || undefined}>
                <p className="prop-get__name" data-reveal="fade">
                  {g.name} <span>{g.note}</span>
                </p>
                <ul className="prop-get__list">
                  {g.items.map((it) => (
                    <li key={typeof it === 'string' ? it : it.text} data-reveal="fade">
                      {typeof it === 'string' ? it : <Deliverable item={it} />}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>
    ))(p.deliverables),
    rules: p.rules && ((rules) => (      <section className="cs-section">
        <div className="cs-text">
          <Head n={num('rules')} label={label('rules', 'Why it works')} heading={rules.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {rules.intro}
            </p>
            <dl className="cs-items prop-rules">
              {rules.items.map((it) => (
                <div key={it.label} className="cs-item" data-reveal="fade">
                  <dt>
                    <Icon name={it.icon} />
                    {it.label}
                  </dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    ))(p.rules),
    investment: (
      <section className="cs-section prop-invest">
        <div className="cs-text">
          <Head n={num('investment')} label={label('investment', 'Investment')} heading={p.investment.heading} />
          <div className="cs-text__body">
            <div className="prop-price" data-reveal="fade">
              <p className="prop-price__name">
                {p.investment.lead.name} <span>{p.investment.lead.terms}</span>
              </p>
              <p className="prop-price__num">{p.investment.lead.price}</p>
              <p className="cs-para">{p.investment.lead.includes}</p>
            </div>
            {p.investment.addon && ((addon) => (
            <div className="prop-price prop-price--addon" data-reveal="fade">
              <p className="prop-price__name">
                {addon.name} <span>{addon.terms}</span>
              </p>
              <p className="cs-para">{addon.includes}</p>
            </div>
            ))(p.investment.addon)}
            <p className="prop-line" data-reveal="fade">
              {p.investment.line}
            </p>
          </div>
        </div>
      </section>
    ),
    proof: (
      <section className="cs-section prop-proof">
        <div className="cs-text">
          <Head n={num('proof')} label={label('proof', 'Proof')} heading={p.proof.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {p.proof.body}
            </p>
          </div>
        </div>
        <div className="prop-proof__row">
          {p.proof.items.map((it) => (
            <a key={it.client} href={it.href} className="pp" data-cursor="View case study">
              <figure className="pp__media" data-media>
                <div className="frame__zoom">
                  <Image src={it.src} alt={it.alt} fill sizes="(min-width: 768px) 48vw, 100vw" quality={80} draggable={false} />
                </div>
              </figure>
              <span className="pp__meta">
                <span className="pp__client">{it.client}</span>
                <span className="pp__note">{it.note}</span>
                <ArrowSwap rotate={-45} />
              </span>
            </a>
          ))}
        </div>
      </section>
    ),
    references: p.references && (
      <section className="cs-section prop-proof prop-refs">
        <div className="cs-text">
          <Head n={num('references')} label={label('references', 'Your references')} heading={p.references.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {p.references.intro}
            </p>
            <dl className="cs-items prop-rules">
              {p.references.themes.map((it) => (
                <div key={it.label} className="cs-item" data-reveal="fade">
                  <dt>
                    <Icon name={it.icon} />
                    {it.label}
                  </dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <div className="prop-proof__row prop-refs__row">
          {p.references.items.map((it) => (
            <a key={it.name} href={it.href} target="_blank" rel="noreferrer" className="pp" data-cursor="Visit">
              <figure className="pp__media" data-media>
                <div className="frame__zoom">
                  <Image src={it.src} alt={it.alt} fill sizes="(min-width: 768px) 24vw, 50vw" quality={85} draggable={false} />
                </div>
              </figure>
              <span className="pp__meta">
                <span className="pp__client">{it.name}</span>
                <span className="pp__note">{it.note}</span>
              </span>
            </a>
          ))}
        </div>
        {p.references.line && (
          <div className="cs-text">
            <div className="cs-text__body">
              <p className="prop-line" data-reveal="fade">
                {p.references.line}
              </p>
            </div>
          </div>
        )}
      </section>
    ),
    run: p.run && <ItemSection n={num('run')} label={label('run', 'How we’d run it')} list={p.run} />,
    next: p.next && <ItemSection n={num('next')} label={label('next', 'Next steps')} list={p.next} />,
    reviews: p.reviews && (
      <section className="cs-section">
        <div className="cs-text">
          <Head n={num('reviews')} label={label('reviews', 'Reviews')} heading={p.reviews.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {p.reviews.body}
            </p>
            <dl className="cs-items prop-split">
              {p.reviews.items.map((it) => (
                <div key={it.name} className="cs-item" data-reveal="fade">
                  <dt>
                    {it.name}, {it.role}
                  </dt>
                  <dd>“{it.quote}”</dd>
                </div>
              ))}
            </dl>
            {p.reviews.line && (
              <p className="prop-line" data-reveal="fade">
                {p.reviews.line}
              </p>
            )}
          </div>
        </div>
      </section>
    ),
  };
  return (
    <>
      <section className="cs-intro prop-intro" aria-labelledby="prop-title">
        <p className="cs-kicker" data-intro="fade">
          {p.kicker}
        </p>
        <h1 id="prop-title" className="cs-title" data-intro="lines">
          {p.title}
        </h1>
        <p className="cs-lede" data-intro="lines">
          {p.lede}
        </p>
        <dl className="cs-meta prop-meta" data-intro="fade">
          {p.meta.map((m, i) => (
            <div key={m.label} className={`cs-meta__cell--${META_CELLS[i]}`}>
              <dt>
                <Icon name={m.icon} />
                {m.label}
              </dt>
              <dd>
                {m.value}
                {m.note && <span className="prop-meta__note">{m.note}</span>}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {order.map((k) => (
        <Fragment key={k}>{sections[k]}</Fragment>
      ))}
    </>
  );
}
