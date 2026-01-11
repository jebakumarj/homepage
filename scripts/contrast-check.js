const fs = require('fs');
const path = require('path');

function parseVars(css){
  const blocks = {};
  // capture :root { ... } and .light-theme { ... } and .dark-theme
  const re = /(:root|\.light-theme|\.dark-theme)\s*\{([\s\S]*?)\}/g;
  let m;
  while((m = re.exec(css))){
    const name = m[1].trim();
    const body = m[2];
    const vars = {};
    body.split(/;\s*/).forEach(line=>{
      const r = line.match(/--([a-zA-Z0-9-_]+)\s*:\s*([^;\n]+)/);
      if(r){ vars['--'+r[1].trim()] = r[2].trim(); }
    });
    blocks[name] = vars;
  }
  return blocks;
}

function clamp(v,min,max){ return Math.max(min, Math.min(max, v)); }
function hexToRgb(hex){
  if(!hex) return null;
  let h = String(hex).trim().replace('#','');
  if(h.length === 3) h = h.split('').map(c=>c+c).join('');
  if(h.length !== 6) return null;
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}
function parseRgbFunc(s){
  const m = s.match(/rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if(m) return { r:+m[1], g:+m[2], b:+m[3] };
  return null;
}
function parseHsl(s){
  const m = s.match(/hsl\(\s*([\d.]+)deg\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if(!m) return null;
  const h=+m[1], sP=+m[2]/100, l=+m[3]/100;
  // convert to rgb
  const c = (1 - Math.abs(2*l -1)) * sP;
  const x = c * (1 - Math.abs((h / 60) % 2 -1));
  const m2 = l - c/2;
  let r1=0,g1=0,b1=0;
  if(h<60){ r1=c; g1=x; b1=0; }
  else if(h<120){ r1=x; g1=c; b1=0; }
  else if(h<180){ r1=0; g1=c; b1=x; }
  else if(h<240){ r1=0; g1=x; b1=c; }
  else if(h<300){ r1=x; g1=0; b1=c; }
  else { r1=c; g1=0; b1=x; }
  return { r: Math.round((r1+m2)*255), g: Math.round((g1+m2)*255), b: Math.round((b1+m2)*255) };
}
function parseColor(str){
  if(!str) return null;
  const s = String(str).trim();
  if(s.startsWith('#')) return hexToRgb(s);
  if(s.toLowerCase().startsWith('rgba')){
    const m = s.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*([\d.]+)\s*\)/i);
    if(m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]), a: Number(m[4]) };
    return null;
  }
  if(s.toLowerCase().startsWith('rgb')) return parseRgbFunc(s);
  if(s.toLowerCase().startsWith('hsl')) return parseHsl(s);
  return null;
}

function luminance(rgb){
  const srgb = [rgb.r/255, rgb.g/255, rgb.b/255].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  return 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
}
function contrast(rgb1, rgb2){
  const L1 = luminance(rgb1);
  const L2 = luminance(rgb2);
  const hi = Math.max(L1,L2), lo = Math.min(L1,L2);
  return (hi + 0.05) / (lo + 0.05);
}

const css = fs.readFileSync(path.join(__dirname,'..','styles.css'),'utf8');
const vars = parseVars(css);
const root = vars[':root'] || {};
const light = vars['.light-theme'] || {};
const dark = vars['.dark-theme'] || {};

function get(name, theme){
  const t = theme === 'light' ? light : root;
  return t[name] || root[name] || null;
}

