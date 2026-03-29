// ═══ WRITING PRACTICE ═══
// Flex layout (header never moves), view/write toggle, hidden answers

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class WritingPractice {
  constructor(app) {
    this.app = app;
    this.groups = [];
    this.loaded = false;
    this.showGuide = true;
    this.writeMode = false;
    this.showAnswers = false;
    this.canvases = {};
    this.checked = {};
    this.originalViewport = '';
    this.styleEl = null;
  }

  async loadData() {
    try {
      const raw = await db.getConsonants();
      const devMap = new Map();
      for (const c of raw) {
        const dev = toDev(c.burmese_char);
        const key = dev || c.burmese_char;
        if (!devMap.has(key)) devMap.set(key, []);
        const existing = devMap.get(key);
        if (!existing.some(e => e.burmese_char === c.burmese_char)) existing.push(c);
      }
      this.groups = [];
      let idx = 0;
      for (const [dev, chars] of devMap) {
        this.groups.push({ id: idx, dev, chars: chars.map(c => ({ burmese: c.burmese_char, roman: c.romanization || '', cid: c.id })) });
        idx++;
      }
      this.loaded = true;
    } catch (err) { console.error('Writing load error:', err); }
  }

  enableZoom() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta) {
      this.originalViewport = meta.getAttribute('content');
      meta.setAttribute('content', 'width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, user-scalable=yes');
    }
  }

  disableZoom() {
    const meta = document.querySelector('meta[name="viewport"]');
    if (meta && this.originalViewport) meta.setAttribute('content', this.originalViewport);
  }

  cleanup() {
    this.disableZoom();
    if (this.styleEl) { this.styleEl.remove(); this.styleEl = null; }
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    this.enableZoom();

    // Inject styles
    if (this.styleEl) this.styleEl.remove();
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'wr-styles';
    this.styleEl.textContent = `
      #app { display:flex; flex-direction:column; height:100vh; height:100dvh; min-height:0; }
      .tab-bar { display:none !important; }
      #wr-header { flex-shrink:0; background:#131F24; padding:8px 10px; display:flex; align-items:center; justify-content:space-between; border-bottom:2px solid #1E2D33; z-index:10; }
      #wr-body { flex:1; overflow:auto; -webkit-overflow-scrolling:touch; }
      .wr-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:2px; padding:4px; max-width:800px; margin:0 auto; }
      .wr-sq { position:relative; width:100%; padding-bottom:100%; border-radius:6px; overflow:hidden; background:#FAFAF8; border:2px solid #ddd; }
      .wr-sq-inner { position:absolute; inset:0; display:flex; flex-direction:column; }
      .wr-canvas-area { flex:1; position:relative; overflow:hidden; }
      .wr-label { height:0; overflow:hidden; transition:height 0.2s ease; background:rgba(0,0,0,0.05); border-top:1px solid rgba(0,0,0,0.08); display:flex; align-items:center; justify-content:center; gap:4px; padding:0 2px; }
      .wr-label.shown { height:26px; }
      .wr-ghost { position:absolute; inset:0; display:flex; align-items:center; justify-content:center; font-weight:700; color:rgba(0,0,0,0.07); pointer-events:none; font-family:'Noto Sans Myanmar',sans-serif; }
      .wr-ghost.hidden { display:none; }
      .wr-cv { position:absolute; top:0; left:0; width:100%; height:100%; display:block; }
      .wr-cv.view-mode { touch-action:auto; pointer-events:none; cursor:default; }
      .wr-cv.write-mode { touch-action:none; pointer-events:auto; cursor:crosshair; }
      .wr-x { position:absolute; top:2px; left:2px; width:14px; height:14px; border-radius:3px; background:rgba(0,0,0,0.05); border:1px solid rgba(0,0,0,0.1); color:rgba(0,0,0,0.3); font-size:7px; cursor:pointer; display:flex; align-items:center; justify-content:center; z-index:5; font-family:inherit; }
      .wr-chk { position:absolute; top:2px; right:2px; width:18px; height:18px; border-radius:4px; cursor:pointer; z-index:5; display:flex; align-items:center; justify-content:center; font-size:10px; color:#fff; font-family:inherit; }
      .wr-reveal { position:absolute; bottom:2px; left:50%; transform:translateX(-50%); font-size:8px; color:rgba(0,0,0,0.25); background:rgba(0,0,0,0.04); border:1px solid rgba(0,0,0,0.08); border-radius:3px; padding:1px 8px; cursor:pointer; z-index:5; font-family:inherit; }
      .wr-hdr-btn { padding:5px 10px; border-radius:8px; font-size:10px; font-weight:700; cursor:pointer; border:2px solid; font-family:inherit; }
    `;
    document.head.appendChild(this.styleEl);

    const modeClass = this.writeMode ? 'write-mode' : 'view-mode';

    container.innerHTML = `
      <div id="wr-header">
        <div style="display:flex;align-items:center;gap:6px;">
          <button id="wr-back" class="wr-hdr-btn" style="background:#1A2C33;border-color:#2A3A42;color:#5A7A88;">←</button>
          <span style="font-size:13px;font-weight:800;color:#EAEEF3;">📝 Practice</span>
        </div>
        <div style="display:flex;align-items:center;gap:5px;">
          <button id="wr-mode-btn" class="wr-hdr-btn" style="background:${this.writeMode?'#FF9600':'#1A2C33'};border-color:${this.writeMode?'#FF9600':'#2A3A42'};color:${this.writeMode?'#fff':'#5A7A88'};">${this.writeMode?'✏️ Write':'👁 View'}</button>
          <button id="wr-guide-btn" class="wr-hdr-btn" style="background:${this.showGuide?'#58CC02':'#1A2C33'};border-color:${this.showGuide?'#58CC02':'#2A3A42'};color:${this.showGuide?'#fff':'#5A7A88'};">Abc</button>
          <button id="wr-ans-btn" class="wr-hdr-btn" style="background:${this.showAnswers?'#58CC02':'#1A2C33'};border-color:${this.showAnswers?'#58CC02':'#2A3A42'};color:${this.showAnswers?'#fff':'#5A7A88'};">A̲</button>
          <button id="wr-clear-btn" class="wr-hdr-btn" style="background:#1A2C33;border-color:#2A3A42;color:#5A7A88;">🗑</button>
        </div>
      </div>
      <div id="wr-body">
        <div id="wr-hint" style="text-align:center;padding:4px 0;font-size:9px;color:#5A7A88;">
          ${this.writeMode ? '✏️ Draw with finger · Tap 👁 to scroll/zoom' : '👁 Scroll & zoom · Tap ✏️ to write'}
        </div>
        <div class="wr-grid">
          ${this.groups.map((g, i) => this.renderCell(g, i, modeClass)).join('')}
        </div>
      </div>
    `;

    requestAnimationFrame(() => requestAnimationFrame(() => this.initAllCanvases(container)));
    this.bindEvents(container);
  }

  renderCell(group, idx, modeClass) {
    const isChecked = this.checked[idx];
    const guideChars = group.chars.map(c => c.burmese).join(' ');
    const romans = group.chars.map(c => c.roman).filter(Boolean).join('/');

    return `
      <div class="wr-sq">
        <div class="wr-sq-inner">
          <div class="wr-canvas-area">
            <button class="wr-x" data-cidx="${idx}">✕</button>
            <button class="wr-chk" data-chidx="${idx}" style="background:${isChecked?'#58CC02':'rgba(0,0,0,0.04)'};border:2px solid ${isChecked?'#58CC02':'rgba(0,0,0,0.14)'};">${isChecked?'✓':''}</button>
            <div class="wr-ghost ${this.showGuide?'':'hidden'}" style="font-size:min(15vw, 120px);">${guideChars}</div>
            <canvas class="wr-cv ${modeClass}" data-canvasid="${idx}"></canvas>
            <button class="wr-reveal" data-ridx="${idx}">···</button>
          </div>
          <div class="wr-label ${this.showAnswers?'shown':''}" data-lidx="${idx}">
            <span style="font-size:11px;color:#999;font-weight:600;">${group.dev}</span>
            ${romans ? `<span style="font-size:9px;color:#bbb;">${romans}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  initAllCanvases(container) {
    this.canvases = {};
    container.querySelectorAll('.wr-cv').forEach(canvas => {
      const idx = canvas.dataset.canvasid;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2;
      this.canvases[idx] = { canvas, ctx, strokes: [], isDrawing: false, dpr };

      const getPos = (e) => {
        const r = canvas.getBoundingClientRect(); const t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * (canvas.width / dpr / r.width), y: (t.clientY - r.top) * (canvas.height / dpr / r.height) };
      };
      const startDraw = (e) => {
        if (!this.writeMode) return; if (e.touches && e.touches.length > 1) return;
        e.preventDefault(); const d = this.canvases[idx]; d.isDrawing = true;
        const pos = getPos(e); d.strokes.push([pos]); d.ctx.beginPath(); d.ctx.moveTo(pos.x, pos.y);
      };
      const draw = (e) => {
        if (!this.writeMode) return; const d = this.canvases[idx]; if (!d.isDrawing) return;
        if (e.touches && e.touches.length > 1) { d.isDrawing = false; return; }
        e.preventDefault(); const pos = getPos(e); d.strokes[d.strokes.length - 1].push(pos);
        d.ctx.lineTo(pos.x, pos.y); d.ctx.stroke(); d.ctx.beginPath(); d.ctx.moveTo(pos.x, pos.y);
      };
      const endDraw = (e) => { if (!this.writeMode) return; if (e) e.preventDefault(); this.canvases[idx].isDrawing = false; this.canvases[idx].ctx.beginPath(); };

      canvas.addEventListener('mousedown', startDraw); canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw); canvas.addEventListener('mouseleave', endDraw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', endDraw, { passive: false });
    });
  }

  clearCanvas(idx) {
    const d = this.canvases[idx]; if (!d) return;
    d.ctx.clearRect(0, 0, d.canvas.width / d.dpr, d.canvas.height / d.dpr); d.strokes = [];
  }

  bindEvents(container) {
    // Back
    container.querySelector('#wr-back').addEventListener('click', () => {
      this.cleanup();
      this.app.tabs.more.render(this.app.contentEl);
    });

    // Write/View toggle
    container.querySelector('#wr-mode-btn').addEventListener('click', () => {
      this.writeMode = !this.writeMode;
      const btn = container.querySelector('#wr-mode-btn');
      btn.style.background = this.writeMode ? '#FF9600' : '#1A2C33';
      btn.style.borderColor = this.writeMode ? '#FF9600' : '#2A3A42';
      btn.style.color = this.writeMode ? '#fff' : '#5A7A88';
      btn.innerHTML = this.writeMode ? '✏️ Write' : '👁 View';
      container.querySelectorAll('.wr-cv').forEach(cv => {
        cv.classList.toggle('view-mode', !this.writeMode);
        cv.classList.toggle('write-mode', this.writeMode);
      });
      container.querySelector('#wr-hint').textContent = this.writeMode
        ? '✏️ Draw with finger · Tap 👁 to scroll/zoom'
        : '👁 Scroll & zoom · Tap ✏️ to write';
    });

    // Guide toggle
    container.querySelector('#wr-guide-btn').addEventListener('click', () => {
      this.showGuide = !this.showGuide;
      const btn = container.querySelector('#wr-guide-btn');
      btn.style.background = this.showGuide ? '#58CC02' : '#1A2C33';
      btn.style.borderColor = this.showGuide ? '#58CC02' : '#2A3A42';
      btn.style.color = this.showGuide ? '#fff' : '#5A7A88';
      container.querySelectorAll('.wr-ghost').forEach(el => el.classList.toggle('hidden', !this.showGuide));
    });

    // Show/hide all answers
    container.querySelector('#wr-ans-btn').addEventListener('click', () => {
      this.showAnswers = !this.showAnswers;
      const btn = container.querySelector('#wr-ans-btn');
      btn.style.background = this.showAnswers ? '#58CC02' : '#1A2C33';
      btn.style.borderColor = this.showAnswers ? '#58CC02' : '#2A3A42';
      btn.style.color = this.showAnswers ? '#fff' : '#5A7A88';
      container.querySelectorAll('.wr-label').forEach(el => el.classList.toggle('shown', this.showAnswers));
    });

    // Clear all
    container.querySelector('#wr-clear-btn').addEventListener('click', () => {
      for (const idx of Object.keys(this.canvases)) this.clearCanvas(idx);
      this.checked = {};
      container.querySelectorAll('.wr-chk').forEach(btn => {
        btn.style.background = 'rgba(0,0,0,0.04)'; btn.style.borderColor = 'rgba(0,0,0,0.14)'; btn.textContent = '';
      });
      container.querySelectorAll('.wr-label').forEach(el => el.classList.remove('shown'));
      this.showAnswers = false;
      const ansBtn = container.querySelector('#wr-ans-btn');
      ansBtn.style.background = '#1A2C33'; ansBtn.style.borderColor = '#2A3A42'; ansBtn.style.color = '#5A7A88';
    });

    // Individual cell clear
    container.querySelectorAll('.wr-x').forEach(btn => {
      btn.addEventListener('click', () => this.clearCanvas(btn.dataset.cidx));
    });

    // Individual reveal
    container.querySelectorAll('.wr-reveal').forEach(btn => {
      btn.addEventListener('click', () => {
        const label = container.querySelector(`.wr-label[data-lidx="${btn.dataset.ridx}"]`);
        if (label) label.classList.toggle('shown');
      });
    });

    // Checkboxes
    container.querySelectorAll('.wr-chk').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.chidx);
        this.checked[idx] = !this.checked[idx];
        btn.style.background = this.checked[idx] ? '#58CC02' : 'rgba(0,0,0,0.04)';
        btn.style.borderColor = this.checked[idx] ? '#58CC02' : 'rgba(0,0,0,0.14)';
        btn.textContent = this.checked[idx] ? '✓' : '';
      });
    });
  }
}
