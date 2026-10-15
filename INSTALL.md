# Phases 8 + 11: app-wide voice setting + "Just for fun 😏" pack

## Files (drop the `.txt` when copying into the app)
- `js/settings.js.txt` → `js/settings.js`
  - New **Voice** section at the top: "Your voice" with ♂ ကျွန်တော် / ♀ ကျွန်မ buttons. Saved as `voice`.
  - New Display toggle: **Show playful pack 😏** (`showPlayful`, off by default).
- `js/speak.js.txt` → `js/speak.js`
  - Reads the voice from Settings everywhere (🔊 clips, ကျွန်တော်/ကျွန်မ in the ladder). Your old Speak-only choice is carried over once.
  - Speak home: the ♂/♀ pills are gone. A read-only "voice" row with a **Change** button opens Settings.
  - "Just for fun 😏" section appears **below the packs** only when the toggle is on, with a "friends only" tag and a hint that it can be hidden in Settings. Off = no trace of it (totals, Retry list included).
- `js/speak-data.js.txt` → `js/speak-data.js`: the `fun` pack, 12 lines, `playful: true`.
- `js/app.js.txt` → `js/app.js`: `speak.js?v=6`.
- `sw.js.txt` → `sw.js` (app root): cache `burmese-study-v5`.

## Then regenerate audio
```
node tools/speak-audio-list.mjs
gen-speak-audio.bat
git add audio js sw.js && git commit -m "Phase 8+11: voice setting, playful pack" && git push
```
24 new clips (12 lines × 2 voices).

## Check
- Settings shows Voice at the top; switching to ♀ changes the voice on Speak 🔊 and shows ကျွန်မ in the ladder.
- Speak home has no ♂/♀ pills; the voice row's **Change** opens Settings.
- Playful pack is hidden until Settings → Show playful pack is on; then it appears under the six packs.

## Native-speaker check
မင်းကို သတိရတယ် / မင်းကို ကြိုက်တယ် (casual register), နောက်တာပါ, ဖုန်းဆက်နော်, ကောင်းကောင်းအိပ်နော်.

## Note for Phase 12
Other tabs should read `getSettings().voice` for 🔊, with ကျွန်တော် → m and ကျွန်မ → f overriding it.
