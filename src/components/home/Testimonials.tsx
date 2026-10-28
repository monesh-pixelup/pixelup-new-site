import { home } from '@/content/site';
import { Eyebrow, Lines } from './parts';
import Voices from './Voices';

export default function Testimonials() {
  const { eyebrow, numeral, lead, lines, voices } = home.testimonials;
  return (
    <section className="ht" id="testimonials" aria-labelledby="ht-title">
      {/* Lifts away as the page flips to paper for the clients (Experience). */}
      <div className="ht__in">
        <Eyebrow label={eyebrow} numeral={numeral} className="ht__eb" />
        <h2 id="ht-title" className="disp ht__title">
          <Lines as="span" className="ht__lead" lines={[lead]} />
          <Lines as="span" className="ht__rest" lines={lines} />
        </h2>
        <Voices voices={voices} />
      </div>
    </section>
  );
}
