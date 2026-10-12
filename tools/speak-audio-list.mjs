// Builds audio/speak/texts.json: every text the Speak tab can play, with its voice and file.
// Run after editing js/speak-data.js:   node tools/speak-audio-list.mjs
// Then generate the MP3s:               gen-speak-audio.bat  (or python tools/gen_speak_audio.py)
import { writeFileSync, mkdirSync } from 'node:fs';
import { PACKS, FEEL, STEPS } from '../js/speak-data.js';
import { VOICES, audioFile } from '../js/speak-audio.js';

const ME = { m: 'ကျွန်တော်', f: 'ကျွန်မ' };
const items = new Map();
const add = (text, voice) => items.set(voice + '|' + text, { text, voice: VOICES[voice], file: audioFile(text, voice) });

for (const v of ['m', 'f']) {
  for (const p of PACKS) for (const w of p.words) add(w.my, v);
  // Ladder sentences, built exactly as speak.js builds them (tiles joined).
  STEPS.forEach((s, i) => { if (i > 0) for (const w of FEEL) add(s.tiles(w, ME[v]).join(''), v); });
}

const list = [...items.values()];
mkdirSync('audio/speak', { recursive: true });
writeFileSync('audio/speak/texts.json', JSON.stringify(list, null, 1) + '\n');
console.log(`${list.length} clips listed in audio/speak/texts.json`);
