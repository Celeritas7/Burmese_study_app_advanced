// ═══ COURSE TAB ═══  (router + progress layer)
// Each step launches a screen the app already owns. The pattern drill (Phase 2)
// is a real interactive screen when its unit has authored questions; the unit
// check is a can-do checklist.
import { db } from './supabase.js';
import { Modal } from './modal.js';
import { COURSE_UNITS, getUnit } from './data/course.js';

const LS_KEY = 'burmese_course_progress';

const STEP_META = {
  dialogue: { icon: '💬', color: '#1CB0F6' },
  vocab:    { icon: '📚', color: '#1CB0F6' },
  drill:    { icon: '🧩', color: '#CE82FF' },
  script:   { icon: '✍', color: '#FF9600' },
  check:    { icon: '📊', color: '#FF9600' },
};
const GREEN = '#58CC02';

export class CourseTab {
  constructor(app) {
    this.app = app;
    this.view = 'home'; // home | unit
    this.openUnit = null;
    this.progress = this.loadProgress();
  }

  // ─── PROGRESS (localStorage now; swap for a Supabase table in Phase 3) ───
  loadProgress() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)) || {}; } catch { return {}; }
  }
  saveProgress() { localStorage.setItem(LS_KEY, JSON.stringify(this.progress)); }
  stepDone(unitNum, key) { return !!(this.progress[`u${unitNum}`] || {})[key]; }
  markStep(unitNum, key) {
    if (this.stepDone(unitNum, key)) return;
    (this.progress[`u${unitNum}`] = this.progress[`u${unitNum}`] || {})[key] = true;
    this.saveProgress();
    // Best-effort audit trail in the existing events table
    db.logProgress({ type: 'course_step', result: `u${unitNum}:${key}` }).catch(() => {});
  }
  unitDone(unitNum) {
    const u = getUnit(unitNum);
    return !!u && u.steps.every(s => this.stepDone(unitNum, s.key));
  }
  unitUnlocked(unitNum) {
    const idx = COURSE_UNITS.findIndex(u => u.unit === unitNum);
    return idx <= 0 || this.unitDone(COURSE_UNITS[idx - 1].unit);
  }
  currentUnitNum() {
    for (const u of COURSE_UNITS) if (!this.unitDone(u.unit)) return u.unit;
    return COURSE_UNITS[COURSE_UNITS.length - 1].unit;
  }

  // ─── RENDER ───
  render(container) {
    if (this.view === 'unit' && this.openUnit != null) this.renderUnit(container);
    else this.renderHome(container);
  }

  renderHome(container) {
    const current = this.currentUnitNum();
    const doneUnits = COURSE_UNITS.filter(u => this.unitDone(u.unit)).length;
    const pct = Math.round((doneUnits / COURSE_UNITS.length) * 100);

    container.innerHTML = `
      <div class="pad">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
          <div style="font-size:22px;font-weight:800;">🗺 Course</div>
          <div style="font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;background:rgba(255,200,0,0.12);color:var(--yellow);">Colloquial Burmese</div>
        </div>

        <div style="background:var(--surface);border:2px solid var(--border);border-radius:14px;padding:14px 16px;margin-bottom:16px;">
          <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;">
            <div style="font-size:14px;font-weight:700;">${getUnit(current).title} of 15</div>
            <div style="font-size:12px;color:var(--text-muted);">${doneUnits} unit${doneUnits === 1 ? '' : 's'} done</div>
          </div>
          <div style="height:8px;background:var(--bg);border-radius:5px;padding:2px;border:2px solid var(--border);">
            <div style="height:100%;border-radius:3px;background:var(--green);width:${pct}%;transition:width 0.4s;"></div>
          </div>
        </div>

        <div class="section-label" style="color:var(--text-muted);">Path</div>
        ${COURSE_UNITS.map(u => {
          const isDone = this.unitDone(u.unit);
          const unlocked = this.unitUnlocked(u.unit);
          const isCurrent = u.unit === current && unlocked;
          const doneSteps = u.steps.filter(s => this.stepDone(u.unit, s.key)).length;
          const desc = isDone ? 'Done ✓'
            : !unlocked ? `Unlocks after ${COURSE_UNITS[COURSE_UNITS.findIndex(x => x.unit === u.unit) - 1].title}`
            : `${u.subtitle} · ${doneSteps} of ${u.steps.length} steps`;
          return `
            <button class="course-unit" data-unit="${u.unit}" ${unlocked ? '' : 'disabled'} style="
              display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;margin-bottom:8px;
              border-radius:14px;background:var(--surface);text-align:left;font-family:var(--font);
              border:2px solid ${isCurrent ? u.color : 'var(--border)'};
              cursor:${unlocked ? 'pointer' : 'default'};opacity:${unlocked ? 1 : 0.45};">
              <div style="width:44px;height:44px;border-radius:12px;background:${(isDone ? GREEN : u.color)}18;
                border:2px solid ${(isDone ? GREEN : u.color)}30;display:flex;align-items:center;justify-content:center;font-size:20px;">
                ${isDone ? '✓' : u.icon}
              </div>
              <div style="flex:1;min-width:0;">
                <div style="font-size:14px;font-weight:700;color:var(--text);">${u.title} · ${u.subtitle}</div>
                <div style="font-size:11px;color:var(--text-muted);">${desc}</div>
              </div>
              <span style="font-size:15px;font-weight:800;color:var(--text-muted);">${isDone ? '✓' : (unlocked ? '›' : '🔒')}</span>
            </button>`;
        }).join('')}
      </div>`;

    container.querySelectorAll('.course-unit:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        this.openUnit = parseInt(btn.dataset.unit);
        this.view = 'unit';
        this.render(container);
      });
    });
  }

  renderUnit(container) {
    const u = getUnit(this.openUnit);
    if (!u) { this.view = 'home'; return this.render(container); }
    const doneCount = u.steps.filter(s => this.stepDone(u.unit, s.key)).length;

    let activeSeen = false;
    const rows = u.steps.map((s, i) => {
      const isDone = this.stepDone(u.unit, s.key);
      const locked = i > 0 && !this.stepDone(u.unit, u.steps[i - 1].key);
      const isActive = !isDone && !locked && !activeSeen;
      if (isActive) activeSeen = true;
      const meta = STEP_META[s.type];
      const color = isDone ? GREEN : meta.color;
      const desc = {
        dialogue: `Opens Dialogues · Unit ${u.unit} · D${s.d}`,
        vocab: 'Study session · Colloquial source',
        drill: s.pattern ? `${s.pattern.formula} · ${s.pattern.gloss}` : 'Pattern practice',
        script: s.note,
        check: `${(s.canDos || []).length} can-dos · marks the unit done`,
      }[s.type];
      return `
        <button class="course-step" data-step="${s.key}" ${locked ? 'disabled' : ''} style="
          display:flex;align-items:center;gap:12px;width:100%;padding:10px 14px;margin-bottom:8px;
          border-radius:14px;background:var(--surface);text-align:left;font-family:var(--font);
          border:2px solid ${isActive ? color : 'var(--border)'};
          cursor:${locked ? 'default' : 'pointer'};opacity:${locked ? 0.45 : 1};">
          <div style="width:44px;height:44px;border-radius:12px;background:${color}18;border:2px solid ${color}30;
            display:flex;align-items:center;justify-content:center;font-size:20px;color:${color};font-weight:800;">
            ${isDone ? '✓' : meta.icon}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:14px;font-weight:700;color:var(--text);">${s.title}</div>
            <div style="font-size:11px;color:var(--text-muted);">${desc}</div>
          </div>
          <span style="font-size:15px;font-weight:800;color:var(--text-muted);">${isDone ? '✓' : (locked ? '🔒' : '›')}</span>
        </button>`;
    }).join('');

    container.innerHTML = `
      <div class="pad">
        <button id="course-back" style="background:var(--surface);border:2px solid var(--border);border-radius:999px;
          color:var(--text-muted);cursor:pointer;font-size:12px;padding:5px 12px;font-weight:700;font-family:var(--font);margin-bottom:10px;">
          ← Course
        </button>
        <div style="font-size:19px;font-weight:800;margin-bottom:10px;">${u.title} · ${u.subtitle}</div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
          ${u.badges.map(b => `<span style="font-size:11px;font-weight:800;padding:4px 10px;border-radius:8px;
            background:${u.color}12;color:${u.color};">${b}</span>`).join('')}
        </div>
        <div class="section-label" style="color:var(--text-muted);">Steps · ${doneCount} of ${u.steps.length} done</div>
        ${rows}
      </div>`;

    container.querySelector('#course-back').addEventListener('click', () => {
      this.view = 'home';
      this.render(container);
    });
    container.querySelectorAll('.course-step:not([disabled])').forEach(btn => {
      btn.addEventListener('click', () => {
        const step = u.steps.find(s => s.key === btn.dataset.step);
        if (step) this.launchStep(u, step);
      });
    });
  }

  // ─── STEP LAUNCHERS (reuse existing screens) ───
  launchStep(u, step) {
    const app = this.app;
    switch (step.type) {
      case 'dialogue': {
        this.markStep(u.unit, step.key);
        const dial = app.tabs.dialogues;
        dial.expandedUnit = u.unit;
        dial.expandedDialogue = `${u.unit}_${step.d}`;
        app.showDialogues();
        break;
      }
      case 'vocab': {
        const study = app.tabs.study;
        study.selectedSource = 'colloquial';
        study.courseUnit = u.unit; // unit-tagged words only (falls back to full deck)
        study.phase = 'setup';
        study.autoStart = true; // skip setup — jump straight into the session
        // Phase 3: step completes when the session finishes, then the unit's
        // words are seeded into the SRS queue (due now).
        study.onSessionComplete = async () => {
          this.markStep(u.unit, step.key);
          try {
            const words = await db.getUnitWords(u.unit);
            if (words.length) {
              const res = await db.bulkEnsureUserState(words.map(w => w.id));
              if (res.inserted) db.logProgress({ type: 'course_srs_seed', result: `u${u.unit}:+${res.inserted}` }).catch(() => {});
            }
          } catch { /* offline or untagged — skip seeding */ }
        };
        app.switchTab('study');
        break;
      }
      case 'script': {
        this.markStep(u.unit, step.key);
        app.showWriting();
        break;
      }
      case 'drill': return this.showDrillModal(u, step);
      case 'check': return this.showCheckModal(u, step);
    }
  }

  // ─── PATTERN DRILL (Phase 2 · real screen) ───
  // Interactive when the pattern carries `questions`; otherwise falls back to a
  // "work it in the book, then mark done" card so unauthored units still complete.
  showDrillModal(u, step) {
    const p = step.pattern;
    const qs = (p && Array.isArray(p.questions)) ? p.questions : null;
    if (!qs || !qs.length) return this.showDrillFallback(u, step, p);

    const patternHeader = `
      <div style="background:rgba(206,130,255,0.08);border:2px solid rgba(206,130,255,0.3);border-radius:14px;padding:12px 14px;margin-bottom:14px;">
        <div style="font-size:9px;font-weight:800;letter-spacing:1.5px;color:var(--purple);margin-bottom:4px;">PATTERN · ${p.label}</div>
        <div style="font-size:17px;font-weight:800;color:var(--text);">${p.formula}
          <span style="color:var(--text-muted);font-weight:700;">${p.reading ? '· ' + p.reading + ' ' : ''}· ${p.gloss}</span></div>
      </div>`;

    // Freshly shuffle each option list so the correct slot moves on replay.
    const shuffle = (arr) => arr.map(v => [Math.random(), v]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
    const rounds = qs.map(q => ({ ...q, options: shuffle(q.options) }));
    const st = { i: 0, picked: -1, score: 0, phase: 'quiz' };

    const box = Modal.show(`<div id="drill-body"></div>`, { borderColor: 'var(--purple)' });
    if (!box) return;
    const body = box.querySelector('#drill-body');

    const paintQuiz = () => {
      const q = rounds[st.i];
      const answered = st.picked >= 0;
      const pickedOk = answered && q.options[st.picked].ok;
      body.innerHTML = `
        <div class="modal-header">
          <div class="modal-title" style="color:var(--purple);">🧩 Pattern drill</div>
          <button class="modal-close" data-modal-close>✕ Close</button>
        </div>
        ${patternHeader}
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
          <div style="font-size:11px;font-weight:800;color:var(--text-muted);">Q${st.i + 1} of ${rounds.length}</div>
          <div style="font-size:11px;font-weight:700;color:var(--text-muted);">Score ${st.score}</div>
        </div>
        <div style="font-size:15px;font-weight:700;margin-bottom:${q.hint ? '2px' : '12px'};">
          Say: <span style="color:var(--green);">${q.prompt}</span></div>
        ${q.hint ? `<div style="font-size:11px;color:var(--text-muted);margin-bottom:12px;">${q.hint}</div>` : ''}
        <div id="drill-opts" style="display:flex;flex-direction:column;gap:8px;">
          ${q.options.map((o, idx) => {
            let border = 'var(--border)', bg = 'var(--surface)', tint = 'var(--text)';
            if (answered) {
              if (o.ok) { border = 'var(--green)'; bg = 'rgba(88,204,2,0.1)'; }
              else if (idx === st.picked) { border = 'var(--pink)'; bg = 'rgba(255,107,138,0.1)'; }
              else { tint = 'var(--text-muted)'; }
            }
            return `
              <button data-opt="${idx}" ${answered ? 'disabled' : ''} style="
                display:flex;align-items:center;gap:10px;width:100%;padding:12px 14px;border-radius:14px;
                background:${bg};border:2px solid ${border};text-align:left;font-family:var(--font);
                cursor:${answered ? 'default' : 'pointer'};">
                <div style="flex:1;min-width:0;">
                  <div style="font-size:17px;font-weight:800;color:${tint};">${o.b}</div>
                  <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${o.r}</div>
                </div>
                ${answered && o.ok ? '<span style="color:var(--green);font-size:16px;font-weight:800;">✓</span>' : ''}
                ${answered && idx === st.picked && !o.ok ? '<span style="color:var(--pink);font-size:16px;font-weight:800;">✗</span>' : ''}
              </button>`;
          }).join('')}
        </div>
        ${answered ? `
          <div style="font-size:13px;font-weight:700;text-align:center;margin:12px 0 4px;color:${pickedOk ? 'var(--green)' : 'var(--pink)'};">
            ${pickedOk ? 'Correct! ✓' : (p.wrongHint || 'Not quite.')}
          </div>
          <button class="btn-primary" id="drill-next" style="background:var(--purple);">
            ${st.i + 1 >= rounds.length ? 'See results →' : 'Next →'}
          </button>` : ''}
      `;
      if (answered) {
        body.querySelector('#drill-next').addEventListener('click', () => {
          if (st.i + 1 >= rounds.length) { st.phase = 'result'; paintResult(); }
          else { st.i++; st.picked = -1; paintQuiz(); }
        });
      } else {
        body.querySelectorAll('[data-opt]').forEach(btn => {
          btn.addEventListener('click', () => {
            st.picked = parseInt(btn.dataset.opt);
            if (q.options[st.picked].ok) st.score++;
            paintQuiz();
          });
        });
      }
    };

    const paintResult = () => {
      const total = rounds.length;
      const pct = Math.round((st.score / total) * 100);
      const perfect = st.score === total;
      const strong = st.score >= Math.ceil(total * 0.67);
      const emoji = perfect ? '🎉' : strong ? '👍' : '💪';
      const title = perfect ? 'Excellent!' : strong ? 'Good job!' : 'Keep practicing!';
      const color = perfect ? 'var(--green)' : strong ? 'var(--yellow)' : 'var(--pink)';
      body.innerHTML = `
        <div class="modal-header">
          <div class="modal-title" style="color:var(--purple);">🧩 Drill results</div>
          <button class="modal-close" data-modal-close>✕ Close</button>
        </div>
        <div style="text-align:center;padding:8px 0 4px;">
          <div style="font-size:56px;line-height:1;">${emoji}</div>
          <div style="font-size:24px;font-weight:800;margin-top:8px;">${title}</div>
          <div style="font-size:14px;color:var(--text-muted);margin-top:4px;">${st.score} / ${total} patterns correct</div>
        </div>
        <div style="height:10px;background:var(--bg);border-radius:6px;padding:2px;border:2px solid var(--border);margin:14px 0 16px;">
          <div style="height:100%;border-radius:4px;background:${color};width:${pct}%;transition:width 0.4s;"></div>
        </div>
        <button class="btn-primary" id="drill-continue" style="background:var(--green);margin-bottom:8px;">Continue →</button>
        <button class="btn-primary" id="drill-retry" style="background:var(--surface);border:2px solid var(--border);color:var(--text-muted);">🔁 Drill again</button>
      `;
      body.querySelector('#drill-continue').addEventListener('click', () => {
        this.markStep(u.unit, step.key);
        Modal.close();
        this.render(this.app.contentEl);
      });
      body.querySelector('#drill-retry').addEventListener('click', () => {
        rounds.forEach(r => { r.options = shuffle(r.options); });
        st.i = 0; st.picked = -1; st.score = 0; st.phase = 'quiz';
        paintQuiz();
      });
    };

    paintQuiz();
  }

  showDrillFallback(u, step, p) {
    const done = this.stepDone(u.unit, step.key);
    const box = Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--purple);">🧩 Pattern drill</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      ${p ? `
        <div style="background:rgba(206,130,255,0.08);border:2px solid rgba(206,130,255,0.3);border-radius:14px;padding:14px 16px;margin-bottom:14px;">
          <div style="font-size:9px;font-weight:800;letter-spacing:1.5px;color:var(--purple);margin-bottom:4px;">PATTERN · ${p.label}</div>
          <div style="font-size:17px;font-weight:800;color:var(--text);">${p.formula} <span style="color:var(--text-muted);font-weight:700;">· ${p.gloss}</span></div>
        </div>` : `
        <div style="font-size:13px;color:var(--text-muted);margin-bottom:14px;">Pattern to be added for this unit.</div>`}
      <div style="font-size:13px;color:var(--text-muted);line-height:1.5;margin-bottom:14px;">
        Interactive questions aren't authored for this unit yet. Work the pattern exercises in the book, then mark this step done.
      </div>
      <button class="btn-primary" id="drill-done" style="background:var(--purple);">${done ? '✓ Already done' : 'Mark done ✓'}</button>
    `, { borderColor: 'var(--purple)' });
    box?.querySelector('#drill-done')?.addEventListener('click', () => {
      this.markStep(u.unit, step.key);
      Modal.close();
      this.render(this.app.contentEl);
    });
  }

  // ─── UNIT CHECK (Phase 2b · can-do checklist) ───
  // Entries may be strings or { text, fix } — fix names the step to revisit.
  showCheckModal(u, step) {
    const items = (step.canDos || []).map(c => typeof c === 'string' ? { text: c } : c);
    const alreadyDone = this.stepDone(u.unit, step.key);
    const state = items.map(() => alreadyDone);
    const FIX_LABEL = { d1: '💬 Dialogue 1', d2: '💬 Dialogue 2', vocab: '📚 Vocab', drill: '🧩 Drill', script: '✍ Script' };

    const listHTML = () => items.map((c, i) => {
      const on = state[i];
      const color = on ? GREEN : '#FF6B8A';
      const showFix = !on && c.fix && u.steps.some(s => s.key === c.fix);
      return `
        <div style="display:flex;align-items:stretch;gap:6px;margin-bottom:6px;">
          <button data-cando="${i}" style="display:flex;align-items:center;gap:10px;flex:1;min-width:0;padding:10px 12px;
            border-radius:12px;background:var(--bg);border:2px solid var(--border);cursor:pointer;text-align:left;font-family:var(--font);">
            <span style="width:28px;height:28px;border-radius:10px;background:${color}18;border:2px solid ${color}30;flex-shrink:0;
              display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:${color};">${on ? '✓' : '○'}</span>
            <span style="flex:1;font-size:13px;font-weight:700;color:var(--text);">${c.text}</span>
          </button>
          ${showFix ? `
          <button data-fix="${c.fix}" title="Revisit ${FIX_LABEL[c.fix] || c.fix}" style="display:flex;flex-direction:column;align-items:center;justify-content:center;
            padding:4px 10px;border-radius:12px;background:rgba(28,176,246,0.08);border:2px solid rgba(28,176,246,0.3);
            cursor:pointer;font-family:var(--font);">
            <span style="font-size:11px;font-weight:800;color:var(--blue);white-space:nowrap;">${FIX_LABEL[c.fix] || c.fix}</span>
            <span style="font-size:9px;font-weight:700;color:var(--text-muted);">review ›</span>
          </button>` : ''}
        </div>`;
    }).join('');

    const box = Modal.show(`
      <div class="modal-header">
        <div class="modal-title" style="color:var(--orange);">📊 ${u.title} check</div>
        <button class="modal-close" data-modal-close>✕ Close</button>
      </div>
      <div style="font-size:13px;color:var(--text-muted);margin-bottom:12px;">Can you do this in Burmese? Be honest — tap what you can. Anything unchecked links back to the step that teaches it.</div>
      <div id="cando-list">${listHTML()}</div>
      <div id="cando-gap" style="font-size:12px;color:var(--pink);text-align:center;margin:8px 0;"></div>
      <button class="btn-primary" id="check-done" style="background:var(--green);">Mark ${u.title} done ✓</button>
    `, { borderColor: 'var(--orange)' });
    if (!box) return;

    const list = box.querySelector('#cando-list');
    const gapEl = box.querySelector('#cando-gap');
    const doneBtn = box.querySelector('#check-done');
    const sync = () => {
      const gaps = state.filter(s => !s).length;
      gapEl.textContent = gaps > 0 ? `${gaps} unchecked — revisit those steps before finishing` : '';
      doneBtn.disabled = gaps > 0;
      doneBtn.style.opacity = gaps > 0 ? 0.4 : 1;
      doneBtn.style.cursor = gaps > 0 ? 'not-allowed' : 'pointer';
    };
    const wire = () => {
      list.querySelectorAll('[data-cando]').forEach(b => {
        b.addEventListener('click', () => {
          const i = parseInt(b.dataset.cando);
          state[i] = !state[i];
          list.innerHTML = listHTML();
          wire();
          sync();
        });
      });
      list.querySelectorAll('[data-fix]').forEach(b => {
        b.addEventListener('click', () => {
          const target = u.steps.find(s => s.key === b.dataset.fix);
          if (!target) return;
          Modal.close();
          this.launchStep(u, target);
        });
      });
    };
    wire();
    sync();

    doneBtn.addEventListener('click', () => {
      if (state.some(s => !s)) return;
      this.markStep(u.unit, step.key);
      Modal.close();
      this.view = 'home';
      this.render(this.app.contentEl);
    });
  }
}
