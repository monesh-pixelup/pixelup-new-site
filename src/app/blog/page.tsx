import type { Metadata } from 'next';
import BlogIndex from '@/components/blog/BlogIndex';
import PostCard from '@/components/blog/PostCard';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { blog } from '@/content/caseStudies';

export const metadata: Metadata = {
  title: 'Blog',
  description: 'Design strategies that work for enterprise companies, written by Daksh: agency comparisons with real prices, rebrand timelines and costs.',
  alternates: { canonical: '/blog' },
  openGraph: { title: 'Blog — PIXELUP LABS', url: '/blog' },
};

export default function BlogPage() {
  const [lead, ...rest] = blog;
  return (
    <>
      <Header current="blog" />
      <main data-page="blog">
        <section className="blog-intro" aria-labelledby="blog-title">
          <p className="cs-kicker" data-intro="fade">
            Written by Daksh · Two emails a month
          </p>
          <h1 id="blog-title" className="cs-title" data-intro="lines">
            Design strategies that work for enterprise companies.
          </h1>
        </section>
        <div className="blog-feature" data-dock="index">
          <PostCard post={lead} shape="full" priority />
          <div className="blog-feature__pair">
            {rest.slice(0, 2).map((p) => (
              <PostCard key={p.slug} post={p} shape="half" />
            ))}
          </div>
        </div>
        <BlogIndex id="posts" title="All" posts={blog} />
      </main>
      <Footer />
    </>
  );
}
