// Simple homepage script: store links, render cards with favicon and domain name.
const STORAGE_KEY = 'jeb_home_links_v1';
const CATS_KEY = 'jeb_home_cats_v1';
const addBtn = document.getElementById('addBtn');
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modalTitle');
const submitBtn = document.getElementById('submitBtn');
const cancelBtn = document.getElementById('cancelBtn');
const addForm = document.getElementById('addForm');
const urlInput = document.getElementById('urlInput');
const nameInput = document.getElementById('nameInput');
const categoryInput = document.getElementById('categoryInput');
const categoryList = document.getElementById('categoryList');
const linksEl = document.getElementById('links');
const contextMenu = document.getElementById('contextMenu');
const ctxEdit = document.getElementById('ctxEdit');
const ctxDelete = document.getElementById('ctxDelete');
const toastEl = document.getElementById('toast');
let toastTimeout = null;
let editingIndex = null;
let contextIndex = null;
let categories = [];
let selectedCategory = 'All';
const filterBar = document.getElementById('filterBar');
const manageModal = document.getElementById('manageModal');
const manageList = document.getElementById('manageList');
const manageClose = document.getElementById('manageClose');
const categorySuggestions = document.getElementById('categorySuggestions');
const confirmModal = document.getElementById('confirmModal');
const confirmMsg = document.getElementById('confirmMessage');
const confirmOk = document.getElementById('confirmOk');
const confirmCancel = document.getElementById('confirmCancel');
const THEME_KEY = 'jeb_theme_v1';
const themeToggle = document.getElementById('themeToggle');

// suggestion handlers
function renderCategorySuggestions(filter=''){
  if(!categorySuggestions) return;
  categorySuggestions.innerHTML = '';
  const list = (categories || []).slice().sort((a,b)=>a.name.localeCompare(b.name));
  if(links && links.some && links.some(l=> (l.category||'Uncategorized') === 'Uncategorized') && !list.some(c=>c.name==='Uncategorized')){
    list.unshift({name:'Uncategorized', color: stringToColor('Uncategorized'), icon: 'U'});
  }
  const matches = list.filter(c => (c.name || '').toLowerCase().includes(String(filter || '').toLowerCase()));
  matches.forEach(c=>{
    const item = document.createElement('div');
    item.className = 'category-item';
    const dot = document.createElement('span'); dot.className='dot'; dot.style.background = c.color || stringToColor(c.name);
    const icon = document.createElement('span'); icon.className='icon'; icon.textContent = c.icon || (c.name[0]||'?');
    // ensure icon text contrasts with background
    icon.style.color = getContrastingTextColor(c.color || stringToColor(c.name));
    const label = document.createElement('span'); label.className='label'; label.textContent = c.name;
    item.appendChild(dot); item.appendChild(icon); item.appendChild(label);
    item.addEventListener('click', ()=>{ if(categoryInput) categoryInput.value = c.name; categorySuggestions.classList.add('hidden'); });
    categorySuggestions.appendChild(item);
  });
  if(!categorySuggestions.children || categorySuggestions.children.length === 0){
    const none = document.createElement('div'); none.className = 'category-item'; none.textContent = 'No categories'; categorySuggestions.appendChild(none);
  }
}

if(categoryInput){
  categoryInput.addEventListener('focus', ()=>{ renderCategorySuggestions(''); if(categorySuggestions) categorySuggestions.classList.remove('hidden'); });
  categoryInput.addEventListener('input', (e)=>{ renderCategorySuggestions(e.target.value); if(categorySuggestions) categorySuggestions.classList.remove('hidden'); });
}

if(typeof document !== 'undefined'){
  document.addEventListener('click', (e)=>{ if(categorySuggestions && !categorySuggestions.contains(e.target) && e.target !== categoryInput) categorySuggestions.classList.add('hidden'); });
}

