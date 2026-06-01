import Link from 'next/link';
import { PetIcon } from '@/components/ui/PetDecorations';

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #fff3e6 0%, #d6eeff 100%)',
        borderRadius: 32,
        padding: '56px 40px 48px',
        marginBottom: 28,
        border: '2px solid #f8d9b8',
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 32,
        alignItems: 'center',
      }}>
        {/* Background decorations */}
        <PetIcon icon="paw"     size={72} style={{ position: 'absolute', top: 20, right: 280, opacity: 0.12, transform: 'rotate(20deg)', pointerEvents: 'none' }} />
        <PetIcon icon="star"    size={36} style={{ position: 'absolute', top: 24, left: '52%', opacity: 0.45, pointerEvents: 'none' }} />
        <PetIcon icon="bone"    size={52} style={{ position: 'absolute', bottom: 24, right: 300, opacity: 0.15, transform: 'rotate(-20deg)', pointerEvents: 'none' }} />
        <PetIcon icon="sparkle" size={28} style={{ position: 'absolute', bottom: 32, left: '46%', opacity: 0.4, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 520, position: 'relative', zIndex: 1 }}>
          <span className="badge" style={{ marginBottom: 20, display: 'inline-flex' }}>✨ Now in 3D!</span>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', marginBottom: 18, color: '#1e1e2e' }}>
            Your pet,<br/>
            <span style={{ color: '#ff8c2a' }}>alive & floating</span><br/>
            on your screen.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: '#5a5a6a', marginBottom: 32 }}>
            Upload 1–5 photos of your pet and we&apos;ll generate a 3D companion
            that floats above your screen — it sleeps, wanders, chases its tail,
            and comes to find you! 🐶
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link href="/upload" className="btn" style={{ fontSize: 16, padding: '14px 28px' }}>
              🐾 Upload Photos
            </Link>
            <Link href="/dashboard" className="btn secondary" style={{ fontSize: 16, padding: '14px 28px' }}>
              My Companions
            </Link>
          </div>
        </div>

        {/* Hero pet illustrations */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
          <PetIcon icon="dogFull" size={160} className="deco-float"      style={{ filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.15))' }} />
          <PetIcon icon="catFull" size={120} className="deco-float-slow" style={{ filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.12))', marginBottom: 16 }} />
          <PetIcon icon="rabbit"  size={88}  className="deco-float"      style={{ filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.10))', marginBottom: 28, animationDelay: '1s' }} />
        </div>
      </section>

      {/* ── Behaviors ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 className="section-title" style={{ marginBottom: 6 }}>What your companion does 🎉</h2>
        <p style={{ color: '#7a7a8a', marginBottom: 20, fontSize: 16 }}>Your 3D pet has a life of its own.</p>
        <div className="grid-3">
          {[
            { icon: 'sleep'   as const, title: 'Falls asleep',   desc: 'Leave it alone for 5 min and it curls up for a nap.',   bg: 'card-blue'   },
            { icon: 'paw'     as const, title: 'Goes for walks',  desc: 'Wanders to random corners of your screen on its own.', bg: 'card-peach'  },
            { icon: 'cat'     as const, title: 'Chases its tail', desc: 'Spins around excitedly when it gets bored.',            bg: 'card-purple' },
            { icon: 'heart'   as const, title: 'Rolls around',    desc: 'Tumbles and rolls when it wants your attention.',       bg: 'card-blue'   },
            { icon: 'dog'     as const, title: 'Finds you',       desc: 'Ignore it for 40 min and it runs to find you.',        bg: 'card-peach'  },
            { icon: 'sparkle' as const, title: 'Drag anywhere',   desc: 'Pick it up and drop it wherever you want on screen.',  bg: 'card-purple' },
          ].map(({ icon, title, desc, bg }) => (
            <div key={title} className={`card ${bg}`} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <PetIcon icon={icon} size={52} />
              <h3 style={{ fontSize: 17, fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#5a5a6a', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section style={{
        background: 'white',
        borderRadius: 28,
        padding: '36px 32px',
        border: '2px solid #f8d9b8',
        marginBottom: 28,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <PetIcon icon="hamster" size={110} style={{ position: 'absolute', right: 32, bottom: 0, opacity: 0.13, pointerEvents: 'none' }} />
        <PetIcon icon="paw"     size={48}  style={{ position: 'absolute', left: 32, bottom: 32, opacity: 0.1, transform: 'rotate(-10deg)', pointerEvents: 'none' }} />

        <h2 className="section-title" style={{ marginBottom: 32 }}>How it works 🛠️</h2>
        <div className="grid-3">
          {[
            { num: '01', icon: 'dog'     as const, title: 'Upload photos', desc: 'Share 1–5 clear photos of your pet from different angles.' },
            { num: '02', icon: 'sparkle' as const, title: 'AI builds it',  desc: 'Our AI converts your photos into a detailed 3D model.'    },
            { num: '03', icon: 'heart'   as const, title: 'It floats!',    desc: 'Your 3D pet appears on screen and starts living its life.' },
          ].map(({ num, icon, title, desc }) => (
            <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontFamily: 'Nunito, sans-serif', fontWeight: 900, fontSize: 52, color: '#ff8c2a', lineHeight: 1 }}>{num}</span>
                <PetIcon icon={icon} size={52} />
              </div>
              <h3 style={{ fontSize: 18, fontFamily: 'Nunito, sans-serif', fontWeight: 800 }}>{title}</h3>
              <p style={{ fontSize: 14, color: '#7a7a8a', lineHeight: 1.6 }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{
        background: 'linear-gradient(135deg, #ff8c2a, #ffb56a)',
        borderRadius: 28,
        padding: '48px 32px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <PetIcon icon="bear"    size={80} style={{ position: 'absolute', top: 12, left: 32,   opacity: 0.22, pointerEvents: 'none' }} />
        <PetIcon icon="rabbit"  size={72} style={{ position: 'absolute', top: 12, right: 32,  opacity: 0.22, pointerEvents: 'none' }} />
        <PetIcon icon="bone"    size={44} style={{ position: 'absolute', bottom: 16, left: 80,  opacity: 0.18, pointerEvents: 'none', transform: 'rotate(20deg)' }} />
        <PetIcon icon="balloon" size={44} style={{ position: 'absolute', bottom: 16, right: 80, opacity: 0.18, pointerEvents: 'none' }} />

        <PetIcon icon="party" size={56} style={{ margin: '0 auto 16px', filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' }} />
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', color: 'white', marginBottom: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 900 }}>
          Ready to meet your 3D companion?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.88)', fontSize: 16, marginBottom: 32 }}>
          Upload photos of your pet and bring them to life in minutes.
        </p>
        <Link href="/upload" className="btn" style={{
          background: 'white',
          color: '#ff8c2a',
          fontSize: 17,
          padding: '16px 36px',
          boxShadow: '0 4px 0 rgba(0,0,0,0.15)',
        }}>
          🐾 Get Started Free
        </Link>
      </section>
    </main>
  );
}
