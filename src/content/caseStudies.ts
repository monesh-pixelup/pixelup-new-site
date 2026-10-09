// Case studies and blog posts are pulled from pixeluplabs.com (see README: "Content sync").
import cases from './case-studies.json';
import posts from './blog.json';
import { projects, type Project } from './site';

export type CaseMedia = { kind: 'image' | 'video'; src: string; alt: string };

export type CaseSection = {
  heading?: string;
  challenge?: string;
  items: { label: string; text: string }[];
  paragraphs: string[];
  metrics: { label: string; text: string }[];
  stats: { value: string; label: string }[];
  quote?: { text: string; author?: string; role?: string; avatar?: string };
  media: CaseMedia[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  kicker?: string;
  description: string;
  involvement: string[];
  stats: { value: string; label: string }[];
  hero?: CaseMedia;
  sections: CaseSection[];
  project: Project;
};

const CLIENT: Record<string, string> = {
  greptile: 'Greptile',
  henrylabs: 'Henry Labs',
  streamline: 'Streamline',
  sainapse: 'Sainapse',
  sully: 'Sully.ai',
};

export const caseStudies: CaseStudy[] = (cases as Omit<CaseStudy, 'project'>[]).map((c) => ({
  ...c,
  project: projects.find((p) => p.client === CLIENT[c.slug])!,
}));

export const caseHref = (slug: string) => `/case-studies/${slug}`;
export const caseSlugFor = (client: string) => Object.entries(CLIENT).find(([, name]) => name === client)?.[0];

export function nextCase(slug: string) {
  const i = caseStudies.findIndex((c) => c.slug === slug);
  return caseStudies[(i + 1) % caseStudies.length];
}

/* Blog ----------------------------------------------------------------- */

export type BlogNode =
  | { t: 'p' | 'h2' | 'h3' | 'h4' | 'blockquote' | 'figcaption'; x: string }
  | { t: 'a'; x: string; href: string }
  | { t: 'img'; src: string; alt?: string }
  | { t: 'ul' | 'ol'; items: string[] }
  | { t: 'table'; rows: string[][] };

export type Post = {
  slug: string;
  title: string;
  description: string;
  date: string;
  cover: string;
  body: BlogNode[];
  minutes: number;
  kind: 'Comparison' | 'Guide';
};

const words = (nodes: BlogNode[]) =>
  nodes.reduce((n, b) => {
    if ('x' in b) return n + b.x.split(/\s+/).length;
    if ('items' in b) return n + b.items.join(' ').split(/\s+/).length;
    if ('rows' in b) return n + b.rows.flat().join(' ').split(/\s+/).length;
    return n;
  }, 0);

export const blog: Post[] = (posts as Omit<Post, 'minutes' | 'kind'>[]).map((p) => ({
  ...p,
  title: p.title.replace(/ - PIXELUP LABS$/, ''),
  minutes: Math.max(2, Math.round(words(p.body) / 230)),
  kind: /alternatives|best |compared| vs /i.test(p.title) ? 'Comparison' : 'Guide',
}));

export const blogHref = (slug: string) => `/blog/${slug}`;

/** Width and height from a Sanity asset filename (…-1563x720.png). */
export function sanitySize(src: string): [number, number] {
  const m = src.match(/-(\d+)x(\d+)\.\w+$/);
  return m ? [Number(m[1]), Number(m[2])] : [1600, 900];
}

export function formatDate(d: string) {
  const date = new Date(d);
  return Number.isNaN(date.getTime()) ? d : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
