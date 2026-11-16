# Offline-2 — Burmese Study Offline device validation

The separate Cloudflare Pages edition is `https://burmese-study-offline.pages.dev/`.
**Do not use KG Chart Offline for this checklist.** The original online Burmese
Study app is a different origin and must keep its existing data and behavior.

## What has actually been checked

Read-only source audit and a separate live Chrome test session on 2026-11-15:

| Check | Browser observation | Physical devices |
| --- | --- | --- |
| KG Book | 285 words saved | Pending |
| Main Words | 148 words saved | Pending |
| Recipes | 161 words saved | Pending |
| Colloquial Burmese | 227 words saved | Pending |
| App shell | 41/41 reported ready on deployed version | Pending |
| Study | Card revealed and a rating selected | Pending |
| SRS | Rated word entered queue; later review survived reload | Pending |
| Multiple-choice quiz | Correct answer scored | Pending |
| Typing and matching | Both loaded; one matching pair scored | Pending |
| Recorded audio | Cache fix merged via PR #16; physical device check remains | Pending |
| Interrupted downloads | Automated unit test passes for previous-pack retention | Pending |
| Cloudflare version upgrade | PR #16 merged; device update behavior not yet verified | Pending |
| Word issue flags | PR #18 merged and deployed; local save and export available | Physical acceptance in progress |

The table is **not** a claim that airplane mode or Safari works yet.

## Android acceptance, in order

1. Open the **offline** URL in Chrome. Use **Install app** or **Add to Home
   screen**. Keep the existing online Burmese app installed. Verify the new icon
   opens **Burmese Study Offline**, with the green download banner.
2. With Wi-Fi on, tap **Download words → Settings → Offline**. Download **all
   four** vocabulary packs. Record the saved counts; they may change as public
   vocabulary is edited. Tap **Update** on one already saved pack, and confirm
   it remains complete. Do not remove the app or clear site data.
3. Tap **App files for offline → Download files**. Wait for the verified ready
   count, not just a finished progress bar. Tap **Audio for offline → Download
   all** on Wi-Fi. Note the saved/total count and retry any failed recordings.
   Test both a known recorded Study/SRS clip and a Speak clip while online.
4. Turn on **Airplane mode**, then explicitly check that **Wi-Fi and mobile
   data are off**. Completely close the standalone app from the app switcher.
   Reopen **from its home-screen icon**, not an already open Chrome tab.
5. Confirm Home and **Study** open. Choose each downloaded source in turn and
   start a short session. Reveal meanings. Rate a word **Nope** to make it due
   immediately; verify the app does not claim that it uploaded the rating.
6. Open **SRS** and confirm the newly rated word is **Due Now**. Review it and
   choose **Good**. Fully close/reopen again, still offline: the SRS queue and
   review date must remain. Also confirm all four pack counts are still shown.
7. Open **Study → Quiz Mode**. Complete at least one multiple-choice question,
   one typing question and one correctly matched pair. Verify scoring and no
   connection error. Confirm the rated answers affect local SRS as expected.
8. Tap a **recorded** audio button in Study/SRS, and play a known bundled Speak
   clip. Confirm sound actually plays offline; an unavailable recording must
   give a visible unavailable state rather than pretending to play. Test the
   voice choices when both recordings exist.
9. Reconnect Wi-Fi. Confirm the offline edition still has its packs and SRS
   state, then separately open the **online** Burmese app and verify its older
   records were **not** overwritten. Sharing progress between apps is not yet
   supported.

### Word issue flags (PR #18 deployed; physical checks still required)

1. Still in **Airplane mode**, open Study, start a downloaded vocabulary pack,
   reveal a word and tap **🚩 Flag**. Select **Wrong meaning**, add a brief
   comment, then tap **Save Flag Offline**. The confirmation must say **saved
   locally and pending delivery**, never "sent".
