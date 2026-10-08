export const metadata = { title: "Offline · Shepherd's Desk" };

export default function OfflinePage() {
  return (
    <main className="shell">
      <p className="eyebrow">You&apos;re offline</p>
      <h1>The desk is still here.</h1>
      <p className="lede">
        This page hasn&apos;t been saved for offline use yet. Chapters you&apos;ve already opened
        will keep working; reconnect to reach everything else.
      </p>
    </main>
  );
}
