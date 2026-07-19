# Handoff: Word Tree in Study/Story mode

Add a **Word Tree** view to the Study tab that shows the full hub forest (every hub +
spokes) produced by the app's existing hub generator, rendered as top‑down trees, with
the current word highlighted.

## What's in this folder

- **`CLAUDE_CODE_PROMPT.md`** — paste this into Claude Code, run from `Burmese_study_app_advanced/` root. It's the task brief wired to your real files.
- **`IMPLEMENTATION.md`** — copy‑ready code the prompt references (the `showWordTreeModal` method, the scoped CSS, the export/import/button edits).
- **`Story Mode Word Tree.html`** — the visual + interaction **reference prototype**. Open it in a browser to see the intended look and behavior. It is a design reference, not code to ship.

## Fidelity

**High‑fidelity.** Colors, spacing, typography, and the CSS org‑chart connectors are final and match the app's dark theme tokens. Recreate the behavior in the real vanilla‑JS app using the copy‑ready code in `IMPLEMENTATION.md`.

## How it works

The prototype runs a faithful port of `buildGroups` (from `js/hubexplorer.js`) so the trees
are identical to the Hub Explorer's "All Hubs" tab. In the real app you reuse the actual
function rather than the port — the prompt covers exporting and importing it. Pronunciation
is computed live with `toPronunciation`; only the Burmese word shows until a node is tapped.

## Reference files in the app

- `js/hubexplorer.js` — `buildGroups(consonants, words)` generator
- `js/study.js` — `StudyTab`, `showStoryModal`, action row (`#btn-story`)
- `js/modal.js` — `Modal.show` / `Modal.close`
- `js/supabase.js` — `db.getWords()`, `db.getConsonants()`
- `css/styles.css` — `:root` design tokens
