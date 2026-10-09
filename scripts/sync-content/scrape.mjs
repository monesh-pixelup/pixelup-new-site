import { chromium } from 'playwright-core';
import fs from 'node:fs';
const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
const page = await browser.newPage();
await page.goto('https://www.pixeluplabs.com/blog', { waitUntil: 'networkidle' });
const blogLinks = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/blog/"]')].map((a) => a.href))]);
const extract = async (url) => {
  await page.goto(url, { waitUntil: 'networkidle' });
  return page.evaluate(() => {
    const main = document.querySelector('main') || document.body;
    main.querySelectorAll('script,style,noscript,nav,footer').forEach((n) => n.remove());
    const seq = [];
    const unwrap = (src) => { try { const u = new URL(src, location.href); const inner = u.searchParams.get('url'); return inner ? new URL(inner, location.origin).href : u.href; } catch { return src; } };
    const walk = (n) => {
      for (const c of n.children) {
        const t = c.tagName;
        if (t === 'IMG') { seq.push({ t: 'img', src: unwrap(c.getAttribute('src') || ''), alt: c.alt, w: c.naturalWidth, h: c.naturalHeight }); continue; }
        if (t === 'VIDEO') { seq.push({ t: 'video', src: unwrap(c.getAttribute('src') || c.querySelector('source')?.getAttribute('src') || ''), poster: c.poster }); continue; }
        if (['H1', 'H2', 'H3', 'H4', 'P', 'BLOCKQUOTE', 'FIGCAPTION'].includes(t)) { const x = c.innerText.trim(); if (x) seq.push({ t: t.toLowerCase(), x }); continue; }
        if (t === 'TABLE') { seq.push({ t: 'table', rows: [...c.querySelectorAll('tr')].map((r) => [...r.children].map((td) => td.innerText.trim())) }); continue; }
        if (t === 'UL' || t === 'OL') { seq.push({ t: t.toLowerCase(), items: [...c.querySelectorAll(':scope > li')].map((li) => li.innerText.trim()) }); continue; }
        if (t === 'A' && c.children.length === 0) { const x = c.innerText.trim(); if (x) seq.push({ t: 'a', x, href: c.href }); continue; }
        walk(c);
      }
    };
    walk(main);
    const meta = (n) => document.querySelector(`meta[name="${n}"],meta[property="${n}"]`)?.content;
    const time = document.querySelector('time')?.getAttribute('datetime') || document.querySelector('time')?.innerText;
    return { url: location.href, title: document.title, description: meta('description'), ogImage: meta('og:image'), date: time, seq };
  });
};
const cases = [];
for (const s of ['greptile', 'henrylabs', 'streamline', 'sainapse', 'sully']) cases.push(await extract(`https://www.pixeluplabs.com/case-studies/${s}`));
const blogIndex = await extract('https://www.pixeluplabs.com/blog');
const posts = [];
for (const l of blogLinks) posts.push(await extract(l));
fs.writeFileSync('site-data.json', JSON.stringify({ cases, blogIndex, posts }, null, 1));
console.log('cases', cases.length, 'posts', posts.length, blogLinks);
await browser.close();
