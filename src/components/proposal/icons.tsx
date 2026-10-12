// Line icons for proposals: 16 × 16, straight lines only (square caps, mitred joins) to match the
// site's sharp corners. Every icon renders at one fixed size, set in proposal.css.
import type { ReactNode } from 'react';

export type IconName = 'calendar' | 'clock' | 'layers' | 'tag' | 'frame' | 'message' | 'flag' | 'users' | 'contact' | 'download';

const paths: Record<IconName, ReactNode> = {
  calendar: (
    <>
      <path d="M2.5 3.5h11v10h-11ZM2.5 6.5h11M5.5 1.5v3M10.5 1.5v3" />
      <path d="M9.5 9h2v2h-2Z" fill="currentColor" />
    </>
  ),
  // An hourglass rather than a dial: time, without curves.
  clock: <path d="M3.5 2.5h9M3.5 13.5h9M4.5 2.5V5L8 8l3.5-3V2.5M4.5 13.5V11L8 8l3.5 3v2.5" />,
  layers: <path d="M8 2 14 5 8 8 2 5ZM2 8l6 3 6-3M2 11l6 3 6-3" />,
  tag: <path d="M2.5 2.5h6l5 5-6 6-5-5ZM5 5h1.5v1.5H5Z" />,
  frame: <path d="M2.5 6V2.5H6M10 2.5h3.5V6M13.5 10v3.5H10M6 13.5H2.5V10M6.5 6.5h3v3h-3Z" />,
  message: <path d="M2.5 3h11v8H8l-3 2.5V11H2.5Z" />,
  flag: <path d="M3.5 14.5v-12M3.5 3h9l-2 3 2 3h-9" />,
  users: <path d="M2.5 5.5h7v7h-7ZM6.5 3.5h7v7" />,
  contact: <path d="M8 1.5v4M8 10.5v4M1.5 8h4M10.5 8h4M6.5 6.5h3v3h-3Z" />,
  download: <path d="M8 2.5v8M4.5 7 8 10.5 11.5 7M2.5 13.5h11" />,
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg className="icon" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
