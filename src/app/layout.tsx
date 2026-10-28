import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import type { ReactNode } from 'react';
import Cursor from '@/components/Cursor';
import Experience from '@/components/Experience';
import MarkCanvas from '@/components/mark/MarkCanvas';
import LogoPop from '@/components/LogoPop';
import Pill from '@/components/Pill';
import { services, site } from '@/content/site';
import '@/styles/base.css';
import '@/styles/chrome.css';
import '@/styles/sections.css';
import '@/styles/work.css';
import '@/styles/case.css';
import '@/styles/explorations.css';
import '@/styles/proposal.css';
import '@/styles/home.css';

// Self-hosted so the type never depends on a third-party CDN.
const switzer = localFont({
  src: [
    { path: './fonts/Switzer-300.woff2', weight: '300' },
    { path: './fonts/Switzer-400.woff2', weight: '400' },
    { path: './fonts/Switzer-500.woff2', weight: '500' },
    { path: './fonts/Switzer-700.woff2', weight: '700' },
  ],
  variable: '--font-switzer',
  display: 'swap',
  fallback: ['Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
});

// Labels and numerals on the home page.
const mono = localFont({
  src: './fonts/GeistMono-Regular.woff2',
  weight: '400',
  variable: '--font-mono',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
});

const title = 'PIXELUP LABS - Premium Brands and Websites';
const description = 'We build brands, websites and products that command enterprise trust.';

// Absolute URLs for share images resolve against the deployment serving the page.
const deployment = process.env.VERCEL_PROJECT_PRODUCTION_URL;

export const metadata: Metadata = {
  metadataBase: new URL(deployment ? `https://${deployment}` : site.url),
  title: { default: title, template: '%s — PIXELUP LABS' },
  description,
  applicationName: 'PIXELUP LABS',
  authors: [{ name: 'Daksh' }],
  alternates: { canonical: '/' },
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'PIXELUP LABS',
    type: 'website',
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title, description, creator: '@dakshpixelup' },
};

export const viewport: Viewport = {
  themeColor: '#0c0c0c',
  colorScheme: 'dark',
};

const organization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: site.legalName,
  alternateName: 'PIXELUP',
  url: site.url,
  email: site.email,
  description: site.description,
  founder: { '@type': 'Person', name: 'Daksh' },
  makesOffer: services.map((s) => ({
    '@type': 'Offer',
    itemOffered: { '@type': 'Service', name: s.title, description: s.summary },
  })),
  sameAs: site.socials.map((s) => s.href),
};

// Runs before first paint: enables the motion styles (hidden intro states) only when JS and motion are available,
// and falls back to static content if the motion layer never boots.
const boot = `(function(d){var c=d.documentElement.classList;c.add('js');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){c.add('motion');setTimeout(function(){if(!c.contains('motion-live'))c.remove('motion')},5000)}})(document)`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${switzer.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: boot }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organization) }} />
      </head>
      <body>
        {children}
        {/* Lives outside the pages so the mark stays docked across route changes. */}
        <MarkCanvas />
        <Cursor />
        <Pill />
        <LogoPop />
        <Experience />
      </body>
    </html>
  );
}
