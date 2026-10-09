# PIXELUP LABS — Website 2026

Built from the Figma file `PIXELUP-Brand-2026`: **Home - Desktop - 1440p** (`674:68`) at `/` and **Work - Desktop - 1440p** (`674:208`) at `/work`.

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # static production build
```

Stack: Next.js 16 (App Router), GSAP 3 (ScrollTrigger, SplitText), Lenis, three.js. Type is Switzer (Fontshare), tracked at −3% everywhere.

## The mark

The hero object is the PIXELUP logo mark (the Figma "Union" vector from the Cover), extruded in WebGL as its two pieces: the folded band and the wedge (`src/components/mark/glyph.ts`). It lives in the root layout, so it stays docked across page changes; navigating takes it apart and the next page reassembles it. It sits in a fixed layer above the page with `mix-blend-mode: difference`, so it reads white on ink, black on white, and inverts any colour it passes over. It never scrolls away. It stays docked and only changes pose:

| Section  | Pose |
| -------- | ---- |
| Hero     | Figma position and size, wrapped in its selection handles |
| Work grid | Docked on the right rail, smaller |
| About    | Unfolded and turned, then assembles beside the pinned statement as it lights up |
| Services | Signs each service title while titles roll through |
| News     | Back on the rail |
| Footer   | Signs the email address |
| Work page | Floats over the collage, then rests on the right rail over the project index |

Interactions: it leans toward the cursor; on hover it shows a Figma-style selection (frame, handles, layer name, live size). Drag spins it with momentum, and click or tap flicks it. Scroll speed twists it and pulls the halves apart.

- Pose per section: `src/lib/docks.ts`
- Rendering, physics, selection UI: `src/components/mark/MarkScene.ts`
- Page choreography (intro, reveals, pins): `src/components/Experience.tsx`

## Work page

Collage hero (frames unmask from different edges, drift with the cursor, peel away on scroll), the **All** and **Archives** project indexes (inverted highlight on hover, the row's images rise on a reflective floor), and the collage reassembling before the footer.

## Content

All copy and data live in `src/content/site.ts`. Before launch, confirm:

- Services copy (prices are from pixeluplabs.com) and News rows (case studies link to pixeluplabs.com; the report row is a placeholder)
- Contra profile URL, X handle, Privacy / Legal links
- Email: hello@pixeluplabs.com (the Figma used `contact@pixelup.co`)
- Projects (home grid and Work index) come from pixeluplabs.com: descriptions, services, years, covers and case-study imagery (`public/projects/`). The Industry column uses short labels derived from each description; check them
- Archives holds three concept pieces from the Figma collage imagery
- Client logos are the 1× PNG crops from the Figma strip; SVG versions would sharpen them on retina screens

The footer's staggered text block replaces a placeholder vector in the Figma (it carried another studio's details) with live PIXELUP text.

Motion respects `prefers-reduced-motion` (no smooth scroll, pins or scrubbing; the mark stays docked and still).

## Case studies and blog

`/case-studies/[slug]` (5) and `/blog`, `/blog/[slug]` (17) are generated from pixeluplabs.com content in `src/content/case-studies.json` and `src/content/blog.json`.

- Case studies follow the Figma frame `674:317`: title block in the space above the first frame, client/year/involvement/link on the header's columns, then each section's mocks as full (1392 × 835), pair (690 × 656) and centred portrait (676 × 843) frames.
- Blog: featured cover, a pair, then the full index with the same hover system as Work. Articles use a reading column on the 16-column grid with an "On this page" list; tables and figures break out by one column.
- Media lives in `public/case-studies/`; blog images load from Sanity's CDN.

To re-sync after publishing on the current site (needs `playwright-core` and Google Chrome):

```bash
cd scripts/sync-content && npm i playwright-core && node scrape.mjs && node convert.mjs "$(cd ../.. && pwd)"
```

Then download any new case-study media listed in `scripts/sync-content/downloads.txt`.
Sainapse's case study links to `sainapse-staging.webflow.io`, as on the current site; swap in the production URL in `src/content/site.ts`.
