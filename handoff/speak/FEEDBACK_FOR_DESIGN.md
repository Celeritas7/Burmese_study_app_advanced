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
4. **Progress is only in localStorage.** It isn't synced across devices. `speak_log` in Supabase only receives data, and nothing reads it back.
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

## 4. Content check still needed

The romanisations (e.g. "deh" for တယ်, "kya-naw" for ကျွန်တော်) and the situation texts still need a native-speaker check. The Burmese grammar in the drills looks correct, e.g. ဗိုက် မ ဆာ ဘူး.
