// ═══ SPEAK FIRST — data ═══
// Feel words carry pre/v so the ladder can build: statement (…တယ်), question (…လား), negative (…မ…ဘူး).
// Romanisation is a hand-written hint; Devanagari comes from burmese.js at render time.

export const FEEL = [
  // en, pre, v, preR, vR, situation, emoji, note (optional)
  ['Sleepy',  '',       'အိပ်ချင်', '',      'eik chin', 'You yawned twice in a row', '🥱'],
  ['Hungry',  'ဗိုက်',  'ဆာ',     'baik',  'sa',     'It\u2019s 2pm and you skipped lunch', '😋'],
  ['Thirsty', 'ရေ',     'ငတ်',    'yay',   'ngat',   'Hot day, no water since morning', '🥤', 'Also heard: ရေဆာတယ် (yay sa deh). Both are fine.'],
  ['Tired',   '',       'ပင်ပန်း', '',      'pin ban','You just walked back from the market', '😮‍💨'],
  ['Hot',     '',       'ပူ',     '',      'pu',     'The fan is off and the sun is out', '🥵'],
  ['Cold',    '',       'ချမ်း',   '',      'chan',   'The aircon is blasting', '🥶'],
  ['Full',    'ဗိုက်',  'ပြည့်',   'baik',  'pyay',   'Second plate of rice is done', '😌'],
  ['Happy',   '',       'ပျော်',   '',      'pyaw',   'A friend just arrived', '😄'],
  ['Bored',   '',       'ပျင်း',   '',      'pyin',   'Nothing to do all afternoon', '😑'],
  ['Well',    'နေ',     'ကောင်း',  'nay',   'kaung',  'Someone asks how you are', '🙂'],
  ['Busy',    'အလုပ်', 'များ',    'a-lok', 'mya',    'Someone asks you to come out tonight', '📚'],
  ['Scared',  '',       'ကြောက်',  '',      'kyauk',  'A dog is barking at you', '😨'],
].map(([en, pre, v, pr, vr, sit, emo, note]) => ({
  en, my: pre + v + 'တယ်', ro: [pr, vr, 'deh'].filter(Boolean).join(' '), sit, emo, note: note || '',
  pre, v, pr, vr,
}));

// [English, Burmese, roman, situation/description, emoji, image (optional, e.g. 'img/food/mohinga.jpg')]
const row = ([en, my, ro, sit, emo, img]) => ({ en, my, ro, sit, emo, img: img || '', note: '' });

