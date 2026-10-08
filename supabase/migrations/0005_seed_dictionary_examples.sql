create unique index if not exists dictionary_entries_term_source_idx
  on public.dictionary_entries (term, source);

insert into public.dictionary_entries (term, source, body_text)
values
  ('Shepherd', 'ISBE', 'A keeper of sheep. The shepherd leads, feeds, protects, and searches for the flock, making the image a recurring biblical picture of faithful care.'),
  ('Covenant', 'Easton', 'A solemn agreement or promise. Scripture uses covenant language for the binding relationship established by God with his people.'),
  ('Atonement', 'Smith', 'Reconciliation or the making of amends. In biblical theology the term describes the covering and removal of sin through an appointed sacrifice.')
on conflict (term, source) do nothing;
