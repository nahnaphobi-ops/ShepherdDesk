create extension if not exists vector;

create table public.scripture_references (
  id uuid primary key default gen_random_uuid(),
  book text not null,
  chapter integer not null check (chapter > 0),
  verse integer not null check (verse > 0),
  unique (book, chapter, verse)
);

create table public.translations (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  license_tier text not null check (license_tier in ('public_domain', 'free_noncommercial', 'licensed_commercial')),
  attribution_text text,
  source text,
  enabled boolean not null default false
);

create table public.verses (
  id uuid primary key default gen_random_uuid(),
  reference_id uuid not null references public.scripture_references(id),
  translation_id uuid not null references public.translations(id),
  text text not null,
  unique (reference_id, translation_id)
);
create index verses_reference_idx on public.verses(reference_id);
create index verses_translation_idx on public.verses(translation_id);

create table public.strongs_entries (
  id uuid primary key default gen_random_uuid(),
  strongs_number text unique not null,
  language text not null check (language in ('hebrew', 'greek')),
  transliteration text,
  gloss text,
  full_definition text
);

create table public.verse_word_tags (
  id uuid primary key default gen_random_uuid(),
  verse_id uuid not null references public.verses(id) on delete cascade,
  word_position integer not null check (word_position >= 0),
  surface_text text not null,
  strongs_id uuid references public.strongs_entries(id),
  unique (verse_id, word_position)
);
create index verse_word_tags_strongs_idx on public.verse_word_tags(strongs_id);

create table public.dictionary_entries (
  id uuid primary key default gen_random_uuid(),
  term text not null,
  source text not null check (source in ('ISBE', 'Easton', 'Smith')),
  body_text text not null,
  embedding vector(1536),
  search_vector tsvector generated always as
    (to_tsvector('english', coalesce(term, '') || ' ' || coalesce(body_text, ''))) stored
);
create index dictionary_entries_fts_idx on public.dictionary_entries using gin(search_vector);
create index dictionary_entries_embedding_idx on public.dictionary_entries using ivfflat (embedding vector_cosine_ops);

create table public.margin_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_id uuid not null references public.scripture_references(id),
  body_text text not null,
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index margin_notes_user_reference_idx on public.margin_notes(user_id, reference_id);

create table public.sermon_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  primary_reference_id uuid references public.scripture_references(id),
  key_points jsonb not null default '[]',
  cross_refs uuid[] not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reading_plan_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_date date not null,
  passage text not null,
  completed boolean not null default false,
  unique (user_id, plan_date)
);

create table public.memory_verses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_id uuid not null references public.scripture_references(id),
  translation_id uuid not null references public.translations(id),
  week_of date not null,
  mastered boolean not null default false
);

create table public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body_text text not null,
  linked_reference_id uuid references public.scripture_references(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prayer_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  body_text text not null,
  status text not null default 'ongoing' check (status in ('ongoing', 'answered')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.review_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference_id uuid references public.scripture_references(id),
  note_id uuid references public.margin_notes(id) on delete cascade,
  reason text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (reference_id is not null or note_id is not null)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger margin_notes_updated_at before update on public.margin_notes
for each row execute function public.set_updated_at();
create trigger sermon_notes_updated_at before update on public.sermon_notes
for each row execute function public.set_updated_at();
create trigger journal_entries_updated_at before update on public.journal_entries
for each row execute function public.set_updated_at();
create trigger prayer_items_updated_at before update on public.prayer_items
for each row execute function public.set_updated_at();

alter table public.margin_notes enable row level security;
alter table public.sermon_notes enable row level security;
alter table public.reading_plan_entries enable row level security;
alter table public.memory_verses enable row level security;
alter table public.journal_entries enable row level security;
alter table public.prayer_items enable row level security;
alter table public.review_items enable row level security;

create policy margin_notes_owner on public.margin_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy sermon_notes_owner on public.sermon_notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy reading_plan_entries_owner on public.reading_plan_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy memory_verses_owner on public.memory_verses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy journal_entries_owner on public.journal_entries for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy prayer_items_owner on public.prayer_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy review_items_owner on public.review_items for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.scripture_references, public.translations, public.verses,
  public.strongs_entries, public.verse_word_tags, public.dictionary_entries to anon, authenticated;
grant all on public.margin_notes, public.sermon_notes, public.reading_plan_entries,
  public.memory_verses, public.journal_entries, public.prayer_items, public.review_items to authenticated;
