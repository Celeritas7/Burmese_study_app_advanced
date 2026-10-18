// ═══ APP AUDIO — 🔊 for Sentences, Dialogues, Study and SRS (Phase 12) ═══
// Clips are content-hashed MP3s (same naming as Speak: <voice>/<hash>.mp3).
//   • Speak texts  → audio/speak/<v>/<hash>.mp3 on GitHub (precached by sw.js)
//   • Everything else → Supabase Storage, public bucket "audio" (cached on first play, or Settings → Download all)
// A text with no clip shows the 🔊 'off' state + toast — never silence.
import { audioHash } from './speak-audio.js?v=1';
import { getSettings } from './settings.js';

export const AUDIO_BASE = 'https://ulgrfumbwjovbjzjiems.supabase.co/storage/v1/object/public/audio/';
export const AUDIO_CACHE = 'burmese-audio-v1';   // same cache sw.js uses

const APP = new Set(), SPEAK = new Set();
const load = (url, set) => fetch(url, { cache: 'no-cache' }).then(r => r.json()).then(a => a.forEach(f => set.add(f))).catch(() => {});
export const clipsReady = Promise.all([load('audio/app/clips.json', APP), load('audio/speak/clips.json', SPEAK)])
  .then(() => refreshAudio(document));

const norm = t => String(t || '').trim();
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// Voice rule: ကျွန်မ → ♀, ကျွန်တော် → ♂, otherwise Settings → Your voice.
export function forcedVoice(t) { t = norm(t); return t.includes('ကျွန်မ') ? 'f' : t.includes('ကျွန်တော်') ? 'm' : null; }
export function userVoice() { try { return getSettings().voice === 'f' ? 'f' : 'm'; } catch { return 'm'; } }
export const voiceFor = t => forcedVoice(t) || userVoice();

// URL of the clip for this text + voice, or null if none was generated. Speak's local clip wins.
export function clipUrl(text, v) {
  const h = audioHash(norm(text)), local = `audio/speak/${v}/${h}.mp3`;
  if (SPEAK.has(local)) return local;
  return APP.has(`${v}/${h}.mp3`) ? AUDIO_BASE + `${v}/${h}.mp3` : null;
}
export const hasClip = (text, v) => !!clipUrl(text, v || voiceFor(text));

// ── Markup ──
// Round 34px 🔊 (lists) — opts: { voice, parch (on the cream word card), corner (top-right of the card), label }
export function sayBtn(text, { voice, parch, corner, label } = {}) {
  const v = voice || voiceFor(text), known = APP.size + SPEAK.size > 0;
  const st = known && !clipUrl(text, v) ? 'off' : 'idle';
  const cls = ['sp-btn', 'sm', 'ghost', 'sp-say', label ? '' : 'au-rnd', parch ? 'parch' : '', corner ? 'au-corner' : ''].filter(Boolean).join(' ');
  return `<button class="${cls}" data-au="say" data-t="${esc(norm(text))}"${voice ? ` data-v="${voice}"` : ''} data-state="${st}" aria-label="Play">`
    + `<i class="sp-say-ic"></i>${label || ''}</button>`;
}
// ♀/♂ chip — only when the text itself forces a voice.
export function voiceChip(text) {
  const v = forcedVoice(text);
  if (!v) return '';
  return `<span class="au-chip ${v}">${v === 'f' ? '♀' : '♂'}</span>`;
}
// Re-check off/idle on buttons already on screen (called once the clip lists load).
export function refreshAudio(root = document) {
  root.querySelectorAll?.('[data-au="say"]').forEach(b => {
    if (b.dataset.state === 'playing' || b.dataset.state === 'loading') return;
    b.dataset.state = clipUrl(b.dataset.t, b.dataset.v || voiceFor(b.dataset.t)) ? 'idle' : 'off';
  });
}

