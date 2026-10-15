# Speak tab — feedback after Phase 1 (for Claude Design)

Phase 1 of the Speak tab is live in the app (`js/speak.js`, `js/speak-data.js`, CSS appended to `css/styles.css`). Below is what we changed in code since your handoff, what we found while testing on a real phone, and what we'd like from you next.

## 1. Code change since your handoff — please keep it in future versions

**Audio no longer relies on the phone's text-to-speech.** On Android, Google's TTS engine has no Burmese voice, so 🔊 was silent or read the text wrongly. We replaced it with pre-generated MP3 clips:

- Clips live in `audio/speak/m/<hash>.mp3` (male, Microsoft `my-MM-ThihaNeural`) and `audio/speak/f/<hash>.mp3` (female, `my-MM-NilarNeural`).
- File names come from `audioFile(text, voice)` in `js/speak-audio.js` (FNV-1a hash of the Burmese text).
- **The ♂/♀ toggle now also picks the voice.** ♂ means a male voice and ကျွန်တော် sentences. ♀ means a female voice and ကျွန်မ sentences. Plain words follow the same toggle.
- `speak(t)` in `js/speak.js` plays the clip and falls back to `speechSynthesis` only if the clip is missing.
- `tools/speak-audio-list.mjs` lists every playable text (all pack words + ladder steps 2–4) into `audio/speak/texts.json`. `gen-speak-audio.bat` generates the MP3s.

**If you send a new `speak.js`, please keep `speak()` / `tts()` and the `speak-audio.js` import as they are now.** Otherwise the audio silently goes back to device TTS. If you add words or new ladder steps, that's fine: we re-run the list script and generator.

## 2. Issues found in Phase 1

1. **"Not yet" still counts toward step 1.** `markSaid()` sets `said = 1` even when the answer is "Not yet", so step 1 ("say every word in How I feel") can be cleared by answering "Not yet" to all 12. Should "said" mean *tried* or *said correctly*? The home screen copy says "words tried" but the ladder says "said every word". Please decide and align the copy.
2. **Grammar card opens More instead of Course.** `grammar: () => this.app.switchTab('more')` is still a TODO. The app already has a Course tab (`switchTab('course')`).
3. **Food photos referenced but missing.** Mohinga and Tea leaf salad point to `img/food/*.jpg`, which don't exist yet. The emoji fallback works, but there's a 404 on every render.
4. **Progress is only in localStorage.** It isn't synced across devices. `speak_log` exists in Supabase and is receiving answers, but nothing reads it back yet.
5. **No feedback when audio can't play.** Before the change it failed silently. Now a missing clip falls back to TTS, which may also be silent.

## 3. Design asks

1. **🔊 button states.** Please design *playing*, *loading* and *unavailable* states, so the user knows when no audio exists for an item rather than tapping a dead button.
2. **♂/♀ toggle meaning.** It now changes the voice as well as ကျွန်တော်/ကျွန်မ. It's only shown on the How I feel pack today. Should it move to the Speak home or Settings, with a label like "Your voice: ♂ ကျွန်တော် / ♀ ကျွန်မ"?
3. **Step 1 rule + copy.** See issue 1. Pick *tried* or *said correctly* and update the ladder and home text.
4. **Audio in other tabs.** The Sentences, Dialogues, Study and SRS tabs show Burmese but have no sound at all. Sentences come from Supabase, so we can generate clips for them the same way. We need:
   - where the 🔊 goes on a sentence card / dialogue line;
   - voice rules: sentences with ကျွန်တော် → male, with ကျွန်မ → female, others → the user's ♂/♀ setting;
   - **dialogues have two speakers.** How should we show and assign a voice per speaker (e.g. speaker A = male, B = female, or a per-line label)?
5. **Next content packs** (Phase 5): "At the tea shop", "Numbers & prices", "Where is…". Ladder steps 2–4 currently only work for How I feel, because only those words have the `pre` / `v` split. Should new packs get their own ladder, or stay as word lists?

