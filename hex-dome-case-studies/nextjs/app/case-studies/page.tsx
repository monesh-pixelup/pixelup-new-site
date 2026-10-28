import type { Metadata } from "next";
import { CaseStudyList } from "@/components/case-studies/CaseStudyList";
import { HexDome } from "@/components/case-studies/HexDome";
import { Footer } from "@/components/Footer";
import { caseStudyShowcase } from "@/lib/case-studies-showcase";
import { projects } from "@/lib/projects";

export const metadata: Metadata = {
  title: "Case Studies - PIXELUP LABS",
  description:
    "Real brand, product and website engagements PIXELUP LABS has shipped for ambitious startups — proof, not promises.",
  alternates: { canonical: "/case-studies" },
};

/** Case-study index linked from the global navigation and detail pages. */
export default function CaseStudiesPage() {
  return (
    <div className="relative flex flex-col gap-8 p-4 desk:p-5">
      {/* Full-bleed: cancels the page padding, like the Footer below. */}
      <div className="-mx-4 -mt-4 desk:-mx-5 desk:-mt-5">
        <HexDome projects={projects} showcase={caseStudyShowcase} />
      </div>
      <header className="flex w-fit flex-col gap-4">
        <h1 className="fade-up font-display tracking-display text-[24px] font-medium leading-[1.1] text-white [animation-delay:100ms] desk:text-[56px]">
          Real projects,
          <br />
          real outcomes
        </h1>
        <p className="fade-up text-[16px] leading-[1.3] tracking-[-0.02em] text-muted-65 [animation-delay:200ms]">
          A closer look at the brand, product and website engagements that{" "}
          <br className="hidden desk:block" />
          took ambitious startups from overlooked to enterprise-ready.
        </p>
        {/* <p className="fade-up text-[13px] font-medium uppercase tracking-[0.04em] text-white/50 [animation-delay:300ms]">
          Trusted by funded AI &amp; enterprise startups - from pre-seed to
          Series B
        </p> */}
      </header>
      <CaseStudyList entries={caseStudyShowcase} />
      <div className="-mx-4 -mb-4 desk:-mx-5 desk:-mb-5">
        <Footer />
      </div>
    </div>
  );
}
