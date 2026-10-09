import type { Metadata } from 'next';
import Collage from '@/components/Collage';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ProjectIndex from '@/components/ProjectIndex';
import { archives, projects } from '@/content/site';

export const metadata: Metadata = {
  title: 'Work',
  description: 'Brand, website and product design for Greptile, Henry Labs, Sully.ai, Reducto, Sainapse and other AI-native teams.',
  alternates: { canonical: '/work' },
  openGraph: { title: 'Work — PIXELUP LABS', url: '/work' },
};

export default function WorkPage() {
  return (
    <>
      <Header current="work" />
      <main data-page="work">
        <section className="wk-hero" data-dock="collage" aria-labelledby="work-title">
          <h1 id="work-title" className="sr-only">
            Work
          </h1>
          <Collage variant="intro" />
        </section>
        <ProjectIndex id="all" title="All" rows={projects} dock />
        <ProjectIndex id="archives" title="Archives" rows={archives} />
        <section className="wk-outro" aria-hidden="true">
          <Collage variant="outro" />
        </section>
      </main>
      <Footer />
    </>
  );
}