## 4. Wider app questions (beyond the Speak tab)

1. **Tab bar has 7 tabs** (Speak, Home, Study, SRS, Course, Groups, More). PHASES.md suggested replacing Groups or adding a 6th. On a phone the labels are 9px and "More" sits lower than the others, because its icon is a text "⋯" and not an emoji. Which tabs stay in the bar, and which move under More? Should Speak or Home be the first and default tab? The app currently opens on Home.
2. **Speak vs Course overlap.** Two grammar paths now exist. The Speak ladder (steps 2–4) builds sentences from **tiles**, while the Course "Pattern drill" (`showDrillModal` in `js/course.js`) uses **multiple-choice options**. PHASES.md Phase 4 suggests reusing the Speak tile builder in Course. Should we use one drill style everywhere, and how should the Speak ladder and Course units relate (is the ladder the on-ramp into Course unit 1)?
3. **Speak section in Stats (Phase 3).** `speak_log` will hold every answer, but the Stats page has no design for it yet: accuracy per pack, most-missed words, and maybe a streak.
4. **Food photo style (Phase 2).** If we add dish photos, what style should they follow (real photos vs illustrations, crop, background), so they look consistent with the emoji tiles they replace?

## 5. Content check still needed

The romanisations (e.g. "deh" for တယ်, "kya-naw" for ကျွန်တော်) and the situation texts still need a native-speaker check. The Burmese grammar in the drills looks correct, e.g. ဗိုက် မ ဆာ ဘူး.

## 6. New proposals since this brief

1. **App-wide voice setting.** We plan to move the ♂/♀ choice out of the Speak tab into Settings, so every tab plays the same voice (sentences containing ကျွန်တော် are always male, ကျွန်မ always female). This also covers asks 3.2 and 3.4: please design the setting and the 🔊 placement with this in mind.
2. **"Just for fun 😏" section (Playful pack).** Emotional, real-life phrases are easier to remember, so we're adding a light flirting/teasing pack for use with friends: ချစ်စရာကောင်းတယ် (you're cute), သတိရတယ် (I miss you), တကယ်လား (really?), လူလိမ် (liar!), မစနဲ့ (don't tease me), အတူတူ စားရအောင် (let's eat together), etc. It should be:
   - a separate section on the Speak home, **below** the normal packs (not mixed in with them, and not its own tab);
   - hideable with a Settings switch, "Show playful pack", for when the app is shown to a teacher or others;
   - otherwise a normal pack (counts toward the daily goal and the "say again" list).

   Please design the section header and the hidden/shown states.
3. **More feelings for the ladder.** We're adding *Miss* (သတိရ), *Shy* (ရှက်) and *Jealous* (သဝန်တို) to How I feel. They split into `pre` + `v`, so steps 2–4 work: "Miss me?" (သတိရလား), "I'm not jealous!" (သဝန် မ တို ဘူး). No new UI is needed.
4. **Mini-dialogues (needs a new screen).** These are short two-person chats, e.g. a playful exchange with a friend. The app plays the other person's line in one voice, the user says their reply, then hears it in the other voice. The two voices (male/female) make this natural. We need a design for: the chat layout, whose turn it is, reveal/hint for the user's line, and self-rating at the end, like the practice screen.

## 7. Known issue: Devanagari voicing (sandhi) is missing

The pronunciation line (e.g. ပင်ပန်းတယ် → shows **पिंपंदे**, should be **पिंबंदे**) is currently unvoiced everywhere. The sandhi step was lost when `burmese.js` in the `language-utils` repo was rewritten after version R006. Only a few hard-coded words (တယ်→दे, ပါ→बा, ဘူး→बू) appear voiced. We'll fix this in code. **Please don't hand-type Devanagari in designs or data to work around it**; the engine output will be correct after the fix.
