create or replace function public.search_dictionary(query_text text, limit_count integer default 20)
returns table (id uuid, term text, source text, body_text text, rank real)
language sql stable
as $$
  select id, term, source, body_text,
    ts_rank(search_vector, websearch_to_tsquery('english', query_text)) as rank
  from public.dictionary_entries
  where search_vector @@ websearch_to_tsquery('english', query_text)
  order by rank desc, term asc
  limit greatest(1, least(limit_count, 50));
$$;

grant execute on function public.search_dictionary(text, integer) to anon, authenticated;
