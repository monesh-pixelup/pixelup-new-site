import { about } from '@/content/site';

export default function About() {
  return (
    <section className="about" id="about" aria-labelledby="about-title">
      <div className="about__inner">
        <p className="about__eyebrow">About</p>
        <h2 id="about-title" className="about__statement">
          {about.statement}
        </h2>
        <p className="about__body">{about.body}</p>
      </div>
    </section>
  );
}
