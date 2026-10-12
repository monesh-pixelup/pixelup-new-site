import { blog } from '@/content/caseStudies';
import { explorations } from '@/content/explorations';
import { projects, site } from '@/content/site';
import MenuToggle from './MenuToggle';
import { ArrowSwap, Roll, StatusDots } from './ui';

export default function Header({ current, status = site.status }: { current?: 'work' | 'blog' | 'explorations'; status?: string } = {}) {
  return (
    <header className="hdr">
      <a href="/" className="hdr__brand" aria-label={`${site.name}, back to top`}>
        <span className="mask" data-intro="rise">
          <span className="hdr__logo">
            <Roll>{site.name}</Roll>
            <sup className="hdr__reg">®</sup>
          </span>
        </span>
        <span className="mask hdr__tag-mask" data-intro="rise">
          <span className="hdr__tag">{site.tagline}</span>
        </span>
      </a>

      <nav className="hdr__nav" aria-label="Primary">
        <a href="/work" className="hdr__link" aria-current={current === 'work' ? 'page' : undefined}>
          <span className="mask" data-intro="rise">
            <span>
              <Roll>Work</Roll>
              <sup data-count={projects.length}>{projects.length}</sup>
            </span>
          </span>
        </a>
        <a href="/#about" className="hdr__link">
          <span className="mask" data-intro="rise">
            <span>
              <Roll>About</Roll>
            </span>
          </span>
        </a>
        <a href="/explorations" className="hdr__link" aria-current={current === 'explorations' ? 'page' : undefined}>
          <span className="mask" data-intro="rise">
            <span>
              <Roll>Explorations</Roll>
              <sup data-count={explorations.length}>{explorations.length}</sup>
            </span>
          </span>
        </a>
        <a href="/blog" className="hdr__link" aria-current={current === 'blog' ? 'page' : undefined}>
          <span className="mask" data-intro="rise">
            <span>
              <Roll>Blog</Roll>
              <sup data-count={blog.length}>{blog.length}</sup>
            </span>
          </span>
        </a>
      </nav>

      <div className="hdr__meta">
        <span className="mask" data-intro="rise">
          <span className="status">
            <StatusDots />
            <i className="status__line" aria-hidden="true" />
            <span>{status}</span>
          </span>
        </span>
        <a href="#contact" className="hdr__contact">
          <span className="mask" data-intro="rise">
            <span className="hdr__contact-inner">
              <Roll>Contact</Roll>
              <ArrowSwap />
            </span>
          </span>
          <i className="hdr__line" aria-hidden="true" />
        </a>
      </div>

      <MenuToggle />
    </header>
  );
}
