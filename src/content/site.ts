// All copy and data for the site lives here.
// Projects come from pixeluplabs.com (descriptions, services, years, imagery).
// Industry tags are short labels derived from those descriptions; services, news copy and social URLs should be confirmed before launch.

export type Media =
  | { kind: 'image'; src: string; alt: string; position?: string }
  | { kind: 'video'; src: string; alt: string }
  | { kind: 'logo'; src: string; width: number; height: number }
  | { kind: 'field' };

export const site = {
  name: 'PIXELUP',
  legalName: 'PIXELUP LABS',
  tagline: 'A full service design studio.',
  description: 'We build brands, websites and products that command enterprise trust.',
  url: 'https://www.pixeluplabs.com',
  email: 'hello@pixeluplabs.com',
  status: 'Not taking projects',
  socials: [
    { label: 'Contra', href: 'https://contra.com' },
    { label: 'X', href: 'https://x.com/dakshpixelup' },
  ],
  legal: [
    { label: 'Privacy Policy', href: '#' },
    { label: 'Legal', href: '#' },
  ],
};


/* ---------------------------------------------------------------
   Portfolio — from pixeluplabs.com
---------------------------------------------------------------- */

export type Project = {
  client: string;
  summary: string;
  industry: string;
  scope: string[];
  year: number;
  /** Case study on this site, or the client's own site. */
  href?: string;
  /** Client's own website, shown on the case study. */
  site?: string;
  caseStudy?: boolean;
  cover?: Media;
  /** Images (and an optional video) that rise beside the row in the Work index. */
  gallery?: string[];
  video?: string;
  accent?: string;
};

const cs = (slug: string) => `/case-studies/${slug}`;
const img = (name: string, alt: string, position?: string): Media => ({ kind: 'image', src: `/projects/${name}.jpg`, alt, position });

