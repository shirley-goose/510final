import './globals.css';
import type { Metadata } from 'next';

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
      </body>
    </html>
  );
}
