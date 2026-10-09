import type { Metadata } from 'next';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import ExplorationsStage from '@/components/explorations/ExplorationsStage';
import { explorations } from '@/content/explorations';

export const metadata: Metadata = {
  title: 'Explorations',
  description:
    'A moving index of PIXELUP LABS work and visual research — brand systems, product surfaces and type specimens, drawn onto a curved stage you can walk through.',
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
