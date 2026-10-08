alter table public.sermon_notes
  add column if not exists series text not null default '';
