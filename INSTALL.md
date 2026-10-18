# Phases 12 + 14: 🔊 in Sentences, Dialogues, Study, SRS · Speak stats

## 1. Supabase (once)
SQL Editor → run `phase12.sql`. It creates the public `audio` bucket and adds the optional `speaker` column.

## 2. Files (remove `.txt` when copying)
New:
- `js/app-audio.js.txt`: shared 🔊 for the other tabs (voice rule, button states, Play all, Download all)
- `tools/app-audio-list.mjs.txt`, `tools/gen_app_audio.py`, `gen-app-audio.bat` (app root)

Replaced:
- `js/sentences.js.txt`: round 🔊 on each sentence; ♀/♂ chip only when ကျွန်မ/ကျွန်တော် forces the voice. In practice mode 🔊 plays without revealing.
- `js/dialogues.js.txt`: A/B speaker badges, one voice each (A ♂, B ♀; a pronoun in a line overrides). **Play all**, **⇄ Swap voices** (remembered per dialogue).
- `js/study.js.txt`: 🔊 in the word-card corner in Myanmar mode. In other modes 🔊 appears in the reveal box once the card is fully revealed. 🔊 on results rows.
- `js/srs.js.txt`: 🔊 in the card corner and on results rows.
- `js/stats.js.txt`: **Words | Speak** switch. The Speak view shows said-out-loud count, said-it %, streak, last 14 days, by pack, most missed, and Retry.
- `js/speak.js.txt`: 📊 Stats button on Speak home; the streak shows in the daily-goal line.
- `js/settings.js.txt`: **Play sound on reveal** (off by default). Offline → **Audio for offline** shows "N of M saved" and has **Download all**.
- `js/app.js.txt`: `speak.js?v=7`
- `sw.js.txt` (app root): cache `burmese-study-v6`; Supabase clips cached on first play.
- `css/styles.css.txt`: round-button + chip styles appended at the end.

Add to `.gitignore` (local MP3 copies, the bucket is the real store):
```
/audio/app/m/
/audio/app/f/
```

## 3. Generate + upload audio
```
set SUPABASE_SERVICE_KEY=...   (Supabase → Project Settings → API → service_role. Secret, never commit it.)
gen-app-audio.bat
git add audio/app/texts.json audio/app/clips.json js css sw.js .gitignore tools gen-app-audio.bat
git commit -m "Phase 12+14: sound in all tabs, Speak stats" && git push
```
Expect about 2,100 clips and roughly 26k characters, which is inside Azure's free tier. Texts that already have a Speak clip are skipped. Rerun the .bat whenever you add sentences or words; only new ones are made.

## 4. Check
- Sentences: 🔊 plays; in Practice mode tapping 🔊 doesn't reveal the English. ကျွန်မ sentences show ♀ and play the female voice even when Settings is ♂.
- Dialogues → Unit 1 → D1: lines alternate A/B, Play all walks through them, ⇄ swaps the two voices.
- Study (Myanmar mode): 🔊 in the card corner. EN mode: no 🔊 until fully revealed.
- Settings → Play sound on reveal on: revealing a Study / Review card speaks the word.
- Settings → Download all: the count climbs to "all saved". Then airplane mode: 🔊 still works.
- Speak home → 📊 Stats opens the Speak view; Back returns to Speak. With the playful pack hidden, it's absent from stats too.
- A text with no clip shows 🔇 + "No audio for this one yet".

## Fixing a dialogue that doesn't alternate
```sql
update burmese_app_sentences set speaker = 'A' where id in (101, 102);
```
Only the rows you set are fixed. The lines after them keep alternating from there.

## Native-speaker check
Listen to a sample of dialogue clips. The A/B order is a guess from line order.
