import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateFlagPayload, readFlagPayload, MAX_FLAG_REQUEST_BYTES } from
  '../supabase/functions/submit-word-flags/validation.mjs';
import { handleFlagRequest, receiveOnce } from
  '../supabase/functions/submit-word-flags/receiver.mjs';

const origin = 'https://burmese-study-offline.pages.dev';
const makeFlag = (overrides = {}) => ({
  client_id: 'flag-device-123', word_id: '25', word_text: 'မင်္ဂလာပါ',
  source: 'words', devanagari: 'मिंगलाबा', meaning: 'hello',
  issue_type: 'meaning', comment: 'Meaning may be wrong',
  created_at: '2026-11-16T12:00:00.000Z', ...overrides
});
const request = (flag = makeFlag(), overrides = {}) => new Request(
  'https://project.supabase.co/functions/v1/submit-word-flags', {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin },
    body: JSON.stringify(flag), ...overrides
  });

function memoryAdapter() {
  const rows = new Map();
  const key = (owner, client) => `${owner}/${client}`;
  let nextId = 1;
  return {
    rows,
    async find(owner, client) { return rows.get(key(owner, client)) || null; },
    async countSince(owner, since) {
      return [...rows.entries()].filter(([k, r]) =>
        k.startsWith(`${owner}/`) && r.received_at >= since).length;
    },
    async insertIfAbsent(owner, flag, hash) {
      const recordKey = key(owner, flag.client_flag_id);
      if (rows.has(recordKey)) return null;
      const result = { id: `server-report-${nextId++}`,
        received_at: '2026-11-17T00:00:00.000Z', payload_sha256: hash };
      rows.set(recordKey, result);
      return result;
    }
  };
}

test('validates only the existing offline flag outbox fields and preserves snapshots', () => {
  const result = validateFlagPayload(makeFlag());
  assert.equal(result.client_flag_id, 'flag-device-123');
  assert.equal(result.word_id, 25);
  assert.equal(result.word_text, 'မင်္ဂလာပါ');
  assert.equal(result.devanagari, 'मिंगलाबा');
  assert.equal(result.meaning, 'hello');
  assert.equal(result.client_created_at, '2026-11-16T12:00:00.000Z');
  assert.equal(validateFlagPayload(makeFlag({ source: '' })).source,
    '', 'older device flags with no source must not be discarded');
});

test('rejects forged owners, review decisions, invalid word IDs and issue types', () => {
  for (const extra of [
    { user_id: 'forged' }, { owner_user_id: 'forged' },
    { review_status: 'resolved' }, { access_token: 'secret' },
    { word_id: '2147483648' }, { word_id: 'abc' }, { word_id: 0 },
    { issue_type: 'administrator' }, { comment: 'a'.repeat(1001) },
    { word_text: '' }, { created_at: 'yesterday' },
    { client_id: 'weird space' }
  ]) assert.throws(() => validateFlagPayload(makeFlag(extra)));
});

test('reads valid JSON and rejects non-JSON and oversized request bodies', async () => {
  assert.equal((await readFlagPayload(request())).word_id, 25);
  await assert.rejects(readFlagPayload(request(makeFlag(), {
    headers: { 'Content-Type': 'text/plain' }
  })), { status: 415 });
  const tooLarge = request(makeFlag(), {
    body: 'x'.repeat(MAX_FLAG_REQUEST_BYTES + 1)
  });
  await assert.rejects(readFlagPayload(tooLarge), { status: 413 });
  await assert.rejects(readFlagPayload(request(makeFlag(), { body: '{' })),
    { status: 400 });
});

test('accepts signed-in Google submitters only and derives identity server-side', async () => {
  let receivedOwner = null;
  const deps = {
    ownerId: 'verified-google-uid', googleVerified: true,
    allowedOrigins: [origin],
    receive: async (ownerId) => {
      receivedOwner = ownerId;
      return { id: 'server-123', received_at: '2026-11-17T00:00:00Z' };
    }
  };
  const ok = await handleFlagRequest(request(), deps);
  assert.equal(ok.status, 201);
  assert.equal((await ok.json()).status, 'received');
  assert.equal(receivedOwner, 'verified-google-uid');
  assert.equal((await handleFlagRequest(request(), {
    ...deps, googleVerified: false })).status, 403);
  assert.equal((await handleFlagRequest(request(), {
    ...deps, ownerId: null })).status, 403);
  assert.equal((await handleFlagRequest(request(), {
    ...deps, allowedOrigins: ['https://another-app.example'] })).status, 403);
  assert.equal((await handleFlagRequest(new Request('https://example.test', {
    method: 'GET', headers: { Origin: origin }
  }), deps)).status, 405);
});

test('idempotent retry yields the same receipt and another owner stays separate', async () => {
  const db = memoryAdapter();
  const flag = validateFlagPayload(makeFlag());
  const first = await receiveOnce(db, 'google-user-1', flag);
  const retry = await receiveOnce(db, 'google-user-1', flag);
  const other = await receiveOnce(db, 'google-user-2', flag);
  assert.equal(first.id, retry.id);
  assert.equal(retry.duplicate, true);
  assert.notEqual(first.id, other.id);
  assert.equal(db.rows.size, 2);
  await assert.rejects(receiveOnce(db, 'google-user-1',
    validateFlagPayload(makeFlag({ comment: 'different content; same client ID' }))),
    { status: 409 });
  assert.equal(db.rows.size, 2);
});

test('concurrent conflict resolves to the existing receipt without altering it', async () => {
  const db = memoryAdapter();
  const flag = validateFlagPayload(makeFlag());
  const actualInsert = db.insertIfAbsent.bind(db);
  db.insertIfAbsent = async (owner, payload, hash) => {
    await actualInsert(owner, payload, hash); // a competing request inserted first
    return null; // ON CONFLICT DO NOTHING
  };
  const result = await receiveOnce(db, 'google-user', flag);
  assert.equal(result.duplicate, true);
  assert.equal(db.rows.size, 1);
});

test('daily quota and backend errors never generate false receipts', async () => {
  const flag = validateFlagPayload(makeFlag());
  const quotaDb = {
    find: async () => null, countSince: async () => 50,
    insertIfAbsent: async () => assert.fail('over-quota report must not insert')
  };
  await assert.rejects(receiveOnce(quotaDb, 'user', flag), { status: 429 });
  const result = await handleFlagRequest(request(), {
    ownerId: 'user', googleVerified: true, allowedOrigins: [origin],
    receive: () => { throw new Error('database unavailable: secret detail'); }
  });
  assert.equal(result.status, 503);
  assert.equal((await result.json()).error, 'temporarily_unavailable');
});

test('production security config keeps JWT validation and this PR has no client auto-upload', () => {
  const config = readFileSync(new URL('../supabase/config.toml', import.meta.url), 'utf8');
  const edge = readFileSync(new URL('../supabase/functions/submit-word-flags/index.ts', import.meta.url), 'utf8');
  assert.match(config, /\[functions\.submit-word-flags\]\s*verify_jwt\s*=\s*true/);
  assert.match(edge, /withSupabase\(\{ auth: 'user' \}/);
  assert.match(edge, /user\.app_metadata\?\.provider === 'google'/);
  assert.doesNotMatch(edge, /verify_jwt\s*=\s*false|\bservice_role_key\b\s*=/i);
});
