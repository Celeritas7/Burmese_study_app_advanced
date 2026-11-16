// Pure validation shared by the Edge Function and Node's offline tests.
// Keep this independent of browser storage, Supabase SDKs and authentication.
export const MAX_FLAG_REQUEST_BYTES = 16 * 1024;
export const FLAG_ISSUE_TYPES = Object.freeze(['deva', 'meaning', 'sentence', 'notaword']);

const ALLOWED_FIELDS = new Set([
  'client_id', 'word_id', 'word_text', 'source', 'devanagari', 'meaning',
  'issue_type', 'comment', 'created_at'
]);

export class FlagRequestError extends Error {
  constructor(status, code, message) {
    super(message);
    this.name = 'FlagRequestError';
    this.status = status;
    this.code = code;
  }
}

function badField(field) {
  throw new FlagRequestError(422, 'invalid_report', `Invalid ${field} in the saved report.`);
}

function textField(body, field, maximum, required = false) {
  const value = body[field] ?? '';
  if (typeof value !== 'string' || value.length > maximum) badField(field);
  const trimmed = value.trim();
  if (required && !trimmed) badField(field);
  return trimmed;
}

export function validateFlagPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new FlagRequestError(422, 'invalid_report', 'The saved report must be an object.');
  if (Object.keys(body).some(key => !ALLOWED_FIELDS.has(key)))
    throw new FlagRequestError(422, 'invalid_report', 'The report contains an unsupported field.');

  const clientId = textField(body, 'client_id', 128, true);
  if (!/^[a-zA-Z0-9._:-]{1,128}$/.test(clientId)) badField('client_id');

  const rawWordId = body.word_id;
  if (typeof rawWordId !== 'string' && !Number.isSafeInteger(rawWordId))
    badField('word_id');
  const wordIdText = String(rawWordId);
  if (!/^[1-9]\d{0,9}$/.test(wordIdText)) badField('word_id');
  const wordId = Number(wordIdText);
  if (!Number.isSafeInteger(wordId) || wordId > 2147483647) badField('word_id');

  const issueType = textField(body, 'issue_type', 20, true);
  if (!FLAG_ISSUE_TYPES.includes(issueType)) badField('issue_type');

  const createdAt = textField(body, 'created_at', 40, true);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(createdAt) ||
      !Number.isFinite(Date.parse(createdAt))) badField('created_at');

  return {
    client_flag_id: clientId,
    word_id: wordId,
    word_text: textField(body, 'word_text', 200, true),
    // Older offline flags can contain an empty source. Preserve them for review.
    source: textField(body, 'source', 60),
    devanagari: textField(body, 'devanagari', 200),
    meaning: textField(body, 'meaning', 500),
    issue_type: issueType,
    comment: textField(body, 'comment', 1000),
    client_created_at: createdAt
  };
}

export async function readFlagPayload(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || ''))
    throw new FlagRequestError(415, 'content_type_required', 'Send a JSON report.');

  const advertised = Number(request.headers.get('content-length'));
  if (Number.isFinite(advertised) && advertised > MAX_FLAG_REQUEST_BYTES)
    throw new FlagRequestError(413, 'report_too_large', 'The report is too large.');

  const reader = request.body?.getReader();
  if (!reader) throw new FlagRequestError(400, 'empty_report', 'No report was provided.');
  let size = 0;
  const chunks = [];
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FLAG_REQUEST_BYTES) {
        await reader.cancel();
        throw new FlagRequestError(413, 'report_too_large', 'The report is too large.');
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  let body;
  try { body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)); }
  catch { throw new FlagRequestError(400, 'bad_json', 'The report is not valid JSON.'); }
  return validateFlagPayload(body);
}
