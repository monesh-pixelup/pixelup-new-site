// Client proposals, served at /proposals/[slug] and kept out of search (noindex).
// Each one is written for a single reader; copy is agreed with Daksh before it ships.
import type { IconName } from '@/components/proposal/icons';

export type ProposalWeek = { week: number; date: string; bring: string; decide: string; flag?: string };

/** A deliverable line, optionally with past work that shows what it looks like. */
export type ProposalDeliverable = string | { text: string; reference: { label: string; src: string; alt: string; href?: string } };

export type Proposal = {
  slug: string;
  client: string;
  /** Shown in the header status and the footer CTA. */
  hold: string;
  kicker: string;
  title: string;
  lede: string;
  meta: { label: string; value: string; note?: string; icon: IconName }[];
  /** The weekly time ask: the window the client books the call in (hours in their timezone), and the minutes it takes. */
  week: {
    heading: string;
    body: string;
    tz: string;
    window: [number, number];
    /** Minutes per week: the review call and the async review. */
    call: number;
    review: number;
    caption: string;
  };
  split: { heading: string; items: { label: string; text: string }[]; line: string };
  schedule: {
    heading: string;
    body: string;
    /** `note` is the short badge; `detail` an optional line under it. */
    sprints: { name: string; note: string; detail?: string; from: number; to: number; optional?: boolean; weeks: ProposalWeek[] }[];
    /** Week whose call decides the optional sprint. */
    decideBy: { week: number; label: string };
    line: string;
  };
  deliverables: { heading: string; groups: { name: string; note: string; optional?: boolean; items: ProposalDeliverable[] }[] };
  rules: { heading: string; intro: string; items: { label: string; text: string; icon: IconName }[] };
  investment: {
    heading: string;
    lead: { name: string; terms: string; price: string; includes: string };
    addon: { name: string; terms: string; includes: string };
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
];
