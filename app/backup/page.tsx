"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { exportBackup, importBackup } from "../../lib/local-store";

export default function BackupPage() {
  const [count, setCount] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => { setCount(Object.keys(exportBackup().data).length); }, []);

  function download() {
    const backup = exportBackup();
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `shepherds-desk-backup-${backup.exportedAt.slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setMessage("Backup downloaded.");
  }

  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!window.confirm("Restoring replaces any matching notes, sermons, and lists in this browser with the ones in the backup. Continue?")) return;
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch {
      setMessage("That file couldn't be read as a backup.");
      return;
    }
    const result = importBackup(parsed);
    setMessage(result.error ?? `Restored ${result.restored} item${result.restored === 1 ? "" : "s"}.`);
    setCount(Object.keys(exportBackup().data).length);
  }

  return (
    <main className="workspace-shell">
      <p className="eyebrow">Your data</p>
      <h1>Keep a copy.</h1>
      <p className="workspace-intro">
        Shepherd&apos;s Desk has no accounts. Your notes, highlights, sermons, journal, prayers, memory verses,
        and reading plan are saved only in this browser. Download a backup to keep them safe or move them to another device.
      </p>
      <div className="backup-actions">
        <button className="save-button" type="button" onClick={download}>Download backup</button>
        <label className="quiet-button backup-restore">
          Restore from backup
          <input type="file" accept="application/json,.json" onChange={(event) => void restore(event)} />
        </label>
      </div>
      {count !== null && <p className="workspace-message">{count === 0 ? "Nothing is saved in this browser yet." : `${count} saved collection${count === 1 ? "" : "s"} in this browser.`}</p>}
      <p className="workspace-message" role="status">{message}</p>
      <p className="access-note">Clearing your browser&apos;s site data deletes everything saved here. Back up regularly.</p>
    </main>
  );
}
