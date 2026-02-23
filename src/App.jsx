import { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://ulgrfumbwjovbjzjiems.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVsZ3JmdW1id2pvdmJqemppZW1zIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczNzIyNjcsImV4cCI6MjA4Mjk0ODI2N30.ix5Vh4Y3GXNbQbzVtTD_WSko0L3cr5q_eCnTuDEMh7M";

async function supaFetch(table, params = "") {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${params}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  });
  if (!res.ok) throw new Error(`Supabase error: ${res.status}`);
  return res.json();
}

async function supaInsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Insert error: ${res.status}`);
  return res.json();
}

// ─── Devanagari Transliteration Engine ───
const TRANSLIT = {
  consonants: [
    { char: 'က', roman: 'ka', dev: 'क' },
    { char: 'ခ', roman: 'kha', dev: 'ख' },
    { char: 'ဂ', roman: 'ga', dev: 'ग' },
    { char: 'ဃ', roman: 'gha', dev: 'घ' },
    { char: 'င', roman: 'nga', dev: 'ङ' },
    { char: 'ငြ', roman: 'ngra', dev: 'ङ' },
    { char: 'ကျ', roman: 'kya', dev: 'च' },
    { char: 'ကြ', roman: 'kra', dev: 'च' },
    { char: 'ချ', roman: 'khya', dev: 'छ' },
    { char: 'ခြ', roman: 'khra', dev: 'छ' },
    { char: 'ဇ', roman: 'ja', dev: 'ज' },
    { char: 'ဂျ', roman: 'gya', dev: 'ज' },
    { char: 'ဈ', roman: 'jha', dev: 'झ' },
    { char: 'ဂြ', roman: 'gra', dev: 'झ' },
    { char: 'ဉ ', roman: 'nya', dev: 'ञ' },
    { char: 'ည', roman: 'nyya', dev: 'ञ' },
    { char: 'ဋ', roman: 'ṭa', dev: 'ट' },
    { char: 'ဌ', roman: 'ṭha', dev: 'ठ' },
    { char: 'ဍ', roman: 'ḍa', dev: 'ड' },
    { char: 'ဎ', roman: 'ḍha', dev: 'ढ' },
    { char: 'ဏ', roman: 'ṇa', dev: 'ण' },
    { char: 'တ', roman: 'ta', dev: 'त' },
    { char: 'ထ', roman: 'tha', dev: 'थ' },
    { char: 'သ', roman: 'sa', dev: 'थ' },
    { char: 'ဒ', roman: 'da', dev: 'द' },
    { char: 'ဓ', roman: 'dha', dev: 'ध' },
    { char: 'န', roman: 'na', dev: 'न' },
    { char: 'ပ', roman: 'pa', dev: 'प' },
    { char: 'ဖ', roman: 'pha', dev: 'फ' },
    { char: 'ဗ', roman: 'ba', dev: 'ब' },
    { char: 'ဘ', roman: 'bha', dev: 'भ' },
    { char: 'မ', roman: 'ma', dev: 'म' },
    { char: 'ယ', roman: 'ya', dev: 'य' },
    { char: 'ရ', roman: 'ra', dev: 'र' },
    { char: 'လ', roman: 'la', dev: 'ल' },
    { char: 'ဝ', roman: 'wa', dev: 'व' },
    { char: 'ရှ', roman: 'sha', dev: 'श' },
    { char: 'စ', roman: 'ca', dev: 'स' },
    { char: 'ဆ', roman: 'cha', dev: 'स' },
    { char: 'ဿ', roman: 'ssa', dev: 'स्स' },
    { char: 'ဟ', roman: 'ha', dev: 'ह' },
    { char: 'ဠ', roman: 'ḷa', dev: 'ळ' },
    { char: 'အ', roman: 'a', dev: 'अ' },
  ],
  medials: [
    { char: 'ျ', roman: 'ya', dev: '्य' },
    { char: 'ြ', roman: 'ra', dev: '्य' },
    { char: 'ွ', roman: 'wa', dev: '्व' },
    { char: 'ှ', roman: 'ha', dev: '्ह' },
  ],
  finals: [
    { char: 'က်', roman: 'k', dev: 'क्' },
    { char: 'င်', roman: 'ng', dev: 'ं' },
    { char: 'င်္', roman: 'ng', dev: 'ं' },
    { char: 'စ်', roman: 'c', dev: 'च्' },
    { char: 'ည်', roman: 'ny', dev: 'ञ्' },
    { char: 'တ်', roman: 't', dev: 'त्' },
    { char: 'န်', roman: 'n', dev: 'न्' },
    { char: 'ပ်', roman: 'p', dev: 'प्' },
    { char: 'မ်', roman: 'm', dev: 'म्' },
    { char: 'ယ်', roman: 'y', dev: 'य्' },
    { char: 'သ်', roman: 's', dev: 'स्' },
  ],
  markers: [
    { char: '်', roman: '', dev: '्' },
    { char: '့', roman: '.', dev: '॰' },
    { char: 'း', roman: ':', dev: 'ः' },
    { char: '္', roman: '', dev: '्' },
  ],
  vowels: [
    { char: 'ော်', roman: 'au', dev: 'ौ' },
    { char: 'ော', roman: 'o', dev: 'ो' },
    { char: 'ို', roman: 'o', dev: 'ो' },
    { char: 'ွန်', roman: 'un', dev: 'ुन' },
    { char: 'ုန်', roman: 'on', dev: 'ोन' },
    { char: 'ာ', roman: 'ā', dev: 'ा' },
    { char: 'ါ', roman: 'ā', dev: 'ा' },
    { char: 'ိ', roman: 'i', dev: 'ि' },
    { char: 'ီ', roman: 'ī', dev: 'ी' },
    { char: 'ု', roman: 'u', dev: 'ु' },
    { char: 'ူ', roman: 'ū', dev: 'ू' },
    { char: 'ေ', roman: 'e', dev: 'े' },
    { char: 'ဲ', roman: 'ai', dev: 'ै' },
  ],
};

const ALL_MAPPINGS = [
  ...TRANSLIT.finals,
  ...TRANSLIT.vowels,
  ...TRANSLIT.consonants.sort((a, b) => b.char.length - a.char.length),
  ...TRANSLIT.medials,
  ...TRANSLIT.markers,
].sort((a, b) => b.char.length - a.char.length);

function toDevanagari(burmese) {
  if (!burmese) return '';
  let result = '', i = 0;
  while (i < burmese.length) {
    let matched = false;
    for (const m of ALL_MAPPINGS) {
      if (burmese.startsWith(m.char, i)) {
        result += m.dev;
        i += m.char.length;
        matched = true;
        break;
      }
    }
    if (!matched) { result += burmese[i]; i++; }
  }
  return result;
}

function toRoman(burmese) {
  if (!burmese) return '';
  let result = '', i = 0;
  while (i < burmese.length) {
    let matched = false;
    for (const m of ALL_MAPPINGS) {
      if (burmese.startsWith(m.char, i)) {
        result += m.roman;
        i += m.char.length;
        matched = true;
        break;
      }
    }
    if (!matched) { result += burmese[i]; i++; }
  }
  return result;
}

// ─── Icons ───
const Icons = {
  home: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>,
  cards: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18"/></svg>,
  quiz: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9"/><path d="M9 9a3 3 0 115 2c0 1.5-2 2-2 4m0 3h.01"/></svg>,
  match: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  write: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>,
  stats: <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>,
  check: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>,
  x: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5"><path d="M6 18L18 6M6 6l12 12"/></svg>,
  rotate: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>,
  shuffle: <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>,
  play: <svg width="22" height="22" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>,
};

// ─── Theme ───
const theme = {
  bg: "#0f0f0f", surface: "#1a1a1a", surfaceHover: "#252525",
  card: "#1e1e1e", cardHover: "#282828",
  gold: "#d4a843", goldLight: "#e8c96a", goldDim: "#a07e2e",
  cream: "#f5e6c8", creamDim: "#c4b394",
  green: "#4ade80", greenDim: "#166534",
  red: "#f87171", redDim: "#7f1d1d", blue: "#60a5fa",
  textPrimary: "#f5e6c8", textSecondary: "#a09480", textMuted: "#6b6152",
  border: "#2a2520", borderGold: "#3d3220",
};

// ─── Styles ───
const styles = `
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Noto+Sans+Myanmar:wght@400;500;600;700&family=Noto+Sans+Devanagari:wght@400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{background:${theme.bg}}
.app{font-family:'DM Sans',sans-serif;background:${theme.bg};color:${theme.textPrimary};min-height:100vh;overflow-x:hidden}
.app::before{content:'';position:fixed;top:-50%;left:-50%;width:200%;height:200%;background:radial-gradient(ellipse at 20% 50%,${theme.goldDim}08 0%,transparent 50%),radial-gradient(ellipse at 80% 50%,${theme.goldDim}05 0%,transparent 50%);animation:bgDrift 30s ease-in-out infinite alternate;pointer-events:none;z-index:0}
@keyframes bgDrift{0%{transform:translate(0,0) rotate(0deg)}100%{transform:translate(-5%,3%) rotate(3deg)}}
.sidebar{position:fixed;left:0;top:0;bottom:0;width:72px;background:${theme.surface};border-right:1px solid ${theme.border};display:flex;flex-direction:column;align-items:center;padding:20px 0;z-index:100;gap:8px}
.sidebar-logo{font-family:'Noto Sans Myanmar',sans-serif;font-size:24px;color:${theme.gold};margin-bottom:24px;cursor:default}
.sidebar-btn{width:48px;height:48px;border:none;border-radius:12px;background:transparent;color:${theme.textMuted};cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .2s;position:relative}
.sidebar-btn:hover{background:${theme.surfaceHover};color:${theme.textSecondary}}
.sidebar-btn.active{background:${theme.borderGold};color:${theme.gold}}
.sidebar-btn.active::before{content:'';position:absolute;left:-12px;top:50%;transform:translateY(-50%);width:3px;height:24px;background:${theme.gold};border-radius:0 2px 2px 0}
.sidebar-label{font-size:9px;margin-top:2px;text-transform:uppercase;letter-spacing:.5px}
.main{margin-left:72px;padding:32px 40px;position:relative;z-index:1;max-width:1200px}

