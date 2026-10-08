export default function HomePage() {
  return (
    <main className="shell">
      <p className="eyebrow">Shepherd&apos;s Desk</p>
      <h1>Study with the text, not around it.</h1>
      <p className="lede">
        A personal Bible study workspace where translations, word studies, and
        notes stay together.
      </p>
      <div className="home-actions">
        <a className="button" href="/read/psalm/23">Open Psalm 23</a>
        <a className="text-link" href="/dictionary">Search the dictionary</a>
      </div>
      <p className="access-note">Free and open source. No account needed: your notes and sermons stay in this browser, and you can <a className="text-link" href="/backup">back them up</a> any time.</p>
    </main>
  );
}