2. Try a second word with a different issue type. Close and reopen the
   installed app without internet. Go to **Settings → Offline → Word issue
   flags** and confirm **2 pending flags**.
3. Tap **Download flag reports**. Verify the JSON includes both word snapshots,
   issue types and comments. Try **Copy reports** and paste into a note; if the
   OS denies clipboard access, verify the download fallback works.
4. Reconnect and reopen. The reports must still say **pending**. No automatic
   upload or progress synchronization has been implemented, and exported
   reports are not deleted automatically.
5. Repeat on the iPad. Each device keeps its own outbox. Do not clear website
   storage or uninstall until you have exported the pending reports.

**Server delivery remains blocked:** There is no verified word-flag receiving
endpoint or owner-scoped policy in this app. A separate, reviewed backend
contract will be necessary before a real **Send pending flags** action can be
enabled. This is not part of Offline-3 Study/SRS progress synchronization.

## Interrupted-download acceptance

Do this **after** a complete pack exists. With a weak/throttled connection,
tap **Update** on that pack and interrupt connectivity while the button says
**Downloading…**. The last complete pack must remain visible and usable;
reconnection followed by **Retry** must finish. A small pack can finish too
quickly for this physical test; report **not reproduced**, not a false pass.

For audio, interrupt **Download all** mid-run, reconnect, then retry. Previously
saved recordings should stay saved. Never use **Clear site data**, uninstall,
or iOS **Remove Website Data** as a way of interrupting downloads: those actions
can remove user-owned offline ratings and vocabulary.

## iPad acceptance

1. Use **Safari** to open the offline URL and **Share → Add to Home Screen**.
   Confirm it creates a separate app from the online edition.
2. Repeat Android steps **2–8** on the iPad itself. Downloads and local ratings
   belong to each device separately; Android's downloaded content does not
   automatically appear on the iPad.
3. In Airplane mode, verify Wi-Fi remained off (iPad can remember Wi-Fi as on
   after Airplane mode). Swipe away the app from the app switcher and relaunch
   from the icon. Repeat once after a device restart if practical.
4. After reconnecting, confirm the offline data remains. Do **not** expect SRS
   ratings to sync between iPad, Android and the online app until Offline-3.

## Cloudflare-update acceptance — gated

Do **not** run a new deployment just for testing without explicit approval.
After this PR is approved, merged and published by the user:

1. On each device record one pack count and one SRS item before the update.
2. Open the offline edition with Wi-Fi, then **Settings → Offline → Download
   files / Check again**. Allow the service worker update to complete; close
   and reopen the app so it loads one complete version.
3. Go back to Airplane mode, close/reopen and repeat Study, Quiz, SRS and audio.
   The new app shell must work and all existing vocabulary/rating records must
   remain. If an update is interrupted, the older complete shell must keep
   working; retry after reconnecting.

## What is deliberately not promised

- Study/SRS records are labelled `unowned-device-only` and stay in local
  IndexedDB. No migration, account inference, shared-vocabulary ID adoption, or
  upload is attempted by Offline-2.
- The current **Back up device data** JSON is partial: it **does not include**
  downloaded packs or offline Study/SRS ratings. Do not treat it as a recovery
  mechanism for those records.
- Server-linked sentences, cloud Speak logging and certain lesson relationships
  still require internet. Only downloaded vocabulary, supported local study
  routes and recorded clips that were saved are in scope.
- Browser storage can be evicted under severe storage pressure or when site
  data is cleared, especially on iPad. A passing reopen test cannot guarantee
  permanent retention. Recovery/export and account-safe sync remain follow-up
  work.

## Send back these results

For **each** device: model, Android/iPadOS version, installation method,
four pack counts, app file count, audio saved/total, Study, SRS, three quiz
modes, audio playback, airplane-mode close/reopen, interrupted download, and
reconnect result. Mark each **Pass / Fail / Not reproduced**, with a screenshot
of any failure. Do not include passwords, tokens, or personal progress exports.
