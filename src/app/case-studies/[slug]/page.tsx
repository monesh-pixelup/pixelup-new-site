import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import CaseStudyView from '@/components/case/CaseStudyView';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { caseStudies } from '@/content/caseStudies';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return caseStudies.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const cs = caseStudies.find((c) => c.slug === slug);
  if (!cs) return {};
  const cover = cs.project.cover?.kind === 'image' ? cs.project.cover.src : undefined;
  const title = `${cs.project.client} Case Study`;
  return {
    title,
    description: cs.description,
    alternates: { canonical: `/case-studies/${slug}` },
    openGraph: { title: `${title} — PIXELUP LABS`, description: cs.description, url: `/case-studies/${slug}`, type: 'article', ...(cover ? { images: [cover] } : {}) },
  };
}

export default async function CaseStudyPage({ params }: Props) {
  const { slug } = await params;
  const cs = caseStudies.find((c) => c.slug === slug);
  if (!cs) notFound();
  return (
    <>
      <Header current="work" />
      <main data-page="case">
        <CaseStudyView cs={cs} />
      </main>
      <Footer />
    </>
  );
}
