import Image from 'next/image';
import { blogHref, formatDate, sanitySize, type Post } from '@/content/caseStudies';

/** Cover card in the case-study frame system: full width for the lead story, pairs below it. */
export default function PostCard({ post, shape, priority = false }: { post: Post; shape: 'full' | 'half'; priority?: boolean }) {
  const [w, h] = sanitySize(post.cover);
  return (
    <a href={blogHref(post.slug)} className={`post-card post-card--${shape}`} data-cursor="Read">
      <figure className="post-card__media" data-media>
        <div className="frame__zoom">
          <Image
            src={post.cover}
            alt=""
            width={w}
            height={h}
            sizes={shape === 'full' ? '97vw' : '(min-width: 768px) 48vw, 100vw'}
            quality={85}
            priority={priority}
          />
        </div>
      </figure>
      <div className="post-card__meta">
        <h3 className="post-card__title">
          <span>{post.title}</span>
        </h3>
        <p className="post-card__info">
          <span>{post.kind}</span>
          <span>{formatDate(post.date)}</span>
          <span>{post.minutes} min read</span>
        </p>
      </div>
    </a>
  );
}
