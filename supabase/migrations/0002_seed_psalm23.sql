insert into public.translations (code, name, license_tier, attribution_text, source, enabled)
values
  ('BSB', 'Berean Standard Bible', 'public_domain', 'Public domain', 'seed:psalm23', true),
  ('KJV', 'King James Version', 'public_domain', 'Public domain', 'seed:psalm23', true),
  ('WEB', 'World English Bible', 'public_domain', 'Public domain', 'seed:psalm23', true)
on conflict (code) do update set
  name = excluded.name,
  license_tier = excluded.license_tier,
  attribution_text = excluded.attribution_text,
  source = excluded.source,
  enabled = excluded.enabled;

insert into public.scripture_references (book, chapter, verse)
select 'Psalms', 23, verse
from generate_series(1, 6) as verses(verse)
on conflict (book, chapter, verse) do nothing;

with seeded_text as (
  select * from (values
    ('BSB', 1, 'The LORD is my shepherd; I shall not want.'),
    ('BSB', 2, 'He makes me lie down in green pastures; He leads me beside quiet waters.'),
    ('BSB', 3, 'He restores my soul; He guides me in the paths of righteousness for the sake of His name.'),
    ('BSB', 4, 'Even though I walk through the valley of the shadow of death, I will fear no evil, for You are with me; Your rod and Your staff, they comfort me.'),
    ('BSB', 5, 'You prepare a table before me in the presence of my enemies; You anoint my head with oil; my cup overflows.'),
    ('BSB', 6, 'Surely goodness and mercy will follow me all the days of my life, and I will dwell in the house of the LORD forever.'),
    ('KJV', 1, 'The LORD is my shepherd; I shall not want.'),
    ('KJV', 2, 'He maketh me to lie down in green pastures: he leadeth me beside the still waters.'),
    ('KJV', 3, 'He restoreth my soul: he leadeth me in the paths of righteousness for his name''s sake.'),
    ('KJV', 4, 'Yea, though I walk through the valley of the shadow of death, I will fear no evil: for thou art with me.'),
    ('KJV', 5, 'Thou preparest a table before me in the presence of mine enemies: thou anointest my head with oil.'),
    ('KJV', 6, 'Surely goodness and mercy shall follow me all the days of my life: and I will dwell in the house of the LORD for ever.'),
    ('WEB', 1, 'Yahweh is my shepherd: I shall lack nothing.'),
    ('WEB', 2, 'He makes me lie down in green pastures. He leads me beside still waters.'),
    ('WEB', 3, 'He restores my soul. He guides me in the paths of righteousness for his name''s sake.'),
    ('WEB', 4, 'Even though I walk through the valley of the shadow of death, I will fear no evil, for you are with me.'),
    ('WEB', 5, 'You prepare a table before me in the presence of my enemies. You anoint my head with oil.'),
    ('WEB', 6, 'Surely goodness and loving kindness will follow me all the days of my life, and I will dwell in Yahweh''s house forever.')
  ) as values(code, verse, text)
)
insert into public.verses (reference_id, translation_id, text)
select reference.id, translation.id, seeded_text.text
from seeded_text
join public.translations translation on translation.code = seeded_text.code
join public.scripture_references reference
  on reference.book = 'Psalms' and reference.chapter = 23 and reference.verse = seeded_text.verse
on conflict (reference_id, translation_id) do update set text = excluded.text;
