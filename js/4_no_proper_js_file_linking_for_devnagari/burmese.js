// ═══ BURMESE TRANSLITERATION ENGINE ═══
// Single source of truth for Burmese → Devanagari conversion
// Uses longest-match-first algorithm

const CM = { // Consonant Map
  'က':'क','ခ':'ख','ဂ':'ग','ဃ':'घ','င':'ङ',
  'စ':'च','ဆ':'छ','ဇ':'ज','ဈ':'झ','ည':'ञ',
  'ဋ':'ट','ဌ':'ठ','ဍ':'ड','ဎ':'ढ','ဏ':'ण',
  'တ':'त','ထ':'थ','ဒ':'द','ဓ':'ध','န':'न',
  'ပ':'प','ဖ':'फ','ဗ':'ब','ဘ':'भ','မ':'म',
  'ယ':'य','ရ':'र','လ':'ल','ဝ':'व','သ':'थ',
  'ဟ':'ह','ဠ':'ळ','အ':'अ'
};

const CC = { // Conjunct Clusters
  'ကျ':'क्य','ကြ':'क्र','ကွ':'क्व','ကျွ':'क्य्व',
  'ချ':'ख्य','ခြ':'ख्र','ခွ':'ख्व',
  'ဂျ':'ग्य','ဂြ':'ग्र','ဂွ':'ग्व',
  'စျ':'च्य','ဆွ':'छ्व',
  'တျ':'त्य','တြ':'त्र','တွ':'त्व',
  'ထွ':'थ्व','ဒွ':'द्व',
  'ပျ':'प्य','ပြ':'प्र','ပွ':'प्व',
  'ဖျ':'फ्य','ဖြ':'फ्र',
  'ဗျ':'ब्य','ဗြ':'ब्र','ဗွ':'ब्व',
  'ဘျ':'भ्य','ဘွ':'भ्व',
  'မျ':'म्य','မြ':'म्र','မွ':'म्व',
  'လျ':'ल्य','လွ':'ल्व',
  'သျ':'थ्य','သြ':'थ्र','သွ':'थ्व',
  'ဟွ':'ह्व','ရွ':'र्व',
  'ကြွ':'क्र्व','ချွ':'ख्य्व','ပြွ':'प्र्व','မြွ':'म्र्व',
  'ှ':'ह्'
};

const VM = { // Vowel Map
  'ာ':'ा','ါ':'ा','ိ':'ि','ီ':'ी','ု':'ु','ူ':'ू',
  'ေ':'े','ဲ':'ै','ော':'ो','ို':'ो','း':'3',
  'ံ':'ं','့':'1','်':'्',
  'ွန်':'ून्','ွတ်':'ुत्','ွပ':'ुप','ွက်':'ुक्',
  'ိုက်':'ाइक्','ိုင်':'ाइन्','ောင်':'ाउन्','ောက်':'ाउक्',
  'ိုင်း':'ाइन्3','ောင်း':'ाउन्3'
};

const OVR = { // Common overrides
  'မြန်မာ':'म्यन्मा','ပါ':'बा2','တယ်':'दे2','လဲ':'ले3',
  'ကြ':'क्र','ပြီ':'प्यी2','ဘူး':'बू3','လား':'ला3',
  'ကောင်း':'कौन्3','ဟုတ်':'हुत्','ရောက်':'याउक्',
  'ချင်':'छिन्','သွား':'थ्वा3','စား':'सा3'
};

// Build sorted key list (longest first) for each map
const allKeys = {};
for (const map of [OVR, CC, VM, CM]) {
  for (const k of Object.keys(map)) {
    allKeys[k] = map[k];
  }
}
const sortedKeys = Object.keys(allKeys).sort((a, b) => b.length - a.length);

export function toDev(burmese) {
  if (!burmese) return '';
  let result = '';
  let i = 0;
  const text = burmese.trim();

  while (i < text.length) {
    let matched = false;
    for (const key of sortedKeys) {
      if (text.startsWith(key, i)) {
        result += allKeys[key];
        i += key.length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      result += text[i];
      i++;
    }
  }
  return result;
}

// Syllable breakdown - splits a Burmese word into syllable components
export function breakSyllables(word) {
  if (!word) return [];
  const syllables = [];
  let current = '';

  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const code = ch.charCodeAt(0);

    // Myanmar consonant range: U+1000 - U+1021
    if (code >= 0x1000 && code <= 0x1021 && current.length > 0) {
      // Check if next char is a medial (ျ ြ ွ ှ) - if so, this consonant starts new syllable
      const next = word[i + 1];
      const nextCode = next ? next.charCodeAt(0) : 0;
      const isMedial = nextCode >= 0x103B && nextCode <= 0x103E;

      // Check if previous ends with virama (်) 
      if (!current.endsWith('်')) {
        syllables.push(current);
        current = ch;
        continue;
      }
    }
    current += ch;
  }
  if (current) syllables.push(current);
  return syllables;
}
