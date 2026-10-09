import About from '@/components/About';
import Clients from '@/components/Clients';
import Footer from '@/components/Footer';
import Header from '@/components/Header';
import Hero from '@/components/Hero';
import News from '@/components/News';
import Services from '@/components/Services';
import Work from '@/components/Work';

export default function Home() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Work />
        <Clients />
        <About />
        <Services />
        <News />
      </main>
      <Footer />
    </>
  );
}
