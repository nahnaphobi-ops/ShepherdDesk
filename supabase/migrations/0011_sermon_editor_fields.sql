alter table public.sermon_notes
  add column if not exists passage_label text not null default '',
  add column if not exists big_idea text not null default '',
  add column if not exists application text not null default '';