export const projects: Project[] = [
  {
    client: 'Greptile',
    summary: 'AI-native dev tool startup, Series A $25M',
    industry: 'Developer Tools',
    scope: ['Product', 'Brand'],
    year: 2025,
    href: cs('greptile'),
    site: 'https://greptile.com/',
    caseStudy: true,
    cover: img('greptile', 'Greptile mark rendered as a glowing green glass object'),
    gallery: ['/projects/greptile.jpg', '/projects/greptile-img-3.jpg', '/projects/greptile-img-2.jpg', '/work/greptile-phone.jpg'],
    accent: '#258e65',
  },
  {
    client: 'Henry Labs',
    summary: 'Embedded checkout for agentic commerce',
    industry: 'Agentic Commerce',
    scope: ['Brand', 'Web', 'Product'],
    year: 2026,
    href: cs('henrylabs'),
    site: 'https://www.henrylabs.ai/',
    caseStudy: true,
    cover: { kind: 'video', src: '/projects/henry-labs.mp4', alt: 'Henry Labs brand film' },
    video: '/projects/henry-labs.mp4',
    gallery: ['/work/henry-labs.jpg', '/projects/henry-labs-figjam-checkout-flow.jpg'],
    accent: '#c06a3a',
  },
  {
    client: 'Replay',
    summary: 'Data as growth capital',
    industry: 'Finance',
    scope: ['Brand', 'Web', 'Product', 'Next.js'],
    year: 2026,
    href: 'https://www.replay.ai/',
    cover: img('replay', 'Replay wordmark on a deep blue textured field'),
    gallery: ['/projects/replay.jpg'],
    accent: '#1d4fa3',
  },
  {
    client: 'CTGT',
    summary: 'Applied interpretability lab for regulated industries',
    industry: 'AI Research',
    scope: ['Brand', 'Web'],
    year: 2026,
    href: 'https://www.ctgt.ai/',
    cover: img('ctgt', 'CTGT website hero over a misty mountain range', '35% 50%'),
    gallery: ['/projects/ctgt.jpg'],
    accent: '#8c8c8c',
  },
  {
    client: 'Streamline',
    summary: 'AI intake and workflow automation for in-house legal',
    industry: 'Legal AI',
    scope: ['Brand', 'Web'],
    year: 2026,
    href: cs('streamline'),
    site: 'https://www.streamline.ai/',
    caseStudy: true,
    cover: img('streamline', 'Streamline wordmark with brand imagery and product screens'),
    gallery: ['/projects/streamline.jpg', '/projects/streamline-img-1.jpg', '/projects/streamline-img-3.jpg'],
    accent: '#3f8f86',
  },
  {
    client: 'Sainapse',
    summary: 'AI customer intelligence for enterprise support teams',
    industry: 'Customer Support',
    scope: ['Brand', 'Web'],
    year: 2025,
    href: cs('sainapse'),
    site: 'https://sainapse-staging.webflow.io/',
    caseStudy: true,
    cover: { kind: 'video', src: '/projects/sainapse.mp4', alt: 'Sainapse brand film' },
    video: '/projects/sainapse.mp4',
    gallery: ['/projects/sainapse-img-3.jpg', '/projects/sainapse-img-2.jpg'],
    accent: '#4f8a3a',
  },
  {
    client: 'Reducto',
    summary: 'Agentic document platform for enterprise AI teams',
    industry: 'Document AI',
    scope: ['Product', 'Web'],
    year: 2025,
    href: 'https://reducto.ai/',
    cover: img('reducto', 'Reducto logo on a pixel grid'),
    gallery: ['/projects/reducto.jpg'],
    accent: '#b05ad8',
  },
  {
    client: 'Valley',
    summary: 'AI outbound sales platform for B2B revenue teams',
    industry: 'Sales AI',
    scope: ['Brand', 'Web'],
    year: 2025,
    href: 'https://www.joinvalley.co/',
    cover: img('valley', 'Valley mark on a soft teal and peach field'),
    gallery: ['/projects/valley.jpg'],
    accent: '#3fa7b5',
  },
  {
    client: 'Sully.ai',
    summary: 'AI clinical agents for hospitals and health systems',
    industry: 'Healthcare AI',
    scope: ['Brand', 'Web'],
    year: 2025,
    href: cs('sully'),
    site: 'https://sully.ai/',
    caseStudy: true,
    cover: img('sully', 'Sully website on a laptop'),
    gallery: ['/projects/sully.jpg', '/projects/sully-img-3.jpg', '/projects/sully-img-1.jpg'],
    accent: '#5b7fbf',
  },
  {
    client: 'Zenact',
    summary: 'AI agents that test apps like real users',
    industry: 'QA Automation',
    scope: ['Brand', 'Web', 'Webflow'],
    year: 2026,
    href: 'https://zenact.ai/',
    cover: img('zenact', 'Zenact website on a monitor against an orange gradient'),
    gallery: ['/projects/zenact.jpg'],
    accent: '#e0682c',
  },
  {
    client: 'Autumn',
    summary: 'The drop-in billing layer for AI startups',
    industry: 'Billing',
    scope: ['Brand', 'Web', 'Next.js'],
    year: 2025,
    href: 'https://useautumn.com/',
    cover: img('autumn', 'Autumn wordmark over a portrait lit in violet'),
    gallery: ['/projects/autumn.jpg'],
    accent: '#9a3fd1',
  },
  {
    client: 'Pogo',
    summary: 'AI interviews with purchase-verified audiences',
    industry: 'Consumer Research',
    scope: ['Brand', 'Web', 'Webflow'],
    year: 2026,
    href: 'https://www.joinpogo.com/',
    cover: img('pogo', 'Pogo app on a phone held against a lilac backdrop'),
    gallery: ['/projects/pogo.jpg'],
    accent: '#8f7fd0',
  },
  {
    client: 'Monumint',
    summary: 'Conversational AI for finance institutions',
    industry: 'Fintech',
    scope: ['Brand', 'Web', 'Framer'],
    year: 2026,
    href: 'https://monumint.ai/',
    cover: img('monumint', 'Monumint website on a laptop'),
    gallery: ['/projects/monumint.jpg'],
    accent: '#9a9a9a',
  },
];

/* ---------------------------------------------------------------
   Home work grid — the Figma's scattered layout, filled from the portfolio
---------------------------------------------------------------- */

