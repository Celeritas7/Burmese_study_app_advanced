// ═══ DIALOGUES TAB ═══
// Colloquial Burmese textbook - Preliminary + Units 1-15
// Launches as a sub-page from More tab

import { db } from './supabase.js';
import { toDev } from './burmese.js';

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
      this.app.tabs.more.render(this.app.contentEl);
    });

    container.querySelectorAll('.dial-unit-header').forEach(btn => {
      btn.addEventListener('click', () => {
        const u = parseInt(btn.dataset.unit);
        this.expandedUnit = this.expandedUnit === u ? null : u;
        this.expandedDialogue = null;
        this.render(container);
      });
    });

    // Dialogue expand buttons
    container.querySelectorAll('[data-dialogue]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const d = btn.dataset.dialogue;
        this.expandedDialogue = this.expandedDialogue === d ? null : d;
        this.render(container);
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
            ${isOpen ? `
              <div style="padding:8px 16px 14px;">
                ${sents.map((s, i) => `
                  <div style="
                    display:flex; gap:10px; padding:10px 0;
                    ${i < sents.length - 1 ? `border-bottom:1px solid ${info.color}10;` : ''}
                    animation: fadeSlide 0.2s ease;
                    animation-delay: ${i * 0.03}s;
                    animation-fill-mode: both;
                  ">
                    <div style="width:6px; min-height:20px; border-radius:3px; background:${info.color}30; margin-top:2px;"></div>
                    <div style="flex:1;">
                      ${s.burmese_text ? `
                        <div style="font-size:16px; font-weight:700; color:var(--text); margin-bottom:4px;">
                          ${s.burmese_text}
                        </div>
                        <div style="font-size:12px; color:${info.color}; margin-bottom:4px;">
                          ${toDev(s.burmese_text)}
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
                  </div>
                `).join('')}
              </div>
            ` : ''}
          `;
        }).join('')}
      </div>
    `;
  }
}