.home{display:flex;flex-direction:column;align-items:center;padding-top:48px;max-width:700px;margin:0 auto}
.home-greeting{font-family:'Cormorant Garamond',serif;font-size:44px;font-weight:600;color:${theme.cream};text-align:center;animation:fadeUp .6s ease-out}
.home-greeting .bt{font-family:'Noto Sans Myanmar',sans-serif;color:${theme.gold}}
.home-sub{font-size:15px;color:${theme.textSecondary};text-align:center;margin-top:8px;margin-bottom:40px;animation:fadeUp .6s ease-out .1s both}
.home-mini-stats{display:flex;gap:32px;margin-bottom:40px;animation:fadeUp .6s ease-out .15s both}
.mini-stat{text-align:center}
.mini-stat-val{font-family:'Cormorant Garamond',serif;font-size:32px;font-weight:700;color:${theme.cream}}
.mini-stat-label{font-size:11px;color:${theme.textMuted};text-transform:uppercase;letter-spacing:1px;margin-top:2px}
.home-cta{display:flex;gap:14px;margin-bottom:48px;animation:fadeUp .6s ease-out .2s both}
.cta-btn{padding:14px 32px;border:none;border-radius:14px;font-family:'DM Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;transition:all .3s;display:flex;align-items:center;gap:8px;letter-spacing:.3px}
.cta-btn.primary{background:linear-gradient(135deg,${theme.gold},${theme.goldDim});color:${theme.bg}}
.cta-btn.primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px ${theme.gold}30}
.cta-btn.secondary{background:${theme.card};border:1px solid ${theme.border};color:${theme.textSecondary}}
.cta-btn.secondary:hover{border-color:${theme.goldDim};color:${theme.cream};transform:translateY(-2px)}
.home-wotd{background:${theme.card};border:1px solid ${theme.border};border-radius:20px;padding:32px 40px;width:100%;text-align:center;position:relative;overflow:hidden;animation:fadeUp .6s ease-out .25s both}
.home-wotd::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,transparent,${theme.gold},transparent)}
.wotd-label{font-size:11px;color:${theme.goldDim};text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
.wotd-burmese{font-family:'Noto Sans Myanmar',sans-serif;font-size:48px;font-weight:600;color:${theme.cream};margin-bottom:8px}
.wotd-devanagari{font-family:'Noto Sans Devanagari',sans-serif;font-size:22px;color:${theme.gold};margin-bottom:4px}
.wotd-roman{font-size:14px;color:${theme.textMuted};margin-bottom:12px;font-style:italic}
.wotd-meaning{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:500;color:${theme.creamDim}}
.home-progress{width:100%;margin-top:32px;animation:fadeUp .6s ease-out .3s both}
.home-progress-label{font-size:12px;color:${theme.textMuted};display:flex;justify-content:space-between;margin-bottom:8px}
.home-progress-track{height:8px;background:${theme.bg};border-radius:4px;overflow:hidden}
.home-progress-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,${theme.gold},${theme.goldLight});transition:width 1s ease-out}

