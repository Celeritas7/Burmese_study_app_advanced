// ═══ WRITING PRACTICE ═══
// View/Write mode toggle, fixed header, clipped canvas

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class WritingPractice {
  constructor(app) {
    this.app = app;
    this.groups = [];
    this.loaded = false;
    this.showGuide = true;
    this.writeMode = false;
    this.canvases = {};
    this.checked = {};
    this.originalViewport = '';
    this.headerEl = null;
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
    if (this.headerEl) { this.headerEl.remove(); this.headerEl = null; }
    if (this.styleEl) { this.styleEl.remove(); this.styleEl = null; }
    // Reset scroll position on visual viewport
    window.scrollTo(0, 0);
  }

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    this.enableZoom();

    // ─── Create fixed header OUTSIDE the app container ───
    // This ensures it survives pinch-zoom because it's at document.body level
    if (this.headerEl) this.headerEl.remove();
    this.headerEl = document.createElement('div');
    this.headerEl.id = 'wr-header-fixed';
    this.headerEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;">
        <button id="wr-back-btn" style="background:#1A2C33;border:2px solid #2A3A42;border-radius:8px;
          color:#5A7A88;cursor:pointer;font-size:11px;padding:5px 8px;font-weight:700;">←</button>
        <span style="font-size:13px;font-weight:800;color:#EAEEF3;">📝 Practice</span>
      </div>
      <div style="display:flex;align-items:center;gap:5px;">
        <button id="wr-write-btn" style="padding:5px 10px;border-radius:8px;
          background:${this.writeMode ? '#FF9600' : '#1A2C33'};
          border:2px solid ${this.writeMode ? '#FF9600' : '#2A3A42'};
          color:${this.writeMode ? '#fff' : '#5A7A88'};
          font-size:10px;font-weight:700;cursor:pointer;">${this.writeMode ? '✏️ Write' : '👁 View'}</button>
        <button id="wr-guide-btn" style="padding:5px 8px;border-radius:8px;
          background:${this.showGuide ? '#58CC02' : '#1A2C33'};
          border:2px solid ${this.showGuide ? '#58CC02' : '#2A3A42'};
          color:${this.showGuide ? '#fff' : '#5A7A88'};
          font-size:10px;font-weight:700;cursor:pointer;">Abc</button>
        <button id="wr-clear-btn" style="padding:5px 8px;border-radius:8px;background:#1A2C33;
          border:2px solid #2A3A42;color:#5A7A88;font-size:10px;font-weight:700;cursor:pointer;">🗑</button>
      </div>
    `;
    document.body.appendChild(this.headerEl);

    // ─── Inject styles into document.head ───
    if (this.styleEl) this.styleEl.remove();
    this.styleEl = document.createElement('style');
    this.styleEl.id = 'wr-styles';
    this.styleEl.textContent = `
      #wr-header-fixed {
        position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
        background: #131F24; padding: 8px 10px;
        display: flex; align-items: center; justify-content: space-between;
        border-bottom: 2px solid #1E2D33;
        /* Counteract page zoom so header stays same size */
        transform-origin: top left;
      }
      .wr-grid-main {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 2px; padding: 2px 4px;
        max-width: 800px; margin: 0 auto;
      }
      .wr-sq { position: relative; width: 100%; padding-bottom: 100%; border-radius: 6px; overflow: hidden; background: #FAFAF8; border: 2px solid #ddd; }
      .wr-sq-inner { position: absolute; inset: 0; display: flex; flex-direction: column; }
      .wr-canvas-area { flex: 1; position: relative; overflow: hidden; /* CLIP strokes to this area */ }
      .wr-label-bar {
        height: 26px; min-height: 26px; flex-shrink: 0;
        background: rgba(0,0,0,0.04); border-top: 1px solid rgba(0,0,0,0.08);
        display: flex; align-items: center; justify-content: center;
        gap: 3px; padding: 0 2px; overflow: hidden;
        position: relative; z-index: 2; /* above canvas */
      }
      .wr-ghost {
        position: absolute; inset: 0;
        display: flex; align-items: center; justify-content: center;
        font-weight: 700; color: rgba(0,0,0,0.07); pointer-events: none;
        font-family: 'Noto Sans Myanmar', sans-serif;
      }
      .wr-cv {
        position: absolute; top: 0; left: 0; width: 100%; height: 100%;
        display: block;
      }
      .wr-cv.view-mode { touch-action: auto; pointer-events: none; cursor: default; }
      .wr-cv.write-mode { touch-action: none; pointer-events: auto; cursor: crosshair; }
    `;
    document.head.appendChild(this.styleEl);

    // ─── Page content ───
    const modeClass = this.writeMode ? 'write-mode' : 'view-mode';

    container.innerHTML = `
      <div style="padding-top:50px;padding-bottom:80px;">
        <div id="wr-hint" style="text-align:center;padding:3px 0 5px;font-size:9px;color:#5A7A88;">
          ${this.writeMode ? '✏️ Draw with finger · Tap 👁 to scroll/zoom' : '👁 Scroll & zoom · Tap ✏️ to write'}
        </div>
        <div class="wr-grid-main">
          ${this.groups.map((g, i) => this.renderCell(g, i, modeClass)).join('')}
        </div>
      </div>
    `;

    requestAnimationFrame(() => requestAnimationFrame(() => this.initAllCanvases(container)));
    this.bindHeaderEvents(container);
    this.bindCellEvents(container);

    // Keep header scaled correctly when user zooms
    if (window.visualViewport) {
      this._vpHandler = () => {
        if (this.headerEl) {
          const scale = window.visualViewport.scale;
          this.headerEl.style.transform = `scale(${1/scale})`;
          this.headerEl.style.width = `${100 * scale}%`;
        }
      };
      window.visualViewport.addEventListener('resize', this._vpHandler);
      window.visualViewport.addEventListener('scroll', this._vpHandler);
    }
  }

  renderCell(group, idx, modeClass) {
    const isChecked = this.checked[idx];
    const guideChars = group.chars.map(c => c.burmese).join(' ');
    const totalLen = [...guideChars.replace(/ /g, '')].length;
    const guideFontPct = totalLen > 4 ? 35 : totalLen > 2 ? 45 : 60;

    const labelParts = group.chars.map(c =>
      `<span style="font-size:9px;font-weight:700;color:#444;font-family:'Noto Sans Myanmar',sans-serif;">${c.burmese}</span>`
    ).join(' ');

    return `
      <div class="wr-sq">
        <div class="wr-sq-inner">
          <div class="wr-canvas-area">
            <button class="wr-x" data-cidx="${idx}" style="position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:3px;background:rgba(0,0,0,0.05);border:1px solid rgba(0,0,0,0.1);color:rgba(0,0,0,0.3);font-size:7px;cursor:pointer;display:flex;align-items:center;justify-content:center;z-index:5;">✕</button>
            <button class="wr-chk" data-chidx="${idx}" style="position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:4px;background:${isChecked?'#58CC02':'rgba(0,0,0,0.04)'};border:2px solid ${isChecked?'#58CC02':'rgba(0,0,0,0.14)'};cursor:pointer;z-index:5;display:flex;align-items:center;justify-content:center;font-size:10px;color:#fff;">${isChecked?'✓':''}</button>
            <div class="wr-ghost" style="font-size:${guideFontPct}%;${this.showGuide?'':'display:none;'}">${guideChars}</div>
            <canvas class="wr-cv ${modeClass}" data-canvasid="${idx}"></canvas>
          </div>
          <div class="wr-label-bar">
            ${labelParts}
            <span style="font-size:9px;color:#999;font-weight:600;">${group.dev}</span>
            ${group.chars[0].roman?`<span style="font-size:7px;color:#bbb;">${group.chars.map(c=>c.roman).join('/')}</span>`:''}
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
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * (canvas.width / dpr / r.width), y: (t.clientY - r.top) * (canvas.height / dpr / r.height) };
      };
      const startDraw = (e) => {
        if (!this.writeMode) return;
        if (e.touches && e.touches.length > 1) return;
        e.preventDefault();
        const d = this.canvases[idx]; d.isDrawing = true;
        const pos = getPos(e); d.strokes.push([pos]);
        d.ctx.beginPath(); d.ctx.moveTo(pos.x, pos.y);
      };
      const draw = (e) => {
        if (!this.writeMode) return;
        const d = this.canvases[idx]; if (!d.isDrawing) return;
        if (e.touches && e.touches.length > 1) { d.isDrawing = false; return; }
        e.preventDefault();
        const pos = getPos(e); d.strokes[d.strokes.length - 1].push(pos);
        d.ctx.lineTo(pos.x, pos.y); d.ctx.stroke();
        d.ctx.beginPath(); d.ctx.moveTo(pos.x, pos.y);
      };
      const endDraw = (e) => {
        if (!this.writeMode) return;
        if (e) e.preventDefault();
        this.canvases[idx].isDrawing = false; this.canvases[idx].ctx.beginPath();
      };
      canvas.addEventListener('mousedown', startDraw);
      canvas.addEventListener('mousemove', draw);
      canvas.addEventListener('mouseup', endDraw);
      canvas.addEventListener('mouseleave', endDraw);
      canvas.addEventListener('touchstart', startDraw, { passive: false });
      canvas.addEventListener('touchmove', draw, { passive: false });
      canvas.addEventListener('touchend', endDraw, { passive: false });
    });
  }

  clearCanvas(idx) {
    const d = this.canvases[idx]; if (!d) return;
    d.ctx.clearRect(0, 0, d.canvas.width / d.dpr, d.canvas.height / d.dpr);
    d.strokes = [];
  }

  setWriteMode(on, container) {
    this.writeMode = on;
    container.querySelectorAll('.wr-cv').forEach(cv => {
      cv.classList.toggle('view-mode', !on);
      cv.classList.toggle('write-mode', on);
    });
    const btn = this.headerEl?.querySelector('#wr-write-btn');
    if (btn) {
      btn.style.background = on ? '#FF9600' : '#1A2C33';
      btn.style.borderColor = on ? '#FF9600' : '#2A3A42';
      btn.style.color = on ? '#fff' : '#5A7A88';
      btn.innerHTML = on ? '✏️ Write' : '👁 View';
    }
    const hint = container.querySelector('#wr-hint');
    if (hint) hint.textContent = on ? '✏️ Draw with finger · Tap 👁 to scroll/zoom' : '👁 Scroll & zoom · Tap ✏️ to write';
  }

  bindHeaderEvents(container) {
    this.headerEl.querySelector('#wr-back-btn').addEventListener('click', () => {
      if (this._vpHandler && window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this._vpHandler);
        window.visualViewport.removeEventListener('scroll', this._vpHandler);
      }
      this.cleanup();
      this.app.tabs.more.render(this.app.contentEl);
    });

    this.headerEl.querySelector('#wr-write-btn').addEventListener('click', () => {
      this.setWriteMode(!this.writeMode, container);
    });

    this.headerEl.querySelector('#wr-guide-btn').addEventListener('click', () => {
      this.showGuide = !this.showGuide;
      container.querySelectorAll('.wr-ghost').forEach(el => { el.style.display = this.showGuide ? 'flex' : 'none'; });
      const btn = this.headerEl.querySelector('#wr-guide-btn');
      btn.style.background = this.showGuide ? '#58CC02' : '#1A2C33';
      btn.style.borderColor = this.showGuide ? '#58CC02' : '#2A3A42';
      btn.style.color = this.showGuide ? '#fff' : '#5A7A88';
    });

    this.headerEl.querySelector('#wr-clear-btn').addEventListener('click', () => {
      for (const idx of Object.keys(this.canvases)) this.clearCanvas(idx);
      this.checked = {};
      container.querySelectorAll('.wr-chk').forEach(btn => {
        btn.style.background = 'rgba(0,0,0,0.04)'; btn.style.borderColor = 'rgba(0,0,0,0.14)'; btn.textContent = '';
      });
    });
  }

  bindCellEvents(container) {
    container.querySelectorAll('.wr-x').forEach(btn => {
      btn.addEventListener('click', () => this.clearCanvas(btn.dataset.cidx));
    });
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