export type Work = {
  client: string;
  summary: string;
  scope: string[];
  media: Media;
  href?: string;
  /** Desktop geometry from the Figma frame: [x, y, width, mediaHeight] on the 1440 canvas, y from the top of the grid. */
  frame: [number, number, number, number];
};

const frames: Record<string, Work['frame']> = {
  Greptile: [357, 121, 441, 388],
  Replay: [810, 40, 321, 343],
  CTGT: [1143, 80, 273, 343],
  Streamline: [634, 594, 496, 343],
  'Henry Labs': [24, 0, 321, 275],
  Sainapse: [24, 391, 321, 275],
  'Sully.ai': [1142, 517, 273, 228],
  Reducto: [24, 782, 598, 275],
  Zenact: [1143, 823, 273, 343],
  Monumint: [810, 1015, 321, 343],
  Pogo: [357, 1096, 441, 388],
  Autumn: [24, 1132, 321, 275],
  Valley: [634, 1518, 496, 343],
};

export const work: Work[] = projects
  .filter((p) => frames[p.client] && p.cover)
  .map((p) => ({ client: p.client, summary: p.summary, scope: p.scope, media: p.cover!, href: p.href, frame: frames[p.client] }));

/** Height of the desktop work canvas in design px (bottom of the lowest card plus its caption). */
export const workCanvasHeight = 1915;


/** Logos from pixeluplabs.com/clients. `w`/`h` are the artwork's viewBox; `ink` is the [top, bottom] fraction
    of that height the visible mark occupies, where it isn't the full box (measured from the rendered file). */
export const clients: { name: string; src: string; w: number; h: number; ink?: [number, number] }[] = [
  { name: 'Greptile', src: '/clients/greptile.svg', w: 256, h: 62 },
  { name: 'Razorpay', src: '/clients/razorpay.png', w: 106, h: 32, ink: [0.063, 0.789] },
  { name: 'Bland.ai', src: '/clients/bland.svg', w: 76, h: 22 },
  { name: 'Reducto', src: '/clients/reducto.svg', w: 103, h: 18 },
  { name: 'Streamline.ai', src: '/clients/streamline.svg', w: 151, h: 31, ink: [0, 0.742] },
  { name: 'Sully.ai', src: '/clients/sully.svg', w: 475, h: 98 },
  { name: 'Pogo', src: '/clients/pogo.svg', w: 60, h: 29 },
  { name: 'Valley', src: '/clients/valley.svg', w: 215, h: 51 },
  { name: 'CTGT', src: '/clients/ctgt.svg', w: 348, h: 95 },
  { name: 'Autumn', src: '/clients/autumn-pricing.svg', w: 894, h: 220 },
  { name: 'Monumint', src: '/clients/monumint.svg', w: 817, h: 109 },
  { name: 'Sainapse', src: '/clients/sainapse.svg', w: 155, h: 28 },
  { name: 'Limelight', src: '/clients/limelight.svg', w: 600, h: 107 },
  { name: 'Revyl', src: '/clients/revyl.svg', w: 1100, h: 300 },
  { name: 'Zenact', src: '/clients/zenact.svg', w: 1347, h: 188 },
  { name: 'Henry Labs', src: '/clients/henrylabs.svg', w: 1453, h: 208 },
  { name: 'Jumbo', src: '/clients/jumbo.svg', w: 870, h: 180 },
  { name: 'DayFlow', src: '/clients/dayflow.svg', w: 1195, h: 339 },
  { name: 'Synthio Labs', src: '/clients/synthio-labs.svg', w: 1217, h: 212 },
  { name: 'Workers.io', src: '/clients/workers-io.svg', w: 797, h: 125 },
  { name: "Audrion's", src: '/clients/audrion.svg', w: 284, h: 32 },
];

