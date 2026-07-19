// ═══ COURSE DATA ═══
// Colloquial Burmese — course structure (Phase 1).
// Step keys must stay stable: progress is stored against `u{unit}:{key}`.
// Step types: 'dialogue' (d = dialogue number) | 'vocab' | 'drill' | 'script' | 'check'

const D = (n, title) => ({ key: `d${n}`, type: 'dialogue', d: n, title: title || `Dialogue ${n}` });
const VOCAB = { key: 'vocab', type: 'vocab', title: 'Vocab deck' };
const SCRIPT = (note) => ({ key: 'script', type: 'script', title: 'Script practice', note: note || 'Unit script items' });
const DRILL = (pattern) => ({ key: 'drill', type: 'drill', title: 'Pattern drill', pattern }); // pattern: {label, formula, gloss} or null (TBD)
const CHECK = (canDos) => ({ key: 'check', type: 'check', title: 'Unit check', canDos });

export const COURSE_UNITS = [
  {
    unit: 0, title: 'Preliminary', subtitle: 'Greetings, script and numbers', icon: '🔤', color: '#1CB0F6',
    badges: ['greetings', 'script basics', 'numbers 1–10'],
    steps: [
      D(1, 'Greetings'),
      VOCAB,
      SCRIPT('First consonants က–င'),
      CHECK(['Greet and say goodbye', 'Say thank you and sorry', 'Count 1–10', 'Recognise the first consonants']),
    ],
  },
  {
    unit: 1, title: 'Unit 1', subtitle: 'A curious foreigner', icon: '🛍️', color: '#58CC02',
    badges: ['this / that', 'ဘာလဲ what?', 'yes · no'],
    steps: [
      D(1), VOCAB,
      DRILL({ label: 'IDENTIFYING', formula: 'ဒါ [X] လား', gloss: 'is this X?' }),
      SCRIPT(), D(2),
      CHECK(['Ask what something is', 'Answer yes / no questions', 'Point things out (this / that)']),
    ],
  },
  {
    unit: 2, title: 'Unit 2', subtitle: 'New in town', icon: '🏙️', color: '#FFC800',
    badges: ['places', 'ရှိတယ် there is', 'ဘယ်မှာ where?'],
    steps: [
      D(1), VOCAB,
      DRILL({ label: 'LOCATION', formula: '[X] ဘယ်မှာလဲ', gloss: 'where is X?' }),
      SCRIPT(), D(2),
      CHECK(['Ask where a place is', 'Say what there is in town', 'Answer questions about locations']),
    ],
  },
  {
    unit: 3, title: 'Unit 3', subtitle: 'Talking about the weather', icon: '🌦️', color: '#CE82FF',
    badges: ['weather words', 'adjective + တယ်', 'today · now'],
    steps: [
      D(1), VOCAB,
      DRILL({ label: 'DESCRIBING', formula: '[Adj] တယ်', gloss: 'it is [Adj]' }),
      SCRIPT(), D(2),
      CHECK(['Describe the weather', 'Say it is hot / cold / raining', 'Talk about the seasons']),
    ],
  },
  {
    unit: 4, title: 'Unit 4', subtitle: 'Family and friends', icon: '👨‍👩‍👧', color: '#FF6B8A',
    badges: ['family words', 'possessive ရဲ့', 'who? · what?'],
    steps: [
      D(1, 'Meet the family'), VOCAB,
      DRILL({ label: 'POSSESSIVE', formula: '[X] ရဲ့ [Y]', gloss: "X's Y" }),
      SCRIPT('4 glottal stops'),
      D(2, 'How old is she?'),
      CHECK(['Name family members', 'Say how old someone is', 'Say what someone does for work', 'Ask who? and what nationality?']),
    ],
  },
  {
    unit: 5, title: 'Unit 5', subtitle: 'Lost in the street', icon: '🗺️', color: '#FF9600',
    badges: ['directions', 'left · right · straight'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Ask where a place is', 'Give simple directions', 'Understand left / right / straight ahead']),
    ],
  },
  {
    unit: 6, title: 'Unit 6', subtitle: 'Food and drinks', icon: '🍜', color: '#58CC02',
    badges: ['food words', 'ordering', 'how much?'],
    steps: [
      D(1), VOCAB,
      DRILL({ label: 'PRICE', formula: '[X] ဘယ်လောက်လဲ', gloss: 'how much is X?' }),
      SCRIPT(), D(2),
      CHECK(['Order food and drink', 'Ask how much something costs', 'Say what you want']),
    ],
  },
  {
    unit: 7, title: 'Unit 7', subtitle: 'Likes, dislikes and desires', icon: '❤️', color: '#1CB0F6',
    badges: ['likes · dislikes', 'wants'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Say what you like and dislike', 'Say what you want to do', 'Ask someone what they like']),
    ],
  },
  {
    unit: 8, title: 'Unit 8', subtitle: 'Abilities and talents', icon: '💪', color: '#FFC800',
    badges: ['can · can\'t', 'languages'],
    steps: [
      D(1), VOCAB,
      DRILL({ label: 'ABILITY', formula: '[V] နိုင်တယ်', gloss: 'can [V]' }),
      SCRIPT(), D(2),
      CHECK(['Say what you can and can\'t do', 'Ask about abilities', 'Talk about languages you speak']),
    ],
  },
  {
    unit: 9, title: 'Unit 9', subtitle: 'Getting thirsty and needs', icon: '🥤', color: '#CE82FF',
    badges: ['needs', 'offers'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Say you are hungry / thirsty', 'Say what you need', 'Offer something to someone']),
    ],
  },
  {
    unit: 10, title: 'Unit 10', subtitle: 'Being considerate in public', icon: '🙏', color: '#FF6B8A',
    badges: ['polite requests', 'apologies'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Make polite requests', 'Apologise and excuse yourself', 'Ask for permission']),
    ],
  },
  {
    unit: 11, title: 'Unit 11', subtitle: 'Weekend and travel plans', icon: '✈️', color: '#FF9600',
    badges: ['plans', 'future'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Talk about weekend plans', 'Say where you will go', 'Invite someone along']),
    ],
  },
  {
    unit: 12, title: 'Unit 12', subtitle: 'Talking about time', icon: '⏰', color: '#58CC02',
    badges: ['clock time', 'days'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Tell the time', 'Say days and parts of the day', 'Arrange a meeting time']),
    ],
  },
  {
    unit: 13, title: 'Unit 13', subtitle: 'Talking about experiences', icon: '🌍', color: '#1CB0F6',
    badges: ['experiences', 'ဖူး ever'],
    steps: [
      D(1), VOCAB,
      DRILL({ label: 'EXPERIENCE', formula: '[V] ဖူးတယ်', gloss: 'have [V]-ed before' }),
      SCRIPT(), D(2),
      CHECK(['Say what you have done before', 'Ask about past experiences']),
    ],
  },
  {
    unit: 14, title: 'Unit 14', subtitle: 'Getting sick', icon: '🤒', color: '#FFC800',
    badges: ['symptoms', 'advice'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Describe symptoms', 'Understand simple advice', 'Ask for medicine']),
    ],
  },
  {
    unit: 15, title: 'Unit 15', subtitle: 'Talking about where you are', icon: '📍', color: '#CE82FF',
    badges: ['locations', 'on the phone'],
    steps: [
      D(1), VOCAB, DRILL(null), SCRIPT(), D(2),
      CHECK(['Say where you are on the phone', 'Describe locations in detail']),
    ],
  },
];

export function getUnit(n) {
  return COURSE_UNITS.find(u => u.unit === n) || null;
}
