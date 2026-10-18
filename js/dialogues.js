// ═══ DIALOGUES TAB ═══
// Colloquial Burmese textbook - Preliminary + Units 1-15
// Launches as a sub-page from More tab
// Phase 12: 🔊 per line, Play all, A/B speakers with one voice each (swap per dialogue).

import { db } from './supabase.js';
import { toDev, toPronunciation } from 'https://celeritas7.github.io/language-utils/burmese.js?v=8';
import { sayBtn, forcedVoice, playAll, stopAll } from './app-audio.js?v=1';

const DV_KEY = 'dialogue_voices';   // { "1_2": { A: 'f', B: 'm' } } — only dialogues the user swapped

const UNIT_INFO = [
  { unit: 0, title: 'Preliminary', subtitle: 'Greetings, script and numbers', color: '#1CB0F6', icon: '🔤' },
  { unit: 1, title: 'Unit 1', subtitle: 'A curious foreigner', color: '#58CC02', icon: '🛍️' },
  { unit: 2, title: 'Unit 2', subtitle: 'New in town', color: '#FFC800', icon: '🏙️' },
  { unit: 3, title: 'Unit 3', subtitle: 'Talking about the weather', color: '#CE82FF', icon: '🌦️' },
  { unit: 4, title: 'Unit 4', subtitle: 'Family and friends', color: '#FF6B8A', icon: '👨‍👩‍👧' },
  { unit: 5, title: 'Unit 5', subtitle: 'Lost in the street', color: '#FF9600', icon: '🗺️' },
  { unit: 6, title: 'Unit 6', subtitle: 'Food and drinks', color: '#58CC02', icon: '🍜' },
  { unit: 7, title: 'Unit 7', subtitle: 'Likes, dislikes and desires', color: '#1CB0F6', icon: '❤️' },
  { unit: 8, title: 'Unit 8', subtitle: 'Abilities and talents', color: '#FFC800', icon: '💪' },
  { unit: 9, title: 'Unit 9', subtitle: 'Getting thirsty and needs', color: '#CE82FF', icon: '🥤' },
  { unit: 10, title: 'Unit 10', subtitle: 'Being considerate in public', color: '#FF6B8A', icon: '🙏' },
  { unit: 11, title: 'Unit 11', subtitle: 'Weekend and travel plans', color: '#FF9600', icon: '✈️' },
  { unit: 12, title: 'Unit 12', subtitle: 'Talking about time', color: '#58CC02', icon: '⏰' },
  { unit: 13, title: 'Unit 13', subtitle: 'Talking about experiences', color: '#1CB0F6', icon: '🌍' },
  { unit: 14, title: 'Unit 14', subtitle: 'Getting sick', color: '#FFC800', icon: '🤒' },
  { unit: 15, title: 'Unit 15', subtitle: 'Talking about where you are', color: '#CE82FF', icon: '📍' },
];

const TONE = { m: ['rgba(28,176,246,0.15)', 'var(--blue)'], f: ['rgba(255,107,138,0.15)', 'var(--pink)'] };

export class DialoguesTab {
  constructor(app) {
    this.app = app;
    this.sentences = [];
    this.loaded = false;
    this.expandedUnit = null;
    this.expandedDialogue = null;
    this.linkedWords = {};
  }

  async loadData() {
    try {
      this.sentences = await db.getSentences();
      // Filter to only colloquial sentences
      this.sentences = this.sentences.filter(s => s.category && s.category.startsWith('colloquial_'));
      this.loaded = true;
    } catch (err) {
      console.error('Dialogues load error:', err);
    }
  }

  getSentencesForUnit(unitNum) {
    const prefix = `colloquial_u${unitNum}_`;
    return this.sentences.filter(s => s.category && s.category.startsWith(prefix));
  }

  getDialoguesForUnit(unitNum) {
    const unitSentences = this.getSentencesForUnit(unitNum);
    const dialogues = {};
    for (const s of unitSentences) {
      const m = s.category.match(/colloquial_u\d+_d(\d+)/);
      if (m) {
        const dNum = parseInt(m[1]);
        if (!dialogues[dNum]) dialogues[dNum] = [];
        dialogues[dNum].push(s);
      }
    }
    return dialogues;
  }

  dialogueSents(key) { const [u, d] = key.split('_').map(Number); return this.getDialoguesForUnit(u)[d] || []; }

  // A/B per line: the optional `speaker` column wins, otherwise alternate from the previous line.
  speakers(sents) {
    const out = [];
    sents.forEach((s, i) => { out[i] = (s.speaker === 'A' || s.speaker === 'B') ? s.speaker : i === 0 ? 'A' : (out[i - 1] === 'A' ? 'B' : 'A'); });
    return out;
  }

