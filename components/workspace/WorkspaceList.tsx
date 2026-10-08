"use client";

import { FormEvent, useEffect, useState } from "react";
import { newId, readList, writeList, type ListItem } from "../../lib/local-store";

type WorkspaceListProps = { list: string; title: string; description: string; placeholder: string };

export function WorkspaceList({ list, title, description, placeholder }: WorkspaceListProps) {
  const [items, setItems] = useState<ListItem[]>([]);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => { setItems(readList(list)); }, [list]);

  function save(next: ListItem[]): boolean {
    if (!writeList(list, next)) { setMessage("This browser is blocking storage, so entries can't be saved."); return false; }
    setItems(next);
    return true;
  }

  function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!value.trim()) return;
    if (save([{ id: newId(), text: value.trim(), created_at: new Date().toISOString() }, ...items])) {
      setValue(""); setMessage("Saved in this browser");
    }
  }

  return <main className="workspace-shell"><p className="eyebrow">Shepherd&apos;s Desk</p><h1>{title}</h1><p className="workspace-intro">{description}</p><form className="workspace-form" onSubmit={add}><label htmlFor={`${list}-entry`}>{placeholder}</label><textarea id={`${list}-entry`} value={value} onChange={(event) => setValue(event.target.value)} rows={5} /><button className="save-button" type="submit">Add entry</button></form><p className="workspace-message" role="status">{message}</p><section className="workspace-items" aria-live="polite">{items.length === 0 ? <p className="dictionary-empty">No entries yet.</p> : items.map((item) => <article className="workspace-item" key={item.id}><p>{item.text}</p><button type="button" onClick={() => save(items.filter((entry) => entry.id !== item.id))}>Remove</button></article>)}</section></main>;
}
