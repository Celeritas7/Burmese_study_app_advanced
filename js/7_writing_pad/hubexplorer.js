// ═══ HUB EXPLORER ═══
// buildGroups with filler auto-detection + manual flagging

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

function isSylBoundary(str, pos) {
  if (pos <= 0 || pos >= str.length) return true;
  const code = str.charCodeAt(pos);
  return code >= 0x1000 && code <= 0x1021;
}

// ─── FILLER DETECTION ───
// Signal 1: No english meaning → filler
// Signal 2: Very short (1-2 Myanmar chars) + would grab 10+ spokes → filler
function isAutoFiller(word, spokeCount) {
  const meaning = (word.english_meaning || '').trim();
  // Signal 1: no meaning at all
  if (!meaning) return true;
  // Signal 2: count Myanmar chars (ignore modifiers/vowels)
  const myanmarChars = [...word.burmese_word].filter(c => {
    const code = c.charCodeAt(0);
    return code >= 0x1000 && code <= 0x1021; // consonants only
  }).length;
  if (myanmarChars <= 1 && spokeCount >= 10) return true;
  return false;
}

// ─── BUILD GROUPS ───
function buildGroups(consonantsRaw, wordsRaw) {
  // Filter out manually flagged fillers
  const words = wordsRaw.filter(w => !w.is_filler);

  const sorted = [...words].sort(
    (a, b) => a.burmese_word.length - b.burmese_word.length || a.id - b.id
  );
  const assigned = new Set();
  const hubs = [];
  const fillers = [];

  for (const pot of sorted) {
    if (assigned.has(pot.id)) continue;
    const pw = pot.burmese_word;
    const candidateSpokes = [];

    for (const other of sorted) {
      if (other.id === pot.id) continue;
      if (assigned.has(other.id)) continue;
      const ow = other.burmese_word;
      if (ow.length <= pw.length) continue;

      const isPrefix = ow.startsWith(pw) && isSylBoundary(ow, pw.length);
      const suffixStart = ow.length - pw.length;
      const isSuffix = ow.endsWith(pw) && isSylBoundary(ow, suffixStart);

      if (isPrefix || isSuffix) {
        candidateSpokes.push(other);
      }
    }

    if (candidateSpokes.length > 0) {
      // Auto-filler check BEFORE committing
      if (isAutoFiller(pot, candidateSpokes.length)) {
        fillers.push({
          id: pot.id,
          word: pw,
          meaning: pot.english_meaning || '',
          reason: !(pot.english_meaning || '').trim() ? 'no meaning' : 'too short + many spokes',
          wouldHaveSpokes: candidateSpokes.length
        });
        // Don't assign spokes — let them be available for real hubs
        continue;
      }

      candidateSpokes.forEach(s => assigned.add(s.id));
      hubs.push({
        id: pot.id,
        word: pw,
        meaning: pot.english_meaning || '',
        consonantId: pot.first_consonant_id,
        spokes: candidateSpokes.map(s => ({ word: s.burmese_word, meaning: s.english_meaning || '' }))
      });
    }
  }

  const cons = consonantsRaw.map(c => {
    const myHubs = hubs.filter(h => h.consonantId === c.id);
    return {
      id: c.id, char: c.burmese_char, roman: c.romanization || '',
      hubCount: myHubs.length,
      spokeCount: myHubs.reduce((s, h) => s + h.spokes.length, 0)
    };
  });

  return { cons, hubs, fillers };
}

export class HubExplorer {
  constructor(app) {
    this.app = app;
    this.consonants = [];
    this.hubs = [];
    this.fillers = [];
    this.allWords = [];
    this.loaded = false;
    this.selectedConsonant = null;
    this.expandedHub = null;
    this.searchQuery = '';
    this.view = 'consonants';
    this.showFillers = false;
  }

  async loadData() {
    try {
      const [consonants, words] = await Promise.all([db.getConsonants(), db.getWords()]);
      this.allWords = words;
      const { cons, hubs, fillers } = buildGroups(consonants, words);
      this.consonants = cons;
      this.hubs = hubs;
      this.fillers = fillers;
      this.loaded = true;
    } catch (err) { console.error('Hub Explorer load error:', err); }
  }

