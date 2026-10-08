insert into public.strongs_entries (strongs_number, language, transliteration, gloss, full_definition)
values
  ('H7462', 'hebrew', 'ra''ah', 'to tend, pasture, shepherd', 'To care for and guide a flock; used here as a picture of the LORD''s attentive care.'),
  ('H3068', 'hebrew', 'YHWH', 'the proper name of the God of Israel', 'The covenant name of God, represented in many English translations by LORD in small capitals.'),
  ('H2637', 'hebrew', 'chaser', 'to lack, be diminished', 'To be without what is needed; the psalmist describes complete provision under God''s care.')
on conflict (strongs_number) do update set
  transliteration = excluded.transliteration,
  gloss = excluded.gloss,
  full_definition = excluded.full_definition;
