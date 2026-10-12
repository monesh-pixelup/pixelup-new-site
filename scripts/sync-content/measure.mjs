// Writes each case-study image's intrinsic size (w, h) into src/content/case-studies.json,
// so frames take the image's own aspect ratio instead of cropping it to a fixed shape.
// Run from the repo root after downloading media: node scripts/sync-content/measure.mjs
import fs from 'node:fs';
import sharp from 'sharp';

const FILE = 'src/content/case-studies.json';
const cases = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let measured = 0;
for (const c of cases) {
  const media = [c.hero, ...c.sections.flatMap((s) => s.media)].filter(Boolean);
  for (const m of media) {
    // Videos keep the frame's default shape (no ffprobe here); SVG logos are drawn contained.
    if (m.kind !== 'image' || m.src.endsWith('.svg')) continue;
    const { width, height } = await sharp(`public${m.src}`).metadata();
    m.w = width;
    m.h = height;
    measured++;
  }
}

fs.writeFileSync(FILE, JSON.stringify(cases, null, 1) + '\n');
console.log(`Measured ${measured} images`);
