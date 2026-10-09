// ═══ SPEAK TAB ═══
// "Speak first": say whole words out loud now, grammar later.
// Drop in js/speak.js (+ js/speak-data.js). Progress lives in localStorage;
// every answer is also logged to Supabase `speak_log` (fire-and-forget).
// App deps load lazily so this file also runs standalone (preview) without them.
import { PACKS, FEEL, STEPS } from './speak-data.js?v=1';

const DEPS = { db: null, getSettings: () => ({ showDevanagari: true }), toPronunciation: () => '' };
const depsReady = Promise.all([
  import('./supabase.js').then(m => { DEPS.db = m.db; }).catch(() => {}),
  import('./settings.js').then(m => { DEPS.getSettings = m.getSettings; }).catch(() => {}),
  import('https://celeritas7.github.io/language-utils/burmese.js?v=8').then(m => { DEPS.toPronunciation = m.toPronunciation; }).catch(() => {}),
]);

const LS = 'speak_progress';
const STEP_GOAL = 8;           // correct builds needed to clear steps 2–4
const ROUND = 6;               // questions per practice / build round
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const shuffle = a => a.map(x => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map(x => x[1]);
const dayKey = () => new Date().toISOString().slice(0, 10);

export class SpeakTab {
  constructor(app) {
    this.app = app;
    this.view = { name: 'home' };
    this.open = null;   // expanded word index in pack view
    this.Q = null;      // practice round
    this.B = null;      // build round
    const s = JSON.parse(localStorage.getItem(LS) || '{}');
    this.S = { said: {}, miss: {}, gender: 'm', steps: {}, day: '', today: 0, ...s };
    this.S.miss ??= {};
    if (this.S.day !== dayKey()) { this.S.day = dayKey(); this.S.today = 0; }
    depsReady.then(() => { if (this.container && (!this.app?.activeTab || this.app.activeTab === 'speak')) this.render(this.container); });
  }

  save() { localStorage.setItem(LS, JSON.stringify(this.S)); }
  log(row) { DEPS.db?.insert('speak_log', row).catch(() => {}); }
  dev(my) { try { return DEPS.getSettings().showDevanagari ? DEPS.toPronunciation(my, { tones: false }) : ''; } catch { return ''; } }
  me() { return this.S.gender === 'm' ? ['ကျွန်တော်', 'kya-naw'] : ['ကျွန်မ', 'kya-ma']; }
  key(p, w) { return p.id + '|' + w.en; }
  saidCount(p) { return p.words.filter(w => this.S.said[this.key(p, w)]).length; }
  missed(p) { return p.words.filter(w => this.S.miss[this.key(p, w)] > 0); }
  allMissed() { return PACKS.flatMap(p => this.missed(p).map(w => ({ p, w }))); }
  // Image if the word has one (and it loaded), else the emoji tile.
  pic(w, cls = 'sp-tile dark') { return w.img ? `<img class="sp-img" src="${w.img}" alt="" onerror="this.outerHTML='<div class=&quot;${cls}&quot;>${w.emo}</div>'">` : `<div class="${cls}">${w.emo}</div>`; }
  speak(t) {
    try { speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(t); u.lang = 'my-MM'; u.rate = 0.85; speechSynthesis.speak(u); } catch {}
  }
  markSaid(p, w, ok = true) {
    const k = this.key(p, w);
    if (!this.S.said[k]) this.S.said[k] = 1;
    this.S.miss[k] = ok ? 0 : (this.S.miss[k] || 0) + 1;   // a correct answer clears the miss
    this.S.today++;   // every answer counts toward today's goal, not just first-time words
    this.save();
  }
  // 0 = step 1 (one word) … 3 = step 4 (say no). Returns 'done' | 'now' | 'locked'.
  stepState(i) {
    const done = j => j === 0 ? this.saidCount(PACKS[0]) === FEEL.length : (this.S.steps[j] || 0) >= STEP_GOAL;
    if (done(i)) return 'done';
    for (let j = 0; j < i; j++) if (!done(j)) return 'locked';
    return 'now';
  }

  go(v) { this.view = v; this.open = null; this.render(this.container); this.container.scrollTop = 0; window.scrollTo(0, 0); }

  render(container) {
    this.container = container;
    const v = this.view.name;
    container.innerHTML = `<div class="sp">${
      v === 'pack' ? this.packView(PACKS.find(p => p.id === this.view.pack))
      : v === 'quiz' ? this.quizView()
      : v === 'build' ? this.buildView()
      : this.homeView()}</div>`;
    if (!container.dataset.spBound) {   // bind once; the app shares one container across tabs
      container.dataset.spBound = '1';
      container.addEventListener('click', e => {
        const el = e.target.closest('[data-sp]');
        if (el && !el.disabled && this.H[el.dataset.sp]) this.H[el.dataset.sp](el, e);
      });
    }
  }

  // ---------- Home ----------
  homeView() {
    const total = PACKS.reduce((a, p) => a + p.words.length, 0), said = PACKS.reduce((a, p) => a + this.saidCount(p), 0);
    const grammarOpen = this.stepState(1) === 'done', misses = this.allMissed();
    return `<div class="pad">
      <div class="sp-h1">Speak first 🗣</div><div class="sp-muted">Words you can say today, grammar later</div>
      <div class="sp-goal"><div class="sp-tile" style="background:rgba(88,204,2,.1);border-color:rgba(88,204,2,.25)">🎯</div>
        <div class="flex-1"><div class="sp-b">Say 3 things out loud today</div><div class="sp-muted">${Math.min(this.S.today, 3)} / 3 · ${said} of ${total} words tried</div></div>
        <button class="sp-btn sm green" data-sp="start" data-pack="feel">Go →</button></div>
      ${misses.length ? `<div class="sp-goal pink"><div class="sp-tile" style="background:rgba(255,107,138,.1);border-color:rgba(255,107,138,.25)">🔁</div>
        <div class="flex-1"><div class="sp-b">${misses.length} to say again</div><div class="sp-muted">${misses.slice(0, 3).map(m => m.w.en).join(' · ')}${misses.length > 3 ? ' · …' : ''}</div></div>
        <button class="sp-btn sm pink" data-sp="misses">Retry →</button></div>` : ''}
      <div class="section-label sp-lbl">Packs</div>
      <div class="sp-list">${PACKS.map(p => `<button class="sp-item" data-sp="pack" data-pack="${p.id}">
        <div class="sp-tile" style="background:${p.color}1F;border-color:${p.color}4D">${p.emoji}</div>
        <div class="flex-1" style="min-width:0"><div class="sp-t">${p.title}</div><div class="sp-d">${p.desc} · ${p.words.length} words${this.missed(p).length ? ` · <span style="color:var(--pink)">${this.missed(p).length} to retry</span>` : ''}</div>
          <div class="sp-bar"><i style="width:${this.saidCount(p) / p.words.length * 100}%"></i></div></div>
        <div class="sp-chev">›</div></button>`).join('')}</div>
      <div class="section-label sp-lbl">Your ladder</div>
      <div class="sp-card">${STEPS.map((s, i) => { const st = this.stepState(i); return `<div class="sp-step ${st}">
        <div class="sp-dot ${st}">${st === 'done' ? '✓' : i + 1}</div>
        <div class="flex-1"><div class="sp-t">${s.title}</div><div class="sp-d my">${s.ex}</div>
          ${i > 0 && st === 'now' ? `<div class="sp-d">${this.S.steps[i] || 0} / ${STEP_GOAL} correct</div>` : ''}</div>
        ${st !== 'locked' ? (i === 0 ? `<button class="sp-btn sm" data-sp="pack" data-pack="feel">${st === 'done' ? 'Review' : 'Go'}</button>`
          : `<button class="sp-btn sm ${st === 'done' ? 'ghost' : ''}" data-sp="build" data-step="${i}">${st === 'done' ? 'Again' : 'Try'}</button>`) : ''}</div>`; }).join('')}
        <div class="sp-d" style="margin-top:6px">Step 1 clears when you\u2019ve said every word in How I feel. Steps 2–4 clear at ${STEP_GOAL} correct.</div></div>
      <div class="section-label sp-lbl">Grammar lessons</div>
      <button class="sp-item ${grammarOpen ? '' : 'locked'}" data-sp="${grammarOpen ? 'grammar' : ''}">
        <div class="sp-tile" style="background:rgba(206,130,255,.1);border-color:rgba(206,130,255,.25)">🧩</div>
        <div class="flex-1"><div class="sp-t">Sentence patterns</div><div class="sp-d">${grammarOpen ? 'Open the course' : 'Unlocks after step 2'}</div></div>
        <div class="sp-chev">${grammarOpen ? '›' : '🔒'}</div></button>
    </div>`;
  }

  // ---------- Pack ----------
  packView(p) {
    const [me, meR] = this.me();
    return `<div class="sp-top"><button class="sp-back" data-sp="home">← Back</button><div class="sp-h3 flex-1">${p.emoji} ${p.title}</div>
      ${p.id === 'feel' ? `<div class="sp-gender"><button class="sp-pill ${this.S.gender === 'm' ? 'on' : ''}" data-sp="gender" data-v="m">♂</button><button class="sp-pill ${this.S.gender === 'f' ? 'on' : ''}" data-sp="gender" data-v="f">♀</button></div>` : ''}</div>
    <div class="pad">
      <div class="sp-muted" style="margin-bottom:12px">${p.food ? 'Tap a dish to hear it and see what it is.' : 'Tap a word to hear it. Each line is one chunk — say it as-is.'}</div>
      <div class="sp-list">${p.words.map((w, i) => { const o = this.open === i, k = this.key(p, w), dv = this.dev(w.my), miss = this.S.miss[k] > 0; return `<div class="sp-word ${o ? 'open' : ''} ${miss ? 'miss' : ''}" data-sp="word" data-i="${i}">
        ${this.pic(w)}
        <div class="flex-1" style="min-width:0"><div class="my sp-my">${w.my}</div><div class="sp-sub">${dv ? `<b>${dv}</b> · ` : ''}<span>${w.ro}</span></div>
          ${o ? `<div class="sp-fade sp-d" style="margin-top:8px">${esc(w.sit)}${w.note ? `<div class="my sp-hint">💡 ${w.note}</div>` : ''}
            ${p.id === 'feel' ? `<div class="my" style="margin-top:6px"><span style="color:var(--text)">I\u2019m ${w.en.toLowerCase()}:</span> ${me} ${w.my} <span style="color:var(--yellow)">· ${meR} ${w.ro}</span></div>` : ''}
            <div class="sp-row" style="margin-top:8px"><button class="sp-btn sm ghost" data-sp="say" data-t="${w.my}">🔊 Hear</button><button class="sp-btn sm green" data-sp="mark" data-i="${i}">${this.S.said[k] ? '✓ Said it' : 'I said it'}</button></div></div>` : ''}</div>
        <div class="sp-en">${w.en}${miss ? ' 🔁' : this.S.said[k] ? ' ✓' : ''}</div></div>`; }).join('')}</div>
      <button class="sp-btn" style="margin-top:16px" data-sp="start" data-pack="${p.id}">Practice: situation → word →</button>
    </div>`;
  }

  // ---------- Practice: situation → say it ----------
  // A round is a fixed list of { p, w } items: unseen first, then missed (most-missed first), then the rest.
  startQuiz(p) {
    const k = w => this.key(p, w), seen = w => this.S.said[k(w)], miss = w => this.S.miss[k(w)] || 0;
    const unseen = shuffle(p.words.filter(w => !seen(w)));
    const missed = p.words.filter(w => seen(w) && miss(w) > 0).sort((a, b) => miss(b) - miss(a));
    const rest = shuffle(p.words.filter(w => seen(w) && !miss(w)));
    this.runQuiz([...unseen, ...missed, ...rest].slice(0, ROUND).map(w => ({ p, w })), p);
  }
  startMisses() {
    const items = this.allMissed().sort((a, b) => this.S.miss[this.key(b.p, b.w)] - this.S.miss[this.key(a.p, a.w)]).slice(0, ROUND);
    if (items.length) this.runQuiz(items, null);
  }
  runQuiz(items, p) { this.Q = { p, items, i: 0, shown: false, res: [] }; this.go({ name: 'quiz' }); }
  quizView() {
    const Q = this.Q, it = Q.items[Q.i];
    if (!it) return this.resultsView();
    const { p, w } = it, dv = this.dev(w.my);
    return `<div class="sp-top"><button class="sp-back" data-sp="quit">✕</button><div class="flex-1"><div class="sp-bar" style="margin:0"><i style="width:${Q.i / Q.items.length * 100}%"></i></div></div><div class="sp-muted">${Q.i + 1} / ${Q.items.length}</div></div>
    <div class="pad">
      <div class="section-label sp-lbl" style="margin-top:4px">${p.food ? 'What\u2019s this dish called?' : 'What would you say?'}</div>
      <div class="sp-parch">${Q.shown
        ? `<div class="sp-fade"><div class="my sp-big">${w.my}</div><div class="sp-ro">${w.ro}</div>${dv ? `<div class="sp-dv">${dv}</div>` : ''}<div class="sp-sit" style="margin-top:10px;font-size:15px;color:#6A5A2A">${w.en}</div>${w.note ? `<div class="my sp-hint parch">💡 ${w.note}</div>` : ''}</div>`
        : `${w.img ? this.pic(w, 'sp-emo') : `<div class="sp-emo">${w.emo}</div>`}<div class="sp-sit">${esc(w.sit)}</div>${p.food ? '' : `<div class="sp-ro" style="font-size:15px;color:#8A7A4A">${w.en}</div>`}`}</div>
      ${Q.shown
        ? `<div class="sp-row" style="margin-top:14px"><button class="sp-btn ghost" data-sp="rate" data-v="0">Not yet</button><button class="sp-btn green" data-sp="rate" data-v="1">Said it ✓</button></div>
           <button class="sp-btn sm ghost" style="margin:10px auto 0;display:block" data-sp="say" data-t="${w.my}">🔊 Hear it again</button>`
        : `<button class="sp-btn" style="margin-top:14px" data-sp="show">Say it out loud, then show →</button>
           <div class="sp-muted" style="text-align:center;margin-top:12px">Think of the word. Say it. Then check.</div>`}
    </div>`;
  }
  resultsView() {
    const Q = this.Q, ok = Q.res.filter(Boolean).length, n = Q.res.length;
    const missed = Q.items.filter((_, i) => !Q.res[i]);
    const [emo, msg] = ok === n ? ['🎉', 'Excellent!'] : ok >= n / 2 ? ['👍', 'Good job!'] : ['💪', 'Keep practicing!'];
    return `<div class="pad" style="text-align:center"><div style="font-size:64px;margin-top:40px">${emo}</div><div class="sp-h2" style="margin-top:8px">${msg}</div>
      <div class="sp-muted" style="margin-bottom:20px">You said ${ok} of ${n} out loud</div>
      <div class="sp-stats"><div class="sp-card"><div class="sp-n" style="color:var(--green)">${ok}</div><div class="sp-muted">Said it</div></div>
        <div class="sp-card"><div class="sp-n" style="color:var(--pink)">${n - ok}</div><div class="sp-muted">Not yet</div></div>
        <div class="sp-card"><div class="sp-n" style="color:var(--yellow)">${this.S.today}</div><div class="sp-muted">Today</div></div></div>
      ${missed.length ? `<div class="section-label sp-lbl" style="text-align:left;color:var(--pink)">Say these again</div>
      <div class="sp-list">${missed.map(({ w }) => `<div class="sp-word miss">${this.pic(w)}<div class="flex-1" style="text-align:left"><div class="my sp-my">${w.my}</div><div class="sp-sub"><span>${w.ro}</span></div></div><div class="sp-en">${w.en}</div></div>`).join('')}</div>
      <button class="sp-btn pink" style="margin-top:16px" data-sp="retry">Retry these ${missed.length} →</button>`
      : `<div class="sp-muted" style="margin-top:8px">All said ✓ — use one of them with a real person today.</div>`}
      <button class="sp-btn ${missed.length ? 'ghost' : ''}" style="margin-top:10px" data-sp="again">${Q.p ? 'New round →' : 'Done'}</button>
      ${Q.p ? '<button class="sp-btn ghost" style="margin-top:10px" data-sp="home">Done</button>' : ''}</div>`;
  }

  // ---------- Build (steps 2–4) ----------
  startBuild(step) {
    const S = STEPS[step], [me] = this.me();
    // Fixed for the round: words, tile order, decoys.
    const qs = shuffle(FEEL).slice(0, ROUND).map(w => {
      const parts = S.tiles(w, me);
      return { w, parts, tiles: shuffle([...parts, ...S.decoys]), placed: [], done: null };
    });
    this.B = { step, qs, i: 0, right: 0 };
    this.go({ name: 'build' });
  }
  buildView() {
    const B = this.B, S = STEPS[B.step], q = B.qs[B.i], [me, meR] = this.me();
    if (!q) {
      return `<div class="pad" style="text-align:center"><div style="font-size:64px;margin-top:40px">${B.right === B.qs.length ? '🎉' : '👍'}</div>
        <div class="sp-h2" style="margin-top:8px">${B.right} / ${B.qs.length} correct</div>
        <div class="sp-muted">Step ${B.step + 1} · ${Math.min(this.S.steps[B.step] || 0, STEP_GOAL)} / ${STEP_GOAL}${this.stepState(B.step) === 'done' ? ' · cleared ✓' : ''}</div>
        <button class="sp-btn" style="margin-top:20px" data-sp="build" data-step="${B.step}">Again →</button>
        <button class="sp-btn ghost" style="margin-top:10px" data-sp="home">Done</button></div>`;
    }
    const correct = q.parts.join(' '), dv = this.dev(q.parts.join('')), lock = q.done !== null ? 'disabled' : '';
    return `<div class="sp-top"><button class="sp-back" data-sp="home">✕</button><div class="flex-1"><div class="sp-bar" style="margin:0"><i style="width:${B.i / B.qs.length * 100}%"></i></div></div><span class="sp-pill on" style="pointer-events:none">🧩 Step ${B.step + 1}</span></div>
    <div class="pad">
      <details class="sp-note" ${B.i === 0 ? 'open' : ''}><summary>Grammar note</summary><div class="my">${S.note(me)}</div></details>
      <div class="section-label sp-lbl">Say in Burmese</div>
      <div class="sp-h2" style="margin-bottom:14px">${S.prompt(q.w)} ${q.w.emo}</div>
      <div class="sp-slot ${q.done === true ? 'ok' : q.done === false ? 'bad' : ''}">${q.placed.length
        ? q.placed.map((ti, k) => `<button class="sp-tl in" data-sp="unplace" data-k="${k}" ${lock}>${q.tiles[ti]}</button>`).join('')
        : '<span class="sp-muted">Tap tiles in order</span>'}</div>
      <div class="sp-tiles">${q.tiles.map((t, i) => `<button class="sp-tl ${q.placed.includes(i) ? 'used' : ''}" data-sp="place" data-i="${i}" ${lock}>${t}</button>`).join('')}</div>
      ${q.done === null
        ? `<button class="sp-btn" style="margin-top:18px" data-sp="check" ${q.placed.length ? '' : 'disabled'}>Check</button>`
        : `<div class="sp-card sp-fade ${q.done ? 'ok' : 'bad'}" style="margin-top:18px"><div class="sp-b" style="color:${q.done ? 'var(--green)' : 'var(--red)'}">${q.done ? '✓ Correct' : '✗ Not quite'}</div>
            <div class="my sp-my" style="font-size:20px;margin-top:6px">${correct}</div>
            <div class="sp-sub">${dv ? `<b>${dv}</b> · ` : ''}<span>${S.ro(q.w, meR)}</span></div>
            <button class="sp-btn sm ghost" style="margin-top:10px" data-sp="say" data-t="${q.parts.join('')}">🔊 Hear</button></div>
           <button class="sp-btn" style="margin-top:12px" data-sp="next">Next →</button>`}
    </div>`;
  }

  // ---------- Events ----------
  H = {
    home: () => this.go({ name: 'home' }),
    pack: el => this.go({ name: 'pack', pack: el.dataset.pack }),
    grammar: () => this.app.switchTab('more'),   // TODO: point at your course / sentence-patterns screen
    word: (el, e) => {
      if (e.target.closest('[data-sp]') !== el) return;
      const i = +el.dataset.i; this.open = this.open === i ? null : i; this.render(this.container);
      if (this.open !== null) this.speak(PACKS.find(p => p.id === this.view.pack).words[i].my);
    },
    say: el => this.speak(el.dataset.t),
    mark: el => {
      const p = PACKS.find(p => p.id === this.view.pack), w = p.words[+el.dataset.i];
      if (this.S.said[this.key(p, w)]) return;
      this.markSaid(p, w); this.log({ pack: p.id, item: w.en, step: 1, ok: true }); this.render(this.container);
    },
    gender: el => { this.S.gender = el.dataset.v; this.save(); this.render(this.container); },
    start: el => this.startQuiz(PACKS.find(p => p.id === el.dataset.pack)),
    show: () => { this.Q.shown = true; this.render(this.container); this.speak(this.Q.items[this.Q.i].w.my); },
    rate: el => {
      const Q = this.Q, { p, w } = Q.items[Q.i], ok = el.dataset.v === '1';
      Q.res.push(ok); this.markSaid(p, w, ok); this.log({ pack: p.id, item: w.en, step: 1, ok });
      Q.i++; Q.shown = false; this.go({ name: 'quiz' });
    },
    quit: () => this.Q.p ? this.go({ name: 'pack', pack: this.Q.p.id }) : this.go({ name: 'home' }),
    again: () => this.Q.p ? this.startQuiz(this.Q.p) : this.go({ name: 'home' }),
    retry: () => { const Q = this.Q; this.runQuiz(Q.items.filter((_, i) => !Q.res[i]), Q.p); },
    misses: () => this.startMisses(),
    build: el => this.startBuild(+el.dataset.step),
    place: el => { this.B.qs[this.B.i].placed.push(+el.dataset.i); this.render(this.container); },
    unplace: el => { this.B.qs[this.B.i].placed.splice(+el.dataset.k, 1); this.render(this.container); },
    check: () => {
      const B = this.B, q = B.qs[B.i];
      q.done = q.placed.map(i => q.tiles[i]).join('') === q.parts.join('');
      if (q.done) { B.right++; this.S.steps[B.step] = (this.S.steps[B.step] || 0) + 1; this.save(); }
      this.log({ pack: 'feel', item: q.w.en, step: B.step + 1, ok: q.done });
      this.render(this.container); this.speak(q.parts.join(''));
    },
    next: () => { this.B.i++; this.go({ name: 'build' }); },
  };
}
