"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { createSermon, listSermons, toPoints, type SermonRecord } from "../../lib/sermon-store";

function edited(timestamp: string): string {
  if (!timestamp) return "";
  const date = new Date(timestamp);
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days < 1) return "Edited today";
  if (days === 1) return "Edited yesterday";
  if (days < 7) return `Edited ${days} days ago`;
  return `Edited ${date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" })}`;
}

function searchText(sermon: SermonRecord): string {
  const points = toPoints(sermon.key_points).flatMap((point) => [point.heading, point.notes, point.illustration, ...point.subpoints, ...point.verses]);
  return [sermon.title, sermon.series, sermon.passage_label, sermon.big_idea, sermon.introduction, sermon.application, sermon.conclusion, ...points].join(" ").toLowerCase();
}

export default function SermonNotesPage() {
  const [title, setTitle] = useState("");
  const [reference, setReference] = useState("");
  const [series, setSeries] = useState("");
  const [sermons, setSermons] = useState<SermonRecord[]>([]);
  const [message, setMessage] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [seriesFilter, setSeriesFilter] = useState("");

  useEffect(() => {
    setSermons(listSermons());
    setLoaded(true);
  }, []);

  const allSeries = useMemo(() => [...new Set(sermons.map((item) => item.series).filter(Boolean))].sort(), [sermons]);
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sermons
      .filter((item) => (statusFilter === "all" ? true : statusFilter === "active" ? item.status !== "archived" : item.status === statusFilter))
      .filter((item) => !seriesFilter || item.series === seriesFilter)
      .filter((item) => !needle || searchText(item).includes(needle))
      .sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
  }, [sermons, query, statusFilter, seriesFilter]);

  function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = createSermon(title, reference, series);
    if (result.id) {
      window.location.href = `/sermon-notes/${result.id}`;
      return;
    }
    setMessage(result.error ?? "Could not create the sermon");
  }

  return (
    <main className="workspace-shell">
      <p className="eyebrow">Sermon preparation</p>
      <h1>Build the message.</h1>
      <p className="workspace-intro">Start from a passage, shape the outline, and keep the text beside you while you write.</p>
      <p className="workspace-message">Sermons are saved in this browser. <Link href="/backup">Back up your data</Link> to keep a copy or move it to another device.</p>
      <form className="workspace-form" onSubmit={create}>
        <label htmlFor="sermon-title">Sermon title</label>
        <input id="sermon-title" value={title} onChange={(event) => setTitle(event.target.value)} required />
        <label htmlFor="sermon-reference">Passage</label>
        <input id="sermon-reference" value={reference} onChange={(event) => setReference(event.target.value)} placeholder="John 3:1-21" />
        <label htmlFor="sermon-series">Series (optional)</label>
        <input id="sermon-series" list="sermon-series-options" value={series} onChange={(event) => setSeries(event.target.value)} placeholder="Psalms of Ascent" />
        <datalist id="sermon-series-options">{allSeries.map((item) => <option key={item} value={item} />)}</datalist>
        <button className="save-button" type="submit" disabled={!loaded}>Create sermon</button>
      </form>
      <p className="workspace-message" role="status">{message}</p>
      <section className="workspace-items">
        <h2>Your sermons</h2>
        {sermons.length > 0 && (
          <div className="sermon-filters">
            <label className="sr-only" htmlFor="sermon-search">Search sermons</label>
            <input id="sermon-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search titles, passages, notes..." />
            <label className="sr-only" htmlFor="sermon-status-filter">Status</label>
            <select id="sermon-status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="active">Drafts &amp; ready</option>
              <option value="draft">Drafts</option>
              <option value="ready">Ready</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
            {allSeries.length > 0 && (
              <>
                <label className="sr-only" htmlFor="sermon-series-filter">Series</label>
                <select id="sermon-series-filter" value={seriesFilter} onChange={(event) => setSeriesFilter(event.target.value)}>
                  <option value="">All series</option>
                  {allSeries.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </>
            )}
          </div>
        )}
        {loaded && sermons.length === 0 && <p className="dictionary-empty">No sermons yet.</p>}
        {sermons.length > 0 && visible.length === 0 && <p className="dictionary-empty">No sermons match.</p>}
        {visible.map((sermon) => (
          <Link className="sermon-card" href={`/sermon-notes/${sermon.id}`} key={sermon.id}>
            <div>
              <strong>{sermon.title}</strong>
              <span className="sermon-passage">
                {[sermon.series, sermon.passage_label || "No passage", edited(sermon.updated_at || sermon.created_at)].filter(Boolean).join(" · ")}
              </span>
              {sermon.big_idea && <p>{sermon.big_idea}</p>}
            </div>
            <span className={`status-pill status-${sermon.status}`}>{sermon.status}</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