.page-header{margin-bottom:32px}
.page-title{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:600;color:${theme.cream};letter-spacing:-.5px}
.page-subtitle{font-size:14px;color:${theme.textSecondary};margin-top:4px}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:32px}
.stat-card{background:${theme.card};border:1px solid ${theme.border};border-radius:16px;padding:20px 24px;transition:all .3s;animation:fadeUp .5s ease-out both}
.stat-card:hover{border-color:${theme.borderGold};transform:translateY(-2px)}
.stat-label{font-size:12px;color:${theme.textMuted};text-transform:uppercase;letter-spacing:1px;margin-bottom:8px}
.stat-value{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:700;color:${theme.cream}}
.stat-sub{font-size:12px;color:${theme.textSecondary};margin-top:4px}
.stat-icon{float:right;color:${theme.gold};opacity:.6}
.section{margin-bottom:32px}
.section-title{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:600;color:${theme.cream};margin-bottom:16px;display:flex;align-items:center;gap:10px}
.section-title-line{flex:1;height:1px;background:${theme.border}}
.mastery-bar-container{background:${theme.card};border:1px solid ${theme.border};border-radius:16px;padding:24px;animation:fadeUp .5s ease-out .1s both}
.mastery-bar{display:flex;height:32px;border-radius:8px;overflow:hidden;background:${theme.bg};margin-top:12px}
.mastery-segment{transition:width .8s ease-out;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:600;color:white;min-width:0;overflow:hidden;white-space:nowrap}
.mastery-legend{display:flex;gap:20px;margin-top:12px;flex-wrap:wrap}
.legend-item{display:flex;align-items:center;gap:6px;font-size:12px;color:${theme.textSecondary}}
.legend-dot{width:10px;height:10px;border-radius:3px}
.activity-list{background:${theme.card};border:1px solid ${theme.border};border-radius:16px;overflow:hidden;animation:fadeUp .5s ease-out .2s both}
.activity-item{padding:14px 24px;display:flex;align-items:center;gap:12px;border-bottom:1px solid ${theme.border};font-size:13px;color:${theme.textSecondary}}
.activity-item:last-child{border-bottom:none}
.activity-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.activity-word{font-family:'Noto Sans Myanmar',sans-serif;color:${theme.cream};font-size:15px}
.activity-time{margin-left:auto;font-size:11px;color:${theme.textMuted}}