function renderFilterBar(){
  filterBar.innerHTML = '';
  const allBtn = document.createElement('button');
  allBtn.className = 'filter-btn' + (selectedCategory==='All' ? ' active' : '');
  // render 'All' as a badge for consistent visuals with other category chips
  const allBadge = document.createElement('span'); allBadge.className = 'badge';
  const allDot = document.createElement('span'); allDot.className = 'dot'; allDot.classList.add('hidden');
  const allIcon = document.createElement('span'); allIcon.className = 'icon'; allIcon.textContent = '★'; allIcon.classList.add('small');
  const allLabel = document.createElement('span'); allLabel.className = 'label'; allLabel.textContent = 'All';
  allBadge.appendChild(allDot); allBadge.appendChild(allIcon); allBadge.appendChild(allLabel);
  allBtn.appendChild(allBadge);
  allBtn.addEventListener('click', ()=>{ selectedCategory = 'All'; renderFilterBar(); render(); });
  filterBar.appendChild(allBtn);

  const names = new Set(categories.map(c=>c.name));
  // include Uncategorized if any link uses it
  if(links.some(l=> (l.category||'Uncategorized') === 'Uncategorized')) names.add('Uncategorized');
  const sorted = [...names].sort();
  sorted.forEach(cat =>{
    const b = document.createElement('button');
    b.className = 'filter-btn' + (selectedCategory===cat ? ' active' : '');
    const catObj = categories.find(c=>c.name===cat) || {name:cat, color: stringToColor(cat), icon: (cat[0]||'?')};
    const badge = document.createElement('span'); badge.className = 'badge';
    const dot = document.createElement('span'); dot.className='dot'; dot.style.background = catObj.color; badge.appendChild(dot);
    const icon = document.createElement('span'); icon.className='icon'; icon.textContent = catObj.icon || (cat[0]||'?');
    icon.style.color = getContrastingTextColor(catObj.color);
    badge.appendChild(icon);
    const label = document.createElement('span'); label.className='label'; label.textContent = cat; badge.appendChild(label);
    b.appendChild(badge);
    b.addEventListener('click', ()=>{ selectedCategory = cat; renderFilterBar(); render(); });
    filterBar.appendChild(b);
  });

  const actions = document.createElement('div');
  actions.className = 'filter-actions';
  const manageBtn = document.createElement('button');
  manageBtn.id = 'manageCatsBtn';
  manageBtn.textContent = 'Manage Categories';
  manageBtn.addEventListener('click', ()=>{ openManageModal(); });
  actions.appendChild(manageBtn);
  filterBar.appendChild(actions);
}


let links = [];

function load(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    links = raw ? JSON.parse(raw) : [];
  }catch(e){ links = [] }
  try{
    const rawCats = localStorage.getItem(CATS_KEY);
    categories = rawCats ? JSON.parse(rawCats) : [];
  }catch(e){ categories = [] }
  // normalize categories to ensure color and icon fields
  categories = categories.map(c => {
    if(!c) return {name:'Uncategorized', color: stringToColor('Uncategorized'), icon: 'U'};
    if(typeof c === 'string') return {name: c, color: stringToColor(c), icon: c[0] ? c[0].toUpperCase() : '?'};
    return {name: c.name || 'Uncategorized', color: c.color || stringToColor(c.name || 'Uncategorized'), icon: c.icon || (c.name && c.name[0] ? c.name[0].toUpperCase() : '?')};
  });
  renderCategoryOptions();
  renderFilterBar();
  render();
}

function save(){
  localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
}

function saveCategories(){
  localStorage.setItem(CATS_KEY, JSON.stringify(categories));
}

