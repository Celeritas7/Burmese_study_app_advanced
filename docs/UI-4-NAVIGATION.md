# Phase UI-4 — Primary navigation redesign

## Proposed navigation (review before merging)

Replace the crowded seven-button bottom bar with five primary destinations in this order:

1. **Home** — today's study focus and quick actions
2. **Study** — regular vocabulary practice
3. **SRS** — due-card review
4. **Speak** — spoken practice
5. **More** — other learning paths and tools

**Course**, **Groups**, and **Songs & Chants** are preserved as the first three actions in the clearly labeled **Learn & explore** section of More. Dialogues, Writing Practice, and Sentences follow in that section. Stats, Settings, Devanagari Audit, and Supabase connection remain under **Tools & account**. The Home screen's existing direct Songs and Stats shortcuts remain.

This five-tab arrangement was previously suggested, **not explicitly finalized** by the user; it should be reviewed on a phone before merging.

## Navigation behavior

`js/navigation.js` tracks the selected primary tab, the visible page, and a short in-memory subpage history. None of this is stored in localStorage or sent to Supabase.

- Opening a subpage keeps the originating primary tab highlighted and annotated with `aria-current`.
- A subpage's **Back** action returns to its actual source, not always More. In particular, **Home → Songs → Back** and **Home → Settings → Back** return to Home.
- Nested **More → Course → Dialogues → Back** returns to the current Course unit, then Back from Course home returns to More.
- Changing a primary tab clears the old subpage history to prevent unexpected back jumps.
- Existing `switchTab('course')` shortcuts from Speak still open Course as a subpage.
- The Course overview now provides a Back button because Course is no longer a permanent bottom tab.

The existing Course/Study progress, song reviews, settings, account actions, song sync, and disabled account-unsafe restore/reset controls are unchanged. The app cache version advances to `v18` and precaches the new `navigation.js` module.

## Automated tests

Run:

```sh
node --test tests/*.test.mjs
node --check js/app.js
node --check js/more.js
node --check js/navigation.js
git diff --check
```

`tests/navigation.test.mjs` validates the five-tab design, subpage origin/back rules, nested Course flow, feature discoverability, accessibility markup, and cache inclusion.

## Manual QA after preview deployment

1. On a 320–390 CSS-pixel phone, check all five bottom labels, tap targets, active highlight, and safe-area spacing. Verify no horizontal scroll.
2. From **Home**, open Songs, Stats, and Settings separately. Back should return to Home with Home still highlighted.
3. Open **More → Course**, enter a unit, then a Dialogue. Back should return to the Course unit, with a second Back returning to the overview and a third returning to More.
4. Open **More → Groups**, Songs, Writing, Sentences, Settings, and Stats. Check each Back action returns to More.
5. From **Speak**, open Course through its grammar shortcut; Back should return to Speak. Check the Speak statistics shortcut too.
6. Switch directly between bottom tabs while inside a subpage. No stale subpage should reappear on Back.
7. Confirm Study, SRS, Speak, Course progress, and song-review synchronization retain existing behavior.

**These are required manual checks, not completed-device-test claims.** The user should approve the final five-tab arrangement before merging this PR.
