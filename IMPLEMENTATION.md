# Implementation reference — Word Tree

Copy‑ready code for the Claude Code task in `CLAUDE_CODE_PROMPT.md`. Ports the prototype
`Story Mode Word Tree.html` into the real app (`js/study.js` + `js/hubexplorer.js`).

## 1. `js/hubexplorer.js` — export the generator

```js
export { buildGroups };
```

## 2. `js/study.js` — import

```js
import { buildGroups } from './hubexplorer.js';
```

## 3. `js/study.js` — method on `StudyTab`

```js
async showWordTreeModal(word) {
  const studying = word.burmese_word;
  let consonants = [], words = [];
  try {
    [consonants, words] = await Promise.all([db.getConsonants(), db.getWords()]);
  } catch (e) { console.error('Tree load error:', e); }

  const { hubs } = buildGroups(consonants, words);
  const sorted = [...hubs].sort((a, b) => b.spokes.length - a.spokes.length);
  const totalSpokes = sorted.reduce((n, h) => n + h.spokes.length, 0);
  const esc = s => (s || '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

  const nodeHTML = (w, meaning, cls) => {
    const isStudy = w === studying;
    return `<div class="wt-node ${cls}${isStudy ? ' wt-studying' : ''}" tabindex="0">
      ${isStudy ? '<span class="wt-tag">studying</span>' : ''}
      <span class="wt-my">${esc(w)}</span>
      <div class="wt-detail">
        <div class="wt-pron">${esc(toPronunciation(w, { tones:false }))}</div>
        <div class="wt-mean">${esc(meaning)}</div>
      </div>
    </div>`;
  };

  const treeHTML = hub => {
    const studyHub = hub.word === studying;
    const hasStudy = studyHub || hub.spokes.some(s => s.word === studying);
    return `<div class="wt-card${hasStudy ? ' wt-has-study' : ''}">
      <div class="wt-meta"><span class="wt-badge">${hub.spokes.length} spoke${hub.spokes.length!==1?'s':''}</span>
      <span class="wt-gloss">${esc(hub.meaning)}</span></div>
      <div class="wt-scroll"><div class="wt-tree"><ul><li>
        <div class="wt-hubwrap">
          ${nodeHTML(hub.word, hub.meaning, 'wt-hub')}
          <div class="wt-chev" title="Fold">▾</div>
        </div>
        <ul class="wt-spokes">${hub.spokes.map(s => `<li>${nodeHTML(s.word, s.meaning, 'wt-spoke')}</li>`).join('')}</ul>
      </li></ul></div></div>
    </div>`;
  };

  const box = Modal.show(`
    <div class="modal-header">
      <div class="modal-title" style="color:var(--green);">🌿 Word Tree</div>
      <button class="modal-close" data-modal-close>✕ Close</button>
    </div>
    <div style="font-size:11px;color:var(--text-muted);margin-bottom:10px;">
      All hubs · ${sorted.length} hubs · ${totalSpokes} spokes · tap a word for details
    </div>
    <div class="wt-forest" id="wt-forest">
      ${sorted.length ? sorted.map(treeHTML).join('') : '<div style="color:var(--text-muted);padding:24px;text-align:center;">No hubs generated</div>'}
    </div>
    ${WORD_TREE_CSS}
  `, { borderColor: 'var(--green)' });

  const forest = box.querySelector('#wt-forest');
  forest.addEventListener('click', e => {
    const chev = e.target.closest('.wt-chev');
    if (chev) {
      const sp = chev.closest('.wt-card').querySelector('.wt-spokes');
      const folded = sp.style.display === 'none';
      sp.style.display = folded ? '' : 'none';
      chev.textContent = folded ? '▾' : '▸';
      return;
    }
    const node = e.target.closest('.wt-node');
    if (node) node.classList.toggle('wt-open');
  });

  const studyNode = forest.querySelector('.wt-studying');
  if (studyNode) {
    studyNode.classList.add('wt-open');
    forest.scrollTop = studyNode.closest('.wt-card').offsetTop - 12;
  }
}
```

## 4. `js/study.js` — module‑level CSS constant