function renderCategoryOptions(){
  categoryList.innerHTML = '';
  const unique = [...new Set(categories.map(c=>c.name))].sort();
  unique.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c;
    categoryList.appendChild(opt);
  });

}
function normalizeUrl(value){
  try{
    // If user omits protocol, default to https
    if(!/^https?:\/\//i.test(value)) value = 'https://' + value;
    const u = new URL(value);
    return u.href;
  }catch(e){return null}
}

function domainFor(url){
  try{ return new URL(url).hostname.replace(/^www\./,'') }catch(e){return url}
}

function faviconFor(domain){
  // use Google's favicon service for simplicity
  // size param 64 for clearer icons
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=64`;
}

function stringToColor(str) {
  if (str === undefined || str === null) str = 'default';
  str = String(str);
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash) % 360;
  return `hsl(${h}deg 70% 40%)`;
}

function generateInitialsFavicon(text){
  const t = (text || '').trim();
  const initials = t ? t.split(/\s+/).map(s=>s[0]).slice(0,2).join('').toUpperCase() : '?';
  const bg = stringToColor(t || 'default');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64'><rect width='100%' height='100%' fill='${bg}' rx='8' /><text x='50%' y='55%' font-size='34' fill='white' font-family='sans-serif' font-weight='600' text-anchor='middle'>${initials}</text></svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
} 

function ensureCategoryObject(name){
  if(!name || !name.trim()) return {name: 'Uncategorized', color: stringToColor('Uncategorized'), icon: 'U'};
  const n = name.trim();
  let found = categories.find(c => c.name === n);
  if(!found){
    found = {name: n, color: stringToColor(n), icon: n[0].toUpperCase()};
    categories.push(found);
    saveCategories();
    renderCategoryOptions();
    renderFilterBar();
  }
  return found;
}

function showToast(msg, type='info', duration=800){
  if(!toastEl) return;
  toastEl.textContent = msg;
  toastEl.className = 'toast';
  if(type === 'success') toastEl.classList.add('success');
  if(type === 'error') toastEl.classList.add('error');
  if(toastTimeout) clearTimeout(toastTimeout);
  toastEl.classList.remove('hidden');
  toastTimeout = setTimeout(()=>{ toastEl.classList.add('hidden'); toastEl.className = 'toast'; }, duration);
} 

// Promise-based confirm dialog. Returns true for confirm, false for cancel.
function showConfirm(message){
  return new Promise((resolve)=>{
    // fallback to native confirm if modal not present
    if(!confirmModal || !confirmOk || !confirmCancel || !confirmMsg){
      try{ resolve(window.confirm(message)); }catch(e){ resolve(false); }
      return;
    }
    confirmMsg.textContent = message;
    confirmModal.classList.remove('hidden');
    confirmModal.setAttribute('aria-hidden','false');

    const cleanup = (result) => {
      confirmModal.classList.add('hidden');
      confirmModal.setAttribute('aria-hidden','true');
      confirmOk.removeEventListener('click', onOk);
      confirmCancel.removeEventListener('click', onCancel);
      document.removeEventListener('keydown', onKey);
      confirmModal.removeEventListener('click', onBackdrop);
      resolve(result);
    };

    const onOk = () => cleanup(true);
    const onCancel = () => cleanup(false);
    const onKey = (e) => { if(e.key === 'Escape') cleanup(false); if(e.key === 'Enter') cleanup(true); };
    const onBackdrop = (e) => { if(e.target === confirmModal) cleanup(false); };

    confirmOk.addEventListener('click', onOk);
    confirmCancel.addEventListener('click', onCancel);
    document.addEventListener('keydown', onKey);
    confirmModal.addEventListener('click', onBackdrop);
    // focus cancel by default
    confirmCancel.focus();
  });
}

// Theme helpers
function applyTheme(theme){
  const root = document.documentElement;
  root.classList.remove('light-theme','dark-theme');
  const t = theme === 'light' ? 'light' : 'dark';
  root.classList.add(t + '-theme');
  if(themeToggle){
    themeToggle.setAttribute('aria-pressed', String(t === 'dark'));
    themeToggle.textContent = t === 'dark' ? '🌙' : '☀️';
    themeToggle.title = t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
  }
  try{ localStorage.setItem(THEME_KEY, t); }catch(e){}
}

function toggleTheme(){
  const current = document.documentElement.classList.contains('dark-theme') ? 'dark' : 'light';
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
  showToast('Theme: ' + (next === 'dark' ? 'Dark' : 'Light'), 'success', 800);
}

function initTheme(){
  try{
    const saved = localStorage.getItem(THEME_KEY);
    let t = saved;
    if(!t){ t = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
    applyTheme(t);
    if(themeToggle){ themeToggle.addEventListener('click', toggleTheme); }
    document.addEventListener('keydown', (e)=>{ if(e.key.toLowerCase() === 't' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) toggleTheme(); });
  }catch(e){ console.error('Theme init error', e); }
}

// Start the live clock (updates every second). The visual time is aria-hidden to avoid noisy live region updates for screen readers.
function startClock(){
  const smallEl = document.getElementById('clock');
  const bigEl = document.getElementById('bigClock');
  if(!smallEl && !bigEl) return;
  function tick(){
    const now = new Date();
    const txt = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    const dateStr = now.toLocaleDateString([], {weekday:'long', month:'short', day:'numeric'});
    const shortDate = now.toLocaleDateString([], {weekday:'short'});
    if(smallEl){ smallEl.textContent = txt; smallEl.setAttribute('datetime', now.toISOString()); }
    if(bigEl){ bigEl.textContent = txt; bigEl.setAttribute('datetime', now.toISOString()); }
    const bigDateEl = document.getElementById('bigDate'); if(bigDateEl) bigDateEl.textContent = dateStr;
    const smallDateEl = document.getElementById('smallDate'); if(smallDateEl) smallDateEl.textContent = shortDate;
  }
  tick();
  setInterval(tick, 1000);
}

function addLink(rawUrl, titleName, categoryName){
  const normalized = normalizeUrl(rawUrl);
  if(!normalized) return {ok:false, msg:'Invalid URL'};
  const domain = domainFor(normalized);
  // avoid duplicates based on domain+url
  if(links.some(l=>l.url===normalized)) return {ok:false,msg:'URL already exists'};
  const title = (titleName && titleName.trim()) ? titleName.trim() : domain;
  const catObj = ensureCategoryObject(categoryName);
  const entry = {url:normalized, domain, title, category: catObj.name, created: Date.now()};
  // append to the end so new cards appear at the right/last position
  links.push(entry);
  save();
  render();
  // scroll the newly added card into view at the end (align to right if possible)
  try{
    const cards = linksEl.querySelectorAll('.card');
    const last = cards && cards.length ? cards[cards.length - 1] : null;
    if(last && last.scrollIntoView) last.scrollIntoView({behavior:'smooth', block:'nearest', inline:'nearest'});
  }catch(e){}
  showToast('Added "' + title + '"', 'success');
  return {ok:true};
}

function removeLink(idx){
  links.splice(idx,1);
  save();
  closeContextMenu();
  render();
}

function openModal(){ editingIndex = null; modalTitle.textContent = 'Add a new URL'; submitBtn.textContent = 'Add'; categoryInput.value = ''; modal.classList.remove('hidden'); urlInput.focus(); }
function openEditModal(index){ const l = links[index]; if(!l) return; editingIndex = index; modalTitle.textContent = 'Edit URL'; submitBtn.textContent = 'Save'; nameInput.value = l.title || ''; urlInput.value = l.url; categoryInput.value = l.category || ''; modal.classList.remove('hidden'); urlInput.focus(); }
function closeModal(){ modal.classList.add('hidden'); addForm.reset(); editingIndex = null; modalTitle.textContent = 'Add a new URL'; submitBtn.textContent = 'Add'; }

function openContextMenu(x,y,index){ contextIndex = index; contextMenu.style.left = x + 'px'; contextMenu.style.top = y + 'px'; contextMenu.classList.remove('hidden'); contextMenu.setAttribute('aria-hidden','false'); }
function closeContextMenu(){ contextIndex = null; contextMenu.classList.add('hidden'); contextMenu.setAttribute('aria-hidden','true'); }

function render(){
  try{
    linksEl.innerHTML = '';
    if(!links || links.length === 0){
      linksEl.innerHTML = `<div class="card" style="pointer-events:none"><p class="title">No links yet</p><p class="url">Click \"Add URL\" to add your favorite sites.</p></div>`;
      return;
    }

  // flat grid: render all cards in a single grid (optionally filtered)
  const grid = document.createElement('div');
  grid.className = 'grid';

  // grid-level dragover/drop: compute insertion based on horizontal pointer (left-to-right layout)
  grid.addEventListener('dragover', (e)=>{
    e.preventDefault();
    const afterEl = getDragAfterElement(grid, e.clientX, 'x');
    grid.querySelectorAll('.card').forEach(c=>c.classList.remove('drag-over'));
    if(afterEl) afterEl.classList.add('drag-over');
  });
  grid.addEventListener('drop', (e)=>{
    e.preventDefault();
    const from = Number(e.dataTransfer.getData('text/plain'));
    if(isNaN(from)) return;
    const afterEl = getDragAfterElement(grid, e.clientX, 'x');
    let to;
    if(!afterEl){
      to = links.length; // append to end
    } else {
      to = Number(afterEl.dataset.idx);
    }
    moveLink(from, to);
    grid.querySelectorAll('.card.drag-over').forEach(c=>c.classList.remove('drag-over'));
  });

  links.forEach((l, idx) => {
    // apply filter if selected
    if(selectedCategory && selectedCategory !== 'All' && selectedCategory !== (l.category || 'Uncategorized')) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.tabIndex = 0;
    const titleText = l.title || l.domain;
    card.setAttribute('role','link');
    card.setAttribute('aria-label', `${titleText} - ${l.url}`);

    // open link
    card.addEventListener('click', () => { const w = window.open(l.url, '_blank'); if(w) w.opener = null; });
    card.addEventListener('keydown', (e)=>{ if(e.key === 'Enter') { const w = window.open(l.url, '_blank'); if(w) w.opener = null; } });

    // draggable handlers
    card.setAttribute('draggable','true');
    card.dataset.idx = idx;
    card.addEventListener('dragstart', (e)=>{ try{ e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(idx)); }catch(err){} card.classList.add('dragging'); card.setAttribute('aria-grabbed','true'); });
    card.addEventListener('dragend', ()=>{ card.classList.remove('dragging'); card.removeAttribute('aria-grabbed'); grid.querySelectorAll('.card.drag-over').forEach(c=>c.classList.remove('drag-over')); });

    // keyboard reordering (Ctrl/Cmd + ArrowUp/Down)
    card.addEventListener('keydown', (e)=>{
      if((e.ctrlKey || e.metaKey) && (e.key === 'ArrowUp' || e.key === 'ArrowLeft')){ e.preventDefault(); moveLink(idx, idx - 1); }
      if((e.ctrlKey || e.metaKey) && (e.key === 'ArrowDown' || e.key === 'ArrowRight')){ e.preventDefault(); moveLink(idx, idx + 1); }
    });

    const fav = document.createElement('div');
    fav.className = 'favicon';
    const img = document.createElement('img');
    img.alt = titleText;
    img.src = faviconFor(l.domain);
    img.onerror = () => { img.onerror = null; img.src = generateInitialsFavicon(titleText); };
    fav.appendChild(img);

    const title = document.createElement('p');
    title.className = 'title';
    title.textContent = titleText;

    // right-click context menu
    card.addEventListener('contextmenu', (ev)=>{ ev.preventDefault(); openContextMenu(ev.pageX, ev.pageY, idx); });

    // category icon on card
    const catObjOnCard = categories.find(c=>c.name===l.category) || {color:stringToColor(l.category), icon:(l.category && l.category[0])||'?'};
    const cIcon = document.createElement('span');
    cIcon.className = 'cat-icon';
    cIcon.textContent = catObjOnCard.icon || (l.category && l.category[0] || '?');
    cIcon.style.background = catObjOnCard.color;
    cIcon.style.color = getContrastingTextColor(catObjOnCard.color);

    card.appendChild(cIcon);
    card.appendChild(fav);
    card.appendChild(title);

    grid.appendChild(card);
  });

  linksEl.appendChild(grid);
  }catch(err){ console.error('Render error:', err); }
}

