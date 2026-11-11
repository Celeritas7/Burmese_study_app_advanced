// Phase 4D: optional private sync for Song & Chants reviews only.
// The Study and regular SRS REST client remains unchanged and anonymous.
import { mergeSongReviewRecords, readAllSongReviewQueue, replaceSongReviewQueue,
  switchSongReviewAccount } from './song-review-queue.js';

export const SONG_REVIEW_TABLE = 'burmese_app_song_review_state';
const AUTH_SDK = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.57.0/+esm';

export const fromCloudRecord = row => ({
  wordId: String(row.word_id), songId: row.song_id,
  dueAt: new Date(row.due_at).toISOString(),
  masteryLevel: row.mastery_level, attempts: row.attempts,
  removed: row.removed, updatedAt: new Date(row.updated_at).toISOString()
});

export const toCloudRecord = row => ({
  word_id: row.wordId, song_id: row.songId, due_at: row.dueAt,
  mastery_level: row.masteryLevel, attempts: row.attempts,
  removed: row.removed, updated_at: row.updatedAt
});

function expectData(result, action) {
  if (result.error) throw new Error(`${action}: ${result.error.message || 'Server unavailable'}`);
  return result.data || [];
}

// Dependency-injected to test failures, concurrent local edits and safe merging.
export async function syncSongReviewData(client, storage, userId, isCurrent = () => true) {
  if (!userId) throw new Error('Sign in before syncing reviews');
  const checkAccount = () => { if (!isCurrent()) throw new Error('Account changed during sync'); };
  const readRemote = async () => expectData(await client.from(SONG_REVIEW_TABLE)
    .select('word_id,song_id,due_at,mastery_level,attempts,removed,updated_at')
    .eq('user_id', userId), 'Download song reviews').map(fromCloudRecord);

  const remote = await readRemote();
  checkAccount();
  const local = readAllSongReviewQueue(storage);
  const merged = mergeSongReviewRecords(local, remote);
  const remoteById = new Map(remote.map(row => [row.wordId, row]));
  const pending = merged.filter(row => !remoteById.has(row.wordId) ||
    row.updatedAt > remoteById.get(row.wordId).updatedAt);

  // The SQL RPC derives user_id from auth.uid(), not from client-supplied data,
  // and updates only when incoming.updated_at is newer (including tombstones).
  for (let i = 0; i < pending.length; i += 400) {
    checkAccount();
    expectData(await client.rpc('burmese_merge_song_reviews', {
      p_rows: pending.slice(i, i + 400).map(toCloudRecord)
    }), 'Upload song reviews');
  }

  // Re-read cloud and local after uploads. A second device—or this tab—may have
  // changed a review while our first request was in flight.
  const confirmed = await readRemote();
  checkAccount();
  const latestLocal = readAllSongReviewQueue(storage);
  const resolved = mergeSongReviewRecords(latestLocal, confirmed);
  if (!replaceSongReviewQueue(storage, resolved)) {
    throw new Error('Cannot save synced reviews on this device');
  }
  const confirmedById = new Map(confirmed.map(row => [row.wordId, row]));
  return {
    uploaded: pending.length,
    total: resolved.filter(row => !row.removed).length,
    needsRetry: resolved.some(row => !confirmedById.has(row.wordId) ||
      row.updatedAt > confirmedById.get(row.wordId).updatedAt)
  };
}

export class SongReviewCloudSync {
  constructor(storage = localStorage, sdkLoader = () => import(AUTH_SDK)) {
    this.storage = storage;
    this.sdkLoader = sdkLoader;
    this.client = null;
    this.user = null;
    this.status = 'local';
    this.message = '';
    this.lastSynced = null;
    this.listeners = new Set();
    this.starting = null;
    this.inFlight = null;
    this.syncUserId = null;
    this.dirty = false;
  }

  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  emit(queueChanged = false) {
    for (const callback of this.listeners) callback({ queueChanged });
  }

