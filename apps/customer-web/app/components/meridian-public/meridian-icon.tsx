import type { MeridianIconName } from './data';

export function MeridianIcon({
  name,
  className = 'h-5 w-5',
}: {
  name: MeridianIconName;
  className?: string;
}) {
  let glyph;

  switch (name) {
    case 'arrow':
      glyph = (
        <>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </>
      );
      break;
    case 'broadcast':
      glyph = (
        <>
          <path d="M5.5 8.5a5 5 0 0 0 0 7" />
          <path d="M2.5 5.5a9 9 0 0 0 0 13" />
          <path d="M18.5 8.5a5 5 0 0 1 0 7" />
          <path d="M21.5 5.5a9 9 0 0 1 0 13" />
          <circle cx="12" cy="12" r="2" />
        </>
      );
      break;
    case 'building':
      glyph = (
        <>
          <path d="M4 21V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v17" />
          <path d="M16 9h3a1 1 0 0 1 1 1v11" />
          <path d="M2 21h20" />
          <path d="M8 7h4M8 11h4M8 15h4M8 19h4" />
        </>
      );
      break;
    case 'check':
      glyph = <path d="m5 12 4 4L19 6" />;
      break;
    case 'compass':
      glyph = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" />
        </>
      );
      break;
    case 'construction':
      glyph = (
        <>
          <path d="m14 5 5 5" />
          <path d="m12 7 5 5" />
          <path d="M4 20h16" />
          <path d="m6 18 8-8" />
          <path d="M5 5h6l-3 3-3-3Z" />
        </>
      );
      break;
    case 'document':
      glyph = (
        <>
          <path d="M6 2h8l4 4v16H6z" />
          <path d="M14 2v5h4" />
          <path d="M9 12h6M9 16h6" />
        </>
      );
      break;
    case 'droplet':
      glyph = <path d="M12 2S5.5 9.2 5.5 14.2a6.5 6.5 0 0 0 13 0C18.5 9.2 12 2 12 2Z" />;
      break;
    case 'help':
      glyph = (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.8 9a2.4 2.4 0 1 1 3.6 2.1c-.9.5-1.4 1.1-1.4 2.1" />
          <path d="M12 17h.01" />
        </>
      );
      break;
    case 'home':
      glyph = (
        <>
          <path d="m3 11 9-8 9 8" />
          <path d="M5 10v11h14V10" />
          <path d="M9 21v-7h6v7" />
        </>
      );
      break;
    case 'identity':
      glyph = (
        <>
          <rect x="3" y="4" width="18" height="16" rx="3" />
          <circle cx="9" cy="10" r="2.5" />
          <path d="M5.5 16c.8-1.7 2-2.5 3.5-2.5s2.7.8 3.5 2.5" />
          <path d="M15 9h3M15 13h3" />
        </>
      );
      break;
    case 'lock':
      glyph = (
        <>
          <rect x="4" y="10" width="16" height="11" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          <path d="M12 14v3" />
        </>
      );
      break;
    case 'market':
      glyph = (
        <>
          <path d="M4 10v10h16V10" />
          <path d="M3 4h18l-2 6H5L3 4Z" />
          <path d="M8 20v-6h5v6" />
          <path d="M7 4v6M12 4v6M17 4v6" />
        </>
      );
      break;
    case 'nodes':
      glyph = (
        <>
          <circle cx="6" cy="6" r="3" />
          <circle cx="18" cy="7" r="3" />
          <circle cx="12" cy="18" r="3" />
          <path d="m8.5 7.4 7 0.2M7.5 8.6l3 6.7M16.5 9.5l-3 5.8" />
        </>
      );
      break;
    case 'receipt':
      glyph = (
        <>
          <path d="M6 3h12v19l-3-2-3 2-3-2-3 2V3Z" />
          <path d="M9 8h6M9 12h6M9 16h4" />
        </>
      );
      break;
    case 'search':
      glyph = (
        <>
          <circle cx="11" cy="11" r="7" />
          <path d="m16.5 16.5 4 4" />
        </>
      );
      break;
    case 'shield':
      glyph = (
        <>
          <path d="M12 2 20 5v6c0 5.2-3.2 8.5-8 11-4.8-2.5-8-5.8-8-11V5l8-3Z" />
          <path d="m8.5 12 2.2 2.2 4.8-5" />
        </>
      );
      break;
    case 'spark':
      glyph = (
        <>
          <path d="m12 2 1.4 5.6L19 9l-5.6 1.4L12 16l-1.4-5.6L5 9l5.6-1.4L12 2Z" />
          <path d="m19 15 .7 2.3L22 18l-2.3.7L19 21l-.7-2.3L16 18l2.3-.7L19 15Z" />
        </>
      );
      break;
    case 'store':
      glyph = (
        <>
          <path d="M4 10v10h16V10" />
          <path d="m3 4 2 6c1.2 1.2 2.8 1.2 4 0 1.2 1.2 2.8 1.2 4 0 1.2 1.2 2.8 1.2 4 0 1.2 1.2 2.8 1.2 4 0l-2-6H3Z" />
          <path d="M9 20v-5h6v5" />
        </>
      );
      break;
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      focusable="false"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
    >
      {glyph}
    </svg>
  );
}
