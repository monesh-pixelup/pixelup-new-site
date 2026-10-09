import { clients } from '@/content/site';

export default function Clients() {
  return (
    <section className="clients" aria-labelledby="clients-title">
      <div className="clients__rule" data-draw aria-hidden="true" />
      <div className="clients__row">
        <ul className="clients__logos">
          {clients.map((c) => (
            <li key={c.name}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.src} width={c.width} height={32} alt={c.name} draggable={false} />
            </li>
          ))}
        </ul>
        <p className="clients__label" id="clients-title">
          <span>Selected clients</span>
          <span className="clients__count">({clients.length})</span>
        </p>
      </div>
    </section>
  );
}
