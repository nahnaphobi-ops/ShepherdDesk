-- Allow Shepherd's Desk's own annotated entries alongside the public-domain dictionaries.
alter table public.dictionary_entries drop constraint if exists dictionary_entries_source_check;
alter table public.dictionary_entries
  add constraint dictionary_entries_source_check check (source in ('ISBE', 'Easton', 'Smith', 'Shepherd'));

-- Remove placeholder rows from the 0005 seed; real entries are ingested by scripts/ingest-bible-dictionaries.ts.
delete from public.dictionary_entries
where source in ('ISBE', 'Easton', 'Smith') and term in ('Shepherd', 'Covenant', 'Atonement')
  and body_text not like '%Source:%';