// Move a link from one index to another and persist
function moveLink(fromIdx, toIdx){
  if(typeof fromIdx !== 'number' || isNaN(fromIdx) || fromIdx < 0 || fromIdx >= links.length) return;
  if(typeof toIdx !== 'number' || isNaN(toIdx)) toIdx = links.length - 1;
  if(toIdx < 0) toIdx = 0;
  if(toIdx > links.length) toIdx = links.length;
  if(fromIdx === toIdx || fromIdx === (toIdx - 1)) return; // no-op if position unchanged
  const [item] = links.splice(fromIdx,1);
  // adjust insertion index when removing earlier element
  if(toIdx > fromIdx) toIdx--;
  links.splice(toIdx,0,item);
  save();
  render();
  try{ showToast('Moved "' + (item.title || item.domain) + '"', 'success', 800); }catch(e){}
}

// Helper to get the drag-after element inside a container based on pointer position
function getDragAfterElement(container, coord, axis='y'){
  const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
  let closest = {offset: Number.NEGATIVE_INFINITY, element: null};
  draggableElements.forEach(child =>{
    const box = child.getBoundingClientRect();
    const center = axis === 'x' ? (box.left + box.width/2) : (box.top + box.height/2);
    const offset = coord - center;
    // if offset < 0 pointer is before element center; we want the closest negative offset
    if(offset < 0 && offset > closest.offset){ closest = {offset, element: child}; }
  });
  return closest.element;
}

