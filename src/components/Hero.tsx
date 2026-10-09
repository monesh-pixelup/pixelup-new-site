import { ArrowSwap } from './ui';

export default function Hero() {
  return (
    <section className="hero" id="top" aria-labelledby="hero-title">
      <div className="hero__foot">
        <div className="hero__intro">
          <h1 id="hero-title" className="hero__title" data-intro="lines">
            PIXELUP LABS is an independent design studio for AI companies.
          </h1>
          <p className="hero__sub" data-intro="lines">
            Brand, websites and motion for teams moving from model to market.
          </p>
        </div>
        <a href="#work" className="hero__hint" data-intro="fade">
          <span>Selected work</span>
          <ArrowSwap rotate={90} />
        </a>
        <p className="hero__coords" data-intro="fade" aria-hidden="true">
          <span data-mark-coords>X 0  Y 0  R 0°</span>
          <span className="hero__drag">
            <span className="hero__drag-fine">Drag the mark · hold to transform</span>
            <span className="hero__drag-touch">Hold the mark to transform</span>
          </span>
        </p>
      </div>
    </section>
  );
}