.flashcard-setup{max-width:600px;margin:0 auto}
.setup-option{background:${theme.card};border:1px solid ${theme.border};border-radius:14px;padding:18px 22px;margin-bottom:12px;cursor:pointer;transition:all .25s;display:flex;align-items:center;justify-content:space-between}
.setup-option:hover{border-color:${theme.goldDim};background:${theme.cardHover}}
.setup-option.selected{border-color:${theme.gold};background:${theme.borderGold}}
.setup-option-label{font-weight:500;color:${theme.cream}}
.setup-option-desc{font-size:12px;color:${theme.textSecondary};margin-top:2px}
.setup-count{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:${theme.gold}}
.start-btn{width:100%;padding:16px;border:none;border-radius:14px;background:linear-gradient(135deg,${theme.gold},${theme.goldDim});color:${theme.bg};font-family:'DM Sans',sans-serif;font-size:16px;font-weight:700;cursor:pointer;margin-top:20px;transition:all .3s;letter-spacing:.5px}
.start-btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px ${theme.gold}30}
.start-btn:disabled{opacity:.4;pointer-events:none}
.group-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px;max-height:300px;overflow-y:auto;padding:4px;margin-top:12px}
.group-chip{background:${theme.card};border:1px solid ${theme.border};border-radius:10px;padding:10px 14px;cursor:pointer;transition:all .2s;text-align:center}
.group-chip:hover{border-color:${theme.goldDim};background:${theme.cardHover}}
.group-chip.selected{border-color:${theme.gold};background:${theme.borderGold}}
.group-chip-word{font-family:'Noto Sans Myanmar',sans-serif;font-size:18px;color:${theme.cream}}
.group-chip-count{font-size:11px;color:${theme.textMuted};margin-top:2px}
.count-selector{display:flex;gap:10px;margin-top:16px;justify-content:center}
.count-btn{padding:8px 20px;border:1px solid ${theme.border};border-radius:10px;background:${theme.card};color:${theme.textSecondary};cursor:pointer;font-family:'DM Sans',sans-serif;font-size:14px;font-weight:600;transition:all .2s}
.count-btn:hover{border-color:${theme.goldDim}}
.count-btn.selected{border-color:${theme.gold};background:${theme.borderGold};color:${theme.gold}}

