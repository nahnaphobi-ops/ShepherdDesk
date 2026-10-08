create table public.user_highlights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  reference_id uuid not null references public.scripture_references(id) on delete cascade,
  color text not null default 'amber' check (color in ('amber', 'blue', 'green', 'rose')),
  created_at timestamptz not null default now(),
  unique (user_id, reference_id)
);

alter table public.user_highlights enable row level security;
create policy user_highlights_owner on public.user_highlights
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
grant all on public.user_highlights to authenticated;
