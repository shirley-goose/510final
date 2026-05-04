import './globals.css';
import type { Metadata } from 'next';
import dynamic from 'next/dynamic';

const CompanionOverlayLazy = dynamic(
  () => import('@/components/companion-overlay/CompanionOverlay'),
  { ssr: false }
);

export const metadata: Metadata = {
  title: 'Pet2Companion',
  description: 'Upload pet photos to create a 3D desktop companion.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
        <CompanionOverlayLazy />
      </body>
    </html>
  );
}