.flashcard-arena{display:flex;flex-direction:column;align-items:center;padding-top:20px}
.progress-bar-track{width:100%;max-width:560px;height:6px;background:${theme.bg};border-radius:3px;margin-bottom:32px;overflow:hidden}
.progress-bar-fill{height:100%;background:linear-gradient(90deg,${theme.gold},${theme.goldLight});border-radius:3px;transition:width .4s ease-out}
.flashcard-counter{font-size:13px;color:${theme.textMuted};margin-bottom:24px}
.flashcard-wrapper{perspective:1200px;width:420px;height:340px;cursor:pointer;margin-bottom:32px}
.flashcard-inner{width:100%;height:100%;position:relative;transform-style:preserve-3d;transition:transform .6s cubic-bezier(.4,0,.2,1)}
.flashcard-inner.flipped{transform:rotateY(180deg)}
.flashcard-face{position:absolute;inset:0;backface-visibility:hidden;border-radius:20px;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px;border:1px solid ${theme.border}}
.flashcard-front{background:linear-gradient(145deg,${theme.card},${theme.surface});border-color:${theme.borderGold}}
.flashcard-back{background:linear-gradient(145deg,${theme.borderGold},${theme.card});transform:rotateY(180deg);border-color:${theme.gold}40}
.flashcard-burmese{font-family:'Noto Sans Myanmar',sans-serif;font-size:52px;font-weight:600;color:${theme.cream};margin-bottom:6px;text-align:center}
.flashcard-devanagari{font-family:'Noto Sans Devanagari',sans-serif;font-size:20px;color:${theme.gold};margin-bottom:4px}
.flashcard-roman{font-size:13px;color:${theme.textMuted};font-style:italic;margin-bottom:12px}
.flashcard-hint{font-size:13px;color:${theme.textMuted};display:flex;align-items:center;gap:6px}
.flashcard-meaning{font-family:'Cormorant Garamond',serif;font-size:28px;font-weight:600;color:${theme.cream};text-align:center;margin-bottom:8px}
.flashcard-meta{font-size:13px;color:${theme.textSecondary};text-align:center;line-height:1.6}
.flashcard-actions{display:flex;gap:16px;margin-bottom:16px}
.fc-action{width:64px;height:64px;border-radius:50%;border:2px solid;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .25s;font-size:24px}
.fc-action.wrong{border-color:${theme.red}60;color:${theme.red}}
.fc-action.wrong:hover{background:${theme.redDim};border-color:${theme.red};transform:scale(1.1)}
.fc-action.flip{border-color:${theme.textMuted}40;color:${theme.textSecondary}}
.fc-action.flip:hover{background:${theme.surfaceHover};border-color:${theme.textSecondary};transform:scale(1.1)}
.fc-action.right{border-color:${theme.green}60;color:${theme.green}}
.fc-action.right:hover{background:${theme.greenDim};border-color:${theme.green};transform:scale(1.1)}
.session-complete{text-align:center;padding:60px 20px;animation:fadeUp .5s ease-out}
.complete-title{font-family:'Cormorant Garamond',serif;font-size:36px;font-weight:700;color:${theme.cream};margin-bottom:8px}
.complete-stats{display:flex;gap:32px;justify-content:center;margin:32px 0}
.complete-stat{text-align:center}
.complete-stat-val{font-family:'Cormorant Garamond',serif;font-size:42px;font-weight:700}
.complete-stat-label{font-size:12px;color:${theme.textSecondary};text-transform:uppercase;letter-spacing:1px;margin-top:4px}
.missed-words{background:${theme.card};border:1px solid ${theme.border};border-radius:16px;padding:20px 24px;max-width:500px;margin:24px auto;text-align:left}
.missed-words-title{font-size:13px;color:${theme.textMuted};text-transform:uppercase;letter-spacing:1px;margin-bottom:12px}
.missed-word-item{display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid ${theme.border};font-size:14px}
.missed-word-item:last-child{border-bottom:none}
.back-btn{background:none;border:1px solid ${theme.border};border-radius:10px;color:${theme.textSecondary};padding:8px 16px;cursor:pointer;font-family:'DM Sans',sans-serif;font-size:13px;display:flex;align-items:center;gap:6px;transition:all .2s;margin-bottom:20px}
.back-btn:hover{border-color:${theme.goldDim};color:${theme.cream}}
.kb-hint{font-size:11px;color:${theme.textMuted};text-align:center;margin-top:8px}
.kb-key{display:inline-block;background:${theme.surface};border:1px solid ${theme.border};border-radius:4px;padding:1px 6px;font-family:monospace;font-size:11px;margin:0 2px}
.loading{display:flex;align-items:center;justify-content:center;padding:80px;color:${theme.textMuted};gap:12px;font-size:14px}
.spinner{width:20px;height:20px;border:2px solid ${theme.border};border-top-color:${theme.gold};border-radius:50%;animation:spin .8s linear infinite}
.empty-state{text-align:center;padding:40px;color:${theme.textMuted};font-size:14px}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
::-webkit-scrollbar{width:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${theme.border};border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:${theme.textMuted}}
`;

// ─── HOME PAGE ───
function HomePage({ words, userStates, onNavigate }) {
  const totalWords = words.length;
  const practiced = userStates.length;
  const mastered = userStates.filter(u => (u.mastery_level || 0) >= 5).length;
  const dueForReview = userStates.filter(us => us.next_review_at && new Date(us.next_review_at) <= new Date()).length;
  const pct = totalWords > 0 ? Math.round((practiced / totalWords) * 100) : 0;

  const [wotd] = useState(() => {
    const withMeaning = words.filter(w => w.english_meaning);
    if (!withMeaning.length) return null;
    const dayIndex = Math.floor(Date.now() / 86400000) % withMeaning.length;
    return withMeaning[dayIndex];
  });

  return (
    <div className="home">
      <div className="home-greeting">
        <span className="bt">မင်္ဂလာပါ</span> — Welcome
      </div>
      <div className="home-sub">Your Burmese study companion. Pick up where you left off.</div>

      <div className="home-mini-stats">
        <div className="mini-stat"><div className="mini-stat-val">{totalWords}</div><div className="mini-stat-label">Words</div></div>
        <div className="mini-stat"><div className="mini-stat-val">{practiced}</div><div className="mini-stat-label">Practiced</div></div>
        <div className="mini-stat"><div className="mini-stat-val" style={{color: dueForReview > 0 ? theme.gold : theme.cream}}>{dueForReview}</div><div className="mini-stat-label">Due</div></div>
        <div className="mini-stat"><div className="mini-stat-val" style={{color: theme.green}}>{mastered}</div><div className="mini-stat-label">Mastered</div></div>
      </div>

      <div className="home-cta">
        <button className="cta-btn primary" onClick={() => onNavigate('flashcards')}>{Icons.play} Start Flashcards</button>
        <button className="cta-btn secondary" onClick={() => onNavigate('stats')}>{Icons.stats} View Progress</button>
      </div>

      {wotd && (
        <div className="home-wotd">
          <div className="wotd-label">Word of the Day</div>
          <div className="wotd-burmese">{wotd.burmese_word}</div>
          <div className="wotd-devanagari">{toDevanagari(wotd.burmese_word)}</div>
          <div className="wotd-roman">{toRoman(wotd.burmese_word)}</div>
          <div className="wotd-meaning">{wotd.english_meaning}</div>
        </div>
      )}

      <div className="home-progress">
        <div className="home-progress-label"><span>Overall Progress</span><span>{pct}%</span></div>
        <div className="home-progress-track"><div className="home-progress-fill" style={{width:`${pct}%`}}/></div>
      </div>
    </div>
  );
}

// ─── STATS PAGE ───
function StatsPage({ words, anchors, userStates, events }) {
  const totalWords = words.length;
  const totalAnchors = anchors.length;
  const masteryMap = {};
  userStates.forEach(us => { const l = us.mastery_level||0; masteryMap[l]=(masteryMap[l]||0)+1; });
  const practiced = userStates.length;
  const unseen = totalWords - practiced;
  const dueForReview = userStates.filter(us => us.next_review_at && new Date(us.next_review_at) <= new Date()).length;
  const totalCorrect = userStates.reduce((s,u) => s+(u.correct_count||0), 0);
  const totalAttempts = userStates.reduce((s,u) => s+(u.correct_count||0)+(u.incorrect_count||0), 0);
  const accuracy = totalAttempts > 0 ? Math.round((totalCorrect/totalAttempts)*100) : 0;
  const streak = userStates.reduce((max,u) => Math.max(max, u.streak||0), 0);
  const recentEvents = events.slice(0, 10);
  const masteryLevels = [
    {level:0,label:"Unseen",color:theme.textMuted+"40",count:unseen},
    {level:1,label:"New",color:"#ef4444",count:masteryMap[1]||0},
    {level:2,label:"Learning",color:"#f97316",count:masteryMap[2]||0},
    {level:3,label:"Familiar",color:"#eab308",count:masteryMap[3]||0},
    {level:4,label:"Known",color:"#22c55e",count:masteryMap[4]||0},
    {level:5,label:"Mastered",color:"#06b6d4",count:masteryMap[5]||0},
  ];
  function timeSince(d){const mins=Math.floor((new Date()-new Date(d))/60000);if(mins<1)return"just now";if(mins<60)return mins+"m ago";const hrs=Math.floor(mins/60);if(hrs<24)return hrs+"h ago";return Math.floor(hrs/24)+"d ago";}

  return (
    <div>
      <div className="page-header"><div className="page-title">Progress & Stats</div><div className="page-subtitle">Detailed view of your learning journey</div></div>
      <div className="stats-grid">
        {[
          {label:"Total Words",value:totalWords,sub:`${totalAnchors} anchor groups`,icon:"📚"},
          {label:"Due for Review",value:dueForReview,sub:"words ready to review",icon:"🔄"},
          {label:"Accuracy",value:`${accuracy}%`,sub:`${totalAttempts} total attempts`,icon:"🎯"},
          {label:"Best Streak",value:streak,sub:"consecutive correct",icon:"🔥"},
        ].map((s,i) => (
          <div className="stat-card" key={i} style={{animationDelay:`${i*.08}s`}}>
            <div className="stat-icon">{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value">{s.value}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </div>
      <div className="section">
        <div className="section-title">Mastery Breakdown<span className="section-title-line"/></div>
        <div className="mastery-bar-container">
          <div style={{fontSize:"13px",color:theme.textSecondary}}>{practiced} of {totalWords} words practiced ({Math.round((practiced/Math.max(totalWords,1))*100)}%)</div>
          <div className="mastery-bar">
            {masteryLevels.map(m => m.count > 0 && (
              <div key={m.level} className="mastery-segment" style={{width:`${(m.count/Math.max(totalWords,1))*100}%`,background:m.color}}>
                {m.count > totalWords * 0.05 ? m.count : ""}
              </div>
            ))}
          </div>
          <div className="mastery-legend">{masteryLevels.map(m => (
            <div className="legend-item" key={m.level}><div className="legend-dot" style={{background:m.color}}/>{m.label}: {m.count}</div>
          ))}</div>
        </div>
      </div>
      {recentEvents.length > 0 && (
        <div className="section">
          <div className="section-title">Recent Activity<span className="section-title-line"/></div>
          <div className="activity-list">
            {recentEvents.map((evt,i) => {
              const word = words.find(w => w.id === evt.word_id);
              return (
                <div className="activity-item" key={i}>
                  <div className="activity-dot" style={{background:evt.result==="correct"?theme.green:theme.red}}/>
                  <span className="activity-word">{word?.burmese_word||"—"}</span>
                  <span>{word?.english_meaning||evt.event_type}</span>
                  <span style={{color:evt.result==="correct"?theme.green:theme.red}}>{evt.result||"—"}</span>
                  <span className="activity-time">{timeSince(evt.created_at)}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Flashcard Setup ───
function FlashcardSetup({ words, anchors, onStart, onBack }) {
  const [mode, setMode] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [cardCount, setCardCount] = useState(10);

  function handleStart() {
    let pool = [...words];
    if (mode === "group" && selectedGroup) {
      const anchor = anchors.find(a => a.burmese_word === selectedGroup);
      if (anchor) pool = words.filter(w => w.burmese_word.startsWith(anchor.burmese_word) || w.first_consonant_id === anchor.consonant_id);
    }
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random()*(i+1)); [pool[i],pool[j]]=[pool[j],pool[i]]; }
    onStart(pool.slice(0, cardCount));
  }

  const topAnchors = anchors.filter(a => (a.word_count||0) >= 2).sort((a,b) => (b.word_count||0)-(a.word_count||0)).slice(0,30);

  return (
    <div>
      <button className="back-btn" onClick={onBack}>← Back</button>
      <div className="flashcard-setup">
        <div className="page-header" style={{textAlign:"center"}}><div className="page-title">Flashcards</div><div className="page-subtitle">Choose how to study</div></div>
        <div className={`setup-option ${mode==="random"?"selected":""}`} onClick={()=>{setMode("random");setSelectedGroup(null);}}>
          <div><div className="setup-option-label">{Icons.shuffle} Random Shuffle</div><div className="setup-option-desc">Random selection from all words</div></div>
          <div className="setup-count">{words.length}</div>
        </div>
        <div className={`setup-option ${mode==="group"?"selected":""}`} onClick={()=>setMode("group")}>
          <div><div className="setup-option-label">📂 By Hub Group</div><div className="setup-option-desc">Focus on a specific anchor group</div></div>
          <div className="setup-count">{topAnchors.length}</div>
        </div>
        {mode === "group" && (
          <div className="group-grid">{topAnchors.map(a => (
            <div key={a.id} className={`group-chip ${selectedGroup===a.burmese_word?"selected":""}`} onClick={()=>setSelectedGroup(a.burmese_word)}>
              <div className="group-chip-word">{a.burmese_word}</div>
              <div className="group-chip-count">{a.word_count||0} words</div>
            </div>
          ))}</div>
        )}
        <div style={{textAlign:"center",marginTop:24}}>
          <div style={{fontSize:13,color:theme.textSecondary,marginBottom:8}}>How many cards?</div>
          <div className="count-selector">{[5,10,20,50].map(n => (
            <button key={n} className={`count-btn ${cardCount===n?"selected":""}`} onClick={()=>setCardCount(n)}>{n}</button>
          ))}</div>
        </div>
        <button className="start-btn" disabled={!mode||(mode==="group"&&!selectedGroup)} onClick={handleStart}>Start Studying →</button>
      </div>
    </div>
  );
}

// ─── Flashcard Session ───
function FlashcardSession({ cards, onBack }) {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState([]);
  const [done, setDone] = useState(false);
  const card = cards[index];

  useEffect(() => {
    function handleKey(e) {
      if (done) return;
      if (e.code==="Space"){e.preventDefault();setFlipped(f=>!f);}
      if (e.code==="ArrowRight"||e.code==="KeyK") handleResult("correct");
      if (e.code==="ArrowLeft"||e.code==="KeyJ") handleResult("incorrect");
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [index, done]);

  async function handleResult(result) {
    const newResults = [...results, { word: card, result }];
    setResults(newResults);
    try {
      await supaInsert("burmese_app_progress_events", {
        event_type:"flashcard", word_id:card.id, word_type:"word", result,
        metadata:{session_index:index, total_cards:cards.length},
      });
    } catch(e){ console.error("Failed to log:", e); }
    if (index+1 >= cards.length) { setDone(true); } else { setIndex(index+1); setFlipped(false); }
  }

  if (done) {
    const correct = results.filter(r=>r.result==="correct").length;
    const incorrect = results.filter(r=>r.result==="incorrect").length;
    const missed = results.filter(r=>r.result==="incorrect");
    return (
      <div className="session-complete">
        <div style={{fontSize:64,marginBottom:20}}>🎉</div>
        <div className="complete-title">Session Complete!</div>
        <div className="complete-stats">
          <div className="complete-stat"><div className="complete-stat-val" style={{color:theme.green}}>{correct}</div><div className="complete-stat-label">Correct</div></div>
          <div className="complete-stat"><div className="complete-stat-val" style={{color:theme.red}}>{incorrect}</div><div className="complete-stat-label">Missed</div></div>
          <div className="complete-stat"><div className="complete-stat-val" style={{color:theme.gold}}>{results.length>0?Math.round((correct/results.length)*100):0}%</div><div className="complete-stat-label">Accuracy</div></div>
        </div>
        {missed.length > 0 && (
          <div className="missed-words">
            <div className="missed-words-title">Words to Review</div>
            {missed.map((m,i)=>(
              <div className="missed-word-item" key={i}>
                <div>
                  <span style={{fontFamily:"'Noto Sans Myanmar',sans-serif",fontSize:16,color:theme.cream}}>{m.word.burmese_word}</span>
                  <span style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:14,color:theme.gold,marginLeft:10}}>{toDevanagari(m.word.burmese_word)}</span>
                </div>
                <span style={{color:theme.textSecondary}}>{m.word.english_meaning||"—"}</span>
              </div>
            ))}
          </div>
        )}
        <button className="start-btn" style={{maxWidth:300,margin:"20px auto"}} onClick={onBack}>Back to Home</button>
      </div>
    );
  }

  const devText = toDevanagari(card.burmese_word);
  const romanText = toRoman(card.burmese_word);

  return (
    <div className="flashcard-arena">
      <div className="progress-bar-track"><div className="progress-bar-fill" style={{width:`${(index/cards.length)*100}%`}}/></div>
      <div className="flashcard-counter">Card {index+1} of {cards.length}</div>
      <div className="flashcard-wrapper" onClick={()=>setFlipped(!flipped)}>
        <div className={`flashcard-inner ${flipped?"flipped":""}`}>
          <div className="flashcard-face flashcard-front">
            <div className="flashcard-burmese">{card.burmese_word}</div>
            <div className="flashcard-devanagari">{devText}</div>
            <div className="flashcard-roman">{romanText}</div>
            <div className="flashcard-hint">{Icons.rotate} <span>Tap to reveal meaning</span></div>
          </div>
          <div className="flashcard-face flashcard-back">
            <div style={{fontFamily:"'Noto Sans Myanmar',sans-serif",fontSize:28,color:theme.gold,marginBottom:4}}>{card.burmese_word}</div>
            <div style={{fontFamily:"'Noto Sans Devanagari',sans-serif",fontSize:18,color:theme.goldLight,marginBottom:12}}>{devText}</div>
            <div className="flashcard-meaning">{card.english_meaning||"—"}</div>
            {card.hint && <div className="flashcard-meta">💡 {card.hint}</div>}
            {card.sentence && <div className="flashcard-meta" style={{marginTop:8,fontFamily:"'Noto Sans Myanmar',sans-serif"}}>{card.sentence}</div>}
          </div>
        </div>
      </div>
      <div className="flashcard-actions">
        <button className="fc-action wrong" onClick={()=>handleResult("incorrect")} title="Don't know (← or J)">{Icons.x}</button>
        <button className="fc-action flip" onClick={()=>setFlipped(!flipped)} title="Flip (Space)">{Icons.rotate}</button>
        <button className="fc-action right" onClick={()=>handleResult("correct")} title="Know it (→ or K)">{Icons.check}</button>
      </div>
      <div className="kb-hint">
        <span className="kb-key">Space</span> flip<span style={{margin:"0 8px"}}>·</span>
        <span className="kb-key">←</span> don't know<span style={{margin:"0 8px"}}>·</span>
        <span className="kb-key">→</span> know it
      </div>
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [page, setPage] = useState("home");
  const [words, setWords] = useState([]);
  const [anchors, setAnchors] = useState([]);
  const [userStates, setUserStates] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [flashcardCards, setFlashcardCards] = useState(null);

  useEffect(() => { loadData(); }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [w,a,us,ev] = await Promise.all([
        supaFetch("burmese_app_words","select=*&is_filler=not.is.true&order=id&limit=2000"),
        supaFetch("burmese_app_anchor_words","select=*&order=word_count.desc.nullslast&limit=500"),
        supaFetch("burmese_app_user_state","select=*&order=last_practiced_at.desc.nullslast&limit=2000"),
        supaFetch("burmese_app_progress_events","select=*&order=created_at.desc&limit=50"),
      ]);
      setWords(w); setAnchors(a); setUserStates(us); setEvents(ev);
    } catch(e){ setError(e.message); }
    setLoading(false);
  }

  function navigate(p){ setPage(p); setFlashcardCards(null); }

  const sidebarItems = [
    {id:"home",icon:Icons.home,label:"Home"},
    {id:"flashcards",icon:Icons.cards,label:"Cards"},
    {id:"quiz",icon:Icons.quiz,label:"Quiz"},
    {id:"match",icon:Icons.match,label:"Match"},
    {id:"write",icon:Icons.write,label:"Write"},
    {id:"stats",icon:Icons.stats,label:"Stats"},
  ];

  return (
    <div className="app">
      <style>{styles}</style>
      <div className="sidebar">
        <div className="sidebar-logo">မ</div>
        {sidebarItems.map(item => (
          <button key={item.id} className={`sidebar-btn ${page===item.id?"active":""}`} onClick={()=>navigate(item.id)} title={item.label}>
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>{item.icon}<span className="sidebar-label">{item.label}</span></div>
          </button>
        ))}
      </div>
      <div className="main">
        {loading ? (
          <div className="loading"><div className="spinner"/>Loading your study data...</div>
        ) : error ? (
          <div className="loading" style={{color:theme.red}}>⚠ Error: {error}</div>
        ) : (
          <>
            {page==="home" && <HomePage words={words} userStates={userStates} onNavigate={navigate}/>}
            {page==="stats" && <StatsPage words={words} anchors={anchors} userStates={userStates} events={events}/>}
            {page==="flashcards" && !flashcardCards && <FlashcardSetup words={words} anchors={anchors} onStart={cards=>setFlashcardCards(cards)} onBack={()=>navigate("home")}/>}
            {page==="flashcards" && flashcardCards && <FlashcardSession cards={flashcardCards} onBack={()=>{navigate("home");loadData();}}/>}
            {["quiz","match","write"].includes(page) && (
              <div>
                <button className="back-btn" onClick={()=>navigate("home")}>← Back</button>
                <div className="empty-state" style={{paddingTop:100}}>
                  <div style={{fontSize:48,marginBottom:16}}>🚧</div>
                  <div style={{fontFamily:"'Cormorant Garamond',serif",fontSize:28,color:theme.cream,marginBottom:8}}>Coming Soon</div>
                  <div>This mode is under development. Start with Flashcards!</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
