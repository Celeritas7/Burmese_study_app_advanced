# Offline-2C — Word issue delivery and review contract

**Status:** 2C-A client receipt foundation only. **No receiving endpoint, database
migration, automatic upload, server review screen or production deployment is
included in this change.** Offline-2B Android/iPad SRS acceptance remains open.

## Existing safe checkpoint

PR #18 saves word-issue reports in the separate offline origin's IndexedDB
database `burmese-study-offline-flags-v1`. Each report has a stable `id`, a
snapshot of the word, issue type, optional comment, `status: pending`, and
`provenance: device-only-unsubmitted`. Reopening, reconnection and exporting
JSON must not delete these records. The online Burmese Study app and its
existing Supabase tables remain untouched.

The offline edition deliberately disables Google song-review account sync.
Its old shared Study/SRS records have no verified ownership. **Do not infer an
account identity from a word ID, stored anon API key or a device-only report.**

## 2C-A: safely acknowledging delivery (this PR)

- `listPendingOfflineFlags()` reads only the pending local reports. It does
  not call the network, alter a row or silently resend anything.
- `recordOfflineFlagServerReceipt(receipt)` records `received` only for an
  existing local report when a future trusted uploader has validated a server
  acknowledgement. The receipt must include a matching `client_id`, nonempty
  `server_report_id`, `received_at`, and `status: received`.
- Duplicate acknowledgements for the same report/server ID are idempotent.
  Conflicting server IDs and unknown local report IDs are rejected. Both
  pending and received reports remain locally stored and JSON-exportable.
- JSON exports distinguish fully pending, partially received and fully received
  report sets; the export itself never changes local delivery state.
- The helper **does not authenticate the server**. The future uploader must
  do that; never pass an arbitrary string, network error, or mere HTTP 200 to
  the helper as if it were a receipt.
- No caller invokes this receipt helper in the shipped UI yet. The Android
  report already saved before 2C-A therefore remains `pending` and is not
  uploaded or deleted by this PR.

## Proposed receiving contract (2C-B / 2C-C; not implemented yet)

The preferred transport is a **user-authenticated Supabase Edge Function**
that checks the caller's JWT and respects narrowly scoped database access.
The device sends each report's stable client ID, word/source identifiers,
word snapshot, issue type, comment, and creation time. No Study/SRS history,
audio data, login secret or unrelated local backup is sent.

Proposed request to `POST /functions/v1/submit-word-flags`:

```json
{
  "client_id": "flag-device-generated-id",
  "word_id": "123",
  "word_text": "example",
  "source": "words",
  "issue_type": "meaning",
  "comment": "Meaning seems incorrect",
  "created_at": "2026-11-16T12:00:00Z"
}
```

Only after a successful, authenticated server response may the future client
record a receipt with this format:

```json
{
  "client_id": "flag-device-generated-id",
  "status": "received",
  "server_report_id": "server-generated-stable-id",
  "received_at": "2026-11-16T12:00:01Z"
}
```

Required properties:

1. **Idempotent receiving:** enforce uniqueness for the authenticated owner
   plus `client_id`. Retrying after a timeout returns the same server report
   identifier; it must not create duplicates.
2. **Explicit trust boundary:** derive ownership from verified server-side
   authentication, not a user ID in the request. Reject invalid source,
   issue type, length, timestamps, oversized payloads and unknown words.
   Never expose a service-role/secret key in public JavaScript.
3. **RLS and least privilege:** the eventual report table requires RLS and
   explicit grants. Reporters may submit and see their own receipts; they
   cannot change review decisions or other users' reports. Reviewing and
   correcting vocabulary is privileged server/admin work, not an ordinary
   client UPDATE on a shared vocabulary table.
4. **Honest states:** `pending` means device-only; `received` means accepted
   by the server, **not fixed**. Additional server review states such as
   `under_review`, `resolved` and `rejected` require an authenticated status
   endpoint. Corrections reach offline vocabulary only after its normal
   downloaded-pack update.
5. **Lossless retries:** offline, sign-in-required, timeout and server failure
   all leave reports pending with the same ID. Reconnect must never clear
   local storage, reinstall the PWA, replace a complete vocabulary pack with
   a partial one, or automatically delete reports after delivery.
6. **Separation:** no migration of legacy Study/SRS ratings, song history or
   online-app records is part of 2C. That belongs to a separately reviewed
   Offline-3 ownership/synchronization design.

### Authentication decision required before 2C-B

The offline PWA does not currently hold a signed-in account session.
Authenticated delivery requires an explicit, separate sign-in and iPad/Android
OAuth acceptance, without enabling unrelated Study/SRS sync. An alternative
anonymous receiving service would require its own abuse prevention, rate
limits, moderation and privacy contract; a public anonymous PostgREST `INSERT`
policy is **not** an acceptable shortcut.

Do not silently choose one model or enable auto-delivery until the owner has
approved it. When authentication is available, prefer an explicit first-time
consent to sync issue reports, followed by safe automatic retries and a
manual **Send pending flags** option.

## Review and deployment gates

- [x] 2C-A: local receipt contract, no network side effects, regression tests
- [ ] Confirm authenticated vs moderated anonymous submission
- [ ] Design and review receiving table, RLS, grants, idempotency and admin role
- [ ] Validate migration and RLS in isolated PostgreSQL; inspect backups and
      security warnings before requesting production authorization
- [ ] Add and test a server endpoint and secure status/review interface
- [ ] Add a disabled-by-default client uploader and opt-in automatic retries
- [ ] Validate one genuine report end-to-end on staging, including duplicate,
      timeout, offline reopen and ownership boundary cases
- [ ] Obtain explicit authorization for production SQL and function deployment
- [ ] Validate Android **and** iPad: previously saved flags, vocabulary packs,
      recorded audio and SRS data survive app-version upgrades

This document is a contract and risk register, **not a runnable migration**.
When implementing SQL, generate a migration with the Supabase CLI, follow the
project's reviewed migration history, and deploy only after approval.

Official references:

- [Supabase Edge Function authentication](https://supabase.com/docs/guides/functions/auth)
- [Supabase Postgres RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)
