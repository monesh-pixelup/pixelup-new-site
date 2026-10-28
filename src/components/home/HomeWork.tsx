import Image from 'next/image';
import { home } from '@/content/site';
import { Roll } from '../ui';
import type { Vars } from './parts';

// Columns drift at different rates on desktop; the two columns of each row move apart slightly as you scroll.
const drift = (x: number, w: number) => (w > 1000 ? 18 : x < 400 ? 26 : 48);

export default function HomeWork() {
  return (
    <section className="hw" id="work" aria-labelledby="hw-title">
      <h2 id="hw-title" className="sr-only">
        Selected work
      </h2>
      <div className="hw__grid">
        {home.work.map((item) => {
          const [x, y, w, h, cap] = item.frame;
          const style: Vars = { '--x': x, '--y': y, '--w': w, '--h': h, '--cap': cap };
          const external = item.href?.startsWith('http');
          const Tag = item.href ? 'a' : 'article';
          const link = item.href
            ? { href: item.href, 'data-cursor': external ? 'Visit site' : 'View case study', ...(external ? { target: '_blank', rel: 'noreferrer' } : {}) }
            : {};
          return (
            <Tag key={item.index} className={w > 1000 ? 'hw__card hw__card--wide' : 'hw__card'} style={style} data-card data-drift={drift(x, w)} {...link}>
              <div className="hw__media">
                <div className="hw__zoom">
                  {item.video ? (
                    <video className="hw__video" src={item.video} poster={item.src} aria-label={item.alt} autoPlay muted loop playsInline preload="metadata" />
                  ) : (
                    <Image src={item.src} alt={item.alt} fill quality={90} sizes={`(min-width: 1024px) ${Math.round((w / 1440) * 100)}vw, 100vw`} draggable={false} />
                  )}
                </div>
              </div>
              <p className="hw__cap">
                <span className="hw__label tb">
                  <Roll>{item.label.toUpperCase()}</Roll>
                </span>
                <span className="hw__index tb">{item.index}</span>
              </p>
            </Tag>
          );
        })}
      </div>
    </section>
  );
}
