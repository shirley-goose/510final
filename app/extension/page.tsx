import Link from 'next/link';
import { PetIcon } from '@/components/ui/PetDecorations';

export const metadata = { title: 'Get the Chrome Extension — Pet2Companion' };

const steps = [
  {
    num: '01',
    icon: '⬇️',
    title: 'Download the extension',
    desc: 'Click the button below to download the Pet2Companion extension as a zip file.',
    action: (
      <a
        href="/api/extension"
        download
        className="btn"
        style={{ marginTop: 10, fontSize: 14, padding: '10px 20px', display: 'inline-flex' }}
      >
        ⬇️ Download .zip
      </a>
    ),
  },
  {
    num: '02',
    icon: '📂',
    title: 'Unzip & open Chrome',
    desc: 'Unzip the file anywhere on your computer. Then go to chrome://extensions in Chrome.',
    highlight: 'chrome://extensions',
  },
  {
    num: '03',
    icon: '🔧',
    title: 'Enable Developer Mode',
    desc: 'Toggle "Developer mode" in the top-right corner, then click "Load unpacked" and select the unzipped folder.',
  },
  {
    num: '04',
    icon: '🐾',
    title: 'Pin & enjoy!',
    desc: 'Pin the Pet2Companion icon to your toolbar. Click it on any page to summon your floating companion!',
  },
];

export default function ExtensionPage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #d6eeff 0%, #ede8ff 100%)',
        borderRadius: 32,
        padding: '52px 40px 44px',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 32,
        alignItems: 'center',
      }}>
        <PetIcon icon="star"    size={44} style={{ position: 'absolute', top: 24, right: 260, opacity: 0.35, pointerEvents: 'none' }} />
        <PetIcon icon="sparkle" size={32} style={{ position: 'absolute', bottom: 28, left: '48%', opacity: 0.4, pointerEvents: 'none' }} />
        <PetIcon icon="paw"     size={64} style={{ position: 'absolute', top: 20, left: '52%', opacity: 0.1, transform: 'rotate(15deg)', pointerEvents: 'none' }} />

        <div style={{ maxWidth: 520, position: 'relative', zIndex: 1 }}>
          <span className="badge" style={{ marginBottom: 18, display: 'inline-flex', background: '#ede8ff', color: '#5a3fbf', borderColor: '#b8a6e8' }}>
            🧩 Chrome Extension
          </span>
          <h1 style={{ fontSize: 'clamp(32px, 5vw, 52px)', marginBottom: 16, color: '#1e1e2e' }}>
            Your pet floats on<br/>
            <span style={{ color: '#7c5cbf' }}>every website.</span>
          </h1>
          <p style={{ fontSize: 17, lineHeight: 1.7, color: '#5a5a6a', marginBottom: 28 }}>
            Install the free Chrome extension and your 3D companion will
            follow you across the entire web — Gmail, YouTube, GitHub, anywhere.
          </p>
          <a
            href="/api/extension"
            download
            className="btn"
            style={{ fontSize: 16, padding: '14px 28px', background: '#7c5cbf', boxShadow: '0 4px 0 #4a2d9c' }}
          >
            ⬇️ Download Extension (free)
          </a>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
          <PetIcon icon="catFull" size={150} className="deco-float"      style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.15))' }} />
          <PetIcon icon="rabbit"  size={100} className="deco-float-slow" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.12))', marginBottom: 16, animationDelay: '0.8s' }} />
        </div>
      </section>

      {/* ── Install steps ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 className="section-title" style={{ marginBottom: 8 }}>Install in 4 steps ✨</h2>
        <p style={{ color: '#7a7a8a', marginBottom: 24, fontSize: 16 }}>No Chrome Web Store needed — just load it directly.</p>

        <div className="grid-2">
          {steps.map(({ num, icon, title, desc, highlight, action }) => (
            <div key={num} className="card" style={{ display: 'flex', gap: 18, alignItems: 'flex-start' }}>
              <div style={{
                minWidth: 48, height: 48,
                borderRadius: 14,
                background: 'linear-gradient(135deg, #fff3e6, #fdecd8)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 24,
                flexShrink: 0,
              }}>
                {icon}
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#ff8c2a', letterSpacing: 1, marginBottom: 4 }}>
                  STEP {num}
                </div>
                <h3 style={{ fontSize: 16, fontFamily: 'Nunito, sans-serif', fontWeight: 800, marginBottom: 6 }}>{title}</h3>
                <p style={{ fontSize: 14, color: '#5a5a6a', lineHeight: 1.65 }}>
                  {desc}
                  {highlight && (
                    <> <code style={{
                      background: '#f0f0f8', padding: '2px 8px', borderRadius: 6,
                      fontFamily: 'monospace', fontSize: 13, color: '#5a3fbf',
                    }}>{highlight}</code></>
                  )}
                </p>
                {action}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Prerequisite note ── */}
      <section className="card card-blue" style={{ marginBottom: 28, display: 'flex', gap: 20, alignItems: 'flex-start' }}>
        <PetIcon icon="dog" size={64} style={{ flexShrink: 0 }} />
        <div>
          <h3 style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 18, marginBottom: 8 }}>
            First time? Create your pet first 🐶
          </h3>
          <p style={{ fontSize: 15, color: '#5a5a6a', lineHeight: 1.7, marginBottom: 14 }}>
            The extension shows your personal 3D companion. You need to sign in and
            generate at least one pet before the extension will display anything.
          </p>
          <Link href="/upload" className="btn" style={{ fontSize: 14, padding: '10px 20px' }}>
            🐾 Create My Pet
          </Link>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 className="section-title" style={{ marginBottom: 20, fontSize: 24 }}>Quick FAQ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            {
              q: 'Why do I need to load it manually?',
              a: "We're still waiting on Chrome Web Store review. Loading unpacked works identically — it's the same extension.",
            },
            {
              q: 'Will my pet remember its position?',
              a: 'Yes! Your pet\'s position is saved per-browser. It will appear in the same spot next time.',
            },
            {
              q: 'Does it slow down browsing?',
              a: 'Nope. The extension only activates when you toggle it on. The 3D rendering is GPU-accelerated.',
            },
            {
              q: 'Can I use it on multiple computers?',
              a: 'Yes. Log in to Pet2Companion on each browser and install the extension — same pet, everywhere.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="card" style={{ padding: '18px 24px' }}>
              <p style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 800, fontSize: 15, marginBottom: 6 }}>
                {q}
              </p>
              <p style={{ fontSize: 14, color: '#5a5a6a', lineHeight: 1.65 }}>{a}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