export const about = {
  statement: 'Your model is world-class. Your brand should look like it.',
  body: 'PIXELUP is an independent design studio for AI companies. We turn technology that is hard to explain into brands, websites and launch moments people trust on first sight, from the seed deck to the first enterprise contract.',
  proof: [
    { figure: '2×', label: 'Demo requests in launch week', client: 'Greptile' },
    { figure: '26×', label: 'Growth in the 11 months after', client: 'Sully.ai' },
    { figure: '$25M', label: 'Series A, months after launch', client: 'Greptile' },
  ],
};

export const services = [
  {
    title: 'Brand Sprint',
    price: '$15,000',
    summary: 'Positioning, identity system, typography and motion principles. Everything a launch needs to look inevitable.',
    tags: ['Strategy', 'Identity', 'Type', 'Motion'],
  },
  {
    title: 'Website Sprint',
    price: 'Brand + website from $25,000',
    summary: 'Narrative, design and build of a fast marketing site your team can run on its own after launch.',
    tags: ['Narrative', 'Design', 'Build', 'CMS'],
  },
  {
    title: 'Design Retainer',
    price: 'From $6,000 / month',
    summary: 'A senior design team on call for launches, decks, product marketing and everything after.',
    tags: ['Launches', 'Decks', 'Product', 'Campaigns'],
  },
];

export const news = [
  { type: 'Report', title: 'State of AI Startup Branding 2026', meta: 'Coming soon', href: '#news' },
  { type: 'Case study', title: 'Greptile: demo requests doubled in week one, then a $25M Series A', meta: 'Product, Brand', href: cs('greptile') },
  { type: 'Case study', title: 'Sully.ai: 26x growth in the 11 months after the redesign', meta: 'Brand, Web', href: cs('sully') },
  { type: 'Case study', title: 'Sainapse: relaunched ahead of GA, now deployed at Ford and Freshworks', meta: 'Brand, Web', href: cs('sainapse') },
  { type: 'Case study', title: 'Henry Labs: an embedded checkout for agentic commerce', meta: 'Brand, Web, Product', href: cs('henrylabs') },
  { type: 'Case study', title: 'Streamline: AI intake for in-house legal teams', meta: 'Brand, Web', href: cs('streamline') },
];

/* ---------------------------------------------------------------
   Work page (Figma "Work - Desktop - 1440p", node 674:208)
---------------------------------------------------------------- */

export type CollageItem = {
  label: string;
  src?: string;
  /** [x, y, width, height] on the 1440 canvas */
  frame: [number, number, number, number];
  position?: string;
  zoom?: number;
  caption?: string;
  /** Parallax depth: higher moves more. */
  depth: number;
};

export const collage: CollageItem[] = [
  { label: 'henry labs / stage', src: '/work/henry-labs.jpg', frame: [731, 273, 762, 460], depth: 0.35 },
  { label: 'greptile / type specimen', src: '/work/greptile-type.jpg', frame: [561, 128, 412, 249], depth: 0.7 },
  { label: 'sainapse / product', src: '/work/sainapse-monitor.jpg', frame: [510, 339, 370, 287], depth: 1 },
  { label: 'hardware / form factors', src: '/work/hardware-explorations.jpg', frame: [120, 534, 318, 178], position: '50% 30%', zoom: 1.2, depth: 0.55 },
  { label: 'deeptech / film still', src: '/work/deeptech.jpg', frame: [121, 209, 478, 259], caption: 'Deeptech', depth: 0.8 },
  { label: 'blank / white', frame: [-183, 448, 382, 215], depth: 1.2 },
];


export const archives: Project[] = [
  { client: 'Deeptech', summary: 'Concept film stills for a deep tech identity', industry: 'Concept', scope: ['Brand'], year: 2023, gallery: ['/work/deeptech.jpg'], accent: '#8a8a8a' },
  { client: 'Hardware Form Factors', summary: 'Wearable and home device explorations', industry: 'Concept', scope: ['Product'], year: 2023, gallery: ['/work/hardware-explorations.jpg'], accent: '#9aa3ad' },
  { client: 'OpenAI Type System', summary: 'Type and poster studies', industry: 'Concept', scope: ['Brand'], year: 2023, gallery: ['/work/openai-system.jpg', '/work/openai-poster.jpg'], accent: '#e5772e' },
];
