# Offline-2C-B — Google-authenticated word-flag receiver preparation

**Status: REVIEW ONLY. Nothing in this file has been applied to production.**

## Confirmed owner decision

- A report can be flagged and kept locally without signing in.
- The offline app will explain the scope and request **first-time consent** before transmitting any saved reports.
- After consent and Google sign-in, pending reports will be retried when the user **reopens the app online**, with a manual "Send pending flags" alternative. No mobile background job is promised.
- Only word-issue reports are transmitted. Audio, downloaded packs, legacy Study/SRS ratings, song data and unrelated local backups are **not** uploaded.
- The online Burmese Study application and its database records must stay unchanged.

This pull request prepares only the backend receiver and tests. No UI uploader,
OAuth-redirect setting, report transmission, or deployment is active. PR #19
(Offline-2C-A) is still a separate, open receipt-foundation change; the later
client uploader must use its `listPendingOfflineFlags()` and verified receipt
helper after that PR is reviewed and merged.

## Read-only production audit (Technical Supabase, 2026-11-17 Japan)

- Existing `public.burmese_app_words.id` is **integer**; the report's stored
  `word_id` can be an integer. The offline outbox currently sends it as text.
- No `burmese_app_word_issue_reports` table or `submit-word-flags` function
  exists yet. The unrelated `kg_chart_flags` and `kg_chart_reviews` tables
  must not be reused or modified by this feature.
- The project's security advisors already report warnings, including a
  `security_definer_view` error, mutable function search paths and executable
  `SECURITY DEFINER` functions. These are **pre-existing**, not caused by this
  change. Record and review them separately before production approval; do not
  broaden this PR to repair unrelated database objects.
- A manual Technical database backup was created on 2026-11-15; a sufficiently
  tested restoration of the report migration and relevant schema has **not**
  been independently established by this PR.
- The development container has Node but not the Supabase CLI or Deno. The SQL
  below is therefore a **review draft, not a CLI-generated migration**. Use
  `supabase migration new <name>` with the installed CLI to generate the actual
  timestamped migration file only after reviewing the CLI's `--help` and the
  current migration history. Do not run against production without approval.

## Proposed trust boundary

1. PWA explicitly constructs a report body from its local flag. **No user ID,
   role, review state, Study/SRS data or credentials are included.**
2. `POST /functions/v1/submit-word-flags` must receive a Supabase user JWT.
   `withSupabase({ auth: 'user' })` and platform `verify_jwt = true` verify it.
3. The function gets the account from verified Auth, checks Google's provider
   in server-controlled `app_metadata`, and rejects anonymous/password-only
   sessions. It rejects other browser origins and oversized/malformed reports.
4. An Edge Function server-only admin client inserts a tightly validated row.
   Neither the browser nor the JSON chooses `owner_user_id` or review status.
5. `UNIQUE(owner_user_id, client_flag_id)` prevents duplicate reports. A
   SHA-256 fingerprint rejects a reused client ID with different contents. A
   timed out request is retried with the same ID; successful retry receives the
   same server ID and timestamp. The local report is changed to `received` **only**
   after the uploader validates that acknowledgment.
6. Receiving does **not** mean fixing. A later private review workflow will
   triage, correct source vocabulary and publish an ordinary offline pack
   update without overwriting incomplete or unsynced user data.

The function applies a best-effort 50-report rolling-day limit per user. The
count and insert are not a single atomic transaction. Before deploying a
publicly reachable endpoint, evaluate and test an **atomic** per-user limit
or an external rate limiter; CORS and Google authentication alone do not
constitute complete abuse prevention. Mismatched payload replay returns 409.

## Schema for review — **DO NOT RUN**

This is a design sketch, intentionally not stored under `supabase/migrations/`.
Actual migration, grants and RLS must undergo isolated PostgreSQL tests first.

```sql
-- REVIEW DRAFT ONLY. DO NOT EXECUTE IN PRODUCTION.
CREATE TABLE public.burmese_app_word_issue_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_flag_id text NOT NULL CHECK (length(client_flag_id) BETWEEN 1 AND 128),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^[0-9a-f]{64}$'),
  word_id integer NOT NULL CHECK (word_id > 0),
  word_text text NOT NULL CHECK (length(word_text) BETWEEN 1 AND 200),
  source text NOT NULL DEFAULT '' CHECK (length(source) <= 60),
  devanagari text NOT NULL DEFAULT '' CHECK (length(devanagari) <= 200),
  meaning text NOT NULL DEFAULT '' CHECK (length(meaning) <= 500),
  issue_type text NOT NULL CHECK (issue_type IN ('deva','meaning','sentence','notaword')),
  comment text NOT NULL DEFAULT '' CHECK (length(comment) <= 1000),
  client_created_at timestamptz NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  review_status text NOT NULL DEFAULT 'received'
    CHECK (review_status IN ('received','under_review','resolved','rejected')),
  reviewed_at timestamptz,
  reviewer_note text,
  UNIQUE (owner_user_id, client_flag_id)
);

CREATE INDEX burmese_word_issue_review_queue_idx
  ON public.burmese_app_word_issue_reports (review_status, received_at);

ALTER TABLE public.burmese_app_word_issue_reports ENABLE ROW LEVEL SECURITY;
-- No direct browser policies. This is deliberate deny-by-default RLS.
REVOKE ALL ON public.burmese_app_word_issue_reports FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.burmese_app_word_issue_reports TO service_role;
-- Review-only service permission can be added in a separately audited phase.
```

`word_id` is intentionally **not a foreign key** at intake: someone can report
an old or removed word from a cached vocabulary pack, and that report should
still be received with its original word snapshot for manual verification.
The future reviewer must mark missing IDs as unresolved rather than silently
changing another word.

Do not grant browser INSERT/UPDATE/DELETE. `service_role` stays inside the Edge
Function, whose verified user checks are a mandatory guard because this role
bypasses row-level security. Restrict direct report SELECT until the dedicated
authenticated status endpoint is reviewed. Explicit no-policy RLS on this table
is expected to show an informational security-advisor notice.

## Required acceptance tests before enabling production

1. CLI-generated migration succeeds on isolated PostgreSQL; table has the
   expected grants, RLS, constraints and unique key. Verify existing word,
   SRS, song and audio metadata counts remain unchanged.
2. No JWT, invalid JWT, anonymous session and password-only session all fail;
   verified Google session succeeds. One user's reports cannot be seen by
   another user or inserted under another identity.
3. Two simultaneous submissions with the same local ID produce one database
   record and an identical receipt. Retry after forced timeout is safe.
4. Valid Burmese/deva text and old flags with empty `source` are accepted;
   malformed body, oversized body and invalid issue choices are rejected.
5. Rate-limit abuse, client-ID collision with different content, leaked admin
   role attempts and database unavailable cases leave local flags pending.
6. Add exact production and staging redirect URL allowlists, then test OAuth
   on Android Chrome and the iPad Home Screen app. No login loops; no login
   required for offline Study/SRS and playback.
7. First-time opt-in, later foreground-online automatic retry, sign-out,
   switching Google accounts, manual JSON export and verified server receipts
   must all work without clearing PWA site storage or uninstalling the app.
8. Production security-advisor findings and restoration readiness are reviewed
   and accepted. Require **separate explicit authorization** for production
   migration application and Edge Function deployment.

Sources:

- https://supabase.com/docs/guides/functions/auth
- https://supabase.com/docs/guides/functions/cors
- https://supabase.com/docs/guides/auth/social-login/auth-google
- https://supabase.com/docs/guides/auth/redirect-urls
- https://supabase.com/docs/guides/database/postgres/row-level-security
