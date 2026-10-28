import Header from '@/components/Header';
import Dome from '@/components/home/Dome';
import Ethos from '@/components/home/Ethos';
import HomeClients from '@/components/home/HomeClients';
import HomeFooter from '@/components/home/HomeFooter';
import HomeHero from '@/components/home/HomeHero';
import HomeWork from '@/components/home/HomeWork';
import Recognition from '@/components/home/Recognition';
import Testimonials from '@/components/home/Testimonials';
import WhatWeDo from '@/components/home/WhatWeDo';

// Figma "Home - Desktop - 1440p" (PIXELUP-Brand-2026, node 1524:934). The 3D mark sits this page out.
export default function Home() {
  return (
    <>
      <Header variant="home" />
      <main className="home" data-mark="off">
        <HomeHero />
        <Ethos />
        <HomeWork />
        <WhatWeDo />
        <Recognition />
        <Dome />
        <Testimonials />
        <HomeClients />
      </main>
      <HomeFooter />
    </>
  );
}
