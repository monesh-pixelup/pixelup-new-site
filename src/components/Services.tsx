import { services } from '@/content/site';

const pad = (n: number) => String(n).padStart(2, '0');

export default function Services() {
  return (
    <section className="services" id="services" aria-labelledby="services-title">
      <div className="services__inner">
        <div className="services__head">
          <h2 id="services-title" className="services__eyebrow">
            Services
          </h2>
          <p className="services__intro">Three ways to work together.</p>
        </div>

        <ol className="services__list">
          {services.map((s, i) => (
            <li className="svc" key={s.title}>
              <h3 className="svc__title" data-bracket="service">
                <span className="svc__title-inner">{s.title}</span>
              </h3>
              <div className="svc__body">
                <p className="svc__summary">{s.summary}</p>
                <ul className="svc__tags" aria-label="Includes">
                  {s.tags.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
                <p className="svc__price">
                  <span className="svc__price-label">{pad(i + 1)} / Investment</span>
                  {s.price}
                </p>
              </div>
            </li>
          ))}
        </ol>

        <ol className="services__index" aria-hidden="true">
          {services.map((s, i) => (
            <li key={s.title} className={i === 0 ? 'is-active' : undefined}>
              <span className="services__num">{pad(i + 1)}</span>
              <span className="services__name">{s.title}</span>
              <span className="services__track" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
