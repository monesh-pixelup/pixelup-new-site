import Image from 'next/image';
import { site } from '@/content/site';
import { ArrowSwap } from '../ui';

export default function HomeHero() {
  return (
    <section className="hh" id="top" aria-labelledby="hh-title">
      <h1 id="hh-title" className="hh__title" aria-label={`${site.name}®`}>
        <span className="hh__mask" aria-hidden="true">
          <span className="hh__word tb">{site.name}</span>
        </span>
        <span className="hh__mask hh__mask--reg" aria-hidden="true">
          <span className="hh__reg tb">®</span>
        </span>
      </h1>

      <figure className="hh__reel" id="showreel">
        <div className="hh__zoom">
          <Image src="/home/showreel.jpg" alt="The PIXELUP mark painted on a board-formed concrete wall beside an expanded-metal screen" fill priority quality={90} sizes="(min-width: 1024px) 91vw, 100vw" draggable={false} />
        </div>
      </figure>

      {/* The whole hero opens the work; on desktop the cursor becomes the "See our work" pill (Pill.tsx). */}
      <a href="/work" className="hh__go" data-pill="See our work" aria-label="See our work" />
      <a href="/work" className="hh__mgo">
        <span>See our work</span>
        <ArrowSwap />
      </a>

      <p className="hh__cue">
        <span className="hh__cue-rule" aria-hidden="true" />
        <span className="hh__cue-label tb">Showreel</span>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="hh__cue-icon" src="/home/showreel-icon.svg" width={9.6} height={9.6} alt="" />
      </p>
    </section>
  );
}
