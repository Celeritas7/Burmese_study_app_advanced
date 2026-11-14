# Phase UI-1 — Data safety and baseline

This is a **frontend safety baseline**, not a completed account-data migration. It does not run a database migration or modify any existing user records.

## Why the original Settings controls were unsafe

- **Reset All Progress** sent `DELETE` requests to `burmese_app_user_state` and `burmese_app_progress_events` using only `id=gt.0`. Those requests contained **no user filter**; whether the server permits them depends on its policies. The UI also claimed success without checking HTTP status.
- **Import Progress** wrote backup states into `burmese_app_user_state` without an account filter and silently swallowed insert errors. This could affect shared Study/SRS state, depending on database permissions.
- **Export Progress** read all rows returned by `getUserState()` and at most 5,000 `progressEvents`, without an account filter, yet described itself as the user's full progress backup. It omitted many locally stored items, all private song-review sync data, and potentially older events.

The historical files under `js/#Storage/`, `js/7_writing_pad/`, `js/8_old_UI/`, `js/9_no_sandhi_rule/`, `js/10_no_colloqial_book_linked/`, and `js/New folder/` are preserved archival copies. This change only alters the active `js/settings.js` loaded from `index.html`.

## What Phase UI-1 changes

1. Disables **Restore backup** and **Reset All Progress** in Settings and removes their active event handlers. They cannot write/delete legacy shared Study/SRS records through this page.
2. Replaces the old misleading full-progress export with a **read-only, device-only JSON snapshot**. The action never queries Supabase, writes storage, or includes Supabase auth tokens.
3. Documents missing data directly in the UI and in the JSON (`scope`, `excluded`, `restoreSupported: false`). The old `version: 1` file shape is no longer produced; the new file is `version: 2` and cannot currently be restored in-app.
4. Bumps the service-worker cache so the updated Settings and local backup helper are available to installed clients when the new worker activates.
5. Adds regression tests for backup coverage, exclusions, missing/corrupt data, and the absence of the legacy Settings mutation paths.

## Device backup coverage

| Section | Source | In new JSON? | Notes |
| --- | --- | --- | --- |
| Preferences | `burmese_app_settings` | Yes | Only values stored on this device |
| Speak progress | `speak_progress` | Yes | Locally recorded practice; not server log |
| Course progress | `burmese_course_progress` | Yes | Locally completed steps |
| Dialogue voice overrides | `dialogue_voices` | Yes | Device-specific choices |
| Song library and edits | `burmese_song_library_v1` | Yes | Saved library entries, links, and added songs |
| Song review queue | `burmese_song_review_queue_v1` | Yes | Current active local queue only, including removal markers |
| Regular Study/SRS state | `burmese_app_user_state` | **No** | Legacy shared Supabase path; not account-owned in the client |
| Regular progress events | `burmese_app_progress_events` | **No** | Legacy shared Supabase path |
| Speak log | `speak_log` | **No** | Stored separately on server |
| Cloud-only reviews or other accounts' local queues | Private sync / account-specific storage | **No** | Export does not force sync, preventing cross-account inclusion |
| Audio/media/offline cache | Cache Storage | **No** | Re-downloadable content, not JSON data |

`null` in the snapshot means the corresponding local storage key was absent. A malformed JSON value stops the export rather than producing a misleading file. Because this backup cannot yet be restored, save the JSON privately **but do not treat it as a full recovery strategy**.

## Remaining risk and next prerequisites

- Regular Study/SRS reads and writes elsewhere in the app still use legacy `burmese_app_user_state` and `burmese_app_progress_events` methods. **This PR does not make those tables account-isolated**. Any server-side restrictions/RLS must be audited separately before an account-safe reset, import, or complete cloud backup can be offered.
- Song reviews already use a separate authenticated, account-owned sync path. The new backup intentionally does not change that sync or merge cross-account queues.
- Before re-enabling Restore/Reset: implement an owner key and owner-scoped RLS for each relevant progress table; migrate legacy records with a documented ownership plan; create an authenticated, strictly owner-scoped export/import/reset API; enforce validation, dry-run/preview, error handling, and tests for two accounts.
- Test active app flows (Study, normal SRS, songs, Speak, Course, Settings) after deployment. Browser-based UI tests and owner isolation tests against a safe test Supabase project remain desirable.

## Verification

Run `node --test tests/*.test.mjs` and `git diff --check` before opening the PR. Tests are local and do not touch production Supabase.
