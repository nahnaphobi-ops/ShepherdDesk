insert into public.verse_word_tags (verse_id, word_position, surface_text, strongs_id)
select
  verse.id,
  tagged.word_position,
  tagged.surface_text,
  strongs.id
from (values
  (1, 'LORD', 'H3068'),
  (4, 'shepherd', 'H7462'),
  (8, 'want', 'H2637')
) as tagged(word_position, surface_text, strongs_number)
join public.strongs_entries strongs on strongs.strongs_number = tagged.strongs_number
join public.verses verse on verse.translation_id = (select id from public.translations where code = 'BSB')
join public.scripture_references reference on reference.id = verse.reference_id
where reference.book = 'Psalms' and reference.chapter = 23 and reference.verse = 1
on conflict (verse_id, word_position) do update set
  surface_text = excluded.surface_text,
  strongs_id = excluded.strongs_id;
