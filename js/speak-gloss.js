// ═══ SPEAK GLOSSARY — word-by-word breakdown for hints ═══
// breakdown(text) splits a phrase into known pieces (longest match first) so the 💡 hint can show
// what each part means and where the sound differs from the spelling.
// Burmese: [roman, meaning, sound tip (optional)]. Add pieces here and every pack picks them up.

export const GLOSS = {
  // Sentence endings & particles
  'တယ်': ['deh', 'statement ending', 'Spelled "ta", said "deh". Between vowels the d is a light tap, so it can sound like Hindi रे.'],
  'ပါ': ['ba', 'polite softener', 'Spelled "pa", said "ba" after a vowel or nasal.'],
  'လား': ['la', 'yes/no question ending'],
  'လဲ': ['leh', 'question ending for what / where / how much'],
  'ဘူး': ['bu', 'negative ending (with မ before the verb)'],
  'မ': ['ma', 'not — goes right before the verb'],
  'နော်': ['naw', 'softener: "…okay?"'],
  'မယ်': ['meh', 'will / let’s (future)'],
  'ပြီ': ['bi', 'already / now (a change has happened)', 'Spelled "pyi", said "bi" here.'],
  'ကြ': ['ja', 'all of us (plural action)', 'Spelled "kya", said "ja" after a vowel.'],
  'ချင်': ['chin', 'want to'],
  'ကို': ['go', 'to / for (marks who it’s about)', 'Spelled "ko", said "go" after a vowel or nasal.'],
  'နဲ့': ['neh', 'don’t (with မ: မ…နဲ့)'],
  'ရအောင်': ['ya aung', 'let’s'],
  'လို့': ['lo', 'to / for (purpose)'],
  'စရာ': ['sa ya', 'something to … (worth doing)'],
  'ကဲ့': ['keh', 'polite "yes" particle'],

  // People
  'ကျွန်တော်': ['kya-naw', 'I (said by a man)'],
  'ကျွန်မ': ['kya-ma', 'I (said by a woman)'],
  'မင်း': ['min', 'you (casual — close friends only)'],
  'လူ': ['lu', 'person'],
  'ညီလေး': ['nyi lay', 'little brother — how you call a young waiter'],

  // Feelings & verbs
  'အိပ်': ['eik', 'sleep'],
  'ဗိုက်': ['baik', 'belly'],
  'ဆာ': ['sa', 'hungry'],
  'ပြည့်': ['pyay', 'full'],
  'ရေ': ['yay', 'water'],
  'ငတ်': ['ngat', 'thirsty / starved'],
  'ပင်ပန်း': ['pin ban', 'tired', 'Spelled "pan", said "ban": the nasal before it voices the p.'],
  'ပူ': ['pu', 'hot'],
  'ချမ်း': ['chan', 'cold (feeling)'],
  'ပျော်': ['pyaw', 'happy'],
  'ပျင်း': ['pyin', 'bored / lazy'],
  'နေ': ['nay', 'stay / be (နေကောင်း = be well)'],
  'ကောင်း': ['kaung', 'good'],
  'ကောင်းကောင်း': ['kaung kaung', 'well (doubled = adverb)'],
  'အလုပ်': ['a-lok', 'work'],
  'များ': ['mya', 'many (အလုပ်များ = lots of work = busy)'],
  'ကြောက်': ['kyauk', 'afraid'],
  'သတိ': ['tha-di', 'mind / memory'],
  'ရ': ['ya', 'get / can (သတိရ = memory comes = miss, remember)'],
  'ရှက်': ['shet', 'shy / embarrassed'],
  'သဝန်တို': ['tha-wun to', 'jealous'],
  'သဝန်': ['tha-wun', 'envy'],
  'တို': ['to', 'short (သဝန်တို = jealous)'],
  'ဟုတ်': ['hoke', 'true / right', 'Ends in a glottal catch, so the next consonant sounds doubled: ဟုတ်ကဲ့ ≈ होक्कै.'],
  'ကျေးဇူး': ['kyay zu', 'kindness / favour'],
  'တင်': ['tin', 'offer up (ကျေးဇူးတင် = thank)', 'Spelled "tin"; after a vowel it softens to "din".'],
  'တောင်းပန်': ['taung ban', 'apologise'],
  'ခဏ': ['kha na', 'a moment'],
  'လို': ['lo', 'need (လိုချင် = want)'],
  'စား': ['sa', 'eat'],
  'တော်': ['taw', 'enough'],
  'သွား': ['thwa', 'go'],
  'မင်္ဂလာ': ['min ga la', 'blessing / auspicious'],
  'ချစ်': ['chit', 'love'],
  'ရယ်': ['yi', 'laugh'],
  'တကယ်': ['da geh', 'really / truly', 'Spelled "ta", said "da".'],
  'လိမ်': ['lein', 'lie (လူလိမ် = liar)'],
  'စ': ['sa', 'tease'],
  'အတူတူ': ['a tu tu', 'together'],
  'ချော': ['chaw', 'good-looking'],
  'နောက်တာ': ['nauk ta', 'joking (lit. the teasing)'],
  'ဖုန်း': ['phone', 'phone'],
  'ဆက်': ['set', 'connect (ဖုန်းဆက် = call)'],
  'ကြိုက်': ['kyaik', 'like'],

  // Food
  'ထမင်း': ['hta min', 'rice (cooked)'],
  'ကြော်': ['kyaw', 'fried'],
  'ခေါက်ဆွဲ': ['khauk swe', 'noodles'],
  'ရှမ်း': ['shan', 'Shan (state / people)'],
  'အုန်းနို့': ['ohn no', 'coconut milk'],
  'မုန့်ဟင်းခါး': ['mont hin ga', 'mohinga (fish noodle soup)'],
  'ကြက်': ['kyet', 'chicken'],
  'ဝက်': ['wet', 'pig'],
  'သား': ['tha', 'meat'],
  'ဥ': ['u', 'egg'],
  'လက်ဖက်': ['la phet', 'tea leaf'],
  'ရည်': ['yay', 'liquid / drink'],
  'သုပ်': ['thoke', 'mixed salad'],
  'ဟင်း': ['hin', 'curry / dish'],
  'ငါး': ['nga', 'fish / five'],
  'ငါးပိ': ['nga pi', 'fish paste'],
  'စပ်': ['sat', 'spicy'],
  'တိုဟူး': ['to hu', 'tofu'],
  'စမူဆာ': ['sa mu sa', 'samosa'],
  'ကောက်ညှင်း': ['kauk hnyin', 'sticky rice'],

  // Tea shop
  'ပုံမှန်': ['pone hman', 'regular / normal'],
  'ချို': ['cho', 'sweet'],
  'ဆိမ့်': ['seint', 'creamy / rich'],
  'ကျ': ['kya', 'strong (tea)'],
  'ပေါ့': ['paw', 'light / mild'],
  'ရေနွေး': ['yay nway', 'hot water'],
  'ကြမ်း': ['gyan', 'plain / rough (ရေနွေးကြမ်း = plain tea)', 'Spelled "kyan", said "gyan".'],
  'ကော်ဖီ': ['kaw phi', 'coffee'],
  'ပလာတာ': ['pa la ta', 'paratha'],
  'အီကြာကွေး': ['i kya kway', 'fried dough stick'],
  'နောက်': ['nauk', 'next / another'],
  'ခွက်': ['khwet', 'cup'],
  'ပါဆယ်': ['pa seh', 'takeaway (from "parcel")'],
  'ပိုက်ဆံ': ['paik san', 'money'],
  'ရှင်း': ['shin', 'clear / settle (the bill)'],

  // Numbers & prices
  'တစ်': ['tit', 'one', 'Before another word it shortens to "ta".'],
  'နှစ်': ['hnit', 'two'],
  'သုံး': ['thone', 'three'],
  'လေး': ['lay', 'four'],
  'ဆယ်': ['seh', 'ten'],
  'ရာ': ['ya', 'hundred'],
  'ထောင်': ['htaung', 'thousand'],
  'ကျပ်': ['kyat', 'kyat (money)'],
  'ဘယ်လောက်': ['beh lauk', 'how much'],
  'ဈေး': ['zay', 'price / market'],
  'ကြီး': ['kyi', 'big (ဈေးကြီး = price is big = expensive)'],
  'လျှော့': ['shaw', 'reduce'],
  'ပေး': ['pay', 'give / do for someone'],

  // Directions
  'ဘယ်': ['beh', 'which / where'],
  'မှာ': ['hma', 'at / in'],
  'အိမ်သာ': ['ein tha', 'toilet'],
  'ဘတ်စ်ကား': ['bas ka', 'bus'],
  'မှတ်တိုင်': ['hmat tine', 'stop (post)'],
  'ဆေးရုံ': ['hsay yone', 'hospital (ဆေး medicine + ရုံ building)'],
  'ဘုရား': ['pha ya', 'pagoda / Buddha'],
  'ဒီ': ['di', 'this / here'],
  'ဟို': ['ho', 'that / over there'],
  'ဘယ်ဘက်': ['beh bet', 'left side'],
  'ညာ': ['nya', 'right'],
  'ဘက်': ['bet', 'side'],
  'တည့်တည့်': ['teh teh', 'straight ahead'],
  'ဝေး': ['way', 'far'],
};

const KEYS = Object.keys(GLOSS).sort((a, b) => b.length - a.length);
// A piece may only end where a syllable ends: not before a vowel sign / medial / asat (U+102B–U+103E),
// and not before a consonant that is itself killed by asat or stacked (it belongs to this syllable).
const DEP = /[\u102B-\u103E]/;
const endsSyllable = (s, j) => j >= s.length || (!DEP.test(s[j]) && !/[\u1039\u103A]/.test(s[j + 1] || ''));

// → [{ my, ro, en, tip }] in order; unknown stretches come back with ro/en empty.
export function breakdown(text) {
  const s = text.replace(/\s+/g, ''), out = [];
  let i = 0, rest = '';
  const flush = () => { if (rest) { out.push({ my: rest, ro: '', en: '', tip: '' }); rest = ''; } };
  while (i < s.length) {
    const k = KEYS.find(k => s.startsWith(k, i) && endsSyllable(s, i + k.length));
    if (!k) { rest += s[i++]; continue; }
    flush();
    const [ro, en, tip = ''] = GLOSS[k];
    out.push({ my: k, ro, en, tip });
    i += k.length;
  }
  flush();
  return out;
}
