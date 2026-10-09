Design a mobile app called **Kata Kita** (“our words”, Jawi: کات کيت) for English speakers learning Malaysian Malay (Bahasa Melayu). I have a working HTML prototype (attached as `malay-prototype/index.html`). Treat it as the source of truth for layout, colours and interactions. Refine and complete it; don’t replace it with a generic language-app look.

## Goal
Make high-fidelity designs and a clickable prototype for every screen below, in light and dark mode, at phone width (390 × 844). Then write a handoff spec a developer can build from in vanilla JS + Supabase.

## Visual identity (keep exactly)
The look comes from Malaysian textiles and food. It must not read as Duolingo or as a generic dark flashcard app.

**Colour tokens**

| Token | Light | Dark | Use |
|---|---|---|---|
| bg | #EFF2EC (pandan wash) | #0F1226 | page |
| sheet | #FAFBF8 | #161A33 | cards, panels |
| card | #FFFFFF | #1D2240 | flashcard, result card |
| ink | #1B2140 (songket indigo) | #ECEEF6 | text, primary buttons |
| ink-2 / ink-3 | #545B78 / #8B90A6 | #B3B8CF / #7C82A0 | secondary / tertiary text |
| line | #DCE1D8 | #272C4A | borders |
| gold (kunyit) | #D9961A, soft #F6E7C4 | #F0B23A, soft #3A3120 | highlights, prefixes |
| pandan | #2E8B57, soft #D8EEDF | #4FC07D, soft #183428 | success, roots, “Ingat” |
| sambal | #CF3E2C, soft #F7DCD6 | #F0624F, soft #3D1E1E | errors, suffixes, “Belum”, hibiscus |
| band | #1B2140 | #0A0C1C | header band |
| dock | #1B2140 | #070915 | bottom navigation, always dark |

**Type**
- Display: Bricolage Grotesque 800, tight tracking (−1px at large sizes). Use it for screen titles, big words and numbers.
- Body: Plus Jakarta Sans 500–800.
- Jawi: Noto Naskh Arabic, set right-to-left.

**Signature elements**
- **Songket header band:** each screen opens with a deep indigo band. It has a faint gold diagonal lattice pattern and a striped gold/red border along its bottom edge. The content sheet below has 24px top corners and overlaps the band by 24px.
- **Affix colour code**, used everywhere a word is broken into parts: prefix = gold, root = pandan green, suffix = sambal red.
- **Floating dock:** rounded (22px), inset 12px from the screen edges, with five line icons and Malay labels: Hari ini, Belajar, Kebun, Peta, Bengkel. The active item gets a gold label and a tinted pill behind it.
- **Corner radii:** 6px chips, 14px buttons, 18–26px cards. Don’t round everything the same.
- Bilingual microcopy: Malay first, English after it (e.g. “Peribahasa hari ini · Proverb of the day”).

## Screens

### 1. Hari ini (Today)
- The greeting changes with the time of day: Selamat pagi / tengah hari / petang / malam. Under it, the streak line: “hari ke-12 berturut-turut”.
- **Proverb of the day card:** the Malay proverb, its literal English meaning, and “Use it when: …” with one key word glossed. A large faint Jawi watermark sits in a corner.
- **Bento grid:**
  - A tall indigo “Belajar” tile with the count of new words and five word chips.
  - A green “Kebun” tile showing how many plants need water.
  - A gold “Next stop” tile showing a town name and its unit.
- A dashed red call-to-action: “Order at the mamak”. It opens the role-play.

### 2. Belajar (Learn): swipe deck
- **Filters:** topic chips (Semua, Salam, Makan, Jalan, Wang, Cakap pasar) and a three-way switch for the card front: Malay first, English first or Jawi first.
- **Progress:** a counter (“1 of 10”) and a row of pips coloured by result.
- **Card stack:** three cards visible, offset behind each other. The top card has a woven gold/indigo strip along its top edge.
- **Front:** the big word, the Jawi underneath, a hint line and a speaker button.
- **Back** (3D flip): meaning, syllables with gold dots (se·la·mat), a “Built from” row of affix chips, an example sentence with its translation, and the Jawi.
- **Gestures:** tap to flip. Drag right for *Ingat* (remembered) and left for *Belum* (not yet). While dragging, the card tilts and an INGAT / BELUM stamp fades in.
- **Buttons below:** “← Belum”, a round flip button, “Ingat →”. Keyboard: space flips, arrow keys sort.
- **End of deck:** a summary of the score. Words sorted to *Belum* get planted as seeds in the Kebun.

