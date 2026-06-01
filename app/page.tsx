import Link from 'next/link';
import {
  DogSitting,
  DogRunning,
  CatSitting,
  PawPrint,
  Bone,
  Star,
} from '@/components/ui/PetDecorations';

export default function HomePage() {
  return (
    <main>
      {/* ── Hero ── */}
      <section style={{
        background: 'linear-gradient(135deg, #fff3e6 0%, #d6eeff 100%)',
        borderRadius: 32,
        padding: '56px 40px 40px',
        marginBottom: 28,
        border: '2px solid #f8d9b8',
        position: 'relative',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: '1fr auto',
        gap: 24,
        alignItems: 'center',
      }}>
        {/* Background decorations */}
        <PawPrint size={80} color="#ffb56a" className="deco" style={{ position: 'absolute', top: 16, right: 260, opacity: 0.18, transform: 'rotate(20deg)' } as React.CSSProperties} />
        <Star size={28} color="#ffd166" className="deco" style={{ position: 'absolute', top: 32, left: '55%', opacity: 0.5 } as React.CSSProperties} />
        <Star size={18} color="#ffb56a" className="deco" style={{ position: 'absolute', bottom: 40, left: '48%', opacity: 0.4 } as React.CSSProperties} />
        <Bone size={56} color="#ffe0b8" className="deco" style={{ position: 'absolute', bottom: 20, right: 280, opacity: 0.35, transform: 'rotate(-15deg)' } as React.CSSProperties} />

        <div style={{ maxWidth: 520, position: 'relative', zIndex: 1 }}>
          <span className="badge" style={{ marginBottom: 20, display: 'inline-flex' }}>✨ Now in 3D!</span>
          <h1 style={{ fontSize: 'clamp(36px, 6vw, 60px)', marginBottom: 18, color: '#1e1e2e' }}>
            Your pet,<br/>
            <span style={{ color: '#ff8c2a' }}>alive & floating</span><br/>
            on your screen.
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.7, color: '#5a5a6a', marginBottom: 32 }}>
            Upload 1–5 photos of your pet and we&apos;ll generate a 3D companion that floats above your screen — it sleeps, wanders, chases its tail, and comes to find you! 🐶
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

        {/* Hero illustration */}
        <div style={{ display: 'flex', gap: 0, alignItems: 'flex-end', position: 'relative', zIndex: 1 }}>
          <DogSitting size={160} color="#c8915a" className="deco deco-float" />
          <CatSitting size={110} color="#9b8ec4" className="deco deco-float-slow" style={{ marginBottom: 12 } as React.CSSProperties} />
        </div>
      </section>

      {/* ── Behaviors ── */}
      <section style={{ marginBottom: 28 }}>
        <h2 className="section-title" style={{ marginBottom: 6 }}>What your companion does 🎉</h2>
        <p style={{ color: '#7a7a8a', marginBottom: 20, fontSize: 16 }}>Your 3D pet has a life of its own.</p>
        <div className="grid-3">
          {[
            { icon: '😴', title: 'Falls asleep', desc: 'Leave it alone for 5 min and it curls up for a nap.', bg: 'card-blue' },
            { icon: '🚶', title: 'Goes for walks', desc: 'Wanders to random corners of your screen on its own.', bg: 'card-peach' },
            { icon: '🌀', title: 'Chases its tail', desc: 'Spins around excitedly when it gets bored.', bg: 'card-purple' },
            { icon: '🥰', title: 'Rolls around', desc: 'Tumbles and rolls when it wants your attention.', bg: 'card-blue' },
            { icon: '🏃', title: 'Finds you', desc: 'Ignore it for 40 min and it runs to find your cursor.', bg: 'card-peach' },
            { icon: '🖱️', title: 'Follows you', desc: 'Move your mouse and it trots along behind you.', bg: 'card-purple' },
          ].map(({ icon, title, desc, bg }) => (
            <div key={title} className={`card ${bg}`} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <span style={{ fontSize: 32 }}>{icon}</span>
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
        <DogRunning size={130} color="#d4a96a" className="deco" style={{ position: 'absolute', right: 24, bottom: 0, opacity: 0.18 } as React.CSSProperties} />
        <PawPrint size={50} color="#ffb56a" className="deco" style={{ position: 'absolute', left: 24, bottom: 24, opacity: 0.12, transform: 'rotate(-10deg)' } as React.CSSProperties} />

        <h2 className="section-title" style={{ marginBottom: 28 }}>How it works 🛠️</h2>
        <div className="grid-3">
          {[
            { num: '01', title: 'Upload photos', desc: 'Share 1–5 clear photos of your pet from different angles.' },
            { num: '02', title: 'AI builds it', desc: 'Our AI converts your photos into a detailed 3D model.' },
            { num: '03', title: 'It floats!', desc: 'Your 3D pet appears on screen and starts living its life.' },
          ].map(({ num, title, desc }) => (
            <div key={num} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <span style={{
                fontFamily: 'Nunito, sans-serif',
                fontWeight: 900,
                fontSize: 48,
                color: '#ff8c2a',
                lineHeight: 1,
              }}>{num}</span>
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
        padding: '40px 32px',
        textAlign: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}>
        <Star size={32} color="rgba(255,255,255,0.4)" className="deco" style={{ position: 'absolute', top: 16, left: 40 } as React.CSSProperties} />
        <Star size={20} color="rgba(255,255,255,0.3)" className="deco" style={{ position: 'absolute', bottom: 16, right: 60 } as React.CSSProperties} />
        <PawPrint size={60} color="rgba(255,255,255,0.15)" className="deco" style={{ position: 'absolute', right: 32, top: 20 } as React.CSSProperties} />
        <PawPrint size={44} color="rgba(255,255,255,0.1)" className="deco" style={{ position: 'absolute', left: 32, bottom: 16 } as React.CSSProperties} />
        <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', color: 'white', marginBottom: 12, fontFamily: 'Nunito, sans-serif', fontWeight: 900 }}>
          Ready to meet your 3D companion?
        </h2>
        <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: 16, marginBottom: 28 }}>
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
