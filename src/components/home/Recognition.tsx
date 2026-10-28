import { home } from '@/content/site';
import { Eyebrow, Lines } from './parts';

export default function Recognition() {
  const { eyebrow, numeral, count, lines, awards } = home.recognition;
  return (
    <section className="hr" aria-labelledby="hr-title">
      <Eyebrow label={eyebrow} numeral={numeral} className="hr__eb" />

      {/* The Figma sets the 2 in type and the 7 as a drawn figure, with a black block between them. */}
      <div className="hr__count" aria-hidden="true">
        <span className="hr__two tb">{count[0]}</span>
        <span className="hr__block" />
        {/* Stands in for the drawn 7 while the figure counts up, then hands back to it. */}
        <span className="hr__one tb">{count[1]}</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hr__seven" src="/home/seven.svg" width={335.824} height={482.565} alt="" />
      </div>
      <h2 id="hr-title" className="sr-only">
        {count} features and awards
      </h2>
      <Lines className="disp hr__text" lines={lines} words />

      <ul className="hr__awards">
        {awards.map((a, i) => (
          <li className="hr__row" key={i}>
            <span className="hr__rule" data-draw aria-hidden="true" />
            <span className="hr__left">
              <span className="hr__title tb">{a.title}</span>
              <span className="hr__source tb">{a.source}</span>
            </span>
            <span className="hr__right">
              <span className="hr__title tb">{a.award}</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img className="hr__spark" src="/home/spark.svg" width={23} height={23} alt="" />
              <span className="hr__title tb">{a.project}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
