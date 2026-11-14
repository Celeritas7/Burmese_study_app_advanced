# Phase UI-2 — Account management

## What changed

- `More → Settings` now starts with an **Account** card. It shows whether Google is connected, the account email when available, song-review sync status, optional Google sign-in, **Sync now**, and **Sign out**.
- The **Review** queue now has only a compact song-review status and **Manage in Settings** shortcut. It does not display the account email or sign-in/out buttons.
- Account status re-renders when the existing `SongReviewCloudSync` service emits changes, without refreshing the entire Settings page or resetting preferences.
- The UI states explicitly that Google currently syncs **Song & Chants reviews only**. It does not claim that regular Study/SRS, Speak or Course progress follows the Google account.
- Existing authentication redirect, session persistence, account-isolated local queue, and cloud sync implementation remain unchanged. No Supabase schema or production data changes.
- The service-worker cache is bumped to v16 and includes `js/account-ui.js`.

## Expected manual verification

1. Open More → Settings while signed out. See optional Google button and device-only status. Normal Study, Speak, Course and Review remain accessible without signing in.
2. Sign in using Google from Settings. Return from Google OAuth to the app, reopen Settings: signed-in email and status appear. Review shows only compact status + Settings shortcut.
3. Click Sync now. The status reports syncing, then completion or a useful error; repeat clicks are disabled while syncing. Confirm song reviews remain accessible offline.
4. Sign out from Settings. Confirm account status changes to device-only, and no local song reviews or saved settings are deleted. Log in again to the same account and confirm its song-review queue is still available.
5. Switch between two Google accounts (if available) and ensure song-review records do not cross accounts. This behavior is existing, covered by the song-review sync test suite, and is not modified by UI-2.
6. Check a narrow mobile viewport: account email wraps, buttons remain readable and usable, and Review queue starts near the top.

## Important limitation

This is an **account-control relocation**, not a full app-wide account system. The old Study/SRS REST paths remain shared/unscoped, as documented in `UI-1-DATA-SAFETY.md`. A future ownership/RLS migration is required before offering full per-account progress, reset, and restore.

## Automated checks

Run `node --test tests/*.test.mjs`, `node --check js/settings.js`, `node --check js/srs.js`, `node --check js/account-ui.js` and `git diff --check`. Browser-based OAuth completion must be verified after merge because local tests do not sign into the user's actual Google account.