// ── Playback ──
let cur = null, runId = 0, allSeq = 0;
const setState = (btn, st) => { if (btn) btn.dataset.state = st; };
export function toast(m = 'No audio for this one yet') {
  let t = document.getElementById('sp-toast');
  if (!t) { t = document.createElement('div'); t.id = 'sp-toast'; t.className = 'sp-toast'; document.body.appendChild(t); }
  t.textContent = m; t.classList.add('show'); clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), 1600);
}
export function stop() {
  const c = cur; cur = null;
  if (!c) return;
  try { c.audio.pause(); } catch {}
  setState(c.btn, 'idle'); c.done(false);
}
export function stopAll() { runId++; stop(); }

// Resolves true when the clip played to the end, false if missing / failed / interrupted.
export async function play(text, { voice, btn } = {}) {
  stop();
  await clipsReady;
  const v = voice || voiceFor(text), url = clipUrl(text, v);
  if (!url) { setState(btn, 'off'); toast(); return false; }
  return new Promise(res => {
    const a = new Audio(url);
    let settled = false;
    const c = cur = { audio: a, btn, done: ok => { if (!settled) { settled = true; res(ok); } } };
    const end = (st, ok) => { if (cur === c) cur = null; setState(btn, st); c.done(ok); };
    setState(btn, 'loading');
    a.onplaying = () => { if (cur === c) setState(btn, 'playing'); };
    a.onended = () => end('idle', true);
    a.onerror = () => { if (cur === c) { end('off', false); toast(); } };
    a.play().catch(err => { if (cur !== c) return; err && err.name === 'NotAllowedError' ? end('idle', false) : a.onerror(); });
  });
}

// Plays lines in order; onLine(i) fires as each starts, onLine(-1) at the end. Stops at the first line with no clip.
export async function playAll(items, onLine = () => {}) {
  stop();
  const id = ++runId, seq = ++allSeq;
  for (let i = 0; i < items.length && id === runId; i++) {
    onLine(i);
    if (!(await play(items[i].text, { voice: items[i].voice, btn: items[i].btn }))) break;
  }
  if (seq === allSeq) onLine(-1);   // a newer Play all owns the highlight
}

// One capture-phase listener for every 🔊 in the app: runs before card/reveal click handlers and stops them,
// so tapping 🔊 on a practice-mode sentence plays it without revealing the English.
document.addEventListener('click', e => {
  const b = e.target.closest?.('[data-au="say"]');
  if (!b) return;
  e.stopPropagation(); e.preventDefault();
  if (b.dataset.state === 'playing' || b.dataset.state === 'loading') { stopAll(); return; }   // tap again = stop
  runId++;   // a single tap cancels any Play all
  play(b.dataset.t, { voice: b.dataset.v, btn: b });
}, true);

// Auto-play on reveal (Settings → Play sound on reveal, off by default).
export function autoPlay(text, btn) { try { if (getSettings().autoPlay) play(text, { btn }); } catch {} }

// ── Offline: Settings → Download all audio ──
export async function allClipUrls() {
  await clipsReady;
  return [...[...SPEAK], ...[...APP].map(k => AUDIO_BASE + k)].map(u => new URL(u, location.href).href);
}
export async function savedCount() {
  try {
    const urls = await allClipUrls(), c = await caches.open(AUDIO_CACHE);
    const have = new Set((await c.keys()).map(r => r.url));
    return { saved: urls.filter(u => have.has(u)).length, total: urls.length };
  } catch { return { saved: 0, total: 0 }; }
}
// Fetches every missing clip into the audio cache, 6 at a time. onProgress(done, total).
export async function downloadAll(onProgress = () => {}) {
  const urls = await allClipUrls(), c = await caches.open(AUDIO_CACHE);
  const have = new Set((await c.keys()).map(r => r.url));
  const todo = urls.filter(u => !have.has(u));
  let done = 0, failed = 0, i = 0;
  onProgress(0, todo.length);
  const worker = async () => {
    while (i < todo.length) {
      const u = todo[i++];
      try { const r = await fetch(u, { mode: 'cors' }); if (r.ok) await c.put(u, r); else failed++; } catch { failed++; }
      onProgress(++done, todo.length);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { fetched: todo.length - failed, failed };
}
