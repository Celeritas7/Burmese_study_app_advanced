// ═══ HUB EXPLORER ═══
// Browse anchor words (hubs) and their spoke words
// The "artificial kanji" system — visual scaffolding for Burmese

import { db } from './supabase.js';
import { toDev } from './burmese.js';

export class HubExplorer {
  constructor(app) {
    this.app = app;
    this.consonants = [];
    this.anchors = [];
    this.words = [];
    this.loaded = false;
    this.selectedConsonant = null;
    this.expandedAnchor = null;
    this.searchQuery = '';
    this.view = 'consonants'; // consonants | all | search
  }

  async loadData() {
    try {
      const [consonants, anchors, words] = await Promise.all([
        db.getConsonants(),
        db.getAnchorWords(),
        db.getWords()
      ]);
      this.consonants = consonants;
      this.anchors = anchors;
      this.words = words;
      this.loaded = true;
    } catch (err) {
      console.error('Hub Explorer load error:', err);
    }
  }

  getSpokesForAnchor(anchorWord) {
    return this.words.filter(w =>
      w.burmese_word !== anchorWord &&
      w.burmese_word.includes(anchorWord)
    );
  }

  getAnchorsForConsonant(consonantId) {
    return this.anchors.filter(a => a.consonant_id === consonantId);
  }

