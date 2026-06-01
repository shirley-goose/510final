import './globals.css';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const CompanionOverlayLazy = dynamic(
  () => import('@/components/companion-overlay/CompanionOverlay'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'Pet2Companion',
  description: 'Turn your pet photos into a living 3D desktop companion.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <nav className="site-nav">
          <Link href="/" className="site-nav-logo">
            🐾 Pet2Companion
          </Link>
          <div className="site-nav-links">
            <Link href="/dashboard" className="btn outline" style={{ padding: '8px 16px', fontSize: 14 }}>
              Dashboard
            </Link>
            <Link href="/upload" className="btn" style={{ padding: '8px 16px', fontSize: 14 }}>
              + New Pet
            </Link>
          </div>
        </nav>
        {children}
        <CompanionOverlayLazy />
      </body>
    </html>
  );
}
