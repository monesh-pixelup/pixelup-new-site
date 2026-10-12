import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import { Icon } from '@/components/proposal/icons';
import ProposalView from '@/components/proposal/ProposalView';
import { proposals } from '@/content/proposals';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return proposals.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = proposals.find((x) => x.slug === slug);
  if (!p) return {};
  // Written for one reader: shareable by link, never indexed.
  return {
    title: `Proposal for ${p.client}`,
    description: p.lede,
    robots: { index: false, follow: false },
    alternates: { canonical: `/proposals/${slug}` },
  };
}

export default async function ProposalPage({ params }: Props) {
  const { slug } = await params;
  const p = proposals.find((x) => x.slug === slug);
  if (!p) notFound();
  return (
    <>
      <Header status={p.hold} />
      <main data-page="proposal">
        <ProposalView p={p} />
      </main>
      <Footer
        eyebrow={p.cta.eyebrow}
        email={p.cta.email}
        note={p.cta.note}
        action={{ label: p.cta.reserve.label, href: p.cta.reserve.href ?? `mailto:${p.cta.email}?subject=${encodeURIComponent(`Reserve the ${p.client} Brand Sprint`)}` }}
        links={p.cta.ach ? [{ ...p.cta.ach, icon: <Icon name="download" /> }] : []}
      />
    </>
  );
}
