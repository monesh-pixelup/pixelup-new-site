import { about } from '@/content/site';

export default function About() {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="about__inner">
        <p className="about__eyebrow">About</p>
        <h2 id="about-title" className="about__statement">
          {about.statement}
        </h2>
        <div className="about__foot">
          <p className="about__body">{about.body}</p>
          <ul className="about__proof">
            {about.proof.map((p) => (
              <li key={p.label}>
                <span className="about__figure">{p.figure}</span>
                <span className="about__label">{p.label}</span>
                <span className="about__client">{p.client}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
