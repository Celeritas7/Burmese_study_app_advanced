// ═══ WRITING PRACTICE ═══
// 5-column grid that fits screen width at max zoom-out
// Pinch to zoom IN to write, header stays fixed

import { db } from './supabase.js';
import { toDev } from 'https://celeritas7.github.io/language-utils/burmese.js';

export class WritingPractice {
  constructor(app) {
    this.app = app;
    this.groups = [];
    this.loaded = false;
    this.showGuide = true;
    this.canvases = {};
    this.checked = {};
    this.originalViewport = '';
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

  async render(container) {
    if (!this.loaded) {
      container.innerHTML = '<div class="pad text-center" style="padding-top:40vh;font-size:24px;">Loading...</div>';
      await this.loadData();
    }

    this.enableZoom();

    // Cell size = fit exactly 5 columns in viewport width
    // gap=2px, padding=6px each side → available = 100vw - 12px - 8px(4 gaps)
    // On desktop, cap at 150px per cell

    container.innerHTML = `
      <style>
        #wr-header {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: var(--bg); padding: 8px 10px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 2px solid var(--border);
        }
        #wr-body { padding-top: 52px; padding-bottom: 80px; }
        .wr-grid {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 2px;
          padding: 4px 6px;
          max-width: 770px;
          margin: 0 auto;
        }
        .wr-sq {
          position: relative;
          width: 100%;
          padding-bottom: 100%; /* square aspect ratio */
          border-radius: 6px;
          overflow: hidden;
          background: #FAFAF8;
          border: 2px solid #ddd;
        }
        .wr-sq-inner {
          position: absolute; inset: 0;
          display: flex; flex-direction: column;
        }
        .wr-sq-canvas-area {
          flex: 1; position: relative; overflow: hidden;
        }
        .wr-sq-label {
          height: 28px; min-height: 28px;
          background: rgba(0,0,0,0.04); border-top: 1px solid rgba(0,0,0,0.08);
          display: flex; align-items: center; justify-content: center;
          gap: 3px; padding: 0 2px; overflow: hidden;
        }
        .wr-sq-label span { white-space: nowrap; }
        .wr-guide-ch {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; color: rgba(0,0,0,0.07); pointer-events: none;
          font-family: 'Noto Sans Myanmar', sans-serif;
        }
        .wr-cv {
          position: absolute; inset: 0;
          display: block; width: 100%; height: 100%;
          cursor: crosshair; touch-action: none;
        }
        .wr-btn-x {
          position: absolute; top: 2px; left: 2px; width: 14px; height: 14px;
          border-radius: 3px; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1);
          color: rgba(0,0,0,0.3); font-size: 7px; cursor: pointer; font-family: var(--font);
          display: flex; align-items: center; justify-content: center; z-index: 5;
        }
        .wr-btn-chk {
          position: absolute; top: 2px; right: 2px; width: 18px; height: 18px;
          border-radius: 4px; cursor: pointer; z-index: 5;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; color: #fff;
        }
      </style>

      <!-- Fixed header -->
      <div id="wr-header">
        <div style="display:flex;align-items:center;gap:8px;">
          <button id="wr-back" style="background:var(--surface);border:2px solid var(--border);border-radius:10px;
            color:var(--text-muted);cursor:pointer;font-size:11px;padding:5px 10px;font-weight:700;font-family:var(--font);">←</button>
          <div style="font-size:14px;font-weight:800;">📝 Practice Sheet</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;">
          <button id="wr-guide-toggle" style="padding:5px 10px;border-radius:8px;
            background:${this.showGuide ? 'var(--green)' : 'var(--surface)'};
            border:2px solid ${this.showGuide ? 'var(--green)' : 'var(--border)'};
            color:${this.showGuide ? '#fff' : 'var(--text-muted)'};
            font-size:10px;font-weight:700;cursor:pointer;font-family:var(--font);">Guide</button>
          <button id="wr-clear-all" style="padding:5px 10px;border-radius:8px;background:var(--surface);
            border:2px solid var(--border);color:var(--text-muted);font-size:10px;font-weight:700;
            cursor:pointer;font-family:var(--font);">🗑 Clear</button>
        </div>
      </div>

      <!-- Scrollable body -->
      <div id="wr-body">
        <div style="text-align:center;padding:2px 0 6px;font-size:9px;color:var(--text-muted);">
          Pinch to zoom in · Write · Pinch out to see all
        </div>
        <div class="wr-grid">
          ${this.groups.map((g, i) => this.renderCell(g, i)).join('')}
        </div>
      </div>
    `;

    // Wait for layout, then init canvases
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.initAllCanvases(container);
      });
    });
    this.bindEvents(container);
  }

  renderCell(group, idx) {
    const isChecked = this.checked[idx];
    const guideChars = group.chars.map(c => c.burmese).join(' ');
    const totalLen = [...guideChars.replace(/ /g, '')].length;
    // Font as percentage of cell — works at any zoom level
    const guideFontPct = totalLen > 4 ? 35 : totalLen > 2 ? 45 : 60;

    const labelParts = group.chars.map(c =>
      `<span style="font-size:9px;font-weight:700;color:#444;font-family:'Noto Sans Myanmar',sans-serif;">${c.burmese}</span>`
    ).join(' ');

    return `
      <div class="wr-sq">
        <div class="wr-sq-inner">
          <div class="wr-sq-canvas-area">
            <button class="wr-btn-x" data-cidx="${idx}">✕</button>
            <button class="wr-btn-chk" data-chidx="${idx}" style="
              background:${isChecked ? '#58CC02' : 'rgba(0,0,0,0.04)'};
              border:2px solid ${isChecked ? '#58CC02' : 'rgba(0,0,0,0.14)'};
            ">${isChecked ? '✓' : ''}</button>
            <div class="wr-guide-ch" style="font-size:${guideFontPct}%;${this.showGuide ? '' : 'display:none;'}">${guideChars}</div>
            <canvas class="wr-cv" data-canvasid="${idx}"></canvas>
          </div>
          <div class="wr-sq-label">
            ${labelParts}
            <span style="font-size:9px;color:#999;font-weight:600;">${group.dev}</span>
            ${group.chars[0].roman ? `<span style="font-size:7px;color:#bbb;">${group.chars.map(c => c.roman).join('/')}</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  initAllCanvases(container) {
    this.canvases = {};
    container.querySelectorAll('.wr-cv').forEach(canvas => {
      const idx = canvas.dataset.canvasid;
      // Size canvas to actual rendered size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(rect.width * dpr);
      canvas.height = Math.round(rect.height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 2;

      this.canvases[idx] = { canvas, ctx, strokes: [], isDrawing: false, dpr };

      const getPos = (e) => {
        const r = canvas.getBoundingClientRect();
        const t = e.touches ? e.touches[0] : e;
        return { x: (t.clientX - r.left) * (canvas.width / dpr / r.width), y: (t.clientY - r.top) * (canvas.height / dpr / r.height) };
      };

      const startDraw = (e) => {
        if (e.touches && e.touches.length > 1) return;
        e.preventDefault();
        const d = this.canvases[idx];
        d.isDrawing = true;
        const pos = getPos(e);
        d.strokes.push([pos]);
        d.ctx.beginPath();
        d.ctx.moveTo(pos.x, pos.y);
      };

      const draw = (e) => {
        const d = this.canvases[idx];
        if (!d.isDrawing) return;
        if (e.touches && e.touches.length > 1) { d.isDrawing = false; return; }
        e.preventDefault();
        const pos = getPos(e);
        d.strokes[d.strokes.length - 1].push(pos);
        d.ctx.lineTo(pos.x, pos.y);
        d.ctx.stroke();
        d.ctx.beginPath();
        d.ctx.moveTo(pos.x, pos.y);
      };

      const endDraw = (e) => {
        if (e) e.preventDefault();
        this.canvases[idx].isDrawing = false;
        this.canvases[idx].ctx.beginPath();
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
    const d = this.canvases[idx];
    if (!d) return;
    const { dpr } = d;
    d.ctx.clearRect(0, 0, d.canvas.width / dpr, d.canvas.height / dpr);
    d.strokes = [];
  }

  bindEvents(container) {
    container.querySelector('#wr-back').addEventListener('click', () => {
      this.disableZoom();
      // Remove injected style
      container.querySelector('style')?.remove();
      container.querySelector('#wr-header')?.remove();
      this.app.tabs.more.render(this.app.contentEl);
    });

    container.querySelector('#wr-guide-toggle').addEventListener('click', () => {
      this.showGuide = !this.showGuide;
      container.querySelectorAll('.wr-guide-ch').forEach(el => {
        el.style.display = this.showGuide ? 'flex' : 'none';
      });
      const btn = container.querySelector('#wr-guide-toggle');
      btn.style.background = this.showGuide ? 'var(--green)' : 'var(--surface)';
      btn.style.borderColor = this.showGuide ? 'var(--green)' : 'var(--border)';
      btn.style.color = this.showGuide ? '#fff' : 'var(--text-muted)';
    });

    container.querySelector('#wr-clear-all').addEventListener('click', () => {
      for (const idx of Object.keys(this.canvases)) this.clearCanvas(idx);
      this.checked = {};
      container.querySelectorAll('.wr-btn-chk').forEach(btn => {
        btn.style.background = 'rgba(0,0,0,0.04)';
        btn.style.borderColor = 'rgba(0,0,0,0.14)';
        btn.textContent = '';
      });
    });

    container.querySelectorAll('.wr-btn-x').forEach(btn => {
      btn.addEventListener('click', () => this.clearCanvas(btn.dataset.cidx));
    });

    container.querySelectorAll('.wr-btn-chk').forEach(btn => {
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
