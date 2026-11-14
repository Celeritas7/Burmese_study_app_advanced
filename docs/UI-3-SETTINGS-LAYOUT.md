# Phase UI-3 — Settings layout redesign

## Scope

The Settings screen is reorganized into compact, expandable groups. **Account** remains visible at the top; the other controls appear in four independently expandable sections:

| Section | Existing controls |
| --- | --- |
| Learning & audio | Voice selection, play sound on reveal |
| Display | Burmese font size, Devanagari, playful pack, romanization |
| Data & safety | Partial device backup, paused restore, paused account-unsafe reset |
| Offline | Service-worker app cache, recorded audio download |

The Learning & audio section initially opens. Open sections persist across setting changes **within the current Settings session**, so picking a voice or font size does not close the row being edited. Open state is not added to local or cloud storage.

The layout adds wrapping choices for narrow screens, more generous section tap targets, visible keyboard focus, accessible switch state labels, and clearer visual grouping. The service-worker cache version changes from `v16` to `v17` to refresh the updated Settings assets.

## Safety and scope boundaries

- This is a **presentation-only** change: no Supabase tables, policies, account scopes, review logic, or saved progress are changed.
- Sign-in, sync, and sign-out remain in the visible Account card, not in the Review queue.
- The backup remains **device-local and partial**; the restore and unscoped reset buttons remain disabled under UI-1's data-safety guardrails.
- All existing Settings controls and their event handlers are retained.
- This PR targets the regular Burmese Study app only; it does not add offline-edition architecture.

## Automated checks

Run from the repository root:

```sh
node --test tests/*.test.mjs
node --check js/settings.js
git diff --check
```

`tests/settings-layout.test.mjs` checks section presence and order, default expansion, account visibility, retained controls, protected actions, accessible switch markup, section persistence after a setting change, mobile CSS, and updated cache version. Earlier account, safety, song, and review-sync tests still run.

## Manual verification after preview deployment

1. Open **More → Settings** on a narrow phone (around 320–380 CSS pixels). Check that the Account card and all four section summaries fit without horizontal scrolling.
2. Sign in and out (or inspect both states). Verify the account remains visible at the top and Google sign-in/out/sync still behave as before.
3. Open **Display**, change font size, and confirm Display stays open. Repeat with voice selection under **Learning & audio**.
4. Test each toggle and confirm the setting still affects Study, Review, or Speak as it did before. On keyboard, tab to summaries and toggles; verify focus and Enter/Space interaction.
5. Expand **Data & safety**, download a *partial* device backup, and confirm Restore/Reset are still disabled.
6. Expand **Offline**, inspect cache status and saved audio count, and confirm caching/downloading work online. Reopen Settings after a reload and ensure the controls are accessible.
7. Check a regular desktop viewport too. **This list is a manual QA gate, not a claim these device tests have been performed.**
