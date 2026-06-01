import type { Metadata } from 'next';
import '../globals.css';

export const metadata: Metadata = {
  title: 'Pet2Companion Overlay',
};

/**
 * Minimal layout for the iframe overlay page.
 * Background must be transparent so only the pet shows.
 */
export default function PetOverlayLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <style>{`
          html, body {
            background: transparent !important;
            margin: 0;
            padding: 0;
            overflow: hidden;
            width: 100vw;
            height: 100vh;
          }
        `}</style>
      </head>
      <body style={{ background: 'transparent' }}>
        {children}
      </body>
    </html>
  );
}
