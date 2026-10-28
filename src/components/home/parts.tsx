import type { CSSProperties, ElementType } from 'react';

export type Vars = CSSProperties & Record<`--${string}`, string | number>;

/** Section label with its raised roman numeral, e.g. OUR ETHOS ᴵ. */
export function Eyebrow({ label, numeral, className = '' }: { label: string; numeral: string; className?: string }) {
  return (
    <p className={`eb ${className}`} data-reveal="fade">
      <span className="eb__label tb">{label}</span>
      <span className="eb__num tb" aria-hidden="true">
        {numeral}
      </span>
    </p>
  );
}

/**
 * Text set on the Figma's line breaks. On desktop each line is its own mask and rises in turn;
 * phones drop the breaks and let the text rewrap. `words` wraps each word for the scroll-lit statement.
 */
export function Lines({ lines, as: Tag = 'p', className = '', id, reveal = true, words = false }: { lines: string[]; as?: ElementType; className?: string; id?: string; reveal?: boolean; words?: boolean }) {
  return (
    <Tag className={`lines ${className}`} id={id} data-reveal={reveal ? 'stack' : undefined}>
      {lines.map((line, i) => {
        const text = i < lines.length - 1 ? `${line} ` : line;
        return (
          <span className="ln" key={i}>
            <span className="tb">
              {words
                ? text.split(/(\s+)/).map((w, j) => (/^\s+$/.test(w) || !w ? w : <span className="w" key={j}>{w}</span>))
                : text}
            </span>
          </span>
        );
      })}
    </Tag>
  );
}
