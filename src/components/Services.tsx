import { services } from '@/content/site';
import { Circ } from './ui';

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
          {services.map((s) => (
            <li className="svc" key={s.title}>
              <h3 className="svc__title" data-bracket="service">
                <span className="svc__title-inner">{s.title}</span>
              </h3>
              <div className="svc__body">
                <p className="svc__summary">{s.summary}</p>
                <p className="svc__tags">
                  {s.tags.join(', ')}
                  <span className="svc__price">{s.price}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>

        <ol className="services__index" aria-hidden="true">
          {services.map((s, i) => (
            <li key={s.title} className={i === 0 ? 'is-active' : undefined}>
              <Circ n={i + 1} />
              {s.title}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
