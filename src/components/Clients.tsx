'use client';

import gsap from 'gsap';
import { useEffect, useRef } from 'react';
import { clients } from '@/content/site';

// Optical sizing: scale height by 1/sqrt(aspect) so long wordmarks and compact marks carry equal weight.
const optical = (w: number, h: number) => Math.min(1.5, Math.max(0.62, Math.sqrt(4 / (w / h))));

function Logos({ hidden }: { hidden?: boolean }) {
  return (
    <ul className="clients__set" aria-hidden={hidden || undefined}>
      {clients.map((c) => (
        <li key={c.name} style={{ '--k': optical(c.w, c.h).toFixed(3) } as React.CSSProperties}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.src} width={c.w} height={c.h} alt={hidden ? '' : c.name} draggable={false} loading="lazy" />
        </li>
      ))}
    </ul>
  );
}

export default function Clients() {
  const trackRef = useRef<HTMLDivElement>(null);

  // The loop is a CSS animation; hovering eases its playback rate down instead of stopping dead.
  useEffect(() => {
    const track = trackRef.current;
    const anim = track?.getAnimations()[0];
    if (!track || !anim) return;
    const rate = { v: 1 };
    const to = (v: number) =>
      gsap.to(rate, { v, duration: 1.1, ease: 'power2.out', overwrite: true, onUpdate: () => anim.updatePlaybackRate(rate.v) });
    const slow = () => to(0.15);
    const resume = () => to(1);
    track.addEventListener('pointerenter', slow);
    track.addEventListener('pointerleave', resume);
    return () => {
      track.removeEventListener('pointerenter', slow);
      track.removeEventListener('pointerleave', resume);
      gsap.killTweensOf(rate);
    };
  }, []);

  return (
    <section className="clients" aria-labelledby="clients-title">
      <div className="clients__head">
        <h2 className="clients__label" id="clients-title">
          Selected clients <span className="clients__count">({clients.length})</span>
        </h2>
        <p className="clients__note">From seed decks to enterprise contracts.</p>
      </div>
      <div className="clients__rule" data-draw aria-hidden="true" />
      <div className="clients__marquee">
        <div className="clients__track" ref={trackRef}>
          <Logos />
          <Logos hidden />
        </div>
      </div>
    </section>
  );
}
