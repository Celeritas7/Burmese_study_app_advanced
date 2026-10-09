-- Speak tab answer log (optional — the tab works without it; progress is in localStorage).
create table if not exists speak_log (
  id bigint generated always as identity primary key,
  pack text not null,           -- feel | basics | food
  item text not null,           -- English key of the word, e.g. 'Hungry'
  step smallint not null,       -- 1 = said the word, 2 = add me, 3 = ask back, 4 = say no
  ok boolean not null,
  created_at timestamptz not null default now()
);
create index if not exists speak_log_item_idx on speak_log (pack, item);

-- Same access model as your other tables (single user, anon key).
alter table speak_log enable row level security;
create policy "anon insert speak_log" on speak_log for insert to anon with check (true);
create policy "anon read speak_log"   on speak_log for select to anon using (true);