  async reload(container) {
    this.loaded = false;
    this.expandedHub = null;
    await this.render(container);
  }

  getHubsForConsonant(cid) { return this.hubs.filter(h => h.consonantId === cid); }

  getFilteredHubs() {
    if (!this.searchQuery) return this.hubs;
    const q = this.searchQuery.toLowerCase();
    return this.hubs.filter(h => h.word.includes(this.searchQuery) || h.meaning.toLowerCase().includes(q) || toDev(h.word).toLowerCase().includes(q));
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }
    const totalSpokes = this.hubs.reduce((s, h) => s + h.spokes.length, 0);
    container.innerHTML = `
      <div class="pad-sm">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <button id="hub-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div style="flex:1;"><div style="font-size:20px;font-weight:800;">🌿 Hub Explorer</div><div style="font-size:12px;color:var(--text-muted);">${this.hubs.length} hubs · ${totalSpokes} spokes${this.fillers.length > 0 ? ` · ${this.fillers.length} filtered` : ''}</div></div>
        </div>
        <input class="input-field" id="hub-search" placeholder="Search hubs..." value="${this.searchQuery}" style="font-size:14px;margin-bottom:10px;">
        <div style="display:flex;gap:6px;margin-bottom:12px;">
          ${['consonants','all'].map(v=>`<button class="hub-view-btn" data-view="${v}" style="flex:1;padding:9px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);background:${this.view===v?(v==='consonants'?'var(--green)15':'var(--blue)15'):'var(--surface)'};border:2px solid ${this.view===v?(v==='consonants'?'var(--green)':'var(--blue)'):'var(--border)'};color:${this.view===v?(v==='consonants'?'var(--green)':'var(--blue)'):'var(--text-muted)'};">${v==='consonants'?'By Consonant':'All Hubs'}</button>`).join('')}
        </div>
        ${this.fillers.length > 0 ? `
          <button id="toggle-fillers" style="width:100%;padding:8px;border-radius:10px;font-size:11px;font-weight:700;cursor:pointer;font-family:var(--font);
            background:${this.showFillers ? 'var(--pink)12' : 'var(--surface)'};border:2px solid ${this.showFillers ? 'var(--pink)' : 'var(--border)'};
            color:${this.showFilters ? 'var(--pink)' : 'var(--text-muted)'};margin-bottom:14px;">
            ${this.showFillers ? '▴ Hide' : '▾ Show'} ${this.fillers.length} auto-filtered words
          </button>
          ${this.showFillers ? this.renderFillers() : ''}
        ` : ''}
        <div id="hub-content">${this.searchQuery?this.renderSearch():this.view==='consonants'?this.renderByConsonant():this.renderAllHubs()}</div>
      </div>`;
    this.bindEvents(container);
  }

  // ─── FILLERS PANEL ───
  renderFillers() {
    return `
      <div style="background:var(--pink)08;border:2px solid var(--pink)30;border-radius:14px;padding:12px;margin-bottom:14px;">
        <div style="font-size:11px;color:var(--pink);font-weight:700;margin-bottom:8px;">
          Auto-filtered (would create misleading hubs)
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${this.fillers.map(f => `
            <div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border-radius:10px;background:var(--surface);border:1px solid var(--border);">
              <div style="font-size:16px;font-weight:700;color:var(--text);min-width:40px;">${f.word}</div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:11px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                  ${f.meaning || '(no meaning)'}
                </div>
                <div style="font-size:9px;color:var(--pink);">${f.reason} · would have ${f.wouldHaveSpokes} spokes</div>
              </div>
              <button class="filler-restore-btn" data-fid="${f.id}" style="font-size:9px;color:var(--green);background:var(--green)12;border:1px solid var(--green)25;border-radius:6px;padding:3px 8px;cursor:pointer;font-weight:700;font-family:var(--font);white-space:nowrap;">
                ✓ Keep as hub
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  renderByConsonant() {
    if (this.selectedConsonant !== null) return this.renderConsonantDetail();
    return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">
      ${this.consonants.map(c => {
        const has = c.hubCount > 0;
        return `<button class="consonant-cell" data-cid="${c.id}" style="padding:10px 4px;border-radius:12px;text-align:center;background:${has?'var(--surface)':'var(--bg)'};border:2px solid ${has?'var(--green)30':'var(--border)'};cursor:${has?'pointer':'default'};opacity:${has?'1':'0.3'};font-family:var(--font);"><div style="font-size:20px;font-weight:700;">${c.char}</div><div style="font-size:9px;color:var(--text-muted);">${c.roman}</div>${has?`<div style="display:flex;justify-content:center;gap:4px;margin-top:3px;"><span style="font-size:9px;color:var(--green);font-weight:700;">${c.hubCount}</span><span style="font-size:9px;color:var(--blue);font-weight:700;">${c.spokeCount}</span></div>`:''}</button>`;
      }).join('')}
    </div><div style="display:flex;justify-content:center;gap:16px;margin-top:10px;font-size:10px;color:var(--text-muted);"><span><span style="color:var(--green);">■</span> hubs</span><span><span style="color:var(--blue);">■</span> spokes</span></div>`;
  }

  renderConsonantDetail() {
    const c = this.consonants.find(x => x.id === this.selectedConsonant);
    if (!c) return '';
    const hubs = this.getHubsForConsonant(c.id);
    return `<button id="back-to-grid" style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 14px;border-radius:12px;background:var(--green)10;border:2px solid var(--green)30;cursor:pointer;width:100%;text-align:left;font-family:var(--font);"><span style="color:var(--green);">←</span><div style="font-size:24px;font-weight:800;">${c.char}</div><div><div style="font-size:14px;font-weight:700;">${c.roman}</div><div style="font-size:11px;color:var(--text-muted);">${hubs.length} hubs · ${c.spokeCount} spokes</div></div></button>
    ${hubs.map(h => this.renderHubCard(h)).join('')}`;
  }

  renderAllHubs() {
    const sorted = [...this.hubs].sort((a, b) => b.spokes.length - a.spokes.length);
    return sorted.map(h => this.renderHubCard(h)).join('') || '<div style="text-align:center;padding:30px;color:var(--text-muted);">No hubs found</div>';
  }

  renderSearch() {
    const r = this.getFilteredHubs();
    return `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">${r.length} found</div>${r.map(h => this.renderHubCard(h)).join('')}`;
  }

  renderHubCard(hub) {
    const isExp = this.expandedHub === hub.id;
    const dev = toDev(hub.word);
    return `<div style="margin-bottom:8px;">
      <button class="hub-btn" data-hid="${hub.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:${isExp?'14px 14px 0 0':'14px'};background:${isExp?'var(--green)10':'var(--surface)'};border:2px solid ${isExp?'var(--green)':'var(--border)'};cursor:pointer;text-align:left;font-family:var(--font);">
        <div style="min-width:48px;height:48px;border-radius:12px;background:var(--green)15;border:2px solid var(--green)25;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:var(--green);padding:0 6px;">${hub.word}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--yellow);font-weight:600;">${dev}</div>
          <div style="font-size:12px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${hub.meaning}</div>
          <span style="font-size:9px;padding:2px 6px;border-radius:5px;background:var(--blue)15;color:var(--blue);font-weight:700;margin-top:4px;display:inline-block;">${hub.spokes.length} spoke${hub.spokes.length!==1?'s':''}</span>
        </div>
        <span style="color:var(--text-muted);font-size:12px;">${isExp?'▴':'▾'}</span>
      </button>
      ${isExp?`<div style="border:2px solid var(--green);border-top:none;border-radius:0 0 14px 14px;background:var(--green)05;padding:12px;">
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${hub.spokes.map(s => {const sd=toDev(s.word);return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--border);"><div style="flex:1;min-width:0;"><div style="font-size:16px;font-weight:700;color:var(--text);">${s.word}</div><div style="font-size:11px;color:var(--yellow);">${sd}</div></div><div style="font-size:11px;color:var(--text-muted);text-align:right;max-width:50%;">${s.meaning}</div></div>`;}).join('')}
        </div>
        <div style="display:flex;gap:8px;padding-top:8px;margin-top:8px;border-top:1px solid var(--green)20;">
          <div style="flex:1;font-size:11px;color:var(--text-muted);">Hub: <strong style="color:var(--green);">${hub.word}</strong> · ${dev} · ${hub.meaning}</div>
          <button class="mark-filler-btn" data-mid="${hub.id}" style="font-size:9px;color:var(--pink);background:var(--pink)12;border:1px solid var(--pink)25;border-radius:6px;padding:3px 8px;cursor:pointer;font-weight:700;font-family:var(--font);white-space:nowrap;">✗ Mark filler</button>
        </div>
      </div>`:''}
    </div>`;
  }

  // ─── EVENTS ───
  bindEvents(container) {
    container.querySelector('#hub-back').addEventListener('click', () => { this.app.tabs.more.render(this.app.contentEl); });
    const si = container.querySelector('#hub-search'); let st;
    si.addEventListener('input', () => { clearTimeout(st); st = setTimeout(() => { this.searchQuery = si.value.trim(); this.expandedHub = null; const c = container.querySelector('#hub-content'); if(c){c.innerHTML=this.searchQuery?this.renderSearch():this.view==='consonants'?this.renderByConsonant():this.renderAllHubs();this.bindContentEvents(container);} }, 300); });
    container.querySelectorAll('.hub-view-btn').forEach(b => { b.addEventListener('click', () => { this.view=b.dataset.view; this.selectedConsonant=null; this.expandedHub=null; this.searchQuery=''; si.value=''; this.render(container); }); });

    // Toggle fillers panel
    container.querySelector('#toggle-fillers')?.addEventListener('click', () => {
      this.showFillers = !this.showFillers;
      this.render(container);
    });

    // Restore filler as hub (remove is_filler flag)
    container.querySelectorAll('.filler-restore-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const fid = parseInt(b.dataset.fid);
        // For auto-detected fillers, mark is_filler = false explicitly so it passes through next time
        // But since auto-fillers aren't in DB, we'd need to add meaning or adjust threshold
        // For now just notify user
        b.textContent = 'Add meaning first';
        b.style.color = 'var(--yellow)';
        b.style.borderColor = 'var(--yellow)';
      });
    });

    this.bindContentEvents(container);
  }

  bindContentEvents(container) {
    container.querySelectorAll('.consonant-cell').forEach(b => { b.addEventListener('click', () => { const cid=parseInt(b.dataset.cid); const c=this.consonants.find(x=>x.id===cid); if(!c||c.hubCount===0)return; this.selectedConsonant=cid; this.expandedHub=null; this.render(container); }); });
    container.querySelector('#back-to-grid')?.addEventListener('click', () => { this.selectedConsonant=null; this.expandedHub=null; this.render(container); });
    container.querySelectorAll('.hub-btn').forEach(b => { b.addEventListener('click', () => { const hid=parseInt(b.dataset.hid); this.expandedHub=this.expandedHub===hid?null:hid; this.render(container); }); });

    // Mark hub as filler → write is_filler to DB
    container.querySelectorAll('.mark-filler-btn').forEach(b => {
      b.addEventListener('click', async (e) => {
        e.stopPropagation();
        const mid = parseInt(b.dataset.mid);
        try {
          await db.update('burmese_app_words', mid, { is_filler: true });
          b.textContent = '✓ Marked';
          b.style.color = 'var(--green)';
          b.style.borderColor = 'var(--green)';
          // Reload after short delay
          setTimeout(() => this.reload(container), 800);
        } catch (err) {
          b.textContent = 'Error';
          b.style.color = 'var(--pink)';
          console.error('Mark filler error:', err);
        }
      });
    });
  }
}
