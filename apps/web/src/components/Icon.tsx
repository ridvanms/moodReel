const PATHS = {
  lock: 'M7 11V8a5 5 0 0 1 10 0v3M5 11h14v10H5z',
  unlock: 'M7 11V8a5 5 0 0 1 9.6-2M5 11h14v10H5z',
  plus: 'M12 5v14M5 12h14',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z',
  shuffle: 'M3 7h4l10 10h4M3 17h4l3-3M14 10l3-3h4M18 4l3 3-3 3M18 14l3 3-3 3',
  close: 'M6 6l12 12M18 6L6 18',
  spark: 'M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18',
  bookmark: 'M6 3h12v18l-6-4-6 4z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  reel: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 9.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM12 17.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM7.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3zM16.5 13.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z',
  external: 'M14 4h6v6M20 4l-9 9M18 14v6H4V6h6',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM20 20l-4-4',
  menu: 'M4 7h16M4 12h16M4 17h16',
  chevron: 'M9 6l6 6-6 6',
  chevronDown: 'M6 9l6 6 6-6',
  orb: 'M12 20a8 8 0 1 0 0-16 8 8 0 0 0 0 16zM8.5 10a3.5 3.5 0 0 1 3.5-3M5 21h14',
  play: 'M7 4.5v15l12-7.5z',
  heart: 'M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z',
  sliders: 'M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0M14 4v4M8 10v4M16 16v4',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 18, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={PATHS[name]} />
    </svg>
  );
}
