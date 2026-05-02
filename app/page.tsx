export default function HomePage() {
  return (
    <main>
      <div className="card" style={{ display: 'grid', gap: 16 }}>
        <span className="badge">Pet2Companion</span>
        <h1 style={{ fontSize: 42, margin: 0 }}>Turn pet photos into a desktop companion.</h1>
        <p style={{ fontSize: 18, margin: 0 }}>
          Start by uploading 1–5 photos of your pet. We validate file types and sizes,
          then store them securely in Supabase.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a className="btn" href="/upload">Upload Photos</a>
          <a className="btn secondary" href="/login">Sign In</a>
        </div>
      </div>
    </main>
  );
}
