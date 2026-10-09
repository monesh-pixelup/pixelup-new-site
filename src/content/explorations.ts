import { archives, projects, type Media } from './site';

export type Exploration = {
  slug: string;
  title: string;
  summary: string;
  kind: string;
  year: number;
  media: Media;
  href?: string;
  accent?: string;
  tags: string[];
};

const fromProject = (clientName: string, overrides: Partial<Exploration> = {}): Exploration | null => {
  const p = projects.find((x) => x.client === clientName);
  if (!p?.cover) return null;
  return {
    slug: p.client.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: p.client,
    summary: p.summary,
    kind: p.industry,
    year: p.year,
    media: p.cover,
    href: p.href,
    accent: p.accent,
    tags: p.scope,
    ...overrides,
  };
};

const fromArchive = (clientName: string): Exploration | null => {
  const a = archives.find((x) => x.client === clientName);
  if (!a?.gallery?.[0]) return null;
  return {
    slug: a.client.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
    title: a.client,
    summary: a.summary,
    kind: a.industry,
    year: a.year,
    media: { kind: 'image', src: a.gallery[0], alt: a.summary },
    accent: a.accent,
    tags: a.scope,
  };
};

export const explorations: Exploration[] = (
  [
    fromProject('Henry Labs'),
    fromProject('Greptile'),
    fromArchive('OpenAI Type System'),
    fromProject('Sainapse'),
    fromProject('Streamline'),
    fromArchive('Hardware Form Factors'),
    fromProject('Replay'),
    fromProject('Sully.ai'),
    fromArchive('Deeptech'),
    fromProject('Reducto'),
    fromProject('CTGT'),
    fromProject('Valley'),
    fromProject('Zenact'),
    fromProject('Autumn'),
    fromProject('Monumint'),
    fromProject('Pogo'),
  ].filter(Boolean) as Exploration[]
);