export const PACKS = [
  { id: 'feel', emoji: '🥱', color: '#FFC800', title: 'How I feel', desc: 'One word says it all', words: FEEL },
  { id: 'basics', emoji: '🙏', color: '#1CB0F6', title: 'Yes, no, thanks', desc: 'Everyday replies', words: [
    ['Hello', 'မင်္ဂလာပါ', 'min ga la ba', 'Someone greets you', '👋'],
    ['Yes', 'ဟုတ်ကဲ့', 'hoke keh', 'Someone asks: are you Indian?', '👍'],
    ['No', 'မဟုတ်ဘူး', 'ma hoke bu', 'Someone asks: are you from Yangon?', '👎'],
    ['Thank you', 'ကျေးဇူးတင်ပါတယ်', 'kyay zu tin ba deh', 'The waiter brings your tea', '🙏'],
    ['Sorry', 'တောင်းပန်ပါတယ်', 'taung ban ba deh', 'You bumped into someone', '😅'],
    ['OK / fine', 'ရပါတယ်', 'ya ba deh', 'They ask if the change is fine', '👌'],
    ['Wait a moment', 'ခဏ', 'kha na', 'Your phone rings mid-chat', '✋'],
    ['I want', 'လိုချင်တယ်', 'lo chin deh', 'Pointing at a snack on the shelf', '🛍️'],
    ['Don\u2019t want', 'မလိုချင်ဘူး', 'ma lo chin bu', 'Offered a plastic bag', '🚫'],
    ['Delicious', 'စားလို့ကောင်းတယ်', 'sa lo kaung deh', 'First bite of the curry', '😋'],
    ['Enough', 'တော်ပြီ', 'taw bi', 'They keep adding rice', '🛑'],
    ['Let\u2019s go', 'သွားကြမယ်', 'thwa ja meh', 'Everyone has finished eating', '🚶'],
  ].map(row) },
  { id: 'food', emoji: '🍜', color: '#FF9600', title: 'Food & dishes', desc: 'Name what\u2019s on the table', food: true, words: [
    ['Mohinga', 'မုန့်ဟင်းခါး', 'mont hin ga', 'Rice noodles in fish broth, the national breakfast', '🍜', 'img/food/mohinga.jpg'],
    ['Tea leaf salad', 'လက်ဖက်သုပ်', 'la phet thoke', 'Fermented tea leaves, nuts, garlic, tomato', '🥗', 'img/food/laphet-thoke.jpg'],
    ['Shan noodles', 'ရှမ်းခေါက်ဆွဲ', 'shan khauk swe', 'Rice noodles with chicken or pork, from Shan state', '🍝'],
    ['Coconut noodles', 'အုန်းနို့ခေါက်ဆွဲ', 'ohn no khauk swe', 'Noodles in coconut-chicken curry', '🥥'],
    ['Fried rice', 'ထမင်းကြော်', 'hta min kyaw', 'Yesterday\u2019s rice, fried with egg and peas', '🍚'],
    ['Rice', 'ထမင်း', 'hta min', 'The base of every meal', '🍚'],
    ['Curry', 'ဟင်း', 'hin', 'Any oily dish eaten with rice', '🍛'],
    ['Chicken', 'ကြက်သား', 'kyet tha', 'The most common curry meat', '🍗'],
    ['Pork', 'ဝက်သား', 'wet tha', 'Often in a sour-sweet curry', '🥓'],
    ['Fish', 'ငါး', 'nga', 'River fish, fried or in curry', '🐟'],
    ['Egg', 'ကြက်ဥ', 'kyet u', 'Boiled, in curry or on fried rice', '🥚'],
    ['Tea', 'လက်ဖက်ရည်', 'la phet yay', 'Sweet milk tea at the tea shop', '🍵'],
    ['Water', 'ရေ', 'yay', 'Ask for it at any table', '💧'],
    ['Samosa salad', 'စမူဆာသုပ်', 'samusa thoke', 'Chopped samosas, cabbage, mint, chickpea sauce', '🥙'],
    ['Fried tofu', 'တိုဟူးကြော်', 'to hu kyaw', 'Shan chickpea tofu, crispy outside', '🧈'],
    ['Sticky rice', 'ကောက်ညှင်း', 'kauk hnyin', 'Steamed glutinous rice, often as a snack', '🍙'],
    ['Fish paste', 'ငါးပိ', 'nga pi', 'Pungent fermented fish, with vegetables', '🫙'],
    ['Spicy', 'စပ်တယ်', 'sat deh', 'The chilli hits', '🌶️'],
  ].map(row) },
];

// Ladder. Step 1 = say every word in "How I feel". Steps 2–4 are tile drills on FEEL.
export const STEPS = [
  { title: 'One word', ex: 'ဗိုက်ဆာတယ် — Hungry' },
  { title: 'Add me', ex: 'ကျွန်တော် / ကျွန်မ + word — "I\u2019m hungry"',
    note: me => `Put <b>${me}</b> (I) first. The feeling stays as it is and <b>တယ်</b> closes the sentence. There\u2019s no word for "am".`,
    prompt: w => `I\u2019m ${w.en.toLowerCase()}`,
    tiles: (w, me) => [me, w.pre + w.v, 'တယ်'],
    ro: (w, meR) => `${meR} ${[w.pr, w.vr].filter(Boolean).join(' ')} deh`,
    decoys: ['လား', 'ဘူး'] },
  { title: 'Ask back', ex: 'word + လား — "Hungry?"',
    note: () => `Swap <b>တယ်</b> for <b>လား</b> and it becomes a yes/no question. Same word order.`,
    prompt: w => `${w.en}? (asking a friend)`,
    tiles: w => [w.pre + w.v, 'လား'],
    ro: w => `${[w.pr, w.vr].filter(Boolean).join(' ')} la`,
    decoys: ['တယ်', 'မ', 'ဘူး'] },
  { title: 'Say no', ex: 'မ + verb + ဘူး — "Not hungry"',
    note: () => `<b>မ</b> goes right before the verb, not before the whole phrase, and <b>ဘူး</b> replaces <b>တယ်</b>. ဗိုက် <b>မ</b> ဆာ <b>ဘူး</b>.`,
    prompt: w => `Not ${w.en.toLowerCase()}`,
    tiles: w => [w.pre, 'မ', w.v, 'ဘူး'].filter(Boolean),
    ro: w => `${w.pr ? w.pr + ' ' : ''}ma ${w.vr} bu`,
    decoys: ['တယ်', 'လား'] },
];
