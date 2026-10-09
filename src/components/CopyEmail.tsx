'use client';

import { memo, useEffect, useRef, useState, type MouseEvent } from 'react';
import { Roll } from './ui';

// Memoised so React never re-renders the letters the hover animation relies on.
const Address = memo(function Address({ email }: { email: string }) {
  return (
    <span className="mask foot__email-mask" data-reveal="rise">
      <span className="foot__email-text">
        <Roll>{email}</Roll>
      </span>
    </span>
  );
});

export default function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const onClick = async (e: MouseEvent<HTMLAnchorElement>) => {
    if (!navigator.clipboard) return;
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <a
      href={`mailto:${email}`}
      className="foot__email"
      data-bracket="email"
      data-cursor={copied ? 'Copied' : 'Copy email'}
      data-copied={copied}
      onClick={onClick}
    >
      <Address email={email} />
      <span className="foot__toast" aria-hidden="true">
        Copied to clipboard
      </span>
      <span className="sr-only" role="status">
        {copied ? 'Email address copied to clipboard' : ''}
      </span>
    </a>
  );
}
