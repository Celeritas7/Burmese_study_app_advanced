import { FlagRequestError, readFlagPayload } from './validation.mjs';

const DAILY_LIMIT = 50;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HASH_FIELDS = ['word_id', 'word_text', 'source', 'devanagari', 'meaning',
  'issue_type', 'comment', 'client_created_at'];

async function fingerprint(report) {
  const bytes = new TextEncoder().encode(JSON.stringify(HASH_FIELDS.map(field => report[field])));
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function sameReport(existing, expectedHash) {
  if (existing.payload_sha256 !== expectedHash)
    throw new FlagRequestError(409, 'idempotency_conflict',
      'This saved flag ID already belongs to a different report. Nothing was changed.');
  return existing;
}

function json(data, status = 200, extras = {}) {
  return Response.json(data, {
    status, headers: { 'Cache-Control': 'no-store', ...extras }
  });
}

// Only verified Google users can reach the persistence adapter. The caller's
// identity always comes from the server auth context, never from JSON.
export async function handleFlagRequest(request, { ownerId, googleVerified, allowedOrigins, receive }) {
  const origin = request.headers.get('origin');
  if (origin && !allowedOrigins.includes(origin))
    return json({ error: 'origin_not_allowed' }, 403);
  if (request.method !== 'POST')
    return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
  if (!ownerId || !googleVerified)
    return json({ error: 'google_sign_in_required' }, 403);

  try {
    const report = await readFlagPayload(request);
    const receipt = await receive(ownerId, report);
    return json({ client_id: report.client_flag_id, status: 'received',
      server_report_id: receipt.id, received_at: receipt.received_at },
      receipt.duplicate ? 200 : 201);
  } catch (error) {
    if (error instanceof FlagRequestError)
      return json({ error: error.code, message: error.message }, error.status,
        error.status === 429 ? { 'Retry-After': '3600' } : {});
    // Never return database details, JWTs, request bodies or credentials.
    return json({ error: 'temporarily_unavailable',
      message: 'Delivery was not confirmed. Keep the flag pending and retry later.' }, 503);
  }
}

// The database adapter MUST enforce UNIQUE(owner_user_id, client_flag_id).
// `insertIfAbsent` uses ON CONFLICT DO NOTHING and returns null on conflict.
// A competing retry then reads the same immutable receipt.
export async function receiveOnce(adapter, ownerId, report, now = new Date()) {
  const payloadHash = await fingerprint(report);
  const original = await adapter.find(ownerId, report.client_flag_id);
  if (original) return { ...sameReport(original, payloadHash), duplicate: true };

  const since = new Date(now.getTime() - ONE_DAY_MS).toISOString();
  const recent = await adapter.countSince(ownerId, since);
  if (recent >= DAILY_LIMIT)
    throw new FlagRequestError(429, 'daily_limit',
      'Daily report limit reached. Your flag remains pending.');

  const inserted = await adapter.insertIfAbsent(ownerId, report, payloadHash);
  if (inserted) return { ...inserted, duplicate: false };
  const concurrent = await adapter.find(ownerId, report.client_flag_id);
  if (!concurrent) throw new Error('Idempotent insert did not produce a receipt.');
  return { ...sameReport(concurrent, payloadHash), duplicate: true };
}