  getFilteredAnchors() {
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      return this.anchors.filter(a =>
        a.burmese_word.includes(this.searchQuery) ||
        (a.meaning || '').toLowerCase().includes(q) ||
        toDev(a.burmese_word).toLowerCase().includes(q)
      );
    }
    return this.anchors;
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;"><div style="font-size:24px;">Loading...</div></div>';
      await this.loadData();
    }

    const totalSpokes = this.anchors.reduce((sum, a) => sum + this.getSpokesForAnchor(a.burmese_word).length, 0);

    container.innerHTML = `
      <div class="pad-sm">
        <!-- Header -->
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:16px;">
          <button id="hub-back" style="background:var(--surface); border:2px solid var(--border); border-radius:10px;
            color:var(--text-muted); cursor:pointer; font-size:12px; padding:6px 12px; font-weight:700; font-family:var(--font);">
            ← Back
          </button>
          <div style="flex:1;">
            <div style="font-size:20px; font-weight:800; color:var(--text);">🌿 Hub Explorer</div>
            <div style="font-size:12px; color:var(--text-muted);">${this.anchors.length} hubs · ${totalSpokes} spokes</div>
          </div>
        </div>

        <!-- Search -->
        <div style="margin-bottom:14px;">
          <input class="input-field" id="hub-search" placeholder="Search hubs by Burmese, Devanagari, or meaning..."
            value="${this.searchQuery}" style="font-size:14px;">
        </div>

        <!-- View toggles -->
        <div style="display:flex; gap:6px; margin-bottom:16px;">
          <button class="hub-view-btn" data-view="consonants" style="
            flex:1; padding:9px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; font-family:var(--font);
            background:${this.view === 'consonants' ? 'var(--green)15' : 'var(--surface)'};
            border:2px solid ${this.view === 'consonants' ? 'var(--green)' : 'var(--border)'};
            color:${this.view === 'consonants' ? 'var(--green)' : 'var(--text-muted)'};
          ">By Consonant</button>
          <button class="hub-view-btn" data-view="all" style="
            flex:1; padding:9px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; font-family:var(--font);
            background:${this.view === 'all' ? 'var(--blue)15' : 'var(--surface)'};
            border:2px solid ${this.view === 'all' ? 'var(--blue)' : 'var(--border)'};
            color:${this.view === 'all' ? 'var(--blue)' : 'var(--text-muted)'};
          ">All Hubs</button>
        </div>

        <!-- Content -->
        <div id="hub-content">
          ${this.searchQuery ? this.renderSearchResults() :
            this.view === 'consonants' ? this.renderByConsonant() : this.renderAllHubs()}
        </div>
      </div>
    `;

    this.bindEvents(container);
  }

  // ─── BY CONSONANT VIEW ───
  renderByConsonant() {
    if (this.selectedConsonant !== null) {
      return this.renderConsonantDetail();
    }

    return `
      <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
        ${this.consonants.map(c => {
          const anchors = this.getAnchorsForConsonant(c.id);
          const spokeCount = anchors.reduce((sum, a) => sum + this.getSpokesForAnchor(a.burmese_word).length, 0);
          const hasAnchors = anchors.length > 0;

          return `
            <button class="consonant-cell" data-cid="${c.id}" style="
              padding:14px 8px; border-radius:14px; text-align:center;
              background:${hasAnchors ? 'var(--surface)' : 'var(--bg)'};
              border:2px solid ${hasAnchors ? 'var(--green)30' : 'var(--border)'};
              cursor:${hasAnchors ? 'pointer' : 'default'};
              opacity:${hasAnchors ? '1' : '0.35'};
              font-family:var(--font); transition:all 0.15s;
            ">
              <div style="font-size:24px; font-weight:700; color:var(--text);">${c.burmese_char}</div>
              <div style="font-size:10px; color:var(--text-muted); margin-top:2px;">${c.romanization || ''}</div>
              ${hasAnchors ? `
                <div style="display:flex; justify-content:center; gap:4px; margin-top:6px;">
                  <span style="font-size:9px; padding:2px 6px; border-radius:6px;
                    background:var(--green)15; color:var(--green); font-weight:700;">
                    ${anchors.length}
                  </span>
                  <span style="font-size:9px; padding:2px 6px; border-radius:6px;
                    background:var(--blue)15; color:var(--blue); font-weight:700;">
                    ${spokeCount}
                  </span>
                </div>
              ` : ''}
            </button>
          `;
        }).join('')}
      </div>
      <div style="display:flex; justify-content:center; gap:16px; margin-top:12px; font-size:10px; color:var(--text-muted);">
        <span><span style="color:var(--green);">■</span> hubs</span>
        <span><span style="color:var(--blue);">■</span> spokes</span>
      </div>
    `;
  }

  // ─── CONSONANT DETAIL ───
  renderConsonantDetail() {
    const c = this.consonants.find(c => c.id === this.selectedConsonant);
    if (!c) return '';
    const anchors = this.getAnchorsForConsonant(c.id);

    return `
      <!-- Consonant header -->
      <button id="back-to-grid" style="
        display:flex; align-items:center; gap:10px; margin-bottom:14px; padding:10px 14px;
        border-radius:12px; background:var(--green)10; border:2px solid var(--green)30;
        cursor:pointer; width:100%; text-align:left; font-family:var(--font);
      ">
        <span style="font-size:11px; color:var(--green);">←</span>
        <div style="font-size:28px; font-weight:800; color:var(--text);">${c.burmese_char}</div>
        <div style="flex:1;">
          <div style="font-size:14px; font-weight:700; color:var(--text);">${c.romanization || ''}</div>
          <div style="font-size:11px; color:var(--text-muted);">${anchors.length} hubs</div>
        </div>
      </button>

      <!-- Anchor list -->
      ${anchors.length > 0 ? anchors.map(a => this.renderAnchorCard(a)).join('') :
        '<div style="text-align:center; padding:30px; color:var(--text-muted);">No hubs for this consonant</div>'}
    `;
  }

  // ─── ALL HUBS VIEW ───
  renderAllHubs() {
    const sorted = [...this.anchors].sort((a, b) =>
      (a.burmese_word || '').localeCompare(b.burmese_word || '')
    );

    return `
      ${sorted.map(a => this.renderAnchorCard(a)).join('')}
      ${sorted.length === 0 ? '<div style="text-align:center; padding:30px; color:var(--text-muted);">No anchor words found</div>' : ''}
    `;
  }

  // ─── SEARCH RESULTS ───
  renderSearchResults() {
    const results = this.getFilteredAnchors();

    return `
      <div style="font-size:12px; color:var(--text-muted); margin-bottom:10px;">
        ${results.length} hub${results.length !== 1 ? 's' : ''} found
      </div>
      ${results.map(a => this.renderAnchorCard(a)).join('')}
      ${results.length === 0 ? '<div style="text-align:center; padding:30px; color:var(--text-muted);">No matching hubs</div>' : ''}
    `;
  }

  // ─── ANCHOR CARD (reusable) ───
  renderAnchorCard(anchor) {
    const spokes = this.getSpokesForAnchor(anchor.burmese_word);
    const isExpanded = this.expandedAnchor === anchor.id;
    const dev = toDev(anchor.burmese_word);

    return `
      <div style="margin-bottom:8px;">
        <!-- Anchor header -->
        <button class="anchor-btn" data-aid="${anchor.id}" style="
          display:flex; align-items:center; gap:12px; width:100%; padding:12px 14px;
          border-radius:${isExpanded ? '14px 14px 0 0' : '14px'};
          background:${isExpanded ? 'var(--green)10' : 'var(--surface)'};
          border:2px solid ${isExpanded ? 'var(--green)' : 'var(--border)'};
          cursor:pointer; text-align:left; font-family:var(--font); transition:all 0.15s;
        ">
          <div style="
            width:48px; height:48px; border-radius:12px;
            background:var(--green)15; border:2px solid var(--green)25;
            display:flex; align-items:center; justify-content:center;
            font-size:22px; font-weight:800; color:var(--green);
          ">${anchor.burmese_word}</div>
          <div style="flex:1;">
            <div style="font-size:14px; font-weight:700; color:var(--text);">
              ${dev}
              ${anchor.meaning ? `<span style="color:var(--text-muted); font-weight:500; font-size:12px; margin-left:6px;">${anchor.meaning}</span>` : ''}
            </div>
            <div style="display:flex; gap:6px; margin-top:4px;">
              <span style="font-size:10px; padding:2px 8px; border-radius:6px;
                background:var(--blue)15; color:var(--blue); font-weight:700;">
                ${spokes.length} spoke${spokes.length !== 1 ? 's' : ''}
              </span>
              ${anchor.is_curated ? `
                <span style="font-size:10px; padding:2px 8px; border-radius:6px;
                  background:var(--yellow)15; color:var(--yellow); font-weight:700;">curated</span>
              ` : ''}
              ${anchor.group_no ? `
                <span style="font-size:10px; padding:2px 8px; border-radius:6px;
                  background:var(--purple)15; color:var(--purple); font-weight:700;">grp ${anchor.group_no}</span>
              ` : ''}
            </div>
          </div>
          <span style="color:var(--text-muted); font-size:12px;">${isExpanded ? '▴' : '▾'}</span>
        </button>

        <!-- Spokes (expanded) -->
        ${isExpanded ? `
          <div style="
            border:2px solid var(--green); border-top:none;
            border-radius:0 0 14px 14px; background:var(--green)05;
            padding:12px 14px;
          ">
            ${spokes.length > 0 ? `
              <div style="display:flex; flex-wrap:wrap; gap:6px; margin-bottom:10px;">
                ${spokes.map(s => {
                  const sDev = toDev(s.burmese_word);
                  const containsHub = s.burmese_word.includes(anchor.burmese_word);
                  return `
                    <div style="
                      padding:8px 12px; border-radius:10px;
                      background:var(--surface); border:2px solid var(--border);
                      transition:all 0.15s;
                    ">
                      <div style="font-size:15px; font-weight:600; color:var(--text);">${s.burmese_word}</div>
                      <div style="font-size:10px; color:var(--yellow); margin-top:2px;">${sDev}</div>
                      <div style="font-size:10px; color:var(--text-muted); margin-top:1px;">${s.english_meaning || ''}</div>
                      ${containsHub ? `<div style="font-size:9px; color:var(--green); margin-top:3px; font-weight:700;">contains: ${anchor.burmese_word}</div>` : ''}
                    </div>
                  `;
                }).join('')}
              </div>
            ` : `
              <div style="text-align:center; padding:12px; color:var(--text-muted); font-size:13px;">
                No spoke words found in database
              </div>
            `}

            <!-- Hub info -->
            <div style="display:flex; gap:8px; padding-top:8px; border-top:1px solid var(--green)15;">
              <div style="flex:1; font-size:11px; color:var(--text-muted);">
                Hub: <strong style="color:var(--green);">${anchor.burmese_word}</strong>
                · ${dev}
                ${anchor.meaning ? `· ${anchor.meaning}` : ''}
              </div>
              <button class="hub-flag-btn" data-flag-aid="${anchor.id}" style="
                font-size:10px; color:var(--pink); background:var(--pink)12;
                border:1px solid var(--pink)25; border-radius:8px;
                padding:3px 10px; cursor:pointer; font-weight:700; font-family:var(--font);
              ">⚑ Flag</button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  // ─── EVENTS ───
  bindEvents(container) {
    // Back to More
    container.querySelector('#hub-back').addEventListener('click', () => {
      this.app.tabs.more.render(this.app.contentEl);
    });

    // Search
    const searchInput = container.querySelector('#hub-search');
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this.searchQuery = searchInput.value.trim();
        this.expandedAnchor = null;
        if (this.searchQuery) {
          this.view = 'search';
        }
        const content = container.querySelector('#hub-content');
        if (content) {
          content.innerHTML = this.searchQuery ? this.renderSearchResults() :
            this.view === 'consonants' ? this.renderByConsonant() : this.renderAllHubs();
          this.bindContentEvents(container);
        }
      }, 300);
    });

    // View toggles
    container.querySelectorAll('.hub-view-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.view = btn.dataset.view;
        this.selectedConsonant = null;
        this.expandedAnchor = null;
        this.searchQuery = '';
        searchInput.value = '';
        this.render(container);
      });
    });

    this.bindContentEvents(container);
  }

  bindContentEvents(container) {
    // Consonant grid cells
    container.querySelectorAll('.consonant-cell').forEach(btn => {
      btn.addEventListener('click', () => {
        const cid = parseInt(btn.dataset.cid);
        const anchors = this.getAnchorsForConsonant(cid);
        if (anchors.length === 0) return;
        this.selectedConsonant = cid;
        this.expandedAnchor = null;
        this.render(container);
      });
    });

    // Back to consonant grid
    container.querySelector('#back-to-grid')?.addEventListener('click', () => {
      this.selectedConsonant = null;
      this.expandedAnchor = null;
      this.render(container);
    });

    // Anchor expand/collapse
    container.querySelectorAll('.anchor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const aid = parseInt(btn.dataset.aid);
        this.expandedAnchor = this.expandedAnchor === aid ? null : aid;
        this.render(container);
      });
    });

    // Flag buttons
    container.querySelectorAll('.hub-flag-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const aid = parseInt(btn.dataset.flagAid);
        const anchor = this.anchors.find(a => a.id === aid);
        if (anchor) {
          // Simple flag — just log it
          try {
            db.logProgress({
              type: 'flag_hub',
              wordId: aid,
              wordType: 'anchor',
              result: 'flagged'
            });
          } catch {}
          btn.textContent = '✓ Flagged';
          btn.style.color = 'var(--green)';
          btn.style.borderColor = 'var(--green)25';
          btn.style.background = 'var(--green)12';
        }
      });
    });
  }
}
