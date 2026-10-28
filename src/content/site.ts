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
   Home — Figma "Home - Desktop - 1440p" (PIXELUP-Brand-2026, node 1524:934).
   Copy is the Figma's, verbatim. Lines that are placeholders in the Figma are marked PLACEHOLDER;
   swap them for real copy before launch. `lines` keep the Figma's line breaks on desktop; phones rewrap.
---------------------------------------------------------------- */

export type HomeWork = {
  label: string;
  index: string;
  src: string;
  alt: string;
  /** Plays in place of the image, which stays as its poster. */
  video?: string;
  /** [x, y, width, imageHeight, captionCapTop] on the 1440 canvas, from the top of the grid. */
  frame: [number, number, number, number, number];
  href?: string;
};

export const home = {
  ethos: {
    eyebrow: 'Our ethos',
    numeral: 'I',
    lead: 'Remarkable by default &',
    lines: ['Never merely enough Uncommon while being', 'the frontier partner for AI labs.'],
  },

  // Images are the Figma's composed frames, exported flat.
  work: [
    { label: 'Replay', index: '01', src: '/home/work-replay.jpg', alt: 'Replay identity: engraved figure, data sheets and code', frame: [0, 0, 781, 430.63, 446.23], href: 'https://www.replay.ai/' },
    { label: 'Greptile', index: '02', src: '/home/work-greptile.jpg', alt: 'Greptile app icon, poster and colour palette', frame: [801.81, 0, 601, 321.5, 334.6], href: '/case-studies/greptile' },
    { label: 'Autumn', index: '03', src: '/home/work-autumn.jpg', alt: 'Autumn wordmark over a portrait lit in violet', frame: [0, 545.63, 601, 319, 334.6], href: 'https://useautumn.com/' },
    { label: 'Henrylabs', index: '04', src: '/home/work-henrylabs.jpg', alt: 'Henry Labs posters: where intent becomes action', frame: [621.81, 545.63, 781, 430.63, 446.23], href: '/case-studies/henrylabs' },
    { label: 'Fuse AI', index: '05', src: '/home/work-fuse-poster.jpg', alt: 'FuseAI brand film: racing collage with the (FUSE*) wordmark', video: '/home/work-fuse.mp4', frame: [0, 1091.27, 1402.81, 358.15, 376.15] },
    // PLACEHOLDER: the Figma labels this Streamline image "REPLAY". The link follows the image.
    { label: 'Replay', index: '06', src: '/home/work-streamline.jpg', alt: 'Streamline wordmark with brand imagery and product screens', frame: [0, 1568.42, 781, 430.63, 446.23], href: '/case-studies/streamline' },
    { label: 'Sainapse', index: '07', src: '/home/work-sainapse.jpg', alt: 'Sainapse mark over a misty valley', frame: [801.81, 1568.42, 601, 319, 334.6], href: '/case-studies/sainapse' },
  ] satisfies HomeWork[],

  services: {
    eyebrow: 'What we do',
    numeral: 'II',
    lines: ['Everything', 'you need', 'is what we', 'specialize in'],
    groups: [
      {
        title: 'Branding',
        items: ['Brand architecture', 'Brand positioning', 'Naming', 'Brand strategy', 'Brand development', 'Brand identity', 'Brand implementation', 'Wayfinding', 'Iconography', 'Illustration', '3D', 'Print', 'Editorial design', 'Type design'],
      },
      {
        title: 'Digital Branding',
        items: ['User Experience', 'User Interface', 'Prototyping', 'Web design', 'App design', 'E-commerce', 'Front-end development', 'Back-end development', 'Digital Publishing'],
      },
    ],
  },

  recognition: {
    eyebrow: 'Recognition',
    numeral: 'III',
    count: '27',
    // PLACEHOLDER: XX figures.
    lines: [
      "We've been featured across some of",
      "the world's leading design platforms,",
      'recognized for our distinctive',
      'approach to branding, typography,',
      'and digital experiences. With XX+',
      'international features, XX industry',
      'awards, and XX nominations.',
    ],
    // PLACEHOLDER: the Figma repeats three awards twice.
    awards: [
      { title: 'SOTD ‘21', source: 'Awwwards', award: 'Site of the day', project: 'Greptile' },
      { title: 'HM ‘21', source: 'Awwwards', award: 'Honourable Mention', project: 'Relay.ai' },
      { title: 'Brand feature ‘24', source: 'Recent design', award: 'Design feature', project: 'Monument' },
      { title: 'Brand feature ‘24', source: 'Recent design', award: 'Design feature', project: 'Monument' },
      { title: 'HM ‘21', source: 'Awwwards', award: 'Honourable Mention', project: 'Relay.ai' },
      { title: 'SOTD ‘21', source: 'Awwwards', award: 'Site of the day', project: 'Greptile' },
    ],
  },

  dome: {
    eyebrow: 'Work',
    numeral: 'IV',
    lines: ['Some', 'highlights', 'from our', 'recent', 'projects'],
    /** The project the dome opens on (the Figma's default state). */
    start: 'Reducto',
  },

  testimonials: {
    eyebrow: 'Testimonials',
    numeral: 'V',
    lead: "Don't take our word for it.",
    lines: ['We could tell you how good we are,', 'but that would be awkward'],
    // As on /next: a carousel of quotes, each with its highlighted phrase and a plate from the case study.
    voices: [
      {
        company: 'Replay',
        quote: "PIXELUP LABS nailed our brand + website + component library. Best agency I've ever worked with.",
        highlight: "Best agency I've ever worked with.",
        name: 'Brendan Mahony',
        title: 'Founder & CEO',
        plate: '/case-studies/replay/billboard.avif',
      },
      {
        company: 'Greptile',
        quote: 'Daksh is a tier-1 designer, with great taste, attention-to-detail, and strong product intuition.',
        highlight: 'a tier-1 designer',
        name: 'Daksh Gupta',
        title: 'Co-founder',
        href: cs('greptile'),
        plate: '/case-studies/greptile/subway-poster.avif',
      },
      {
        company: 'FuseAI',
        quote:
          '…Improved customer feedback and [higher] free to paid trial conversions on the product. Good creative judgement as a team with strong branding expertise.',
        highlight: 'Good creative judgement as a team with strong branding expertise.',
        name: 'Saurav Bubber',
        title: 'Co-founder & CEO',
        plate: '/case-studies/fuseai/billboard.avif',
      },
      {
        company: 'Henry Labs',
        quote:
          'Pixelup has been a great partner for us at Henry Labs. They handled our landing page redesign and core product design, and the output speaks for itself…',
        highlight: 'the output speaks for itself',
        name: 'Faaris Hussain',
        title: 'COO',
        href: cs('henrylabs'),
        plate: '/case-studies/henrylabs/asset-2.avif',
      },
    ] as { company: string; quote: string; highlight?: string; name: string; title: string; href?: string; plate: string }[],
  },

  clients: {
    eyebrow: 'Clients',
    numeral: 'IV',
    lines: ['We’ve', 'worked', 'with all', 'the', 'names', 'you know', 'or heard', 'of'],
    side: 'Past projects',
    /** The drum, as on /next: wordmarks from /home/logotypes.svg (`w` × `h` is each symbol's box); `src` and `ratio`
        feed the card that follows the cursor. */
    logos: [
      { id: 'greptile', name: 'Greptile', w: 443.61, h: 43.04, src: '/clients/greptile.svg', ratio: 4.129 },
      { id: 'bland-ai', name: 'Bland AI', w: 254.51, h: 42.45, src: '/clients/bland.svg', ratio: 3.455 },
      { id: 'reducto', name: 'Reducto', w: 273.8, h: 44.35, src: '/clients/reducto.svg', ratio: 5.722 },
      { id: 'sully-ai', name: 'Sully.ai', w: 194.83, h: 45.06, src: '/clients/sully.svg', ratio: 4.847 },
      { id: 'ctgt', name: 'CTGT', w: 136.39, h: 41.73, src: '/clients/ctgt.svg', ratio: 3.663 },
      { id: 'autumn', name: 'Autumn', w: 261.97, h: 43.4, src: '/clients/autumn-pricing.svg', ratio: 4.064 },
      { id: 'monumint', name: 'Monumint', w: 315.76, h: 44.23, src: '/clients/monumint.svg', ratio: 7.495 },
      { id: 'revyl', name: 'Revyl', w: 174.28, h: 42.45, src: '/clients/revyl.svg', ratio: 3.667 },
      { id: 'dayflow', name: 'Dayflow', w: 310.92, h: 42.98, src: '/clients/dayflow.svg', ratio: 3.525 },
      { id: 'synthio-labs', name: 'Synthio Labs', w: 391.08, h: 44.36, src: '/clients/synthio-labs.svg', ratio: 5.741 },
      { id: 'audrion', name: 'Audrion', w: 186.18, h: 43.04, src: '/clients/audrion.svg', ratio: 8.875 },
    ],
  },

  footer: {
    eyebrow: 'Have a project in mind?',
    studio: ['A full service design studio.', 'Remarkable by default, the frontier', 'partner for AI labs.'],
    // PLACEHOLDER: only X has a known profile; the others need their URLs.
    elsewhere: [
      { label: 'Instagram', href: '#' },
      { label: 'X / Twitter', href: 'https://x.com/dakshpixelup' },
      { label: 'LinkedIn', href: '#' },
      { label: 'Awwwards', href: '#' },
    ],
    location: 'Bangalore, India',
    legal: '©2026 Pixelup Pvt. Ltd. All rights reserved.',
  },
};

/** Offers in the site's structured data (layout.tsx). */
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
