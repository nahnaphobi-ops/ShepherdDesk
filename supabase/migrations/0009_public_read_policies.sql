-- Reference tables are enabled for RLS but had no read policies, so anon/authenticated reads returned nothing.
drop policy if exists scripture_references_read on public.scripture_references;
create policy scripture_references_read on public.scripture_references for select to anon, authenticated using (true);

drop policy if exists translations_read on public.translations;
create policy translations_read on public.translations for select to anon, authenticated using (enabled);

drop policy if exists verses_read on public.verses;
create policy verses_read on public.verses for select to anon, authenticated using (
  exists (
    select 1 from public.translations t
    where t.id = verses.translation_id
      and t.enabled
      and (t.license_tier = 'public_domain' or auth.uid() is not null)
  )
);

drop policy if exists strongs_entries_read on public.strongs_entries;
create policy strongs_entries_read on public.strongs_entries for select to anon, authenticated using (true);

drop policy if exists verse_word_tags_read on public.verse_word_tags;
create policy verse_word_tags_read on public.verse_word_tags for select to anon, authenticated using (true);

drop policy if exists dictionary_entries_read on public.dictionary_entries;
create policy dictionary_entries_read on public.dictionary_entries for select to anon, authenticated using (true);
