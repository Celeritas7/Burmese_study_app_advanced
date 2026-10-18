-- Phase 12 — run once in Supabase → SQL Editor.

-- 1. Public bucket for the app's 🔊 clips (reads need no key; uploads use the service_role key from gen_app_audio.py).
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update set public = true;

-- 2. Optional speaker per dialogue line. Empty = alternate A, B, A… in id order.
alter table burmese_app_sentences
  add column if not exists speaker text check (speaker in ('A', 'B'));

-- Fix a dialogue that doesn't alternate, e.g. A says two lines in a row:
-- update burmese_app_sentences set speaker = 'A' where id in (101, 102);
-- Only rows you set are used; the rest keep alternating from the previous line.