  // Voices: the user's swap → else the first ကျွန်မ / ကျွန်တော် decides that speaker → else A ♂, B ♀.
  voicesFor(key, sents) {
    try { const saved = JSON.parse(localStorage.getItem(DV_KEY) || '{}')[key]; if (saved) return saved; } catch {}
    const spk = this.speakers(sents);
    for (let i = 0; i < sents.length; i++) {
      const f = forcedVoice(sents[i].burmese_text);
      if (f) { const o = f === 'm' ? 'f' : 'm'; return spk[i] === 'A' ? { A: f, B: o } : { A: o, B: f }; }
    }
    return { A: 'm', B: 'f' };
  }

  // Keep the line being played on screen without scrollIntoView.
  keepVisible(el) {
    const r = el.getBoundingClientRect();
    if (r.top >= 70 && r.bottom <= window.innerHeight - 90) return;
    const d = r.top - window.innerHeight / 3, sc = this.app.contentEl;
    if (sc && sc.scrollHeight > sc.clientHeight + 4) sc.scrollBy({ top: d, behavior: 'smooth' });
    else window.scrollBy({ top: d, behavior: 'smooth' });
  }

  async render(container) {
    if (!this.loaded) await this.loadData();

    // Count sentences per unit
    const unitCounts = {};
    for (const info of UNIT_INFO) {
      unitCounts[info.unit] = this.getSentencesForUnit(info.unit).length;
    }

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:20px;">
          <button id="dial-back" style="background:var(--surface); border:2px solid var(--border); border-radius:10px;
            color:var(--text-muted); cursor:pointer; font-size:12px; padding:6px 12px; font-weight:700; font-family:var(--font);">
            ← Back
          </button>
          <div style="flex:1;">
            <div style="font-size:20px; font-weight:800; color:var(--text);">💬 Dialogues</div>
            <div style="font-size:12px; color:var(--text-muted);">Colloquial Burmese · ${this.sentences.length} sentences</div>
          </div>
        </div>

        <!-- Unit list -->
        <div id="unit-list">
          ${UNIT_INFO.map(info => {
            const count = unitCounts[info.unit] || 0;
            const dialogues = this.getDialoguesForUnit(info.unit);
            const dCount = Object.keys(dialogues).length;
            const isExpanded = this.expandedUnit === info.unit;

            return `
              <div class="dial-unit" style="margin-bottom:8px;">
                <!-- Unit header -->
                <button class="dial-unit-header" data-unit="${info.unit}" style="
                  display:flex; align-items:center; gap:12px; width:100%; padding:14px 16px;
                  border-radius:${isExpanded ? '16px 16px 0 0' : '16px'};
                  background:${isExpanded ? `${info.color}10` : 'var(--surface)'};
                  border:2px solid ${isExpanded ? info.color : 'var(--border)'};
                  cursor:pointer; text-align:left; font-family:var(--font);
                  transition:all 0.2s;
                ">
                  <div style="width:44px; height:44px; border-radius:12px; background:${info.color}18;
                    border:2px solid ${info.color}30; display:flex; align-items:center; justify-content:center;
                    font-size:20px;">
                    ${info.icon}
                  </div>
                  <div style="flex:1;">
                    <div style="font-size:14px; font-weight:700; color:var(--text);">${info.title}</div>
                    <div style="font-size:11px; color:var(--text-muted);">${info.subtitle}</div>
                  </div>
                  <div style="text-align:right;">
                    <div style="font-size:13px; font-weight:800; color:${info.color};">${count}</div>
                    <div style="font-size:10px; color:var(--text-muted);">${dCount} dial.</div>
                  </div>
                  <span style="color:var(--text-muted); font-size:12px; margin-left:4px;">
                    ${isExpanded ? '▴' : '▾'}
                  </span>
                </button>

                <!-- Expanded dialogues -->
                ${isExpanded ? this.renderUnitDialogues(info, dialogues) : ''}
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;

    // Wire events
    container.querySelector('#dial-back').addEventListener('click', () => {
      stopAll();
      this.app.tabs.more.render(this.app.contentEl);
    });

    container.querySelectorAll('.dial-unit-header').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = parseInt(btn.dataset.unit);
        this.expandedUnit = this.expandedUnit === u ? null : u;
        this.expandedDialogue = null;
        stopAll();
        this.render(container);
      });
    });

    // Dialogue expand buttons
    container.querySelectorAll('[data-dialogue]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = btn.dataset.dialogue;
        this.expandedDialogue = this.expandedDialogue === d ? null : d;
        stopAll();
        this.render(container);
      });
    });

    // ⇄ Swap voices — remembered per dialogue
    container.querySelectorAll('[data-dial-swap]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.dialSwap, v = this.voicesFor(key, this.dialogueSents(key));
        let all = {}; try { all = JSON.parse(localStorage.getItem(DV_KEY) || '{}'); } catch {}
        all[key] = { A: v.B, B: v.A };
        localStorage.setItem(DV_KEY, JSON.stringify(all));
        stopAll();
        this.render(container);
      });
    });

    // Play all — highlights the current line, stops at the first line with no clip; tap again to stop
    container.querySelectorAll('[data-dial-play]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.dataset.state === 'playing') { stopAll(); return; }
        const key = btn.dataset.dialPlay, sents = this.dialogueSents(key);
        const spk = this.speakers(sents), v = this.voicesFor(key, sents);
        const rows = [...container.querySelectorAll(`[data-dl="${key}"] .dial-line`)];
        const items = sents.map((s, i) => ({ text: s.burmese_text, voice: v[spk[i]], row: rows[i], btn: rows[i]?.querySelector('[data-au]') }))
          .filter(it => it.text && it.row);
        btn.dataset.state = 'playing';
        playAll(items, i => {
          rows.forEach(r => { r.style.background = ''; });
          if (i < 0) { btn.dataset.state = 'idle'; return; }
          items[i].row.style.background = 'rgba(28,176,246,0.08)';
          this.keepVisible(items[i].row);
        });
      });
    });
  }

  renderUnitDialogues(info, dialogues) {
    const dNums = Object.keys(dialogues).sort((a, b) => a - b);

    return `
      <div style="border:2px solid ${info.color}; border-top:none; border-radius:0 0 16px 16px;
        background:${info.color}05; overflow:hidden;">
        ${dNums.map(dNum => {
          const sents = dialogues[dNum];
          const key = `${info.unit}_${dNum}`;
          const isOpen = this.expandedDialogue === key;

          return `
            <!-- Dialogue header -->
            <button data-dialogue="${key}" style="
              display:flex; align-items:center; gap:10px; width:100%; padding:12px 16px;
              background:${isOpen ? `${info.color}12` : 'transparent'};
              border:none; border-top:1px solid ${info.color}20;
              cursor:pointer; text-align:left; font-family:var(--font);
            ">
              <div style="width:28px; height:28px; border-radius:8px; background:${info.color}20;
                display:flex; align-items:center; justify-content:center;
                font-size:12px; font-weight:800; color:${info.color};">
                D${dNum}
              </div>
              <div style="flex:1; font-size:13px; font-weight:600; color:var(--text);">
                Dialogue ${dNum}
              </div>
              <span style="font-size:11px; color:var(--text-muted); font-weight:600;">
                ${sents.length} lines
              </span>
              <span style="color:var(--text-muted); font-size:11px;">
                ${isOpen ? '▴' : '▾'}
              </span>
            </button>

            <!-- Sentences -->
            ${isOpen ? this.renderLines(info, key, sents) : ''}
          `;
        }).join('')}
      </div>
    `;
  }

  renderLines(info, key, sents) {
    const spk = this.speakers(sents), v = this.voicesFor(key, sents);
    const chip = p => { const [bg, c] = TONE[v[p]]; return `<span style="font-size:10px;font-weight:800;border-radius:999px;padding:3px 8px;background:${bg};color:${c};">${p} · ${v[p] === 'f' ? '♀' : '♂'}</span>`; };
    return `
      <div data-dl="${key}" style="padding:8px 16px 14px;">
        <div style="display:flex; align-items:center; gap:6px; padding:2px 0 8px;">
          <button class="sp-btn sm ghost sp-say" data-dial-play="${key}" data-state="idle" style="padding:6px 10px;font-size:12px;"><i class="sp-say-ic"></i>Play all</button>
          ${chip('A')}${chip('B')}
          <button data-dial-swap="${key}" style="margin-left:auto;background:none;border:none;color:var(--text-muted);font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);padding:6px 0;">⇄ Swap voices</button>
        </div>
        ${sents.map((s, i) => {
          const [bg, c] = TONE[v[spk[i]]];
          return `
          <div class="dial-line" style="
            display:flex; gap:10px; padding:10px 6px; margin:0 -6px; border-radius:10px; transition:background 0.2s;
            ${i < sents.length - 1 ? `border-bottom:1px solid ${info.color}10;` : ''}
            animation: fadeSlide 0.2s ease;
            animation-delay: ${i * 0.03}s;
            animation-fill-mode: both;
          ">
            <div style="width:22px; height:22px; border-radius:7px; display:flex; align-items:center; justify-content:center;
              flex:none; margin-top:3px; font-size:11px; font-weight:800; background:${bg}; color:${c};">${spk[i]}</div>
            <div style="flex:1; min-width:0;">
              ${s.burmese_text ? `
                <div style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:4px;">
                  ${s.burmese_text}
                </div>
                <div style="font-size:12px; color:${info.color}; margin-bottom:4px;">
                  ${toPronunciation(s.burmese_text, { tones: false })}
                </div>
              ` : `
                <div style="font-size:11px; color:var(--text-dim); font-style:italic; margin-bottom:4px;">
                  Burmese text not yet added
                </div>
              `}
              <div style="font-size:13px; color:var(--text-muted); line-height:1.5;">
                ${s.english_text}
              </div>
            </div>
            ${s.burmese_text ? sayBtn(s.burmese_text, { voice: v[spk[i]] }) : ''}
          </div>`;
        }).join('')}
      </div>`;
  }
}