function checkTheme(theme){
  console.log('\n=== Theme:', theme, '===');
  const raw = {
    bg: get('--bg', theme),
    card: get('--card', theme),
    badgeBg: get('--badge-bg', theme),
    badgeText: get('--badge-text', theme),
    filterText: get('--filter-text', theme),
    filterBtnBg: get('--filter-btn-bg', theme),
    accent: get('--accent', theme),
    btnText: get('--btn-text', theme),
    panel: get('--panel-start', theme),
    title: get('--title', theme),
    muted: get('--muted', theme),
    inputBorder: get('--input-border', theme),
    panelBorder: get('--panel-border', theme)
  };
  console.log('Raw vars:', raw);
  const bg = parseColor(raw.bg);
  const card = parseColor(raw.card);
  const badgeBg = parseColor(raw.badgeBg);
  const badgeText = parseColor(raw.badgeText);
  const filterText = parseColor(raw.filterText);
  const filterBtnBg = parseColor(raw.filterBtnBg) || bg;
  const accent = parseColor(raw.accent);
  const btnText = parseColor(raw.btnText);
  const panel = parseColor(raw.panel) || card;
  const title = parseColor(raw.title);
  const muted = parseColor(raw.muted);
  const blend = (fg, bgColor) => {
    if(!fg) return null;
    if(typeof fg.a === 'number'){
      const a = fg.a;
      const bg = bgColor || {r:7,g:16,b:33};
      return { r: Math.round(fg.r*a + bg.r*(1-a)), g: Math.round(fg.g*a + bg.g*(1-a)), b: Math.round(fg.b*a + bg.b*(1-a)) };
    }
    return fg;
  };

  const safeContrast = (a,b, opts={}) => {
    if(!a || !b) return 'unparsable';
    try{
      let A = a;
      let B = b;
      if(a.a){ A = blend(a, opts.bg || bg); }
      if(b.a){ B = blend(b, opts.bg || bg); }
      return contrast(A,B).toFixed(2);
    }catch(e){ return 'error' }
  };

  console.log('BadgeBg parsed (raw):', badgeBg);
  const badgeBgFinal = badgeBg && typeof badgeBg.a === 'number' ? blend(badgeBg, bg) : badgeBg;
  console.log('BadgeText parsed:', badgeText);
  console.log('BadgeBg parsed (final):', badgeBgFinal);
  console.log('Badge label contrast:', safeContrast(badgeText, badgeBgFinal));
  const filterBtnBgFinal = (filterBtnBg && filterBtnBg.a) ? blend(filterBtnBg, bg) : filterBtnBg || bg;
  console.log('Filter label vs filter btn bg:', safeContrast(filterText, filterBtnBgFinal));
  console.log('Filter label vs page bg:', safeContrast(filterText, bg));
  console.log('Active filter (btn text vs accent):', safeContrast(btnText, accent));
  const cardBg = card && card.a ? blend(card, bg) : card;
  console.log('Card title vs card bg:', safeContrast(title, cardBg));
  const panelBg = panel && panel.a ? blend(panel, bg) : panel;
  console.log('Modal label (muted) vs panel bg:', safeContrast(muted, panelBg));
  // input border check: original used rgba(255,255,255,0.04) or 0.03; compute contrast against panel
  const inputBorder = parseColor(raw.inputBorder);
  const inputBorderFinal = inputBorder && inputBorder.a ? blend(inputBorder, panelBg) : inputBorder;
  console.log('Input border vs panel:', safeContrast(inputBorderFinal, panelBg));
  console.log('Panel border vs panel bg:', safeContrast(parseColor(raw.panelBorder), panelBg));

  // sample category colors generated by stringToColor (hsl with 70% sat, 40% lightness)
  const sampleHs = Array.from({length:12}, (_,i)=>i*30);
  let minContrastChosen = Infinity;
  sampleHs.forEach(h=>{
    const hsl = `hsl(${h}deg 70% 40%)`;
    const bgc = parseColor(hsl);
    const chosen = (function(){
      // pick white or black which gives higher contrast
      const cw = contrast({r:255,g:255,b:255}, bgc);
      const cb = contrast({r:0,g:0,b:0}, bgc);
      return cw >= cb ? {color:'#fff', c: cw} : {color:'#000', c: cb};
    })();
    if(chosen.c < minContrastChosen) minContrastChosen = chosen.c;
  });
  console.log('Min contrast for generated category icon text (best of black/white):', minContrastChosen.toFixed(2));
}

checkTheme('dark');
checkTheme('light');

console.log('\nNote: WCAG contrast threshold for normal text is 4.5. Values below this may be insufficient.');
