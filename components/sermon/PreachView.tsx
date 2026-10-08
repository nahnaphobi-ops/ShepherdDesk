"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { sermonWordCount } from "../../lib/sermon-export";
import { getSermon, toPoints, type SermonPoint, type SermonRecord } from "../../lib/sermon-store";
import { usePassageStudy, useVerseText } from "./passage-data";

const paragraphs = (value: string) => value.split(/\n{2,}/).filter((item) => item.trim()).map((item, index) => <p key={index}>{item}</p>);

function PreachVerse({ reference }: { reference: string }) {
  const text = useVerseText(reference, "BSB");
  return <li><strong>{reference}</strong>{text && <> — {text}</>}</li>;
}

function formatTime(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function PreachView({ id }: { id: string }) {
  const [sermon, setSermon] = useState<SermonRecord | null | undefined>(undefined);
  const [points, setPoints] = useState<SermonPoint[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const study = usePassageStudy(sermon?.passage_label ?? "");

  useEffect(() => {
    const found = getSermon(id);
    setSermon(found);
    setPoints(found ? toPoints(found.key_points) : []);
  }, [id]);

  const passageReady = study !== "loading";
  const printRequested = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("print");
  useEffect(() => {
    // Print once the sermon and its passage text have rendered.
    if (!printRequested || !sermon || !passageReady) return;
    const timer = window.setTimeout(() => window.print(), 300);
    return () => window.clearTimeout(timer);
  }, [printRequested, sermon, passageReady]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => setElapsed((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [running]);

  if (sermon === undefined) return <main className="workspace-shell"><p className="dictionary-empty">Loading sermon...</p></main>;
  if (!sermon) return <main className="workspace-shell"><h1>Sermon not found</h1><p><Link href="/sermon-notes">Back to your sermons</Link></p></main>;

  const estimate = Math.max(1, Math.round(sermonWordCount(sermon, points) / 130)) * 60;
  const passage = study && study !== "loading" ? study.reading.translations.find((item) => item.code === "BSB") ?? study.reading.translations[0] : undefined;

  return (
    <main className="preach-shell">
      <div className="preach-toolbar">
        <Link className="text-link" href={`/sermon-notes/${id}`}>← Back to editing</Link>
        <div className="preach-timer" role="timer" aria-live="off">
          <span className={elapsed > estimate ? "over" : undefined}>{formatTime(elapsed)}</span>
          <span className="preach-estimate">/ about {formatTime(estimate)}</span>
          <button className="quiet-button" type="button" onClick={() => setRunning((value) => !value)}>{running ? "Pause" : elapsed ? "Resume" : "Start timer"}</button>
          {elapsed > 0 && <button className="quiet-button" type="button" onClick={() => { setRunning(false); setElapsed(0); }}>Reset</button>}
          <button className="quiet-button" type="button" onClick={() => window.print()}>Print / PDF</button>
        </div>
      </div>

      <article className="preach-sheet">
        {sermon.series && <p className="eyebrow">{sermon.series}</p>}
        <h1>{sermon.title}</h1>
        {sermon.passage_label && <p className="preach-passage-label">{sermon.passage_label}</p>}
        {sermon.big_idea && <p className="preach-big-idea">{sermon.big_idea}</p>}

        {passage && passage.verses.length > 0 && (
          <blockquote className="preach-scripture">
            {passage.verses.map(([verse, text]) => <span key={verse}><sup>{verse}</sup>{text.replace(/<\/?i>/g, "")} </span>)}
            <cite>{passage.code}</cite>
          </blockquote>
        )}

        {sermon.introduction && <section><h2>Introduction</h2>{paragraphs(sermon.introduction)}</section>}

        {points.map((point, index) => (
          <section className="preach-point" key={point.id}>
            <h2><span>{index + 1}</span> {point.heading || "Untitled point"}</h2>
            {point.subpoints.some(Boolean) && <ol className="preach-subpoints">{point.subpoints.filter(Boolean).map((item, i) => <li key={i}>{item}</li>)}</ol>}
            {paragraphs(point.notes)}
            {point.illustration && <p className="preach-illustration"><strong>Illustration</strong> {point.illustration}</p>}
            {point.verses.length > 0 && <ul className="preach-verses">{point.verses.map((reference) => <PreachVerse key={reference} reference={reference} />)}</ul>}
          </section>
        ))}

        {sermon.application && <section><h2>Application</h2>{paragraphs(sermon.application)}</section>}
        {sermon.conclusion && <section><h2>Conclusion</h2>{paragraphs(sermon.conclusion)}</section>}
      </article>
    </main>
  );
}
