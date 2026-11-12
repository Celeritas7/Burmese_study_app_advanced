# Phase 4D — private Google-linked Song Review sync

The code makes account sync **optional**. Study, Speak, and ordinary SRS data are
untouched. Review words added after Song & Chants practice are saved to the
device immediately; signing in with Google lets the **song-only queue** follow
the same user between Android and iPad when an internet connection is available.

## One-time setup (Supabase project administrator)

1. Open the Supabase project already used by this app (`ulgrfumbwjovbjzjiems`).
   In **SQL Editor**, run [song-review-sync.sql](song-review-sync.sql). The new
   `burmese_app_song_review_state` table uses row-level security. Each signed-in
   user can read/write only their own rows. The merge function rejects older
   timestamps, including attempted restoration of removed reminders.
2. Under **Authentication → Providers → Google**, enable Google and enter a
   Google OAuth **Client ID** and **Client secret** obtained from Google Cloud.
   Do not put the secret in GitHub or frontend JavaScript.
3. In Google Cloud's OAuth client, add:
   - **Authorized JavaScript origin:** `https://celeritas7.github.io`
   - **Authorized redirect URI:**
     `https://ulgrfumbwjovbjzjiems.supabase.co/auth/v1/callback`
4. In **Supabase Authentication → URL Configuration**, add the exact deployed
   GitHub Pages app URL to **Redirect URLs** (the app redirects to its own
   directory path after Google login), e.g.
   `https://celeritas7.github.io/Burmese_study_app_advanced/`.
   Use the actual deployed URL if it differs. Keep your current Site URL unless
   you intend to change the project's other apps.
5. Deploy the merged PR, then reload the app online once (the new service-worker
   cache is `burmese-study-v14`). The Google login uses supabase-js v2 from a
   CDN on the **first online load**. The rest of the app stays usable when this
   script or the network is unavailable.

Official guide: https://supabase.com/docs/guides/auth/social-sign-in/auth-google

## Device verification

1. On Android, open **Review → Continue with Google** and sign in.
2. In **Songs & Chants**, finish a practice, miss a real Study word, then opt in
   to **Add missed words to Review**. Check **Review → Sync now**.
3. On iPad, open the same deployed app and sign in using the **same Google
   account**. Tap **Sync now**; the song words should appear in Review.
4. Turn off iPad Wi-Fi, review one song word and stop another song reminder.
   Both changes must persist locally while offline.
5. Reconnect iPad and tap **Sync now**. On Android, tap **Sync now** again.
   The updated due date and stopped reminder should match. A stopped reminder
   must not reappear after the older device reconnects.
6. Sign out and sign in with a **different** Google account. The prior account's
   song queue must not upload to the new account. Sign back into the original
   account to restore its own device queue.

## Behavior and limits

- Google login and SQL table setup are **admin/deployment steps**, not handled
  automatically by merging the code. Until setup is complete, local reviews
  still work; Review shows a sync error instead of hiding local records.
- Regular Study mastery, shared SRS dates, Speak logs, and song catalog records
  are **not** account-synced by this phase. Only the song-review queue syncs.
- This is an offline-first *queue*, not a downloaded dictionary: on a device
  with no cached Study words, the SRS screen may need one online visit to load
  word text for its review cards.
- The local queue survives sign-out on that browser, including on shared
  devices. Clear site storage when you want to erase device-local copies.
- Recent edits win by their timestamp; devices should have automatic date/time
  enabled for correct conflict resolution.
- This change deliberately does not modify the original anonymous Study tables.
