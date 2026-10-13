import { archives, projects } from './site';

export type Exploration = {
  key: string;
  title: string;
  kind: string;
  year: number;
  href?: string;
  external: boolean;
  media: { kind: 'image' | 'video'; src: string; w: number; h: number; alt: string };
};

// Pixel sizes of everything in /public the explorations draw from, so cards keep their true shape.
const SIZES: Record<string, [number, number]> = {
  '/projects/autumn.jpg': [1200, 700],
  '/projects/ctgt.jpg': [1800, 1013],
  '/projects/greptile.jpg': [1800, 1080],
  '/projects/greptile-img-2.jpg': [1152, 1096],
  '/projects/greptile-img-3.jpg': [1790, 1080],
  '/projects/henry-labs.mp4': [1920, 1080],
  '/projects/henry-labs-figjam-checkout-flow.jpg': [1800, 985],
  '/projects/monumint.jpg': [1800, 1013],
  '/projects/pogo.jpg': [1800, 1013],
  '/projects/reducto.jpg': [1800, 900],
  '/projects/replay.jpg': [1800, 1013],
  '/projects/sainapse.mp4': [832, 464],
  '/projects/sainapse-img-2.jpg': [1152, 1096],
  '/projects/sainapse-img-3.jpg': [1800, 1080],
  '/projects/streamline.jpg': [1800, 1013],
  '/projects/streamline-img-1.jpg': [1800, 1080],
  '/projects/streamline-img-3.jpg': [1152, 1096],
  '/projects/sully.jpg': [1800, 1013],
  '/projects/sully-img-1.jpg': [1152, 1096],
  '/projects/sully-img-3.jpg': [1800, 1080],
  '/projects/valley.jpg': [1440, 720],
  '/projects/zenact.jpg': [1800, 1013],
  '/work/deeptech.jpg': [2400, 1303],
  '/work/greptile-phone.jpg': [1152, 1096],
  '/work/greptile-type.jpg': [1152, 1096],
  '/work/hardware-explorations.jpg': [1800, 1125],
  '/work/henry-labs.jpg': [2400, 1350],
  '/work/openai-poster.jpg': [1080, 1350],
  '/work/openai-system.jpg': [1138, 640],
  '/work/sainapse-monitor.jpg': [2320, 1392],
  // Studies posted on X (@dakshpixelup), picked by Daksh, 13 Oct 2026
  '/explorations/x/pogo-site-hero.jpg': [1800, 1638],
  '/explorations/x/pogo-site-voices.jpg': [1800, 1534],
  '/explorations/x/pogo-site-use-cases.jpg': [1800, 1366],
  '/explorations/x/leads-landing-study.jpg': [1800, 1012],
  '/explorations/x/early-web-exploration.jpg': [1800, 1800],
  '/explorations/x/replay-brand-film.mp4': [540, 675],
  '/explorations/x/replay-rejected-1.jpg': [1170, 1560],
  '/explorations/x/replay-rejected-2.jpg': [1170, 1560],
  '/explorations/x/replay-rejected-3.jpg': [1170, 1560],
  '/explorations/x/replay-rejected-4.jpg': [1170, 1560],
  '/explorations/x/sculpted-lion.jpg': [448, 657],
  '/explorations/x/flattened-lion.jpg': [448, 657],
  '/explorations/x/corrupt-mono.jpg': [1443, 1800],
  '/explorations/x/corrupt-red.jpg': [1443, 1800],
};

// Studies that live in the work collage rather than a project gallery.
const EXTRA: Record<string, string[]> = {
  Greptile: ['/work/greptile-type.jpg'],
  Sainapse: ['/work/sainapse-monitor.jpg'],
};

type Source = { title: string; kind: string; year: number; href?: string; alt: string; srcs: string[] };

// Posts from X, first in the tunnel. Each card opens the original post.
const x = (id: string) => `https://x.com/dakshpixelup/status/${id}`;
const X = (name: string) => `/explorations/x/${name}`;
const posts: Source[] = [
  { title: 'Replay', kind: 'Brand film', year: 2026, href: x('2104821180394099043'), alt: 'Replay brand system in motion: posters, cards and the winged-horse mark', srcs: [X('replay-brand-film.mp4')] },
  { title: 'Sculpted, then flattened', kind: 'Identity study', year: 2026, href: x('2108218399746920755'), alt: 'A lion mark rendered in sculpted gold, then flattened to a single colour, over Frontier Intelligence type', srcs: [X('sculpted-lion.jpg'), X('flattened-lion.jpg')] },
  { title: 'Pogo', kind: 'Website', year: 2026, href: x('2069743275255431498'), alt: 'Pogo website explorations made with the team after their $32M raise', srcs: [X('pogo-site-hero.jpg'), X('pogo-site-voices.jpg'), X('pogo-site-use-cases.jpg')] },
  { title: 'Corrupt', kind: 'Poster study', year: 2026, href: x('2108514834090430903'), alt: 'Real data, corrupt: glitched statue posters with a data record panel', srcs: [X('corrupt-mono.jpg'), X('corrupt-red.jpg')] },
  { title: 'Replay', kind: 'Rejected concepts', year: 2026, href: x('2104156349429133671'), alt: 'Rejected Replay website concepts with engraved landscapes and a winged-horse statue', srcs: [X('replay-rejected-2.jpg'), X('replay-rejected-3.jpg'), X('replay-rejected-4.jpg'), X('replay-rejected-1.jpg')] },
  { title: 'Early exploration', kind: 'Website', year: 2026, href: x('2080629335946674471'), alt: 'Early website exploration with a modular how-it-works layout', srcs: [X('early-web-exploration.jpg')] },
  { title: 'High-intent leads', kind: 'Landing study', year: 2026, href: x('2071536655627067730'), alt: 'Landing page study: AI that finds high-intent leads, surrounded by a collage of product cards', srcs: [X('leads-landing-study.jpg')] },
];

const sources: Source[] = [
  ...posts,
  ...projects.map((p) => ({
    title: p.client,
    kind: p.industry,
    year: p.year,
    href: p.href,
    alt: p.cover && 'alt' in p.cover ? p.cover.alt : p.summary,
    srcs: [p.video, ...(p.gallery ?? []), ...(EXTRA[p.client] ?? [])].filter((s): s is string => !!s),
  })),
  ...archives.map((a) => ({ title: a.client, kind: a.industry, year: a.year, alt: a.summary, srcs: a.gallery ?? [] })),
];

// Deal the media round-robin across projects so neighbours in the tunnel never come from the same study.
function deal(list: Source[]): Exploration[] {
  const queues = list.map((s) => [...new Set(s.srcs)].filter((src) => SIZES[src]));
  const out: Exploration[] = [];
  for (let round = 0; queues.some((q) => q.length); round++) {
    list.forEach((s, i) => {
      const src = queues[i].shift();
      if (!src) return;
      const [w, h] = SIZES[src];
      out.push({
        key: `${s.title}-${round}`,
        title: s.title,
        kind: s.kind,
        year: s.year,
        href: s.href,
        external: !!s.href?.startsWith('http'),
        media: { kind: src.endsWith('.mp4') ? 'video' : 'image', src, w, h, alt: `${s.title}: ${s.alt}` },
      });
    });
  }
  return out;
}

export const explorations = deal(sources);
