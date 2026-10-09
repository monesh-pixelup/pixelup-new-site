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
};

// Studies that live in the work collage rather than a project gallery.
const EXTRA: Record<string, string[]> = {
  Greptile: ['/work/greptile-type.jpg'],
  Sainapse: ['/work/sainapse-monitor.jpg'],
};

type Source = { title: string; kind: string; year: number; href?: string; alt: string; srcs: string[] };

const sources: Source[] = [
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