// events
addBtn.addEventListener('click', openModal);
cancelBtn.addEventListener('click', closeModal);
modal.addEventListener('click', (e)=>{ if(e.target === modal) closeModal(); });
function updateLink(idx, rawUrl, titleName, categoryName){
  const normalized = normalizeUrl(rawUrl);
  if(!normalized) return {ok:false, msg:'Invalid URL'};
  const domain = domainFor(normalized);
  if(links.some((l, i) => l.url === normalized && i !== idx)) return {ok:false, msg:'URL already exists'};
  const title = (titleName && titleName.trim()) ? titleName.trim() : domain;
  const catObj = ensureCategoryObject(categoryName);
  links[idx] = {...links[idx], url: normalized, domain, title, category: catObj.name};
  save();
  render();
  return {ok:true};
}

addForm.addEventListener('submit', (e)=>{
  e.preventDefault();
  const v = urlInput.value.trim();
  const nameVal = nameInput ? nameInput.value.trim() : '';
  const catVal = categoryInput ? categoryInput.value.trim() : '';
  if(editingIndex === null){
    const res = addLink(v, nameVal, catVal);
    if(!res.ok){ showToast(res.msg || 'Could not add', 'error'); return; }
    showToast('Added "' + (nameVal || v) + '"', 'success');
  } else {
    const res = updateLink(editingIndex, v, nameVal, catVal);
    if(!res.ok){ showToast(res.msg || 'Could not update', 'error'); return; }
    showToast('Updated "' + (nameVal || v) + '"', 'success');
  }
  closeModal();
});

