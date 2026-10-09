'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { site } from '@/content/site';
import { StatusDots } from './ui';

const links = [
  { label: 'Work', href: '/work' },
  { label: 'About', href: '/#about' },
  { label: 'Services', href: '/#services' },
  { label: 'Blog', href: '/blog' },
  { label: 'Contact', href: '#contact' },
];

export default function MenuToggle() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    document.documentElement.classList.toggle('menu-open', open);
    window.dispatchEvent(new CustomEvent('menu:toggle', { detail: open }));
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="hdr__menu"
        aria-expanded={open}
        aria-controls="site-menu"
        onClick={() => setOpen((o) => !o)}
      >
        <span className="hdr__menu-label" data-open={open}>
          <span>Menu</span>
          <span>Close</span>
        </span>
      </button>
      {mounted &&
        createPortal(
          <div id="site-menu" className="menu" aria-hidden={!open} inert={!open}>
            <nav className="menu__nav" aria-label="Menu">
              {links.map((l, i) => (
                <a key={l.href} href={l.href} className="menu__link" style={{ '--i': i } as React.CSSProperties} onClick={() => setOpen(false)}>
                  <span>{l.label}</span>
                </a>
              ))}
            </nav>
            <div className="menu__foot">
              <span className="status">
                <StatusDots />
                <span>{site.status}</span>
              </span>
              <a href={`mailto:${site.email}`}>{site.email}</a>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
