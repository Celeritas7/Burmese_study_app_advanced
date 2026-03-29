// ═══ SENTENCES PAGE ═══
// Browse and practice all sentences
// Search, filter by category, practice mode (hide English)

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class SentencesPage {
  constructor(app) {
    this.app = app;
    this.sentences = [];
    this.loaded = false;
    this.searchQuery = '';
    this.selectedCategory = null;
    this.practiceMode = false;
    this.revealed = new Set();
  }

  async loadData() {
    try {
      this.sentences = await db.getSentences();
      this.loaded = true;
    } catch (err) { console.error('Sentences load error:', err); }
  }

  getCategories() {
    const cats = {};
    for (const s of this.sentences) {
      const cat = s.category || 'uncategorized';
      if (!cats[cat]) cats[cat] = 0;
      cats[cat]++;
    }
    return Object.entries(cats).sort((a, b) => a[0].localeCompare(b[0]));
  }

  getFiltered() {
    let list = this.sentences;
    if (this.selectedCategory) {
      list = list.filter(s => s.category === this.selectedCategory);
    }
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(s =>
        (s.burmese_text || '').includes(this.searchQuery) ||
        (s.english_text || '').toLowerCase().includes(q) ||
        (s.burmese_text ? toDev(s.burmese_text).toLowerCase().includes(q) : false)
      );
    }
    return list;
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    const categories = this.getCategories();
    const filtered = this.getFiltered();
    const catLabel = this.selectedCategory
      ? this.selectedCategory.replace(/_/g, ' ').replace(/colloquial /i, '')
      : 'All';

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <button id="sent-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div style="flex:1;">
            <div style="font-size:20px;font-weight:800;">📝 Sentences</div>
            <div style="font-size:12px;color:var(--text-muted);">${this.sentences.length} total · ${filtered.length} shown</div>
          </div>
          <button id="sent-practice" style="padding:6px 12px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);
            background:${this.practiceMode ? '#FF9600' : 'var(--surface)'};
            border:2px solid ${this.practiceMode ? '#FF9600' : 'var(--border)'};
            color:${this.practiceMode ? '#fff' : 'var(--text-muted)'};">
            ${this.practiceMode ? '✏️ Practice' : '👁 Browse'}
          </button>
        </div>

        <!-- Search -->
        <input class="input-field" id="sent-search" placeholder="Search sentences..." value="${this.searchQuery}" style="font-size:14px;margin-bottom:12px;">

        <!-- Category filter chips -->
        <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:14px;">
          <button class="sent-cat-chip" data-cat="" style="
            padding:4px 10px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font);
            background:${!this.selectedCategory ? 'var(--blue)15' : 'var(--surface)'};
            border:2px solid ${!this.selectedCategory ? 'var(--blue)' : 'var(--border)'};
            color:${!this.selectedCategory ? 'var(--blue)' : 'var(--text-muted)'};">All (${this.sentences.length})</button>
          ${categories.map(([cat, count]) => {
            const isActive = this.selectedCategory === cat;
            const label = cat.replace(/colloquial_u(\d+)_d(\d+)/, 'U$1 D$2').replace(/_/g, ' ');
            return `<button class="sent-cat-chip" data-cat="${cat}" style="
              padding:4px 10px;border-radius:8px;font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font);
              background:${isActive ? 'var(--green)15' : 'var(--surface)'};
              border:2px solid ${isActive ? 'var(--green)' : 'var(--border)'};
              color:${isActive ? 'var(--green)' : 'var(--text-muted)'};">${label} (${count})</button>`;
          }).join('')}
        </div>

        ${this.practiceMode ? `<div style="text-align:center;font-size:10px;color:var(--text-muted);margin-bottom:10px;">
          Tap a sentence to reveal the English meaning
        </div>` : ''}

        <!-- Sentence list -->
        <div id="sent-list">
          ${filtered.length > 0 ? filtered.map((s, i) => this.renderSentence(s, i)).join('') :
            '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px;">No sentences found</div>'}
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  renderSentence(s, idx) {
    const hasBurmese = !!s.burmese_text;
    const dev = hasBurmese ? toDev(s.burmese_text) : '';
    const isRevealed = !this.practiceMode || this.revealed.has(s.id);

    return `
      <div class="sent-item" data-sid="${s.id}" style="
        padding:12px 14px;border-radius:14px;margin-bottom:6px;
        background:var(--surface);border:2px solid var(--border);
        cursor:${this.practiceMode ? 'pointer' : 'default'};
        transition:all 0.15s;
      ">
        ${hasBurmese ? `
          <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;">${s.burmese_text}</div>
          <div style="font-size:12px;color:var(--yellow);margin-bottom:4px;">${dev}</div>
        ` : `
          <div style="font-size:12px;color:var(--text-muted);font-style:italic;margin-bottom:4px;">Burmese text not yet added</div>
        `}
        ${isRevealed ? `
          <div style="font-size:13px;color:var(--text-muted);line-height:1.5;">${s.english_text || ''}</div>
        ` : `
          <div style="font-size:12px;color:var(--blue);font-weight:600;">👆 Tap to reveal</div>
        `}
      </div>
    `;
  }

  bindEvents(container) {
    container.querySelector('#sent-back').addEventListener('click', () => {
      this.app.tabs.more.render(this.app.contentEl);
    });

    // Practice mode toggle
    container.querySelector('#sent-practice').addEventListener('click', () => {
      this.practiceMode = !this.practiceMode;
      this.revealed.clear();
      this.render(container);
    });

    // Search
    const si = container.querySelector('#sent-search');
    let st;
    si.addEventListener('input', () => {
      clearTimeout(st);
      st = setTimeout(() => {
        this.searchQuery = si.value.trim();
        this.revealed.clear();
        const list = container.querySelector('#sent-list');
        if (list) {
          const filtered = this.getFiltered();
          list.innerHTML = filtered.length > 0 ? filtered.map((s, i) => this.renderSentence(s, i)).join('') :
            '<div style="text-align:center;padding:40px;color:var(--text-muted);font-size:14px;">No sentences found</div>';
          this.bindSentenceClicks(container);
        }
      }, 300);
    });

    // Category chips
    container.querySelectorAll('.sent-cat-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        const cat = btn.dataset.cat;
        this.selectedCategory = cat || null;
        this.revealed.clear();
        this.render(container);
      });
    });

    this.bindSentenceClicks(container);
  }

  bindSentenceClicks(container) {
    if (!this.practiceMode) return;
    container.querySelectorAll('.sent-item').forEach(el => {
      el.addEventListener('click', () => {
        const sid = parseInt(el.dataset.sid);
        if (!this.revealed.has(sid)) {
          this.revealed.add(sid);
          const s = this.sentences.find(x => x.id === sid);
          if (s) {
            el.innerHTML = this.renderSentenceInner(s);
            el.style.borderColor = 'var(--green)';
          }
        }
      });
    });
  }

  renderSentenceInner(s) {
    const dev = s.burmese_text ? toDev(s.burmese_text) : '';
    return `
      ${s.burmese_text ? `
        <div style="font-size:16px;font-weight:700;color:var(--text);margin-bottom:4px;">${s.burmese_text}</div>
        <div style="font-size:12px;color:var(--yellow);margin-bottom:4px;">${dev}</div>
      ` : ''}
      <div style="font-size:13px;color:var(--green);line-height:1.5;font-weight:600;">${s.english_text || ''}</div>
    `;
  }
}
