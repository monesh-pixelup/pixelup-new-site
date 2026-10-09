import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ExplorationsStage from '@/components/explorations/ExplorationsStage';
import { explorations } from '@/content/explorations';

export const metadata: Metadata = {
  title: 'Explorations',
  description:
    'Concepts we killed and the ones we shipped: brand systems, product surfaces and type studies from PIXELUP LABS, laid out as a tunnel you can fly through.',
  alternates: { canonical: '/explorations' },
  openGraph: { title: 'Explorations — PIXELUP LABS', url: '/explorations' },
};

export default function ExplorationsPage() {
  return (
    <>
      <Header current="explorations" />
      <main data-page="explorations">
        <ExplorationsStage items={explorations} />
      </main>
      <Footer />
    </>
  );
}
