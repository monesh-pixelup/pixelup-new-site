// Client proposals, served at /proposals/[slug] and kept out of search (noindex).
// Each one is written for a single reader; copy is agreed with Daksh before it ships.
import type { IconName } from '@/components/proposal/icons';

export type ProposalWeek = { week: number; date?: string; bring: string; decide: string; flag?: string };

/** A deliverable line, optionally with past work that shows what it looks like. */
export type ProposalDeliverable = string | { text: string; reference: { label: string; src: string; alt: string; href?: string } };

/** The page's sections, in the default order. A proposal can reorder or drop them with `order`. */
export type ProposalSection = 'week' | 'split' | 'schedule' | 'deliverables' | 'rules' | 'investment' | 'proof' | 'run' | 'reviews' | 'next' | 'references' | 'extras';

/** An icon list section (the run, the next steps). */
export type ProposalList = { heading: string; intro?: string; items: { label: string; text: string; icon: IconName }[]; line?: string };

export type Proposal = {
  /** Section order; omitted sections are not shown. Defaults to all seven in the usual order. */
  order?: ProposalSection[];
  /** Override a section's eyebrow label. */
  labels?: Partial<Record<ProposalSection, string>>;
  slug: string;
  client: string;
  /** Set false to turn off smooth (Lenis) scrolling on this proposal. */
  smoothScroll?: boolean;
  /** Shown in the header status and the footer CTA. */
  hold: string;
  kicker: string;
  title: string;
  lede: string;
  meta: { label: string; value: string; note?: string; icon: IconName }[];
  /** The weekly time ask: the window the client books the call in (hours in their timezone), and the minutes it takes. */
  week?: {
    heading: string;
    body: string;
    tz: string;
    window: [number, number];
    /** Minutes per week: the review call and the async review. */
    call: number;
    review: number;
    caption: string;
  };
  split: { heading: string; intro?: string; items: { label: string; text: string }[]; line?: string };
  schedule: {
    heading: string;
    body: string;
    /** `note` is the short badge; `detail` an optional line under it. */
    /** Column labels for each week row; default "We bring" / "You decide". */
    labels?: { bring: string; decide: string };
    /** `sum` replaces the calls/hours summary. */
    sprints: { name: string; note: string; detail?: string; sum?: string; from: number; to: number; optional?: boolean; weeks: ProposalWeek[] }[];
    /** Week whose call decides the optional sprint. */
    decideBy?: { week: number; label: string };
    /** Show only the timeline bars, not the week-by-week rows. */
    hideRows?: boolean;
    line: string;
  };
  deliverables?: { heading: string; groups: { name: string; note: string; optional?: boolean; items: ProposalDeliverable[] }[] };
  rules?: { heading: string; intro: string; items: { label: string; text: string; icon: IconName }[] };
  /** Optional extra sections; shown only when listed in `order`. */
  /** The client's own references, the thread through them, and screenshots. */
  references?: {
    heading: string;
    intro: string;
    themes: { label: string; text: string; icon: IconName }[];
    items: { name: string; note: string; href: string; src: string; alt: string }[];
    line?: string;
  };
  run?: ProposalList;
  next?: ProposalList;
  /** Extra services offered alongside the sprint (launch videos, AEO and so on). */
  extras?: ProposalList;
  reviews?: { heading: string; body: string; items: { name: string; role: string; quote: string }[]; line?: string };
  investment: {
    heading: string;
    lead: { name: string; terms: string; price: string; includes: string };
    addon?: { name: string; terms: string; price?: string; includes: string };
    line: string;
  };
  proof: { heading: string; body: string; items: { client: string; note: string; href: string; src: string; alt: string }[] };
  cta: {
    eyebrow: string;
    email: string;
    note: string;
    /** The deposit link. Until it exists, the button opens an email to Daksh instead. */
    reserve: { label: string; href?: string };
    /** Bank transfer details, a PDF in public/. Shown only once the file is there. */
    ach?: { label: string; href: string };
  };
};

