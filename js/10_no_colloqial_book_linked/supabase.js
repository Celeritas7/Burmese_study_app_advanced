// ═══ SUPABASE CLIENT ═══
const SUPABASE_URL = 'https://ulgrfumbwjovbjzjiems.supabase.co';
const STORAGE_KEY = 'burmese_app_supabase_key';

class SupabaseClient {
  constructor() {
    this.url = SUPABASE_URL;
    this.key = localStorage.getItem(STORAGE_KEY) || '';
    this.connected = false;
  }

  setKey(key) {
    this.key = key;
    localStorage.setItem(STORAGE_KEY, key);
  }

  get headers() {
    return {
      'apikey': this.key,
      'Authorization': `Bearer ${this.key}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  }

  async query(table, { select = '*', filters = [], order, limit, single = false } = {}) {
    let url = `${this.url}/rest/v1/${table}?select=${encodeURIComponent(select)}`;
    for (const f of filters) {
      url += `&${f}`;
    }
    if (order) url += `&order=${order}`;
    if (limit) url += `&limit=${limit}`;

    const res = await fetch(url, { headers: this.headers });
    if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
    const data = await res.json();
    return single ? data[0] || null : data;
  }

  async insert(table, row) {
    const res = await fetch(`${this.url}/rest/v1/${table}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify(row)
    });
    if (!res.ok) throw new Error(`Insert error: ${res.status}`);
    return res.json();
  }

  async update(table, id, updates) {
    const res = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
      method: 'PATCH',
      headers: this.headers,
      body: JSON.stringify(updates)
    });
    if (!res.ok) throw new Error(`Update error: ${res.status}`);
    return res.json();
  }

  async testConnection() {
    try {
      await this.query('burmese_app_consonants', { limit: 1 });
      this.connected = true;
      return true;
    } catch {
      this.connected = false;
      return false;
    }
  }

  // ─── APP-SPECIFIC QUERIES ───

  async getWords({ source, categoryId, limit: lim } = {}) {
    const filters = [];
    if (source) filters.push(`source=eq.${source}`);
    if (categoryId) filters.push(`category_id=eq.${categoryId}`);
    return this.query('burmese_app_words', {
      select: '*',
      filters,
      order: 'id',
      limit: lim
    });
  }

  async getCategories() {
    return this.query('burmese_app_categories', { order: 'display_order' });
  }

  async getConsonants() {
    return this.query('burmese_app_consonants', { order: 'display_order' });
  }

  async getAnchorWords() {
    return this.query('burmese_app_anchor_words', { order: 'id' });
  }

  async getAnchorForWord(wordText) {
    const anchors = await this.query('burmese_app_anchor_words');
    return anchors.filter(a => wordText.includes(a.burmese_word));
  }

  async getSpokesForAnchor(anchorWord) {
    const words = await this.query('burmese_app_words');
    return words.filter(w => w.burmese_word.includes(anchorWord) && w.burmese_word !== anchorWord);
  }

  async getSentences() {
    return this.query('burmese_app_sentences', { order: 'id' });
  }

  // ─── JUNCTION TABLE QUERIES ───

  // Get sentences linked to a word via junction table
  async getSentencesForWord(wordId) {
    return this.query('burmese_app_word_sentences', {
      select: 'sentence_id,rating,burmese_app_sentences(id,burmese_text,english_text,category)',
      filters: [`word_id=eq.${wordId}`]
    });
  }

  // Rate a word↔sentence link (0-3 stars)
  async rateSentenceLink(wordId, sentenceId, rating) {
    const res = await fetch(
      `${this.url}/rest/v1/burmese_app_word_sentences?word_id=eq.${wordId}&sentence_id=eq.${sentenceId}`,
      {
        method: 'PATCH',
        headers: this.headers,
        body: JSON.stringify({ rating })
      }
    );
    if (!res.ok) throw new Error(`Rate error: ${res.status}`);
  }

  // Batch: get sentence counts for multiple word IDs
  async getSentenceCountsForWords(wordIds) {
    if (!wordIds || wordIds.length === 0) return {};
    const links = await this.query('burmese_app_word_sentences', {
      select: 'word_id,sentence_id',
      filters: [`word_id=in.(${wordIds.join(',')})`]
    });
    const counts = {};
    for (const link of links) {
      counts[link.word_id] = (counts[link.word_id] || 0) + 1;
    }
    return counts;
  }

  // Search sentences containing a word (text match)
  async searchSentencesByText(wordText) {
    if (!wordText || wordText.length < 2) return [];
    const all = await this.getSentences();
    return all.filter(s => s.burmese_text && s.burmese_text.includes(wordText));
  }

  // Link a word to a sentence
  async linkWordSentence(wordId, sentenceId) {
    return this.insert('burmese_app_word_sentences', {
      word_id: wordId,
      sentence_id: sentenceId
    });
  }

  // Unlink a word from a sentence
  async unlinkWordSentence(wordId, sentenceId) {
    const res = await fetch(
      `${this.url}/rest/v1/burmese_app_word_sentences?word_id=eq.${wordId}&sentence_id=eq.${sentenceId}`,
      { method: 'DELETE', headers: this.headers }
    );
    if (!res.ok) throw new Error(`Delete error: ${res.status}`);
  }

  async getUserState() {
    return this.query('burmese_app_user_state', { order: 'next_review_at' });
  }

  async logProgress(event) {
    return this.insert('burmese_app_progress_events', {
      event_type: event.type,
      word_id: event.wordId,
      word_type: event.wordType || 'word',
      result: event.result,
      metadata: event.metadata || {}
    });
  }

  async upsertUserState(wordId, rating) {
    const existing = await this.query('burmese_app_user_state', {
      filters: [`word_id=eq.${wordId}`],
      single: true
    });

    const isCorrect = [1, 3].includes(rating);
    const now = new Date().toISOString();

    if (existing) {
      const streak = isCorrect ? (existing.streak || 0) + 1 : 0;
      const mastery = Math.min(5, Math.max(0, (existing.mastery_level || 0) + (isCorrect ? 1 : -1)));
      const intervals = [0, 4, 8, 24, 72, 168];
      const nextReview = new Date(Date.now() + intervals[mastery] * 3600000).toISOString();

      return this.update('burmese_app_user_state', existing.id, {
        correct_count: (existing.correct_count || 0) + (isCorrect ? 1 : 0),
        incorrect_count: (existing.incorrect_count || 0) + (isCorrect ? 0 : 1),
        streak,
        mastery_level: mastery,
        next_review_at: nextReview,
        last_practiced_at: now
      });
    } else {
      return this.insert('burmese_app_user_state', {
        word_id: wordId,
        word_type: 'word',
        correct_count: isCorrect ? 1 : 0,
        incorrect_count: isCorrect ? 0 : 1,
        streak: isCorrect ? 1 : 0,
        mastery_level: isCorrect ? 1 : 0,
        next_review_at: now,
        last_practiced_at: now
      });
    }
  }

  async getWordCounts() {
    const words = await this.getWords();
    const counts = {};
    for (const w of words) {
      const src = w.source || 'unknown';
      counts[src] = (counts[src] || 0) + 1;
    }
    return counts;
  }
}

export const db = new SupabaseClient();
