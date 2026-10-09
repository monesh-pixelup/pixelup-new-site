import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import ArticleBody, { anchorFor } from '@/components/blog/ArticleBody';
import BlogIndex from '@/components/blog/BlogIndex';
import Toc from '@/components/blog/Toc';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { blog, formatDate, sanitySize } from '@/content/caseStudies';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return blog.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = blog.find((p) => p.slug === slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${slug}` },
    authors: [{ name: 'Daksh' }],
    openGraph: { title: post.title, description: post.description, type: 'article', url: `/blog/${slug}`, images: [post.cover] },
    twitter: { card: 'summary_large_image', title: post.title, description: post.description, images: [post.cover] },
  };
}

export default async function PostPage({ params }: Props) {
  const { slug } = await params;
  const post = blog.find((p) => p.slug === slug);
  if (!post) notFound();
  const [w, h] = sanitySize(post.cover);
  const toc = post.body.filter((n) => n.t === 'h2').map((n) => ({ id: anchorFor((n as { x: string }).x), text: (n as { x: string }).x }));
  const more = blog.filter((p) => p.slug !== slug).slice(0, 5);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    datePublished: new Date(post.date).toISOString(),
    author: { '@type': 'Person', name: 'Daksh' },
    publisher: { '@type': 'Organization', name: 'PIXELUP LABS' },
    image: post.cover,
  };
  return (
    <>
      <Header current="blog" />
      <main data-page="article">
        <article className="article">
          <header className="cs-intro article__intro">
            <p className="cs-kicker" data-intro="fade">
              {post.kind} · {formatDate(post.date)} · {post.minutes} min read
            </p>
            <h1 className="cs-title article__title" data-intro="lines">
              {post.title}
            </h1>
            <p className="cs-lede" data-intro="fade">
              {post.description}
            </p>
          </header>
          <div className="article__cover" data-dock="index">
            <figure className="frame frame--cover" data-media>
              <div className="frame__zoom">
                <Image src={post.cover} alt="" width={w} height={h} sizes="97vw" quality={85} priority />
              </div>
            </figure>
          </div>
          <div className="article__grid">
            <aside className="article__aside">
              <p className="article__byline">
                <span>Written by</span> Daksh
              </p>
              {toc.length > 2 && <Toc items={toc} />}
            </aside>
            <ArticleBody nodes={post.body} />
          </div>
        </article>
        <BlogIndex id="more" title="More" kicker="Articles" posts={more} />
      </main>
      <Footer />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </>
  );
}
