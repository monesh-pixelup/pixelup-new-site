import { home } from '@/content/site';
import ClientsSky from './ClientsSky';
import { Eyebrow, Lines, type Vars } from './parts';

/**
 * Clients, as on /next: the page flips to paper as it arrives, then a tall field where the wordmarks turn on a drum
 * over the brand gradient, which moves through its colours as you scroll (ClientsSky).
 */
export default function HomeClients() {
  const { eyebrow, numeral, lines, side, logos } = home.clients;
  return (
    <section className="hc" aria-labelledby="hc-title">
      <div className="hc__head">
        <Eyebrow label={eyebrow} numeral={numeral} className="hc__eb" />
        <Lines as="h2" id="hc-title" className="disp hc__title" lines={lines} />
      </div>

      <div className="hc__field">
        <ClientsSky count={logos.length} />
        <div className="hc__side" aria-hidden="true">
          <span>
            {eyebrow}
            <sup>{numeral}</sup>
          </span>
          <span>{side}</span>
        </div>
        {/* The list runs three times so the drum is never empty and the sky has room to blend; the repeats are hidden
            from assistive tech. */}
        <ul className="hc__list" data-drum>
          {[...logos, ...logos, ...logos].map((l, i) => {
            const repeat = i >= logos.length;
            return (
              <li
                key={i}
                className="hc__logo"
                aria-hidden={repeat || undefined}
                style={{ '--w': l.w, '--hh': l.h } as Vars}
                data-logo={l.src}
                data-logo-ratio={l.ratio}
                data-logo-name={l.name}
              >
                <svg viewBox={`0 0 ${l.w} ${l.h}`} role={repeat ? undefined : 'img'} aria-label={repeat ? undefined : l.name}>
                  <use href={`/home/logotypes.svg#${l.id}`} />
                </svg>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
