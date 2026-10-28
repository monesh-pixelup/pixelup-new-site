# Hex Dome — PIXELUP LABS case studies

An infinite, draggable dome of case-study cards (WebGL / Three.js + GSAP), built from the
"Some highlights from our recent projects" frame in the PIXELUP LABS Brand 2026 Figma file.

- **Drag** (or flick) in any direction: the field wraps forever and settles on the nearest card.
- **Hover** a card to light it up; **click** (or Enter) to bring it forward and open its details. **Esc** closes.
- **Arrow keys** move between cards.

There are two versions in this zip.

## 1. `standalone/` — runs anywhere, no install

Plain HTML/JS/CSS. Three.js and GSAP load from a CDN, so you need an internet connection.
It has to be served over http (opening `index.html` straight from disk won't load the modules):

```bash
cd standalone
python -m http.server 5174
```

Then open http://localhost:5174. (`npx serve .` works too.)

| File | What it is |
|---|---|
| `main.js` | Dome engine, shaders, input, intro and open/close animation |
| `data.js` | The 14 projects: name, tagline, services, headline, stats, links |
| `style.css` | Overlay UI: headline, HUD, detail panel, cursor, loader |
| `media/` | Card images (cropped to 1280×768) and two looping videos |
| `fonts/` | Inter Display (SIL Open Font License) |

To change the projects, edit `data.js`. Images should be 1280×768 (other sizes are cover-cropped).

## 2. `nextjs/` — the component as wired into pixelup-website-v1

Drop-in files for the PIXELUP LABS Next.js site (Next 16, React 19, Tailwind v4,
`three@^0.186`, `gsap@^3.15`):

| File | What it is |
|---|---|
| `components/case-studies/HexDome.tsx` | Client component: headline, HUD, project panel, cursor |
| `components/case-studies/hexDomeEngine.ts` | WebGL engine (no React), pauses when off screen, cleans up on unmount |
| `components/case-studies/hexDomeShaders.ts` | GLSL for cards, captions, honeycomb sky and dust |
| `app/case-studies/page.tsx` | `/case-studies` with the dome added above the existing list |
| `case-studies-page.diff` | The same page change as a diff |

The dome reads its cards from `lib/projects.ts` and the panel details from
`lib/case-studies-showcase.ts`. Neither file is included here; they already exist in that repo.
Inside the site, the mouse wheel scrolls the page (it doesn't spin the dome), and on phones
horizontal swipes turn the dome while vertical swipes scroll.
