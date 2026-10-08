"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function SiteNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);

  // Offer "Install app" when the browser says the PWA can be installed.
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as InstallPromptEvent); };
    const onInstalled = () => setInstallPrompt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  // Fold the menu away after navigating or pressing Escape.
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <nav className={open ? "site-nav open" : "site-nav"} aria-label="Primary">
      <Link className="site-nav-brand" href="/"><img src="/logo.svg" alt="" width={28} height={28} />Shepherd&apos;s Desk</Link>
      <button
        className="site-nav-toggle"
        type="button"
        aria-expanded={open}
        aria-controls="site-nav-links"
        aria-label={open ? "Close menu" : "Open menu"}
        onClick={() => setOpen((value) => !value)}
      >
        <span /><span /><span />
      </button>
      <div className="site-nav-links" id="site-nav-links">
        <Link href="/read/psalm/23">Read</Link>
        <Link href="/dictionary">Dictionary</Link>
        <Link href="/sermon-notes">Sermon notes</Link>
        <Link href="/reading-plan">Reading plan</Link>
        <Link href="/backup">Backup</Link>
        {installPrompt && <button className="install-button" type="button" onClick={() => void install()}>Install app</button>}
      </div>
    </nav>
  );
}