### 3. Kebun (Garden): spaced review shown as plants
- Each word is a potted plant at one of five growth stages: Benih (seed), Tunas (sprout), Daun (leaves), Kudup (bud), Mekar (bloom). Mekar is a red bunga raya (hibiscus), Malaysia’s national flower.
- A legend strip shows all five stages.
- **Grid:** three columns of pots. Each shows the word and its stage. Pots that are due for review get a gold border and a “💧 dry” badge.
- **“Water N thirsty plants”** starts a review. For each plant you see the plant, the word and three meanings to choose from. A right answer makes the plant grow one stage, with a small animation. A wrong answer leaves it where it is.
- Draw the plants as simple flat vector illustrations, coloured with the theme tokens so they work in both light and dark mode.

### 4. Peta (Map): the course as a journey
- A dotted route snakes up the screen through six stops:
  1. Kuala Lumpur: Salam & kenalan
  2. Melaka: Nombor & wang
  3. Pulau Pinang: Di kedai mamak
  4. Ipoh: Arah & bas
  5. Kota Bharu: Imbuhan meN-
  6. Kuching: Cakap pasar
- The background has a subtle wave pattern for the sea.
- The completed part of the route is drawn as a solid green line. Finished stops are green with a ✓. The current stop is gold with a pulsing ring. Locked stops are outlined.
- Tapping a stop opens an indigo sheet with its four steps: Dengar (listen), Kata (words), Main peranan (role-play), Cabaran (checkpoint). Each step has its own state. A locked stop explains what to finish first.

### 5. Bengkel Imbuhan (Affix workshop)
- A large result card at the top shows the equation (“meN- + tulis + -kan =”) and the built word, with each part in its affix colour (me|nulis|kan). Below that: the meaning, a rule note (“meN- + t → men-, and the t drops”) and a speaker button. A “NEW” badge appears the first time you find a word.
- **Three selector rows:**
  - Awalan (prefix): —, ber-, meN-, di-, peN-, ter-, per-
  - Kata dasar (root): ajar, makan, jalan, beli, tulis, each with its English gloss
  - Akhiran (suffix): —, -an, -kan, -i
- **Not a real word:** the result is struck through in red, labelled “Bukan perkataan · not a word”, with a hint to try something else.
- **Collection:** a progress meter (e.g. 4 / 40), chips for words already found, and hatched placeholder chips for words not found yet.

### 6. Gerai Mamak (role-play at a mamak stall)
- A chat between the waiter (Pelayan) and you. Waiter messages are light bubbles with English underneath. Your messages are indigo bubbles.
- Each turn offers three possible replies. A wrong reply turns red and shows a one-line explanation (“‘I am nasi lemak’. Funny, but drop the saya.”). A right reply posts as your message, followed by a gold tip bubble.
- The end screen shows how many you got right on the first try, with “Order again” and “Back” buttons.

## States to design
- Empty and first-run states: empty garden, nothing found in the workshop yet, a new user with no streak.
- Loading and offline states.
- The card back when its content is too long to fit (it scrolls inside the card).
- Error copy that says what went wrong and how to fix it.
- Settings: theme (system / light / dark), the Jawi layer on or off, audio speed, daily goal.

## Content rules
- Use real Malay throughout, never lorem ipsum. Reuse the words, proverbs, affix forms and mamak dialogue from the prototype.
- Mark informal and slang words with a small tag (“informal”, “slang”, “spoken: tak”).
- Flag Jawi spellings as needing review by a native speaker.

## Accessibility
- Meet WCAG AA contrast in both themes. Touch targets at least 44px.
- Every swipe has a button and a keyboard equivalent.
- Respect prefers-reduced-motion: no tilt or pulse animations.
- Give the Jawi text `lang="ms-Arab"` and `dir="rtl"`.

## Deliverables
1. High-fidelity frames for all screens and states, in light and dark.
2. A clickable prototype covering these flows: Today → Learn deck → swipe → garden seed; Garden → water → plant grows; Map → stop → role-play; Workshop → build a word → collection updates.
3. A component sheet: band, dock, tiles, flashcard (front and back), affix chip, plant at each of the 5 stages, map stop states, chat bubbles, buttons.
4. A handoff spec: design tokens as CSS variables, spacing scale, type scale, animation timings (flip 500ms, swipe-out 350ms, swipe threshold 90px), and data shapes for:
   - Word `{ms, en, syllables, parts[], jawi, example, exampleEn, topic, register}`
   - Plant `{wordId, stage 0–4, dueAt}`
   - Affix form `{prefix, root, suffix, surfaceParts[], meaning, rule}`
   - Stop `{town, unit, steps[]}`
