alter table public.sermon_notes
  add column if not exists introduction text not null default '',
  add column if not exists conclusion text not null default '';
