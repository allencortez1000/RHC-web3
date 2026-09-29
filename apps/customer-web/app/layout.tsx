import './globals.css';
import { Providers } from './providers';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'RHC', template: '%s | RHC' },
  description: 'One RHC account, one Digital ID, one connected ecosystem.',
  icons: {
    icon: '/images/rhc-token-front.png',
    shortcut: '/images/rhc-token-front.png',
    apple: '/images/rhc-token-front.png',
  },
};

const themeBootScript = `
(function () {
  try {
    var stored = window.localStorage.getItem('rhc-theme');
    var preference = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
    var theme = preference === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : preference;
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.themePreference = preference;
    document.documentElement.style.colorScheme = theme;
  } catch (error) {
    document.documentElement.dataset.theme = 'dark';
    document.documentElement.style.colorScheme = 'dark';
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body suppressHydrationWarning><Providers>{children}</Providers></body>
    </html>
  );
}
