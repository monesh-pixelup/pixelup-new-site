import fs from 'node:fs';
const d = JSON.parse(fs.readFileSync('site-data.json', 'utf8'));
const ROOT = process.argv[2];
const SLUGS = ['greptile', 'henrylabs', 'streamline', 'sainapse', 'sully'];
const downloads = [];

const localMedia = (slug, src) => {
  const u = new URL(src);
  const name = u.pathname.split('/').pop();
  const local = `/case-studies/${slug}/${name}`;
  downloads.push([u.origin + u.pathname, ROOT + '/public' + local]);
  return local;
};

const isLabel = (x) => x.length <= 42 && !/[.!?]$/.test(x) && !/^\d/.test(x) && !/:/.test(x);
const metricRe = /^([A-Z][\w ]{1,14}): (.+)$/;
const statValue = /^([\d$€£]|F\d)/;

const cases = d.cases.map((c, idx) => {
  const slug = SLUGS[idx];
  let seq = c.seq;
  const stop = seq.findIndex((x) => x.x === 'Frequently asked questions' || x.x === 'More projects');
  if (stop > 0) seq = seq.slice(0, stop);
  seq = seq.filter((x) => !(x.src && /Container\.svg|\/card\.png/.test(x.src)));
  const h1 = seq.findIndex((x) => x.t === 'h1');
  const kicker = h1 > 0 && seq[h1 - 1].t === 'p' ? seq[h1 - 1].x : undefined;
  const title = seq[h1].x;
  let i = h1 + 1;
  const involvement = [];
  const stats = [];
  // label block: Client / Year / Involvement ... / Link(s) / Funding
  while (i < seq.length && seq[i].t !== 'img' && seq[i].t !== 'video' && seq[i].t !== 'h2') {
    const x = seq[i].x ?? '';
    if (['Client', 'Year', 'Involvement', 'Link', 'Links', 'Funding'].includes(x)) { i++; continue; }
    if (statValue.test(x) && seq[i + 1] && seq[i + 1].t === 'p') { stats.push({ value: x, label: seq[i + 1].x }); i += 2; continue; }
    if (x) involvement.push(x.replace(/,$/, ''));
    i++;
  }
  const hero = seq[i] && (seq[i].t === 'img' || seq[i].t === 'video') ? { kind: seq[i].t === 'video' ? 'video' : 'image', src: localMedia(slug, seq[i].src), alt: seq[i].alt || title } : undefined;
  if (hero) i++;
  // extra media straight after the hero (e.g. sainapse.svg) goes into the first section
  const sections = [];
  let pendingChallenge;
  let cur = { media: [], items: [], paragraphs: [], metrics: [], stats: [] };
  const flush = () => { if (cur.heading || cur.media.length || cur.paragraphs.length) sections.push(cur); };
  for (; i < seq.length; i++) {
    const n = seq[i];
    if (n.t === 'h2') { flush(); cur = { heading: n.x, challenge: pendingChallenge, media: [], items: [], paragraphs: [], metrics: [], stats: [] }; pendingChallenge = undefined; continue; }
    if (n.t === 'img' || n.t === 'video') {
      if (/faaris|headshot/i.test(n.src) && cur.quote) { cur.quote.avatar = localMedia(slug, n.src); continue; }
      cur.media.push({ kind: n.t === 'video' ? 'video' : 'image', src: localMedia(slug, n.src), alt: n.alt || '' });
      continue;
    }
    const x = n.x;
    if (!x) continue;
    if (x === 'Critical challenge') continue;
    if (/^\d\d \/ \d\d$/.test(x)) { pendingChallenge = x; continue; }
    if (x === 'CLIENT TESTIMONIAL') continue;
    if (n.t === 'blockquote') { cur.quote = { text: x.replace(/^[“"]|[”"]$/g, '') }; continue; }
    if (cur.quote && !cur.quote.author && n.t === 'p' && x.length < 40) { cur.quote.author = x; continue; }
    if (cur.quote && cur.quote.author && !cur.quote.role && n.t === 'p' && x.length < 60) { cur.quote.role = x; continue; }
    if (statValue.test(x) && x.length <= 6 && seq[i + 1]?.t === 'p') { cur.stats.push({ value: x, label: seq[i + 1].x }); i++; continue; }
    const m = x.match(metricRe);
    if (m && !x.includes('\n')) { cur.metrics.push({ label: m[1], text: m[2] }); continue; }
    if (isLabel(x) && seq[i + 1]?.t === 'p' && seq[i + 1].x && seq[i + 1].x.length > x.length) { cur.items.push({ label: x, text: seq[i + 1].x }); i++; continue; }
    cur.paragraphs.push(x);
  }
  flush();
  return { slug, title, kicker, description: c.description, involvement, stats, hero, sections };
});