  getState() {
    return {
      signedIn: !!this.user,
      email: this.user?.email || '',
      status: this.status,
      message: this.message,
      lastSynced: this.lastSynced
    };
  }

  async initialize() {
    if (this.starting) return this.starting;
    this.status = 'connecting';
    this.emit();
    this.starting = (async () => {
      try {
        const { createClient } = await this.sdkLoader();
        const { db, SUPABASE_ANON_KEY } = await import('./supabase.js');
        // Always use the public anon key, never a legacy custom REST key.
        this.client = createClient(db.url, SUPABASE_ANON_KEY, {
          auth: { persistSession: true, autoRefreshToken: true,
            detectSessionInUrl: true, flowType: 'pkce' }
        });
        this.client.auth.onAuthStateChange((event, session) => {
          this.handleSession(session);
          if (session?.user && ['SIGNED_IN', 'INITIAL_SESSION', 'TOKEN_REFRESHED'].includes(event)) {
            // Do not await Supabase calls inside an auth callback (auth lock).
            Promise.resolve().then(() => this.sync().catch(() => {}));
          }
        });
        const { data, error } = await this.client.auth.getSession();
        if (error) throw error;
        this.handleSession(data.session);
        if (this.user) await this.sync();
        else if (this.status !== 'error') { this.status = 'local'; this.emit(); }
      } catch (err) {
        this.status = 'error';
        this.message = `Online sync unavailable: ${err.message}`;
        if (!this.client) this.starting = null; // Retry when connectivity returns.
        this.emit();
      }
    })();
    return this.starting;
  }

  handleSession(session) {
    const next = session?.user || null;
    const changed = next?.id !== this.user?.id;
    if (changed && next && !switchSongReviewAccount(this.storage, next.id)) {
      this.status = 'error';
      this.message = 'Cannot separate local reviews for this account. Check device storage.';
      this.emit();
      return;
    }
    this.user = next;
    if (!next) { this.status = 'local'; this.message = ''; }
    this.emit(changed && !!next);
  }

  async signInGoogle() {
    await this.initialize();
    if (!this.client) throw new Error(this.message || 'Authentication is unavailable');
    const redirectTo = new URL('./', window.location.href).href;
    const { error } = await this.client.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo }
    });
    if (error) throw error;
  }

  async signOut() {
    if (!this.client) return;
    const { error } = await this.client.auth.signOut({ scope: 'local' });
    if (error) throw error;
    this.handleSession(null);
    // Reviews stay in device storage so offline practice is still possible.
  }

  async sync() {
    if (!this.client || !this.user) return null;
    if (this.inFlight) {
      if (this.syncUserId === this.user.id) return this.inFlight;
      // A different account signed in while the earlier request was finishing.
      this.dirty = true;
      return null;
    }
    const userId = this.user.id;
    this.syncUserId = userId;
    this.status = 'syncing';
    this.message = '';
    this.emit();
    this.inFlight = (async () => {
      try {
        const result = await syncSongReviewData(this.client, this.storage, userId,
          () => this.user?.id === userId);
        if (this.user?.id === userId) {
          this.lastSynced = new Date().toISOString();
          this.status = 'synced';
          this.emit(true);
        }
        return result;
      } catch (err) {
        this.status = 'error';
        this.message = `Reviews remain on this device. ${err.message}`;
        this.emit();
        throw err;
      }
    })();
    try {
      const result = await this.inFlight;
      if (result?.needsRetry) this.dirty = true;
      return result;
    } finally {
      this.inFlight = null;
      this.syncUserId = null;
      const needsSync = this.dirty;
      this.dirty = false;
      if (needsSync && this.user) Promise.resolve().then(() => this.sync().catch(() => {}));
    }
  }

  // Never blocks the local Save / Review / Remove action.
  afterLocalChange() {
    if (!this.user) return;
    if (this.inFlight) this.dirty = true;
    else this.sync().catch(() => {});
  }
}
