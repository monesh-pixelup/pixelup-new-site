import Image from 'next/image';
import type { CSSProperties } from 'react';
import type { Proposal, ProposalDeliverable } from '@/content/proposals';
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
function WeekWindow({ week }: { week: Proposal['week'] }) {
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
  const dates = new Map<number, string>();
  schedule.sprints.forEach((s) => s.weeks.forEach((w) => dates.set(w.week, w.date)));
  const weeks = Array.from(dates.keys()).sort((a, b) => a - b);
  const d = schedule.decideBy.week;
  return (
    <div className="pt" style={{ '--weeks': weeks.length } as Vars} data-reveal="fade" aria-hidden="true">
      {weeks.map((w) => (
        <span key={w} className="pt__week" style={{ gridColumn: w + 1 }}>
          <b>W{w}</b> {dates.get(w)}
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
      <span className="pt__decide" style={{ gridColumn: d + 1, gridRow: `2 / span ${schedule.sprints.length}` }}>
        <span>{schedule.decideBy.label}</span>
      </span>
    </div>
  );
}

export default function ProposalView({ p }: { p: Proposal }) {
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

      <section className="cs-section prop-week" data-dock="badge">
        <div className="cs-text">
          <Head n={1} label="Your week" heading={p.week.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {p.week.body}
            </p>
          </div>
        </div>
        <WeekWindow week={p.week} />
      </section>

      <section className="cs-section">
        <div className="cs-text">
          <Head n={2} label="How we split it" heading={p.split.heading} />
          <div className="cs-text__body">
            <dl className="cs-items prop-split">
              {p.split.items.map((it) => (
                <div key={it.label} className="cs-item" data-reveal="fade">
                  <dt>{it.label}</dt>
                  <dd>{it.text}</dd>
                </div>
              ))}
            </dl>
            <p className="prop-line" data-reveal="fade">
              {p.split.line}
            </p>
          </div>
        </div>
      </section>

      <section className="cs-section prop-schedule">
        <div className="cs-text">
          <Head n={3} label="How the weeks run" heading={p.schedule.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {p.schedule.body}
            </p>
          </div>
        </div>

        <Timeline schedule={p.schedule} />

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
                  {s.weeks.length} calls · ~{(s.weeks.length * 45) / 60} hours of your time
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
                      <span className="ps__date">Week · {w.date}</span>
                    </span>
                    <div className="ps__bring">
                      <span className="ps__label">We bring</span>
                      <p>{w.bring}</p>
                    </div>
                    <div className="ps__decide">
                      <span className="ps__label">You decide</span>
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
      </section>

      <section className="cs-section">
        <div className="cs-text">
          <Head n={4} label="Deliverables" heading={p.deliverables.heading} />
          <div className="cs-text__body prop-get">
            {p.deliverables.groups.map((g) => (
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

      <section className="cs-section">
        <div className="cs-text">
          <Head n={5} label="Why it works" heading={p.rules.heading} />
          <div className="cs-text__body">
            <p className="cs-para" data-reveal="fade">
              {p.rules.intro}
            </p>
            <dl className="cs-items prop-rules">
              {p.rules.items.map((it) => (
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

      <section className="cs-section prop-invest">
        <div className="cs-text">
          <Head n={6} label="Investment" heading={p.investment.heading} />
          <div className="cs-text__body">
            <div className="prop-price" data-reveal="fade">
              <p className="prop-price__name">
                {p.investment.lead.name} <span>{p.investment.lead.terms}</span>
              </p>
              <p className="prop-price__num">{p.investment.lead.price}</p>
              <p className="cs-para">{p.investment.lead.includes}</p>
            </div>
            <div className="prop-price prop-price--addon" data-reveal="fade">
              <p className="prop-price__name">
                {p.investment.addon.name} <span>{p.investment.addon.terms}</span>
              </p>
              <p className="cs-para">{p.investment.addon.includes}</p>
            </div>
            <p className="prop-line" data-reveal="fade">
              {p.investment.line}
            </p>
          </div>
        </div>
      </section>

      <section className="cs-section prop-proof">
        <div className="cs-text">
          <Head n={7} label="Proof" heading={p.proof.heading} />
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
    </>
  );
}
