import { home } from '@/content/site';
import { Eyebrow, Lines } from './parts';

// The glyph's dots: five on top pop in, then eight around the ring blink in turn.
const TOP = [[36, 60.9], [68.6, 60.9], [52.1, 76.9], [36, 93.1], [68.6, 93.1]];
const RING = [[37, 135.3], [53, 135.3], [68.9, 135.3], [68.9, 150.9], [68.9, 166.5], [53, 166.5], [37, 166.5], [37, 150.9]];

export default function WhatWeDo() {
  const { eyebrow, numeral, lines, groups } = home.services;
  return (
    <section className="hs" id="services" aria-labelledby="hs-title">
      <Eyebrow label={eyebrow} numeral={numeral} className="hs__eb" />
      <Lines as="h2" id="hs-title" className="disp hs__title" lines={lines} />
      <svg className="hs__glyph" viewBox="0 0 107.986 224.213" width={107.982} height={224.213} aria-hidden="true" data-reveal="hex">
        <g>
          <path className="hs__b hs__b--tl" d="M46.9932 4.37891C43.3071 4.48886 39.6695 5.9158 36.8145 8.67188L9.04004 35.5137C6.05611 38.3996 4.37305 42.3704 4.37305 46.5273V84.2129H0V46.5273C2.33415e-07 41.1874 2.16389 36.0776 6.00195 32.3672L33.7764 5.52539C37.4658 1.9548 42.2241 0.111859 46.9932 0V4.37891Z" />
          <path className="hs__b hs__b--tr" d="M60.9932 23.166C64.6793 23.276 68.3169 24.7029 71.1719 27.459L98.9463 54.3008C101.93 57.1867 103.613 61.1575 103.613 65.3145V103H107.986V65.3145C107.986 59.9745 105.822 54.8648 101.984 51.1543L74.21 24.3125C70.5205 20.7419 65.7623 18.899 60.9932 18.7871V23.166Z" />
          <path className="hs__b hs__b--bl" d="M46.9932 203.834C43.3071 203.724 39.6695 202.297 36.8145 199.541L9.04004 172.699C6.05611 169.813 4.37305 165.843 4.37305 161.686V124H0V161.686C2.33415e-07 167.025 2.16389 172.135 6.00195 175.846L33.7764 202.688C37.4658 206.258 42.2241 208.101 46.9932 208.213V203.834Z" />
          <path className="hs__b hs__b--br" d="M60.9932 219.834C64.6793 219.724 68.3169 218.297 71.1719 215.541L98.9463 188.699C101.93 185.813 103.613 181.843 103.613 177.686V140H107.986V177.686C107.986 183.025 105.822 188.135 101.984 191.846L74.21 218.688C70.5205 222.258 65.7623 224.101 60.9932 224.213V219.834Z" />
        </g>
        <g className="hs__top">
          {TOP.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={8.2} />
          ))}
        </g>
        <g className="hs__ring">
          {RING.map(([cx, cy]) => (
            <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={8} />
          ))}
        </g>
      </svg>

      {groups.map((g, gi) => (
        <div className={`hs__group hs__group--${gi + 1}`} key={g.title}>
          <h3 className="hs__label tb" data-reveal="fade">
            {g.title}
          </h3>
          <ol className="hs__list" data-reveal="list">
            {g.items.map((item, i) => (
              <li className="hs__item" key={item}>
                <span className="hs__name tb">
                  <span>{item}</span>
                </span>
                <span className="hs__num tb" aria-hidden="true">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ))}
    </section>
  );
}