export const proposals: Proposal[] = [
  {
    slug: 'general-knowledge',
    client: 'General Knowledge',
    hold: 'Slot held until Fri 16 Oct',
    kicker: 'Proposal · General Knowledge · October 2026',
    title: 'You run the business. We build the brand. 45 minutes a week.',
    lede: 'You said the business comes first right now, and it should. This engagement is built around that. Each week is a 30-minute review call plus 15 minutes to leave feedback whenever suits you. We handle everything else. You make the calls and we do the work.',
    meta: [
      { label: 'Prepared for', value: 'Mac Reddin, General Knowledge', note: '12 October 2026', icon: 'calendar' },
      { label: 'Your time', value: '45 min / week', note: '30 min call + 15 min async', icon: 'clock' },
      { label: 'Engagement', value: 'Brand Sprint', note: '4 weeks, ~3 hours in total', icon: 'layers' },
      { label: 'Investment', value: '$19,977', note: '50% deposit to reserve', icon: 'tag' },
    ],
    week: {
      heading: 'One slot of your choosing. Same time, every week.',
      body: 'Pick a 30-minute slot anywhere between 15:00 and 22:00 Copenhagen time and keep it every week. Then spend 15 minutes leaving feedback in Figma whenever suits you.',
      tz: 'Copenhagen time',
      window: [15, 22],
      call: 30,
      review: 15,
      caption: 'A 40-hour week is 160 quarter-hours. We ask for three.',
    },
    split: {
      heading: 'You make the calls. We do the work.',
      items: [
        { label: 'You', text: 'Join one 30-minute call a week and make one decision on it. Then spend 15 minutes leaving comments in Figma, whenever you like.' },
        {
          label: 'Us',
          text: 'Research, competitor teardown, positioning, copy, identity, website design and build, templates, QA and launch. Daksh leads every call, and 2–3 senior designers do the work behind it.',
        },
      ],
      line: 'No workshops, no questionnaires, and no 40-slide decks to read before a call.',
    },
    schedule: {
      heading: 'Every call ends in a decision.',
      body: 'We start with the Brand Sprint. If it’s working, tell us by week 3 and the Website Sprint starts in week 4, overlapping the end of the brand work.',
      sprints: [
        {
          name: 'Brand Sprint',
          note: 'Where we start',
          from: 1,
          to: 4,
          weeks: [
            {
              week: 1,
              date: '2 Nov',
              bring: 'Onboarding call: references put in front of you to gauge your taste, building on your moodboard and our first call',
              decide: 'Lock the angle: European defense, built in Denmark',
            },
            { week: 2, date: '9 Nov', bring: 'Three directions, each shown on a drone, a missile and a hoodie', decide: 'Pick one' },
            { week: 3, date: '16 Nov', bring: 'Refined mark, wordmark and identity system', decide: 'Approve the mark', flag: 'Tell us whether to add the Website Sprint' },
            { week: 4, date: '23 Nov', bring: 'Brand strategy deck walkthrough, plus marketing, social and merch templates', decide: 'Sign off the brand' },
          ],
        },
        {
          name: 'Website Sprint',
          note: 'Optional',
          detail: 'Starts in week 4 if you confirm by the week 3 call',
          from: 4,
          to: 7,
          optional: true,
          weeks: [
            { week: 4, date: '23 Nov', bring: 'Site structure and homepage copy, in the same call as the brand sign-off', decide: 'Approve the messaging' },
            { week: 5, date: '30 Nov', bring: 'Homepage design', decide: 'Approve' },
            { week: 6, date: '7 Dec', bring: 'Inner pages, built on staging', decide: 'Final punch list' },
            { week: 7, date: '14 Dec', bring: 'Final build and handover: component library and .md docs', decide: 'Launch date' },
          ],
        },
      ],
      decideBy: { week: 3, label: 'Decide by 16 Nov' },
      line: 'Even when the sprints overlap, it’s still one 30-minute call a week. The weeks don’t double up.',
    },
    deliverables: {
      heading: 'What you get.',
      groups: [
        {
          name: 'Brand Sprint',
          note: '4 weeks',
          items: [
            'An onboarding call to understand your taste',
            'Positioning and messaging: what General Knowledge stands for in European defense',
            'A logo mark and identity system that works on a drone, a missile and a hoodie',
            {
              text: 'A 20-page brand strategy deck, walked through on a call',
              reference: { label: 'Replay design system', src: '/projects/replay.jpg', alt: 'Replay wordmark on a deep blue textured field', href: 'https://replay-brand-guidelines.vercel.app/#/in-action' },
            },
            'Templates for marketing, social and merch',
          ],
        },
        {
          name: 'Website Sprint',
          note: '4 weeks, optional',
          optional: true,
          items: [
            'Information architecture and the homepage narrative',
            'A landing page plus 4 pages, designed and built in Webflow, Next.js or Framer',
            'A component library and .md docs, so your team can extend the site without us',
          ],
        },
      ],
    },
    rules: {
      heading: 'It stays lean because the structure doesn’t bend.',
      intro: 'Here’s what it depends on.',
      items: [
        { icon: 'frame', label: 'A proper onboarding', text: 'One onboarding call to understand your taste properly. Everything after it moves faster because of it.' },
        { icon: 'clock', label: 'The same slot', text: 'You choose it between 15:00 and 22:00 Copenhagen time, and it ends at 30 minutes.' },
        { icon: 'message', label: 'Async by default', text: 'Work arrives as a Figma link and a short Loom. You review it in 15 minutes and comment where it matters.' },
        { icon: 'flag', label: 'Missed a week?', text: 'We’ll flag it and collect your input async, or through Figma comments. The project keeps moving.' },
        {
          icon: 'users',
          label: 'Both founders',
          text: 'Separate reviews with each co-founder split decisions and slow everything down. Instead, both of you stay in the loop on every call and every update.',
        },
        { icon: 'contact', label: 'One point of contact', text: 'Daksh.' },
      ],
    },
    investment: {
      heading: 'Start with the brand.',
      lead: {
        name: 'Brand Sprint',
        terms: '4 weeks · ~3 hours of your time · 50% deposit reserves the slot',
        price: '$19,977',
        includes: 'Positioning, the mark and identity system, a 20-page strategy deck, and templates for marketing, social and merch.',
      },
      addon: {
        name: 'Website Sprint',
        terms: 'Add it when it’s working · 4 weeks · ~3 more hours',
        includes: 'A landing page plus 4 pages, designed and built, with a component library and docs. We’ll scope it with you once the brand is underway.',
      },
      line: 'Tell us by the week 3 call (16 Nov) and the website starts in week 4, overlapping the end of the brand work. You get both in 7 weeks instead of 8, launching before the holiday break. If you’d rather wait, the website can start whenever you’re ready, with the same team and no re-briefing.',
    },
    proof: {
      heading: 'You mentioned two of ours.',
      body: 'Neither mark had anything to do with the name, and both became what people remember.',
      items: [
        { client: 'Greptile', note: 'The lizard', href: '/case-studies/greptile', src: '/projects/greptile.jpg', alt: 'Greptile mark rendered as a glowing green glass object' },
        { client: 'Henry Labs', note: 'The eagle', href: '/case-studies/henrylabs', src: '/work/henry-labs.jpg', alt: 'Henry Labs brand on stage' },
      ],
    },
    cta: {
      eyebrow: 'Confirm the Brand Sprint by Friday, 16 Oct',
      email: 'daksh@pixeluplabs.com',
      note: 'Reserve your spot with a 50% deposit of $9,988.50, through Contra or by bank transfer. Then send us your preferred slot between 15:00 and 22:00 Copenhagen time, and we’ll send the onboarding invite for the week of 2 Nov. You can decide on the website any time up to the week 3 call. We run three sprints a quarter, and we’re holding this one for you until Friday.',
      reserve: { label: 'Reserve spot now', href: 'https://contra.com/payment-link/oPgYnpcQ-general-knowledge-brand-sprint-50percent-deposit' },
    },
  },
  {
    slug: 'nation',
    client: 'Nation',
    hold: 'Can start next week',
    kicker: 'Proposal · Nation · October 2026',
    title: 'A brand that says one thing: this makes you money.',
    lede: 'Positioning, identity, a design system and the withnation.ai homepage. Four to five weeks, starting next week, built so a first-time seller trusts Nation on the first screen and starts a store on the second.',
    meta: [
      { label: 'Brand and website sprints', value: '35+', icon: 'layers' },
      { label: 'Raised by clients after their sprint', value: '$300M+', icon: 'tag' },
      { label: 'Rating across every Contra review', value: '5.0', icon: 'users' },
      { label: 'Contra Top 100, October 2026', value: '#4', icon: 'flag' },
    ],
    order: ['split', 'references', 'rules', 'run', 'schedule', 'proof', 'reviews', 'investment', 'next'],
    labels: { split: 'What we read', references: 'Your references', rules: 'How we’d approach it', proof: 'Selected work', reviews: 'Proof', run: 'How we’d run it', schedule: 'Timeline', next: 'Next steps' },
    references: {
      heading: 'Your references all sell the business, not the software.',
      intro: 'Shopify, Squarespace, Owner, Toast, GlossGenius, Propel and AppLovin look nothing alike. But they all make the same three moves, and that’s the bar for Nation.',
      themes: [
        { icon: 'users', label: 'Real people up front', text: 'A founder at work, a chef on the line, a salon front desk, a shopper on her phone. The owner and their work are the hero, never a dashboard.' },
        { icon: 'message', label: 'One plain promise', text: '“Be the next household name.” “Built for busy.” “Handled.” “Grow your business.” Short, confident, about the outcome, not the AI.' },
        { icon: 'flag', label: 'One action, right there', text: 'Start for free, your email, your restaurant’s name. The first step sits in the hero, so starting feels small.' },
      ],
      items: [
        { name: 'Shopify', note: 'Be the next household name', href: 'https://www.shopify.com/', src: '/proposals/nation/shopify.jpg', alt: 'Shopify homepage hero: Be the next household name' },
        { name: 'Squarespace', note: 'Real small businesses as the product shot', href: 'https://www.squarespace.com/', src: '/proposals/nation/squarespace.jpg', alt: 'Squarespace homepage showing real small business websites' },
        { name: 'Owner', note: 'Promise and proof in one screen', href: 'https://www.owner.com/', src: '/proposals/nation/owner.jpg', alt: 'Owner.com homepage hero with a restaurant search and phone' },
        { name: 'Toast', note: 'A real kitchen, one bold color', href: 'https://pos.toasttab.com/', src: '/proposals/nation/toast.jpg', alt: 'Toast homepage hero: Built For Busy over a chef at work' },
        { name: 'GlossGenius', note: 'Warm, human, calm', href: 'https://glossgenius.com/', src: '/proposals/nation/glossgenius.jpg', alt: 'GlossGenius homepage hero: Scheduling, payments, and admin. Handled.' },
        { name: 'Propel', note: 'Everyday people, everyday money', href: 'https://www.propel.app/', src: '/proposals/nation/propel.jpg', alt: 'Propel homepage hero: a shopper checking her phone outside a store' },
        { name: 'AppLovin', note: 'Real products, real owners', href: 'https://www.applovin.com/', src: '/proposals/nation/applovin.jpg', alt: 'AppLovin homepage collage of small business products and founders' },
      ],
      line: 'Nation takes the same three moves further: real sellers and their first sales, one promise (this makes you money), and “start a store” on every screen. Here’s how we’d get there.',
    },
    split: {
      heading: 'A nation of first-time owners.',
      intro: 'Nation starts a store from one prompt and runs the products, pages, ads and growth. The people using it are not tech people. Many are opening their first business for their family. So the brand has to feel warm like a place you belong, look as serious as a company raising a Series A, and point every scroll at one action: start a store.',
      items: [
        { label: 'Positioning: The line and the story', text: 'One-line positioning, the Nation story, and the descriptor that sits next to the name.' },
        { label: 'Identity: Wordmark and symbol', text: 'Color, type, imagery, voice and motion. Bold enough to spot in an ad feed.' },
        { label: 'System: Design system', text: 'Tokens and core components shared by the site and the product.' },
        { label: 'Website: withnation.ai homepage', text: 'One page that explains the whole product, Toast-level clear, and ends in “start a store.”' },
      ],
    },
    rules: {
      heading: 'Show the money. Skip the AI magic.',
      intro: 'Your sellers don’t care that it’s AI. They care that it sells. The proof is real stores, real products and real sales, and the brand should be built around that. Owner.com is clear but plain. We’d keep the clarity and add the character of Toast and Clay.',
      items: [
        { icon: 'flag', label: 'Leave out', text: 'Sparkles, glows and “powered by AI” badges. Generic SaaS dashboards. Stock photos of smiling founders.' },
        { icon: 'frame', label: 'Bring in', text: 'Real stores, real products, real first sales. Nation cues (flag, passport, citizens) done warm, not kitsch. One ownable color people remember. A voice like a friend who has already done it.' },
      ],
    },
    proof: {
      heading: 'Commerce, shoppers and products that make money.',
      body: 'Picked for Nation: checkout, real shoppers, new revenue, and complex products made simple.',
      items: [
        { client: 'Henry Labs', note: 'Embedded checkout for agentic commerce', href: '/case-studies/henrylabs', src: '/work/henry-labs.jpg', alt: 'Henry Labs brand on stage' },
        { client: 'Replay', note: 'Data as growth capital', href: 'https://www.replay.ai/', src: '/projects/replay.jpg', alt: 'Replay wordmark on a deep blue textured field' },
        { client: 'Pogo', note: 'Talk to verified shoppers', href: 'https://www.joinpogo.com/', src: '/projects/pogo.jpg', alt: 'Pogo app on a phone held against a lilac backdrop' },
        { client: 'CTGT', note: 'Interpretability for regulated industries', href: 'https://www.ctgt.ai/', src: '/projects/ctgt.jpg', alt: 'CTGT website hero over a misty mountain range' },
      ],
    },
    reviews: {
      heading: '5.0 on every review. Verified on Contra.',
      body: 'PIXELUP LABS is a Verified Studio on Contra and ranked #4 on its Top 100 this month. Every quote below is a verified client review.',
      items: [
        { name: 'Daksh Gupta', role: 'Founder, Greptile', quote: 'Daksh is a tier-1 designer, with great taste, attention-to-detail, and strong product intuition. I highly recommend working with him.' },
        { name: 'Sahitya S', role: 'SynthioLabs', quote: 'They not only get timelines (a rarity!) but truly understand the vision and story we, as founders, want to tell.' },
        { name: 'Faaris Hussain', role: 'Co-Founder, Henry Labs', quote: 'They handled our landing page redesign and core product design, and the output speaks for itself. Fast, thoughtful, and easy to work with.' },
        { name: 'Alli Minetti', role: 'Contra Labs', quote: 'Great experience with reliable communication, fast iteration, and implementing feedback quickly.' },
      ],
      line: '$500K+ earned on Contra · Hired 35x · 5.0 across 6 reviews',
    },
    run: {
      heading: 'Four to five weeks. Something real every week.',
      intro: 'Async in Figma, a short review call twice a week, and one owner on our side the whole way. Words come first, so the identity has something true to say.',
      items: [
        { icon: 'message', label: 'Week 1: Positioning', text: 'Kickoff, competitor read (Shopify, Amboras, Whop), then the one-liner, story and descriptor. Output: messaging doc.' },
        { icon: 'frame', label: 'Weeks 1 to 3: Identity', text: 'Two directions, you pick one, we refine it into wordmark, symbol, color, type, imagery, voice and motion. Output: brand guidelines.' },
        { icon: 'layers', label: 'Weeks 3 to 4: Design system', text: 'Tokens and core components built in Figma for both the site and the product. Output: Figma library + tokens.' },
        { icon: 'flag', label: 'Weeks 4 to 5: Homepage', text: 'The withnation.ai homepage, desktop and mobile, with the launch motion. Output: dev-ready homepage.' },
      ],
    },
    schedule: {
      heading: 'Brand locked in week three. Homepage by week five.',
      body: 'If you need to launch sooner, the wordmark and core colors can be ready by the end of week two.',
      hideRows: true,
      sprints: [
        { name: 'Positioning', note: 'Messaging', from: 1, to: 1, weeks: [{ week: 1, bring: '', decide: '' }] },
        { name: 'Identity', note: 'Directions to brand locked', from: 1, to: 3, weeks: [{ week: 2, bring: '', decide: '' }, { week: 3, bring: '', decide: '' }] },
        { name: 'Design system', note: 'Tokens and components', from: 3, to: 4, weeks: [{ week: 4, bring: '', decide: '' }] },
        { name: 'Homepage', note: 'Dev-ready', from: 4, to: 5, weeks: [{ week: 5, bring: '', decide: '' }] },
      ],
      line: 'Week 1: messaging signed off. Week 2: identity direction picked. Week 3: brand guidelines delivered. Week 5: system and homepage handed over.',
    },
    investment: {
      heading: 'Investment: TBD.',
      lead: {
        name: 'Full sprint',
        terms: '4 to 5 weeks · starts next week · two rounds of revisions at every stage',
        price: 'TBD',
        includes: 'Positioning and messaging, full brand identity and guidelines, a design system in Figma, and the withnation.ai homepage, desktop and mobile.',
      },
      addon: { name: 'Ownership', terms: '100%', includes: 'All source files are yours on handover.' },
      line: 'We’ll confirm a fixed price after a quick call on scope and launch date.',
    },
    next: {
      heading: 'Let’s give Nation its flag.',
      items: [
        { icon: 'users', label: 'Step 1: Quick call', text: '20 minutes on the launch date, sellers we can feature, and what stays from the current site.' },
        { icon: 'download', label: 'Step 2: Share access', text: 'Product, current Figma, any seller stories and sales numbers.' },
        { icon: 'calendar', label: 'Step 3: Kick off', text: 'We can start next week. Messaging in your hands within the first week.' },
      ],
    },
    cta: {
      eyebrow: 'Let’s give Nation its flag.',
      email: 'hello@pixeluplabs.com',
      note: 'Book a quick call: 20 minutes on the launch date, sellers we can feature, and what stays from the current site.',
      reserve: { label: 'Book a quick call', href: 'https://cal.com/pixelup/discovery' },
    },
  },
  {
    slug: 'peak',
    client: 'Peak',
    smoothScroll: false,
    hold: 'Can start next week',
    kicker: 'Proposal · Peak · October 2026',
    title: 'A brand engineers trust on the first read.',
    lede: 'Positioning, identity, a design foundation your engineers can build from, and a launch site: a landing page plus 3 to 4 pages. About eight weeks, starting next week, so Peak leaves stealth looking like the company it already is.',
    meta: [
      { label: 'Brand projects shipped', value: '40+', icon: 'layers' },
      { label: 'Raised by clients after their sprint', value: '$300M+', icon: 'tag' },
      { label: 'Rating across every Contra review', value: '5.0', icon: 'users' },
      { label: 'Project slots left this quarter', value: '2', icon: 'calendar' },
    ],
    order: ['split', 'rules', 'run', 'schedule', 'proof', 'reviews', 'investment', 'extras', 'next'],
    labels: { split: 'What we heard', rules: 'How we’d approach it', run: 'How we’d run it', schedule: 'Timeline', proof: 'Selected work', reviews: 'Proof', extras: 'For launch day', next: 'Next steps' },
    split: {
      heading: 'Real customers. Temporary brand.',
      intro: 'Peak is a month old and already running for teams like Catalyst. It sells to infrastructure, platform and DevX engineers at well-funded Series A to C companies that ship a lot of code, in the same space as Modal, Depot, Blacksmith and Buildkite. The product is ahead of the brand. The job is to close that gap before you exit stealth and start the sales push.',
      items: [
        { label: 'Positioning: Where Peak wins', text: 'A one-line position, the Peak story and messaging, set against Modal, Depot, Blacksmith and Buildkite.' },
        { label: 'Identity: Wordmark and symbol', text: 'Color, type, imagery, voice and motion. Distinct in one glance on a crowded shelf.' },
        { label: 'Design foundation: Built to build from', text: 'A design language and framework your engineers can build the product and docs from directly.' },
        { label: 'Website: The launch site', text: 'A landing page plus 3 to 4 pages, designed and built end to end, ready for the day you go public.' },
      ],
    },
    rules: {
      heading: 'Show the speed. Skip the hype.',
      intro: 'Engineers tune out marketing. They read the docs before the homepage and trust numbers over adjectives. The brand should feel like the product: fast, precise and honest about what it does, with proof on every page.',
      items: [
        { icon: 'flag', label: 'Leave out', text: 'Neon gradients and rocket metaphors. Vague “10x faster” claims with no numbers. Stock dev illustrations and fake dashboards.' },
        { icon: 'frame', label: 'Bring in', text: 'Real terminal output, configs and pipelines. Build and benchmark data that reads in one glance. Docs-grade typography on a tight grid. One system across site, docs, product and launch.' },
      ],
    },
    run: {
      heading: 'Eight weeks. 45 minutes a week from you.',
      intro: 'You work directly with Daksh as creative director, with no account or project managers. Two senior designers join: one on brand strategy, one on web. Each week is a 30-minute review and 15 minutes of Figma feedback, plus Slack for quick questions.',
      items: [
        { icon: 'message', label: 'Week 1: Discovery', text: 'Your product, your vision for Peak, and the landscape: where Modal, Depot, Blacksmith and Buildkite sit, and where Peak wins. Output: positioning brief.' },
        { icon: 'frame', label: 'Weeks 1 to 3: Brand strategy and direction', text: 'Close collaboration to validate direction early: positioning, visuals and messaging in one strategy deck. Output: design strategy deck.' },
        { icon: 'layers', label: 'Weeks 3 to 5: Design foundation', text: 'Identity, type, color, components and motion, polished through milestone reviews into a framework engineers build from. Output: brand system in Figma.' },
        { icon: 'flag', label: 'Weeks 6 to 8: Website', text: 'A landing page plus 3 to 4 pages, end to end: structure, all assets, motion design and development. Output: live launch site.' },
      ],
    },
    schedule: {
      heading: 'Brand locked in week five. Site live by week eight.',
      body: 'Direction is validated in the first two to three weeks, so everything after it is polish, not rework.',
      hideRows: true,
      sprints: [
        { name: 'Discovery', note: 'Positioning brief', from: 1, to: 1, weeks: [{ week: 1, bring: '', decide: '' }] },
        { name: 'Brand strategy', note: 'Direction validated', from: 1, to: 3, weeks: [{ week: 2, bring: '', decide: '' }, { week: 3, bring: '', decide: '' }] },
        { name: 'Design foundation', note: 'Brand system', from: 3, to: 5, weeks: [{ week: 4, bring: '', decide: '' }, { week: 5, bring: '', decide: '' }] },
        { name: 'Website', note: 'Launch site', from: 6, to: 8, weeks: [{ week: 6, bring: '', decide: '' }, { week: 7, bring: '', decide: '' }, { week: 8, bring: '', decide: '' }] },
      ],
      line: 'Week 1: positioning brief. Week 3: brand direction signed off. Week 5: brand system handed over. Week 8: website live, ready to exit stealth.',
    },
    proof: {
      heading: 'Technical products, made to look credible.',
      body: 'We work only with B2B companies heading to Series B and upmarket. Picked for Peak: developer tools and infrastructure sold to technical buyers.',
      items: [
        { client: 'Greptile', note: 'AI code review, then a $25M Series A', href: '/case-studies/greptile', src: '/projects/greptile.jpg', alt: 'Greptile mark rendered as a glowing green glass object' },
        { client: 'Replay', note: 'Working with the biggest frontier labs', href: 'https://www.replay.ai/', src: '/projects/replay.jpg', alt: 'Replay wordmark on a deep blue textured field' },
        { client: 'Reducto', note: 'Document AI infrastructure, $75M raised', href: 'https://reducto.ai/', src: '/projects/reducto.jpg', alt: 'Reducto wordmark on a light grid with pixel patterns' },
        { client: 'CTGT', note: 'Now serving Fortune 100 companies', href: 'https://www.ctgt.ai/', src: '/projects/ctgt.jpg', alt: 'CTGT website hero over a misty mountain range' },
      ],
    },
    reviews: {
      heading: '5.0 on every review. Verified on Contra.',
      body: 'PIXELUP LABS is a Verified Studio on Contra and ranked #4 on its Top 100 this month. Every quote below is a verified client review.',
      items: [
        { name: 'Daksh Gupta', role: 'Founder, Greptile', quote: 'Daksh is a tier-1 designer, with great taste, attention-to-detail, and strong product intuition. I highly recommend working with him.' },
        { name: 'Sahitya S', role: 'SynthioLabs', quote: 'They not only get timelines (a rarity!) but truly understand the vision and story we, as founders, want to tell.' },
        { name: 'Faaris Hussain', role: 'Co-Founder, Henry Labs', quote: 'They handled our landing page redesign and core product design, and the output speaks for itself. Fast, thoughtful, and easy to work with.' },
        { name: 'Alli Minetti', role: 'Contra Labs', quote: 'Great experience with reliable communication, fast iteration, and implementing feedback quickly.' },
      ],
      line: '$500K+ earned on Contra · Hired 35x · 5.0 across 6 reviews',
    },
    investment: {
      heading: 'Brand + Website: $20,576.',
      lead: {
        name: 'Brand Sprint',
        terms: '4 to 5 weeks · starts next week',
        price: '$11,977',
        includes: 'Discovery and competitive landscape, a design strategy deck covering positioning, visuals and messaging, the full identity, and a design foundation your engineers build from.',
      },
      addon: {
        name: 'Website Sprint',
        terms: '3 weeks · with the Brand Sprint',
        price: '$8,599',
        includes: 'A landing page plus 3 to 4 pages, designed and built end to end, with all assets and motion. $12,977 as a standalone Website Sprint.',
      },
      line: 'Together: $20,576 for about eight weeks. The website costs less on top of the Brand Sprint because the system, assets and messaging already exist. All source files are yours on handover.',
    },
    extras: {
      heading: 'We also cover launch videos and AEO.',
      intro: 'When Peak comes out of stealth, we can help with the launch itself, built on the same brand. Scoped and priced separately, whenever you need them.',
      items: [
        { icon: 'play', label: 'Launch videos', text: 'Motion-led launch films and product walkthroughs for the announcement, X and LinkedIn, in the new brand.' },
        { icon: 'search', label: 'AEO support: search result visibility', text: 'So Peak shows up when engineers ask ChatGPT, Claude, Perplexity and Google about CI and build infrastructure.' },
      ],
    },
    next: {
      heading: 'Let’s get Peak ready to leave stealth.',
      intro: 'We have two project slots left this quarter. Confirm this week and we start next week.',
      items: [
        { icon: 'message', label: 'Step 1: Reply to confirm', text: 'Reply to the email and tell us you’re in.' },
        { icon: 'users', label: 'Step 2: Slack and contract', text: 'We set up a shared Slack and send the contract.' },
        { icon: 'calendar', label: 'Step 3: Kick off next week', text: 'Discovery starts, with brand direction in your hands within the first two weeks.' },
      ],
    },
    cta: {
      eyebrow: 'Let’s get Peak ready to leave stealth.',
      email: 'daksh@pixelup.in',
      note: 'Two project slots left this quarter. Confirm this week and we start next week, with a shared Slack and the contract the same day.',
      reserve: { label: 'Reply to confirm', href: 'mailto:daksh@pixelup.in?subject=Peak%20x%20PIXELUP%20LABS%3A%20let%E2%80%99s%20go' },
    },
  },
];