// Blog: dates and covers from the index (it lists posts in order with cover, title, date)
const idx = d.blogIndex.seq;
const listing = [];
for (let k = 0; k < idx.length; k++) {
  if (idx[k].t === 'img' && idx[k + 1]?.t === 'p' && /^[A-Z]{3} \d{1,2}, \d{4}$/.test(idx[k + 2]?.x || '')) listing.push({ cover: idx[k].src.split('?')[0], title: idx[k + 1].x, date: idx[k + 2].x });
}
const posts = d.posts.map((p) => {
  const slug = new URL(p.url).pathname.split('/').pop();
  let seq = p.seq;
  const h1 = seq.findIndex((x) => x.t === 'h1');
  const title = h1 >= 0 ? seq[h1].x : p.title.replace(/ - PIXELUP LABS$/, '');
  const firstSrc = seq.find((x) => x.t === 'img')?.src.split('?')[0];
  const meta = listing.find((l) => l.cover === firstSrc) || listing.find((l) => l.title.toLowerCase().replace(/\W/g, '') === title.toLowerCase().replace(/\W/g, '')) || listing.find((l) => title.toLowerCase().startsWith(l.title.toLowerCase().slice(0, 20)));
  const stop = seq.findIndex((x) => /^(More articles|Related|Keep reading|Read next)/i.test(x.x || ''));
  if (stop > 0) seq = seq.slice(0, stop);
  const body = seq.slice(h1 + 1).filter((x) => !(x.t === 'img' && meta && x.src.split('?')[0] === meta.cover)).map((x) => {
    if (x.t === 'img') return { t: 'img', src: x.src.split('?')[0], alt: x.alt };
    return x;
  }).filter((x) => !(x.t === 'p' && /^[A-Z]{3} \d{1,2}, \d{4}$/.test(x.x)));
  const inlineDate = p.seq.find((x) => x.t === 'p' && /^[A-Z]{3} \d{1,2}, \d{4}$/.test(x.x))?.x;
  const firstImg = p.seq.find((x) => x.t === 'img')?.src.split('?')[0];
  const cover = meta?.cover || (p.ogImage && !/opengraph-image/.test(p.ogImage) ? p.ogImage.split('?')[0] : firstImg);
  return { slug, title, description: p.description, date: meta?.date || inlineDate, cover, body: body.filter((x) => !(x.t === 'img' && x.src === cover)) };
});
posts.sort((a, b) => new Date(b.date) - new Date(a.date));

fs.writeFileSync(ROOT + '/src/content/case-studies.json', JSON.stringify(cases, null, 1));
fs.writeFileSync(ROOT + '/src/content/blog.json', JSON.stringify(posts, null, 1));
fs.writeFileSync('downloads.txt', [...new Map(downloads.map((x) => [x[1], x])).values()].map((x) => x.join(' ')).join('\n'));
console.log(cases.map((c) => `${c.slug}: ${c.sections.length} sections, ${c.sections.reduce((n, s) => n + s.media.length, 0)} media, stats ${c.stats.length}`).join('\n'));
console.log('posts', posts.length, 'with date', posts.filter((p) => p.date).length, 'with cover', posts.filter((p) => p.cover).length);
