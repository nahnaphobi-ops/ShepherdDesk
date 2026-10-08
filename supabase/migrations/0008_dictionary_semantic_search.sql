create or replace function public.search_dictionary_semantic(query_embedding vector(1536), limit_count integer default 20)
returns table (id uuid, term text, source text, body_text text, similarity real)
language sql stable
as $$
  select id, term, source, body_text,
    1 - (embedding <=> query_embedding) as similarity
  from public.dictionary_entries
  where embedding is not null
  order by embedding <=> query_embedding
  limit greatest(1, least(limit_count, 50));
$$;

grant execute on function public.search_dictionary_semantic(vector(1536), integer) to anon, authenticated;
