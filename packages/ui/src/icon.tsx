import type { ReactNode, SVGProps } from 'react';
import { cn } from './cn.js';

/**
 * Lumio icon set: 24px grid, 1.75 stroke, round caps.
 * Icons replace emoji everywhere in the back office so the interface reads the
 * same on every OS and inherits the current text colour (light and dark).
 */
const ICONS = {
  home: <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z" />,
  file: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </>
  ),
  'file-text': (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9 13h6M9 17h4" />
    </>
  ),
  pen: (
    <>
      <path d="M4 20h4L18.5 9.5a2.12 2.12 0 0 0-3-3L5 17z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.6 7 8.4 5.8L20.4 7" />
    </>
  ),
  image: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2.5" />
      <circle cx="8.5" cy="9.5" r="1.5" />
      <path d="m20.5 15.5-4.5-4.5L6 20" />
    </>
  ),
  package: (
    <>
      <path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z" />
      <path d="m4 7.5 8 4.5 8-4.5" />
      <path d="M12 12v9" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-3-2V4a1 1 0 0 1 1-1z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </>
  ),
  palette: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h3.5A5.5 5.5 0 0 0 21 6.5C19.4 4.3 16 3 12 3z" />
      <circle cx="8" cy="8.5" r="1" />
      <circle cx="7.5" cy="13" r="1" />
      <circle cx="11" cy="6" r="1" />
    </>
  ),
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2 5.5-5.5 2 2-5.5z" />
    </>
  ),
  layout: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </>
  ),
  layers: (
    <>
      <path d="m12 3 9 4.5-9 4.5-9-4.5z" />
      <path d="m3 12.5 9 4.5 9-4.5" />
      <path d="m3 17 9 4.5 9-4.5" />
    </>
  ),
  folder: (
    <path d="M4 6a2 2 0 0 1 2-2h3.5l2 2.5H18a2 2 0 0 1 2 2V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" />
  ),
  grid: (
    <>
      <rect x="4" y="4" width="7" height="7" rx="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" />
    </>
  ),
  'trending-up': (
    <>
      <path d="m3 17 6-6 4 4 8-8" />
      <path d="M15 7h6v6" />
    </>
  ),
  'chart-bar': <path d="M4 19v-6M10 19V5M16 19v-9M3 19h18" />,
  send: (
    <>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3 14.5 21l-3.5-8-8-3.5z" />
    </>
  ),
  'app-window': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 9h18" />
      <path d="M6.5 6.5h.01M9.5 6.5h.01" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6h.09A1.65 1.65 0 0 0 10.5 3.1V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </>
  ),
  globe: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-1.5a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4V20" />
      <circle cx="9.5" cy="7" r="3.5" />
      <path d="M17 4.5a3.5 3.5 0 0 1 0 6.8" />
      <path d="M21 20v-1.5a4 4 0 0 0-3-3.87" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </>
  ),
  'shopping-bag': (
    <>
      <path d="M5.5 8h13l.9 11.4a1 1 0 0 1-1 1.1H5.6a1 1 0 0 1-1-1.1z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  cart: (
    <>
      <circle cx="9.5" cy="19.5" r="1.5" />
      <circle cx="18" cy="19.5" r="1.5" />
      <path d="M2 4h3l2.5 10.5A1.5 1.5 0 0 0 9 15.7h9a1.5 1.5 0 0 0 1.5-1.2L22 7H6" />
    </>
  ),
  'credit-card': (
    <>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <path d="M2.5 10h19" />
      <path d="M6 15h3" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h12" />
      <path d="M16 13h.01" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  'eye-off': (
    <>
      <path d="M10.6 5.2A9.6 9.6 0 0 1 12 5c6.5 0 10 7 10 7a17 17 0 0 1-3 4" />
      <path d="M6.3 6.8A17 17 0 0 0 2 12s3.5 7 10 7a9.7 9.7 0 0 0 4-.8" />
      <path d="M3 3l18 18" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="m6 7 1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  save: (
    <>
      <path d="M5 4h11l3 3v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" />
      <path d="M8 4v5h7" />
      <path d="M8 20v-6h8v6" />
    </>
  ),
  undo: (
    <>
      <path d="M3 8h10a6 6 0 0 1 0 12H7" />
      <path d="m7 4-4 4 4 4" />
    </>
  ),
  redo: (
    <>
      <path d="M21 8H11a6 6 0 0 0 0 12h6" />
      <path d="m17 4 4 4-4 4" />
    </>
  ),
  'arrow-up': (
    <>
      <path d="M12 20V4" />
      <path d="m5 11 7-7 7 7" />
    </>
  ),
  'arrow-down': (
    <>
      <path d="M12 4v16" />
      <path d="m19 13-7 7-7-7" />
    </>
  ),
  'arrow-right': (
    <>
      <path d="M4 12h16" />
      <path d="m13 5 7 7-7 7" />
    </>
  ),
  'arrow-left': (
    <>
      <path d="M20 12H4" />
      <path d="m11 5-7 7 7 7" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  check: <path d="m4.5 12.5 5 5L20 7" />,
  circle: <circle cx="12" cy="12" r="8" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'chevron-up': <path d="m6 15 6-6 6 6" />,
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-left': <path d="m15 6-6 6 6 6" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  upload: (
    <>
      <path d="M12 16V4" />
      <path d="m7 9 5-5 5 5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  download: (
    <>
      <path d="M12 4v12" />
      <path d="m7 11 5 5 5-5" />
      <path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" />
    </>
  ),
  'external-link': (
    <>
      <path d="M14 4h6v6" />
      <path d="M20 4 11 13" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M19 5l-1.5 1.5M6.5 17.5 5 19" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  'alert-triangle': (
    <>
      <path d="M10.3 4.3 2.6 18a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 4.3a2 2 0 0 0-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </>
  ),
  'alert-circle': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4 2v-8z" />,
  refresh: (
    <>
      <path d="M20 11a8 8 0 0 0-13.7-5.3L3 9" />
      <path d="M3 4v5h5" />
      <path d="M4 13a8 8 0 0 0 13.7 5.3L21 15" />
      <path d="M21 20v-5h-5" />
    </>
  ),
  'log-out': (
    <>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="m10 8-4 4 4 4" />
      <path d="M6 12h9" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 8-8" />
      <path d="m16 7 2 2M14 9l2 2" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v6c0 4.5 3 7.7 7 9 4-1.3 7-4.5 7-9V6z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  zap: <path d="M13 3 5 14h6l-1 7 8-11h-6z" />,
  book: (
    <>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
      <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5z" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M15 6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2" />
    </>
  ),
  star: <path d="m12 3.5 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 10l6.1-.9z" />,
  link: (
    <>
      <path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.3 1.3" />
      <path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.3-1.3" />
    </>
  ),
  type: (
    <>
      <path d="M5 6V4h14v2" />
      <path d="M12 4v16" />
      <path d="M9 20h6" />
    </>
  ),
  'align-left': <path d="M4 6h16M4 10h10M4 14h16M4 18h7" />,
  monitor: (
    <>
      <rect x="2.5" y="4" width="19" height="13" rx="2" />
      <path d="M9 21h6M12 17v4" />
    </>
  ),
  tablet: (
    <>
      <rect x="5" y="2.5" width="14" height="19" rx="2" />
      <path d="M12 18h.01" />
    </>
  ),
  smartphone: (
    <>
      <rect x="7" y="2.5" width="10" height="19" rx="2" />
      <path d="M12 18h.01" />
    </>
  ),
  sparkles: (
    <>
      <path d="m11 3 1.7 4.8 4.8 1.7-4.8 1.7L11 16l-1.7-4.8L4.5 9.5l4.8-1.7z" />
      <path d="m18.5 15 .9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" />
    </>
  ),
  grip: <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" strokeWidth={2.4} />,
  move: (
    <>
      <path d="M12 3v18M3 12h18" />
      <path d="m9 6 3-3 3 3M9 18l3 3 3-3M6 9l-3 3 3 3M18 9l3 3-3 3" />
    </>
  ),
  'more-vertical': <path d="M12 5h.01M12 12h.01M12 19h.01" strokeWidth={2.4} />,
  inbox: (
    <>
      <path d="M4 13h4l1.5 2.5h5L16 13h4" />
      <path d="M6 4h12l2 9v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-5z" />
    </>
  ),
  qr: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1" />
      <rect x="14" y="4" width="6" height="6" rx="1" />
      <rect x="4" y="14" width="6" height="6" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v6h-3" />
    </>
  ),
  tag: (
    <>
      <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
      <path d="M7.5 7.5h.01" />
    </>
  ),
  bell: (
    <>
      <path d="M18 15V9a6 6 0 0 0-12 0v6l-1.5 2.5h15z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2.5" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  list: (
    <>
      <path d="M8 6h12M8 12h12M8 18h12" />
      <path d="M4 6h.01M4 12h.01M4 18h.01" />
    </>
  ),
  archive: (
    <>
      <rect x="3" y="4" width="18" height="4.5" rx="1.5" />
      <path d="M5 8.5V19a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8.5" />
      <path d="M10 12.5h4" />
    </>
  ),
  crop: (
    <>
      <path d="M6 3v13a2 2 0 0 0 2 2h13" />
      <path d="M3 6h13a2 2 0 0 1 2 2v13" />
    </>
  ),
  'map-pin': (
    <>
      <path d="M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  play: <path d="M8 5.5v13l11-6.5z" />,
  'panel-left': (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M9 4v16" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;

export interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  /** Pixel size of the square icon (defaults to 20). */
  size?: number | string;
  /** Accessible name. Omit when the surrounding text already names the action. */
  label?: string;
}

/** Crisp line icon that inherits `currentColor`, so it works in light and dark. */
export const Icon = ({
  name,
  size = 20,
  label,
  strokeWidth = 1.75,
  className,
  ...rest
}: IconProps) => (
  <svg
    className={cn('ui-icon', className)}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    role={label ? 'img' : undefined}
    aria-hidden={label ? undefined : true}
    focusable="false"
    {...rest}
  >
    {label ? <title>{label}</title> : null}
    {ICONS[name]}
  </svg>
);
