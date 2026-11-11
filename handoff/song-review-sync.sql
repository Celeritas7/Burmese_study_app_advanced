-- Phase 4D (optional): private, account-scoped Song & Chants reminders.
-- Run once in the SQL Editor of the SAME Supabase project used by the app.
-- This creates a new table/function; it does not alter Study, SRS or Speak records.

create table if not exists public.burmese_app_song_review_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_id text not null check (char_length(word_id) between 1 and 128),
  song_id text not null default '',
  due_at timestamptz not null,
  mastery_level smallint not null default 0 check (mastery_level between 0 and 7),
  attempts integer not null default 0 check (attempts >= 0),
  removed boolean not null default false,
  updated_at timestamptz not null,
  primary key (user_id, word_id)
);

create index if not exists burmese_song_review_due_idx
  on public.burmese_app_song_review_state (user_id, due_at)
  where removed = false;

alter table public.burmese_app_song_review_state enable row level security;

drop policy if exists "song_reviews_owned_by_account"
  on public.burmese_app_song_review_state;
create policy "song_reviews_owned_by_account"
  on public.burmese_app_song_review_state
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

revoke all on public.burmese_app_song_review_state from public, anon;
grant select, insert, update, delete on public.burmese_app_song_review_state to authenticated;

-- Server-side newer-wins merge. Prevents delayed/offline uploads overwriting a
-- newer review or deletion already synced by another device.
create or replace function public.burmese_merge_song_reviews(p_rows jsonb)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Login required';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array'
     or jsonb_array_length(p_rows) > 500 then
    raise exception 'Expected an array of at most 500 song reviews';
  end if;

  insert into public.burmese_app_song_review_state (
    user_id, word_id, song_id, due_at, mastery_level, attempts, removed, updated_at
  )
  select (select auth.uid()), r.word_id, coalesce(r.song_id, ''),
    r.due_at, coalesce(r.mastery_level, 0), coalesce(r.attempts, 0),
    coalesce(r.removed, false), r.updated_at
  from jsonb_to_recordset(p_rows) as r (
    word_id text, song_id text, due_at timestamptz,
    mastery_level smallint, attempts integer, removed boolean, updated_at timestamptz
  )
  on conflict (user_id, word_id) do update set
    song_id = excluded.song_id,
    due_at = excluded.due_at,
    mastery_level = excluded.mastery_level,
    attempts = excluded.attempts,
    removed = excluded.removed,
    updated_at = excluded.updated_at
  where excluded.updated_at > public.burmese_app_song_review_state.updated_at;
end;
$$;

revoke all on function public.burmese_merge_song_reviews(jsonb) from public, anon;
grant execute on function public.burmese_merge_song_reviews(jsonb) to authenticated;

-- Optional check after setup: both should show RLS and owner-only access.
-- select relname, relrowsecurity from pg_class
-- where oid = 'public.burmese_app_song_review_state'::regclass;
