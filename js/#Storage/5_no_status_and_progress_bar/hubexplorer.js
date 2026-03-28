// ═══ HUB EXPLORER ═══
import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

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
    this.view = 'consonants';
  }

  async loadData() {
    try {
      const [consonants, anchors, words] = await Promise.all([
        db.getConsonants(), db.getAnchorWords(), db.getWords()
      ]);
      this.consonants = consonants;
      this.anchors = anchors;
      this.words = words;
      this.loaded = true;
    } catch (err) { console.error('Hub Explorer load error:', err); }
  }

  getSpokesForAnchor(anchorWord) {
    return this.words.filter(w => w.burmese_word !== anchorWord && w.burmese_word.includes(anchorWord));
  }
  getAnchorsForConsonant(cid) { return this.anchors.filter(a => a.consonant_id === cid); }
  getFilteredAnchors() {
    if (!this.searchQuery) return this.anchors;
    const q = this.searchQuery.toLowerCase();
    return this.anchors.filter(a => a.burmese_word.includes(this.searchQuery) || (a.meaning||'').toLowerCase().includes(q) || toDev(a.burmese_word).toLowerCase().includes(q));
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }
    container.innerHTML = `
      <div class="pad-sm">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
          <button id="hub-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;color:var(--text-muted);cursor:pointer;font-size:12px;padding:6px 12px;font-weight:700;font-family:var(--font);">← Back</button>
          <div style="flex:1;"><div style="font-size:20px;font-weight:800;">🌿 Hub Explorer</div><div style="font-size:12px;color:var(--text-muted);">${this.anchors.length} hubs · ${this.words.length} words</div></div>
        </div>
        <input class="input-field" id="hub-search" placeholder="Search hubs..." value="${this.searchQuery}" style="font-size:14px;margin-bottom:14px;">
        <div style="display:flex;gap:6px;margin-bottom:16px;">
          ${['consonants','all'].map(v=>`<button class="hub-view-btn" data-view="${v}" style="flex:1;padding:9px;border-radius:10px;font-size:12px;font-weight:700;cursor:pointer;font-family:var(--font);background:${this.view===v?(v==='consonants'?'var(--green)15':'var(--blue)15'):'var(--surface)'};border:2px solid ${this.view===v?(v==='consonants'?'var(--green)':'var(--blue)'):'var(--border)'};color:${this.view===v?(v==='consonants'?'var(--green)':'var(--blue)'):'var(--text-muted)'};">${v==='consonants'?'By Consonant':'All Hubs'}</button>`).join('')}
        </div>
        <div id="hub-content">${this.searchQuery?this.renderSearchResults():this.view==='consonants'?this.renderByConsonant():this.renderAllHubs()}</div>
      </div>`;
    this.bindEvents(container);
  }

  renderByConsonant() {
    if (this.selectedConsonant!==null) return this.renderConsonantDetail();
    return `<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px;">
      ${this.consonants.map(c=>{const a=this.getAnchorsForConsonant(c.id);const has=a.length>0;return `<button class="consonant-cell" data-cid="${c.id}" style="padding:10px 4px;border-radius:12px;text-align:center;background:${has?'var(--surface)':'var(--bg)'};border:2px solid ${has?'var(--green)30':'var(--border)'};cursor:${has?'pointer':'default'};opacity:${has?'1':'0.3'};font-family:var(--font);"><div style="font-size:20px;font-weight:700;color:var(--text);">${c.burmese_char}</div><div style="font-size:9px;color:var(--text-muted);">${c.romanization||''}</div>${has?`<div style="font-size:9px;color:var(--green);font-weight:700;margin-top:3px;">${a.length}</div>`:''}</button>`;}).join('')}
    </div>`;
  }

  renderConsonantDetail() {
    const c=this.consonants.find(x=>x.id===this.selectedConsonant);if(!c)return '';
    const anchors=this.getAnchorsForConsonant(c.id);
    return `<button id="back-to-grid" style="display:flex;align-items:center;gap:10px;margin-bottom:14px;padding:10px 14px;border-radius:12px;background:var(--green)10;border:2px solid var(--green)30;cursor:pointer;width:100%;text-align:left;font-family:var(--font);"><span style="color:var(--green);">←</span><div style="font-size:24px;font-weight:800;">${c.burmese_char}</div><div><div style="font-size:14px;font-weight:700;">${c.romanization||''}</div><div style="font-size:11px;color:var(--text-muted);">${anchors.length} hubs</div></div></button>
    ${anchors.map(a=>this.renderAnchorCard(a)).join('')}`;
  }

  renderAllHubs() {
    const sorted=[...this.anchors].sort((a,b)=>(a.burmese_word||'').localeCompare(b.burmese_word||''));
    return sorted.map(a=>this.renderAnchorCard(a)).join('')||'<div style="text-align:center;padding:30px;color:var(--text-muted);">No hubs found</div>';
  }

  renderSearchResults() {
    const r=this.getFilteredAnchors();
    return `<div style="font-size:12px;color:var(--text-muted);margin-bottom:10px;">${r.length} found</div>${r.map(a=>this.renderAnchorCard(a)).join('')}`;
  }

  renderAnchorCard(anchor) {
    const spokes=this.getSpokesForAnchor(anchor.burmese_word);
    const isExp=this.expandedAnchor===anchor.id;
    const dev=toDev(anchor.burmese_word);
    return `<div style="margin-bottom:8px;">
      <button class="anchor-btn" data-aid="${anchor.id}" style="display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:${isExp?'14px 14px 0 0':'14px'};background:${isExp?'var(--green)10':'var(--surface)'};border:2px solid ${isExp?'var(--green)':'var(--border)'};cursor:pointer;text-align:left;font-family:var(--font);">
        <div style="min-width:48px;height:48px;border-radius:12px;background:var(--green)15;border:2px solid var(--green)25;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:800;color:var(--green);padding:0 6px;">${anchor.burmese_word}</div>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;color:var(--yellow);font-weight:600;">${dev}</div>
          <div style="font-size:12px;color:var(--text-muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${anchor.meaning||''}</div>
          <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
            <span style="font-size:9px;padding:2px 6px;border-radius:5px;background:var(--blue)15;color:var(--blue);font-weight:700;">${spokes.length} spoke${spokes.length!==1?'s':''}</span>
            ${anchor.is_curated?'<span style="font-size:9px;padding:2px 6px;border-radius:5px;background:var(--yellow)15;color:var(--yellow);font-weight:700;">curated</span>':''}
            ${anchor.group_no?`<span style="font-size:9px;padding:2px 6px;border-radius:5px;background:var(--purple)15;color:var(--purple);font-weight:700;">grp ${anchor.group_no}</span>`:''}
          </div>
        </div>
        <span style="color:var(--text-muted);font-size:12px;">${isExp?'▴':'▾'}</span>
      </button>
      ${isExp?`<div style="border:2px solid var(--green);border-top:none;border-radius:0 0 14px 14px;background:var(--green)05;padding:12px;">
        ${spokes.length>0?`<div style="display:flex;flex-direction:column;gap:6px;margin-bottom:10px;">
          ${spokes.map(s=>{const sd=toDev(s.burmese_word);return `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:10px;background:var(--surface);border:1px solid var(--border);">
            <div style="flex:1;min-width:0;"><div style="font-size:16px;font-weight:700;color:var(--text);">${s.burmese_word}</div><div style="font-size:11px;color:var(--yellow);">${sd}</div></div>
            <div style="font-size:11px;color:var(--text-muted);text-align:right;max-width:50%;">${s.english_meaning||''}</div>
          </div>`;}).join('')}
        </div>`:'<div style="text-align:center;padding:12px;color:var(--text-muted);font-size:13px;">No spokes found</div>'}
        <div style="display:flex;gap:8px;padding-top:8px;border-top:1px solid var(--green)20;">
          <div style="flex:1;font-size:11px;color:var(--text-muted);">Hub: <strong style="color:var(--green);">${anchor.burmese_word}</strong> · ${dev}</div>
          <button class="hub-flag-btn" data-flag-aid="${anchor.id}" style="font-size:10px;color:var(--pink);background:var(--pink)12;border:1px solid var(--pink)25;border-radius:8px;padding:3px 10px;cursor:pointer;font-weight:700;font-family:var(--font);">⚑ Flag</button>
        </div>
      </div>`:''}
    </div>`;
  }

  bindEvents(container) {
    container.querySelector('#hub-back').addEventListener('click',()=>{this.app.tabs.more.render(this.app.contentEl);});
    const si=container.querySelector('#hub-search');let st;
    si.addEventListener('input',()=>{clearTimeout(st);st=setTimeout(()=>{this.searchQuery=si.value.trim();this.expandedAnchor=null;const c=container.querySelector('#hub-content');if(c){c.innerHTML=this.searchQuery?this.renderSearchResults():this.view==='consonants'?this.renderByConsonant():this.renderAllHubs();this.bindContentEvents(container);}},300);});
    container.querySelectorAll('.hub-view-btn').forEach(b=>{b.addEventListener('click',()=>{this.view=b.dataset.view;this.selectedConsonant=null;this.expandedAnchor=null;this.searchQuery='';si.value='';this.render(container);});});
    this.bindContentEvents(container);
  }

  bindContentEvents(container) {
    container.querySelectorAll('.consonant-cell').forEach(b=>{b.addEventListener('click',()=>{const cid=parseInt(b.dataset.cid);if(this.getAnchorsForConsonant(cid).length===0)return;this.selectedConsonant=cid;this.expandedAnchor=null;this.render(container);});});
    container.querySelector('#back-to-grid')?.addEventListener('click',()=>{this.selectedConsonant=null;this.expandedAnchor=null;this.render(container);});
    container.querySelectorAll('.anchor-btn').forEach(b=>{b.addEventListener('click',()=>{const aid=parseInt(b.dataset.aid);this.expandedAnchor=this.expandedAnchor===aid?null:aid;this.render(container);});});
    container.querySelectorAll('.hub-flag-btn').forEach(b=>{b.addEventListener('click',(e)=>{e.stopPropagation();try{db.logProgress({type:'flag_hub',wordId:parseInt(b.dataset.flagAid),wordType:'anchor',result:'flagged'});}catch{}b.textContent='✓ Flagged';b.style.color='var(--green)';});});
  }
}
