// ═══ SPEAK FIRST — data ═══
// Feel words carry pre/v so the ladder can build: statement (…တယ်), question (…လား), negative (…မ…ဘူး).
// Romanisation is a hand-written hint; Devanagari comes from burmese.js at render time.
// After editing: node tools/speak-audio-list.mjs → gen-speak-audio.bat → bump CACHE_NAME in sw.js.

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
  // Phase 9
  ['Missing you', 'သတိ', 'ရ',     'tha-di', 'ya',    'Your friend has been away for a month', '🥺', 'မ goes before ရ: သတိ မရ ဘူး (not သတိရ မ…).'],
  ['Shy',     '',       'ရှက်',    '',      'shet',   'Everyone is watching you sing karaoke', '😳'],
  ['Jealous', 'သဝန်',   'တို',    'tha-wun', 'to',   'Your friend keeps praising someone else', '😒', 'Playful denial: သဝန် မ တို ဘူး! (I\u2019m not jealous!)'],
].map(([en, pre, v, pr, vr, sit, emo, note]) => ({
  en, my: pre + v + 'တယ်', ro: [pr, vr, 'deh'].filter(Boolean).join(' '), sit, emo, note: note || '',
  pre, v, pr, vr,
}));

// Step 1 clears at this many tried words, so adding feelings never re-locks a cleared ladder.
export const STEP1_GOAL = 12;

// [English, Burmese, roman, situation/description, emoji, image (optional), note (optional)]
const row = ([en, my, ro, sit, emo, img, note]) => ({ en, my, ro, sit, emo, img: img || '', note: note || '' });

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
    ['Mohinga', 'မုန့်ဟင်းခါး', 'mont hin ga', 'Rice noodles in fish broth, the national breakfast', '🍜'],
    ['Tea leaf salad', 'လက်ဖက်သုပ်', 'la phet thoke', 'Fermented tea leaves, nuts, garlic, tomato', '🥗'],
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
  // Phase 10 — word lists (practice rounds only; the ladder stays on How I feel)
  { id: 'tea', emoji: '☕', color: '#58CC02', title: 'At the tea shop', desc: 'Order like a regular', words: [
    ['Waiter!', 'ညီလေး', 'nyi lay', 'You want to order; the young waiter is nearby', '🙋', '', 'Literally “little brother”, the usual way to call a young waiter.'],
    ['Regular milk tea', 'ပုံမှန်', 'pone hman', 'You want the standard cup', '🍵'],
    ['Sweet & creamy', 'ချိုဆိမ့်', 'cho seint', 'You like it sweeter, with more milk', '🍯'],
    ['Strong & creamy', 'ကျဆိမ့်', 'kya seint', 'You want more tea, less sugar', '💪'],
    ['Light & creamy', 'ပေါ့ဆိမ့်', 'paw seint', 'You want it milder', '🥛'],
    ['Plain green tea', 'ရေနွေးကြမ်း', 'yay nway gyan', 'The free pot on every table is empty', '🫖'],
    ['Coffee', 'ကော်ဖီ', 'kaw phi', 'Not in a tea mood today', '☕'],
    ['Paratha', 'ပလာတာ', 'pa la ta', 'Flaky flatbread to go with your tea', '🫓'],
    ['Fried dough stick', 'အီကြာကွေး', 'i kya kway', 'Crispy stick for dipping in tea', '🥖'],
    ['One more cup', 'နောက်တစ်ခွက်', 'nauk ta khwet', 'Your cup is already empty', '☝️'],
    ['Takeaway', 'ပါဆယ်', 'pa seh', 'You need to leave but want the tea', '🥡', '', 'From English “parcel”.'],
    ['Bill, please', 'ပိုက်ဆံရှင်းမယ်', 'paik san shin meh', 'You\u2019re done and ready to pay', '🧾'],
  ].map(row) },
  { id: 'numbers', emoji: '🔢', color: '#CE82FF', title: 'Numbers & prices', desc: 'Count, ask, haggle', words: [
    ['One', 'တစ်', 'tit', 'Holding up one finger to the vendor', '1️⃣'],
    ['Two', 'နှစ်', 'hnit', 'Two of those, please', '2️⃣'],
    ['Three', 'သုံး', 'thone', 'Three people at your table', '3️⃣'],
    ['Four', 'လေး', 'lay', 'Four bananas on the stall', '4️⃣'],
    ['Five', 'ငါး', 'nga', 'One whole hand held up', '5️⃣', '', 'Same word as “fish”; context tells them apart.'],
    ['Ten', 'တစ်ဆယ်', 'ta seh', 'Ten pieces of samosa', '🔟'],
    ['Hundred', 'တစ်ရာ', 'ta ya', 'A small coin amount', '💯'],
    ['Thousand', 'တစ်ထောင်', 'ta htaung', 'A 1,000-kyat note', '💵'],
    ['Kyat', 'ကျပ်', 'kyat', 'The money you pay in', '💰'],
    ['How much?', 'ဘယ်လောက်လဲ', 'beh lauk leh', 'You pick up a longyi at the market', '🏷️'],
    ['Too expensive', 'ဈေးကြီးတယ်', 'zay kyi deh', 'They quote double what you expected', '😬'],
    ['Lower the price, please', 'ဈေးလျှော့ပေးပါ', 'zay shaw pay ba', 'You want a small discount', '🤝'],
  ].map(row) },
  { id: 'where', emoji: '📍', color: '#FF6B8A', title: 'Where is…', desc: 'Find your way', words: [
    ['Where is it?', 'ဘယ်မှာလဲ', 'beh hma leh', 'Say the place first, then this: အိမ်သာ ဘယ်မှာလဲ', '❓'],
    ['Toilet', 'အိမ်သာ', 'ein tha', 'You really need to go', '🚻'],
    ['Market', 'ဈေး', 'zay', 'You want fresh fruit', '🧺'],
    ['Bus stop', 'ဘတ်စ်ကားမှတ်တိုင်', 'bas ka hmat tine', 'You need a ride downtown', '🚏'],
    ['Hospital', 'ဆေးရုံ', 'hsay yone', 'Your friend twisted an ankle', '🏥'],
    ['Pagoda', 'ဘုရား', 'pha ya', 'You want to see the golden stupa', '🛕'],
    ['Here', 'ဒီမှာ', 'di hma', 'Pointing at the spot on your map', '👇'],
    ['Over there', 'ဟိုမှာ', 'ho hma', 'Pointing across the road', '👉'],
    ['Left', 'ဘယ်ဘက်', 'beh bet', 'The driver asks which way', '⬅️', '', 'ဘယ် also means “which/where”; context tells them apart.'],
    ['Right', 'ညာဘက်', 'nya bet', 'Turn at the next corner', '➡️'],
    ['Straight ahead', 'တည့်တည့်', 'teh teh', 'Keep going, no turns', '⬆️'],
    ['Is it far?', 'ဝေးလား', 'way la', 'Deciding whether to walk or take a taxi', '🗺️'],
  ].map(row) },
];

// Ladder. Step 1 = try STEP1_GOAL words in "How I feel". Steps 2–4 are tile drills on FEEL.
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