```js
const WORD_TREE_CSS = `<style>
.wt-forest{max-height:60vh;overflow-y:auto;margin:0 -4px;}
.wt-card{margin:8px 0;padding:6px 2px 10px;background:var(--surface);border:1px solid var(--border);border-radius:16px;}
.wt-card.wt-has-study{border-color:rgba(206,130,255,0.4);}
.wt-meta{display:flex;gap:8px;justify-content:center;align-items:center;margin-bottom:2px;}
.wt-badge{font-size:9px;font-weight:800;padding:2px 7px;border-radius:6px;background:rgba(28,176,246,0.12);color:var(--blue);}
.wt-gloss{font-size:10px;color:var(--text-muted);}
.wt-scroll{overflow-x:auto;padding-bottom:4px;}
.wt-tree{display:inline-block;min-width:100%;padding:6px 10px 2px;text-align:center;}
.wt-tree ul{display:flex;justify-content:center;padding-top:18px;position:relative;list-style:none;}
.wt-tree li{list-style:none;position:relative;padding:18px 6px 0;text-align:center;}
.wt-tree li::before,.wt-tree li::after{content:'';position:absolute;top:0;right:50%;width:50%;height:18px;border-top:2px solid var(--border-light,#2A3A42);}
.wt-tree li::after{right:auto;left:50%;border-left:2px solid var(--border-light,#2A3A42);}
.wt-tree li:first-child::before{border:0;}
.wt-tree li:last-child::after{border:0;}
.wt-tree li:last-child::before{border-right:2px solid var(--border-light,#2A3A42);border-radius:0 7px 0 0;}
.wt-tree li:first-child::after{border-left:2px solid var(--border-light,#2A3A42);border-radius:7px 0 0 0;}
.wt-tree li:only-child::before,.wt-tree li:only-child::after{display:none;}
.wt-tree ul ul::before{content:'';position:absolute;top:0;left:50%;border-left:2px solid var(--border-light,#2A3A42);width:0;height:18px;}
.wt-tree>ul,.wt-tree>ul>li{padding-top:0;}
.wt-tree>ul>li::before,.wt-tree>ul>li::after{display:none;}
.wt-node{display:inline-flex;flex-direction:column;align-items:center;border-radius:12px;cursor:pointer;position:relative;background:var(--bg);padding:9px 12px;min-width:60px;max-width:150px;transition:box-shadow .18s,border-color .18s;}
.wt-my{font-size:19px;font-weight:800;line-height:1.15;white-space:nowrap;}
.wt-hubwrap{display:inline-flex;align-items:stretch;}
.wt-hub{background:rgba(88,204,2,0.10);border:2px solid rgba(88,204,2,0.55);}
.wt-hub .wt-my{color:var(--green);font-size:22px;}
.wt-chev{display:flex;align-items:center;justify-content:center;width:26px;margin-left:6px;background:rgba(88,204,2,0.08);border:2px solid rgba(88,204,2,0.30);border-radius:10px;color:var(--green);cursor:pointer;font-weight:800;}
.wt-spoke{border:2px solid var(--border-light,#2A3A42);}
.wt-spoke .wt-my{color:var(--text);font-size:17px;}
.wt-detail{display:none;margin-top:7px;padding-top:7px;border-top:1px dashed var(--border-light,#2A3A42);width:100%;}
.wt-node.wt-open .wt-detail{display:block;}
.wt-node.wt-open{box-shadow:0 8px 24px -12px #000;}
.wt-pron{font-size:12px;font-weight:700;color:var(--yellow);white-space:nowrap;}
.wt-mean{font-size:11px;color:var(--text);margin-top:2px;line-height:1.3;}
.wt-studying{border-color:var(--purple) !important;box-shadow:0 0 0 4px rgba(206,130,255,0.18),0 0 22px -4px rgba(206,130,255,0.5) !important;}
.wt-studying .wt-my{color:var(--purple) !important;}
.wt-tag{position:absolute;top:-9px;left:50%;transform:translateX(-50%);background:var(--purple);color:#1b0f26;font-size:8px;font-weight:800;letter-spacing:.4px;text-transform:uppercase;padding:2px 7px;border-radius:20px;white-space:nowrap;}
</style>`;
```

## 5. `js/study.js` — action‑row button + binding

Add the button next to `#btn-story` in the action‑row template:

```html
<button class="btn-story" id="btn-tree" style="background:var(--green);">🌳 Tree</button>
```

Bind it where `#btn-story` is wired:

```js
container.querySelector('#btn-tree').addEventListener('click', () => this.showWordTreeModal(word));
```

## Options / extensions

- **Devanagari instead of romanization:** replace `toPronunciation(w, { tones:false })` with `toDev(w)` (already imported).
- **Cache** the generated forest so it isn't rebuilt on every open: store `this._treeHubs` after the first `buildGroups` call.
- **Jump to a spoke's card** in the deck on tap: give spoke nodes a `data-word`, look it up in `this.words`, set `this.currentIdx`, `Modal.close()`, `this.render(container)`.
