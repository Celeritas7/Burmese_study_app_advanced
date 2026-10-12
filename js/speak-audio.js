// ═══ SPEAK AUDIO — file naming ═══
// Pre-generated MP3s live in audio/speak/<voice>/<hash>.mp3, one per spoken text.
// voice: 'm' = male (ကျွန်တော်), 'f' = female (ကျွန်မ) — follows the Speak tab's ♂/♀ toggle.
// Shared by speak.js (playback) and tools/speak-audio-list.mjs (generation list), so names always match.

export const VOICES = { m: 'my-MM-ThihaNeural', f: 'my-MM-NilarNeural' };

// FNV-1a 32-bit over UTF-16 code units → 8 hex chars.
export function audioHash(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export const audioFile = (text, voice) => `audio/speak/${voice}/${audioHash(text)}.mp3`;