// keyboard shortcuts: N to add, Escape to close modal
document.addEventListener('keydown', (e)=>{
  if(e.key === 'Escape' && !modal.classList.contains('hidden')) { closeModal(); closeContextMenu(); return; }
  if(e.key.toLowerCase() === 'n' && !modal.classList.contains('hidden')) return;
  if(e.key.toLowerCase() === 'n' && !['INPUT','TEXTAREA'].includes(document.activeElement.tagName)) openModal();
});

// context menu handlers
ctxEdit.addEventListener('click', (e)=>{ e.stopPropagation(); if(contextIndex !== null) { openEditModal(contextIndex); } closeContextMenu(); });
ctxDelete.addEventListener('click', async (e)=>{ e.stopPropagation(); if(contextIndex !== null){ const ok = await showConfirm('Remove this link?'); if(ok) removeLink(contextIndex); } closeContextMenu(); });

// hide context menu when clicking elsewhere
document.addEventListener('click', (e)=>{ if(!contextMenu.contains(e.target)) closeContextMenu(); });

// also hide on scroll
document.addEventListener('scroll', closeContextMenu, true);

function openManageModal(){ manageModal.classList.remove('hidden'); populateManageList(); }
function closeManageModal(){ manageModal.classList.add('hidden'); }
manageClose.addEventListener('click', ()=>{ closeManageModal(); });
manageModal.addEventListener('click', (e)=>{ if(e.target === manageModal) closeManageModal(); });

