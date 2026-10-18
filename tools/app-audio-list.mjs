// Phase 12: builds audio/app/texts.json — every sentence (Sentences + Dialogues) and every word (Study + SRS),
// in both voices, read straight from Supabase. Texts that already have a Speak clip are skipped (the app uses those).
//   node tools/app-audio-list.mjs      then      gen-app-audio.bat
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { VOICES, audioHash } from '../js/speak-audio.js';

// Reuse the app's own Supabase URL + anon key (js/supabase.js touches localStorage, so read it as text).
const src = readFileSync('js/supabase.js', 'utf8');
const URL_ = src.match(/SUPABASE_URL\s*=\s*'([^']+)'/)[1], KEY = src.match(/SUPABASE_ANON_KEY\s*=\s*'([^']+)'/)[1];
const H = { apikey: KEY, Authorization: `Bearer ${KEY}` };

async function all(table, select) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${URL_}/rest/v1/${table}?select=${select}&order=id`, { headers: { ...H, Range: `${from}-${from + 999}` } });
    if (!r.ok) throw new Error(`${table}: ${r.status} ${await r.text()}`);
    const rows = await r.json(); out.push(...rows);
    if (rows.length < 1000) return out;
  }
}

const speak = new Set(existsSync('audio/speak/clips.json') ? JSON.parse(readFileSync('audio/speak/clips.json', 'utf8')) : []);
const [sentences, words] = await Promise.all([all('burmese_app_sentences', 'burmese_text'), all('burmese_app_words', 'burmese_word')]);
const texts = new Set([...sentences.map(s => s.burmese_text), ...words.map(w => w.burmese_word)].map(t => (t || '').trim()).filter(Boolean));

const items = [];
let skipped = 0;
for (const text of texts) for (const v of ['m', 'f']) {
  const h = audioHash(text);
  if (speak.has(`audio/speak/${v}/${h}.mp3`)) { skipped++; continue; }
  items.push({ text, voice: VOICES[v], key: `${v}/${h}.mp3`, file: `audio/app/${v}/${h}.mp3` });
}
mkdirSync('audio/app', { recursive: true });
writeFileSync('audio/app/texts.json', JSON.stringify(items, null, 1) + '\n');
const chars = items.reduce((a, it) => a + it.text.length, 0);
console.log(`${sentences.length} sentences + ${words.length} words → ${texts.size} unique texts`);
console.log(`${items.length} clips listed in audio/app/texts.json (${chars.toLocaleString()} characters; ${skipped} already in Speak)`);
