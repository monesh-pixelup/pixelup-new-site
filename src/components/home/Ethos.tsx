import { home } from '@/content/site';
import { Eyebrow, Lines } from './parts';

export default function Ethos() {
  const { eyebrow, numeral, lead, lines } = home.ethos;
  return (
    <section className="he" id="about" aria-labelledby="he-title">
      <Eyebrow label={eyebrow} numeral={numeral} className="he__eb eb--level" />
      <Lines as="h2" id="he-title" className="disp he__title" lines={[lead, ...lines]} />
    </section>
  );
}