function populateManageList(){
  manageList.innerHTML = '';
  // add new category row
  const addRow = document.createElement('div');
  addRow.className = 'manage-item';
  const addName = document.createElement('input'); addName.type='text'; addName.placeholder='Category name';
  const addIcon = document.createElement('input'); addIcon.type='text'; addIcon.placeholder='icon (emoji or char)'; addIcon.classList.add('small-input');
  const addColor = document.createElement('input'); addColor.type = 'color'; addColor.value = '#60a5fa';
  const addBtn = document.createElement('button'); addBtn.className = 'small-btn'; addBtn.textContent='Add';
  addBtn.addEventListener('click', ()=>{
    const name = addName.value.trim(); if(!name){ showToast('Name required', 'error'); return; }
    if(categories.some(c=>c.name === name)){ showToast('Category already exists', 'error'); return; }
    const iconVal = addIcon.value.trim() || name[0].toUpperCase();
    const hsl = hexToHsl(addColor.value);
    categories.push({name, color: hsl, icon: iconVal});
    saveCategories(); renderCategoryOptions(); renderFilterBar(); render(); populateManageList();
    addName.value=''; addIcon.value=''; addColor.value='#60a5fa';
    showToast('Category added', 'success');
  });
  addRow.appendChild(addName); addRow.appendChild(addIcon); addRow.appendChild(addColor); addRow.appendChild(addBtn);
  manageList.appendChild(addRow);

  categories.forEach((c, idx)=>{
    const item = document.createElement('div');
    item.className = 'manage-item';
    const input = document.createElement('input');
    input.type = 'text';
    input.value = c.name;
    const iconInput = document.createElement('input'); iconInput.type='text'; iconInput.value = c.icon || (c.name[0]||'?'); iconInput.title = 'Icon'; iconInput.classList.add('small-input');
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = hslToHex(c.color);
    colorInput.title = 'Change color';

    const saveBtn = document.createElement('button');
    saveBtn.className = 'small-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', ()=>{
      const newName = input.value.trim() || 'Uncategorized';
      const newColor = colorInput.value;
      const newIcon = iconInput.value.trim() || (newName[0]||'?');
      // rename across categories
      const oldName = c.name;
      // prevent duplicate names
      if(categories.some((cc,i)=>cc.name === newName && i !== idx)) { showToast('Category name already exists', 'error'); return; }
      categories[idx].name = newName;
      categories[idx].color = hexToHsl(newColor);
      categories[idx].icon = newIcon;
      // update links
      links = links.map(l => l.category === oldName ? {...l, category: newName} : l);
      saveCategories(); save(); renderCategoryOptions(); renderFilterBar(); render(); populateManageList();
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'small-btn';
    delBtn.textContent = 'Delete';
    delBtn.addEventListener('click', async ()=>{
      const ok = await showConfirm(`Delete category '${c.name}'? Confirm = delete links; Cancel = move links to 'Uncategorized'`);
      if(!ok){
        // move links to Uncategorized
        links = links.map(l => l.category === c.name ? {...l, category: 'Uncategorized'} : l);
      } else {
        // delete links in this category
        links = links.filter(l => l.category !== c.name);
      }
      categories.splice(idx,1);
      saveCategories(); save(); renderCategoryOptions(); renderFilterBar(); render(); populateManageList();
      showToast('Category deleted', 'success');
    });

    item.appendChild(input);
    item.appendChild(iconInput);
    item.appendChild(colorInput);
    item.appendChild(saveBtn);
    item.appendChild(delBtn);
    manageList.appendChild(item);
  });
}

// helpers to convert between hsl css string and hex for color input
function hslToHex(hsl){
  // hsl like 'hsl(120deg 70% 40%)' -> convert to hex approximately
  try{
    const m = hsl.match(/hsl\((\d+)deg\s+(\d+)%\s+(\d+)%\)/);
    if(!m) return '#999999';
    const h = Number(m[1]), s = Number(m[2])/100, l = Number(m[3])/100;
    // convert HSL to RGB
    const a = s * Math.min(l, 1 - l);
    const f = n => {
      const k = (n + h/30) % 12;
      const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
      return Math.round(255 * color).toString(16).padStart(2,'0');
    };
    return `#${f(0)}${f(8)}${f(4)}`;
  }catch(e){return '#999999'}
}
function hexToHsl(hex){
  // rough conversion: convert hex to rgb then to hsl string used earlier
  try{
    const r = parseInt(hex.slice(1,3),16)/255;
    const g = parseInt(hex.slice(3,5),16)/255;
    const b = parseInt(hex.slice(5,7),16)/255;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    let h=0, s=0, l=(max+min)/2;
    if(max !== min){
      const d = max-min;
      s = l > 0.5 ? d/(2-max-min) : d/(max+min);
      switch(max){
        case r: h = (g-b)/d + (g<b?6:0); break;
        case g: h = (b-r)/d + 2; break;
        case b: h = (r-g)/d + 4; break;
      }
      h = Math.round(h*60);
    }
    return `hsl(${h}deg ${Math.round(s*100)}% ${Math.round(l*100)}%)`;
  }catch(e){ return stringToColor('default') }
}

// Color parsing & contrast helpers
function hexToRgb(hex){
  if(!hex) return null;
  let h = String(hex).trim().replace('#','');
  if(h.length === 3) h = h.split('').map(c=>c+c).join('');
  if(h.length !== 6) return null;
  return { r: parseInt(h.slice(0,2),16), g: parseInt(h.slice(2,4),16), b: parseInt(h.slice(4,6),16) };
}
function hslStringToRgb(hsl){
  if(!hsl) return null;
  const m = String(hsl).match(/hsl\(\s*([\d.]+)deg\s+([\d.]+)%\s+([\d.]+)%\s*\)/i);
  if(!m) return null;
  const h = Number(m[1]), s = Number(m[2])/100, l = Number(m[3])/100;
  function hue2rgb(p,q,t){ if(t<0) t+=1; if(t>1) t-=1; if(t<1/6) return p+(q-p)*6*t; if(t<1/2) return q; if(t<2/3) return p+(q-p)*(2/3 - t)*6; return p; }
  let r,g,b;
  if(s === 0){ r = g = b = l; }
  else{
    const q = l < 0.5 ? l*(1+s) : l + s - l*s;
    const p = 2*l - q;
    const hk = h/360;
    r = hue2rgb(p,q, hk + 1/3);
    g = hue2rgb(p,q, hk);
    b = hue2rgb(p,q, hk - 1/3);
  }
  return { r: Math.round(r*255), g: Math.round(g*255), b: Math.round(b*255) };
}
function parseColorToRgb(str){
  if(!str) return null;
  const s = String(str).trim();
  if(s.startsWith('#')) return hexToRgb(s);
  if(s.toLowerCase().startsWith('hsl')) return hslStringToRgb(s);
  const m = s.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if(m) return { r: Number(m[1]), g: Number(m[2]), b: Number(m[3]) };
  return null;
}
function getContrastingTextColor(colorStr){
  const rgb = parseColorToRgb(colorStr);
  if(!rgb){ // fallback to theme default
    return document.documentElement.classList.contains('dark-theme') ? '#fff' : '#000';
  }
  const srgb = [rgb.r/255, rgb.g/255, rgb.b/255].map(v => v <= 0.03928 ? v/12.92 : Math.pow((v+0.055)/1.055, 2.4));
  const L = 0.2126*srgb[0] + 0.7152*srgb[1] + 0.0722*srgb[2];
  const contrastWhite = (1.05)/(L + 0.05);
  const contrastBlack = (L + 0.05)/0.05;
  return contrastWhite >= contrastBlack ? '#fff' : '#000';
}

// init
initTheme();
load();
startClock();
