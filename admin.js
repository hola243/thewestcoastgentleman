/* ─────────────────────────────────────────
   WCG Admin  ·  admin.js
   GitHub-powered CMS for thewestcoastgentleman
   ───────────────────────────────────────── */

/* ── Config ── */
let OWNER = 'hola243';
let REPO  = 'thewestcoastgentleman';
const PATH  = 'content.json';

let token         = '';
let content       = {};
let editingCarIdx = null; // null = new car

/* ════════════════════════════════════════
   AUTH
   ════════════════════════════════════════ */
async function login() {
  const t   = document.getElementById('token-input').value.trim();
  const err = document.getElementById('auth-err');
  const btn = document.querySelector('#auth-gate .btn--primary');
  if (!t) return;

  err.style.display = 'none';
  btn.textContent   = 'Checking…';
  btn.setAttribute('disabled', '');

  try {
    const res = await fetch(`https://api.github.com/repos/${OWNER}/${REPO}`, {
      headers: { Authorization: `token ${t}` }
    });
    if (!res.ok) throw new Error('Unauthorized');

    token = t;
    sessionStorage.setItem('wcg_token', t);
    await init();
  } catch (e) {
    err.style.display = 'block';
    btn.textContent   = 'Sign In';
    btn.removeAttribute('disabled');
  }
}

/* ════════════════════════════════════════
   INIT
   ════════════════════════════════════════ */
async function init() {
  document.getElementById('auth-gate').style.display = 'none';
  document.getElementById('app').style.display       = 'flex';

  // Pre-fill settings fields
  document.getElementById('cfg-owner').value = OWNER;
  document.getElementById('cfg-repo').value  = REPO;
  renderTokenStatus();

  showStatus('Loading content…', '');
  await loadContent();
  showStatus('', '');

  populateForm();
  buildValuesEditor();
  buildTimelineEditor();
  buildServiceCardsEditor();
  buildCarList();
}

/* ════════════════════════════════════════
   CONTENT  ·  LOAD
   ════════════════════════════════════════ */
async function loadContent() {
  try {
    const res  = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!res.ok) throw new Error('GitHub fetch failed');
    const data = await res.json();
    content    = JSON.parse(atob(data.content.replace(/\n/g, '')));
  } catch (e) {
    // Fallback: direct fetch (works on localhost preview)
    try {
      const res = await fetch('/content.json?v=' + Date.now());
      content   = await res.json();
    } catch (e2) {
      content = {};
    }
  }
}

/* ════════════════════════════════════════
   CONTENT  ·  SAVE & PUBLISH
   ════════════════════════════════════════ */
async function saveContent() {
  const btn = document.getElementById('save-btn');
  btn.setAttribute('disabled', '');
  showStatus('Saving…', '');

  // Flush all editors into the content object
  readForm();

  try {
    // 1 — fetch current SHA so GitHub accepts the PUT
    const shaRes  = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      { headers: { Authorization: `token ${token}`, Accept: 'application/vnd.github.v3+json' } }
    );
    if (!shaRes.ok) throw new Error('Could not read remote file');
    const { sha } = await shaRes.json();

    // 2 — encode JSON as base64 (handle unicode correctly)
    const jsonStr = JSON.stringify(content, null, 2);
    const encoded = btoa(unescape(encodeURIComponent(jsonStr)));

    // 3 — PUT new content
    const putRes = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`,
      {
        method:  'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept:        'application/vnd.github.v3+json',
          'Content-Type':'application/json'
        },
        body: JSON.stringify({
          message: 'Content update via WCG Admin',
          content: encoded,
          sha
        })
      }
    );
    if (!putRes.ok) throw new Error('GitHub rejected the save (' + putRes.status + ')');

    showStatus('Published! Site updates in ~60 sec.', 'ok');
  } catch (e) {
    showStatus('Error: ' + e.message, 'err');
  } finally {
    btn.removeAttribute('disabled');
  }
}

/* ════════════════════════════════════════
   IMAGE UPLOAD  →  GitHub /images/ folder
   ════════════════════════════════════════ */
async function uploadImage(fileInput, fieldId, previewId) {
  const file = fileInput.files[0];
  if (!file) return;

  showStatus('Uploading image…', '');

  try {
    const dataUrl  = await fileToBase64(file);
    const raw64    = dataUrl.split(',')[1];              // strip mime header
    const ext      = file.name.split('.').pop().toLowerCase();
    const name     = `img_${Date.now()}.${ext}`;
    const imgPath  = `images/${name}`;

    // Check if a file by that name already exists (get SHA for overwrite)
    let existingSha = null;
    try {
      const check = await fetch(
        `https://api.github.com/repos/${OWNER}/${REPO}/contents/${imgPath}`,
        { headers: { Authorization: `token ${token}` } }
      );
      if (check.ok) existingSha = (await check.json()).sha;
    } catch (_) {}

    const body = { message: `Upload image: ${name}`, content: raw64 };
    if (existingSha) body.sha = existingSha;

    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/contents/${imgPath}`,
      {
        method:  'PUT',
        headers: {
          Authorization: `token ${token}`,
          Accept:        'application/vnd.github.v3+json',
          'Content-Type':'application/json'
        },
        body: JSON.stringify(body)
      }
    );
    if (!res.ok) throw new Error('Upload failed (' + res.status + ')');

    const { content: fileData } = await res.json();
    const url = fileData.download_url;

    // Update text input + preview
    const input = document.getElementById(fieldId);
    if (input) { input.value = url; }
    const prev  = document.getElementById(previewId);
    if (prev)  { prev.src = url; }

    // Also update content object immediately
    setPath(content, fieldId, url);

    showStatus('Image uploaded!', 'ok');
  } catch (e) {
    showStatus('Upload error: ' + e.message, 'err');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ════════════════════════════════════════
   FORM  ·  POPULATE  (content → inputs)
   ════════════════════════════════════════ */
function populateForm() {
  // All inputs whose id contains a dot are treated as dot-notation paths
  document.querySelectorAll('input[id*="."], textarea[id*="."], select[id*="."]').forEach(el => {
    if (el.type === 'file') return;
    const val = getPath(content, el.id);
    if (val !== undefined && val !== null && typeof val !== 'object') {
      el.value = val;
    }
  });

  // Sync image previews by triggering oninput on URL fields
  document.querySelectorAll('input[oninput*="previewImg"]').forEach(el => {
    const m = (el.getAttribute('oninput') || '').match(/previewImg\(this,'([^']+)'\)/);
    if (m) previewImg(el, m[1]);
  });
}

/* ════════════════════════════════════════
   FORM  ·  READ  (inputs → content)
   ════════════════════════════════════════ */
function readForm() {
  document.querySelectorAll('input[id*="."], textarea[id*="."], select[id*="."]').forEach(el => {
    if (el.type === 'file') return;
    setPath(content, el.id, el.value.trim());
  });

  readValuesEditor();
  readTimelineEditor();
  readServiceCardsEditor();
}

/* ════════════════════════════════════════
   VALUES EDITOR  (about.values array)
   ════════════════════════════════════════ */
function buildValuesEditor() {
  const container = document.getElementById('values-editor');
  const vals      = (content.about && content.about.values) || [];

  if (!vals.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:.88rem">No values defined in content.json.</p>';
    return;
  }

  container.innerHTML = vals.map((v, i) => `
    <div class="card open" style="border:1px solid var(--border);margin-bottom:.75rem;">
      <div class="card__head" onclick="this.parentElement.classList.toggle('open')">
        <h2 style="font-size:.88rem">${esc(v.icon || '◆')} ${esc(v.title || 'Value ' + (i + 1))}</h2>
        <span class="chevron">▾</span>
      </div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label>Icon (emoji)</label><input type="text" id="val-icon-${i}" value="${esc(v.icon || '')}"/></div>
          <div class="field"><label>Title</label><input type="text" id="val-title-${i}" value="${esc(v.title || '')}"/></div>
        </div>
        <div class="field"><label>Description</label><textarea id="val-text-${i}">${esc(v.text || '')}</textarea></div>
      </div>
    </div>`).join('');
}

function readValuesEditor() {
  const vals = (content.about && content.about.values) || [];
  vals.forEach((v, i) => {
    v.icon  = val('val-icon-'  + i, v.icon);
    v.title = val('val-title-' + i, v.title);
    v.text  = val('val-text-'  + i, v.text);
  });
  if (!content.about) content.about = {};
  content.about.values = vals;
}

/* ════════════════════════════════════════
   TIMELINE EDITOR  (about.timeline array)
   ════════════════════════════════════════ */
function buildTimelineEditor() {
  const container = document.getElementById('timeline-editor');
  const items     = (content.about && content.about.timeline) || [];

  if (!items.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:.88rem">No timeline items in content.json.</p>';
    return;
  }

  container.innerHTML = items.map((item, i) => `
    <div class="card open" style="border:1px solid var(--border);margin-bottom:.75rem;">
      <div class="card__head" onclick="this.parentElement.classList.toggle('open')">
        <h2 style="font-size:.88rem">${esc(item.year || 'Year')} — ${esc(item.title || 'Milestone ' + (i + 1))}</h2>
        <span class="chevron">▾</span>
      </div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label>Year</label><input type="text" id="tl-year-${i}"  value="${esc(item.year  || '')}"/></div>
          <div class="field"><label>Title</label><input type="text" id="tl-title-${i}" value="${esc(item.title || '')}"/></div>
        </div>
        <div class="field"><label>Description</label><textarea id="tl-text-${i}">${esc(item.text || '')}</textarea></div>
      </div>
    </div>`).join('');
}

function readTimelineEditor() {
  const items = (content.about && content.about.timeline) || [];
  items.forEach((item, i) => {
    item.year  = val('tl-year-'  + i, item.year);
    item.title = val('tl-title-' + i, item.title);
    item.text  = val('tl-text-'  + i, item.text);
  });
  if (!content.about) content.about = {};
  content.about.timeline = items;
}

/* ════════════════════════════════════════
   SERVICE CARDS EDITOR
   ════════════════════════════════════════ */
function buildServiceCardsEditor() {
  const container = document.getElementById('service-cards-editor');
  const cards     = (content.services && content.services.cards) || [];

  if (!cards.length) {
    container.innerHTML = '<p style="color:var(--muted);font-size:.88rem">No service cards in content.json.</p>';
    return;
  }

  container.innerHTML = cards.map((card, i) => `
    <div class="card open" style="border:1px solid var(--border);margin-bottom:.75rem;">
      <div class="card__head" onclick="this.parentElement.classList.toggle('open')">
        <h2 style="font-size:.88rem">${esc(card.icon || '')} ${esc(card.title || 'Service ' + (i + 1))}</h2>
        <span class="chevron">▾</span>
      </div>
      <div class="card__body">
        <div class="field-row">
          <div class="field"><label>Number</label><input type="text" id="sc-num-${i}"  value="${esc(card.number || '')}"/></div>
          <div class="field"><label>Icon (emoji)</label><input type="text" id="sc-icon-${i}" value="${esc(card.icon   || '')}"/></div>
        </div>
        <div class="field"><label>Title</label><input type="text" id="sc-title-${i}" value="${esc(card.title || '')}"/></div>
        <div class="field"><label>Description</label><textarea id="sc-desc-${i}">${esc(card.description || '')}</textarea></div>
        <div class="field">
          <label>List Items (one per line)</label>
          <textarea id="sc-items-${i}" style="min-height:110px">${esc((card.items || []).join('\n'))}</textarea>
        </div>
      </div>
    </div>`).join('');
}

function readServiceCardsEditor() {
  const cards = (content.services && content.services.cards) || [];
  cards.forEach((card, i) => {
    card.number      = val('sc-num-'   + i, card.number);
    card.icon        = val('sc-icon-'  + i, card.icon);
    card.title       = val('sc-title-' + i, card.title);
    card.description = val('sc-desc-'  + i, card.description);
    const itemsEl    = document.getElementById('sc-items-' + i);
    if (itemsEl) card.items = itemsEl.value.split('\n').map(s => s.trim()).filter(Boolean);
  });
  if (!content.services) content.services = {};
  content.services.cards = cards;
}

/* ════════════════════════════════════════
   CAR LIST
   ════════════════════════════════════════ */
function buildCarList() {
  const list = document.getElementById('car-list');
  const cars = (content.cars && content.cars.gallery) || [];

  if (!cars.length) {
    list.innerHTML = '<p style="color:var(--muted);font-size:.88rem;padding:.5rem 0">No cars yet — add your first one below.</p>';
    return;
  }

  list.innerHTML = cars.map((car, i) => `
    <div class="car-row">
      <img class="car-row__thumb"
           src="${esc(car.image || '')}"
           alt="${esc(car.brand || '')} ${esc(car.model || '')}"
           onerror="this.style.opacity='.2'"
      />
      <div class="car-row__name">
        <strong>${esc(car.brand || '')} ${esc(car.model || '')}</strong>
        <span>${esc(car.location || '')}</span>
      </div>
      <span class="cat-badge">${esc(car.category || '')}</span>
      <button class="btn btn--outline btn--sm" onclick="openCarModal(${i})">Edit</button>
      <button class="btn btn--danger btn--sm"  onclick="deleteCar(${i})">✕</button>
    </div>`).join('');
}

/* ════════════════════════════════════════
   CAR MODAL
   ════════════════════════════════════════ */
function openCarModal(idx) {
  editingCarIdx = idx;
  const cars    = (content.cars && content.cars.gallery) || [];

  document.getElementById('modal-title').textContent = idx === null ? 'Add Car' : 'Edit Car';

  if (idx !== null && cars[idx]) {
    const car = cars[idx];
    document.getElementById('m-image').value    = car.image    || '';
    document.getElementById('m-brand').value    = car.brand    || '';
    document.getElementById('m-model').value    = car.model    || '';
    document.getElementById('m-location').value = car.location || '';
    document.getElementById('m-category').value = car.category || 'exotic';
    document.getElementById('m-prev').src        = car.image    || '';
  } else {
    ['m-image','m-brand','m-model','m-location'].forEach(id => {
      document.getElementById(id).value = '';
    });
    document.getElementById('m-category').value = 'exotic';
    document.getElementById('m-prev').src        = '';
  }

  document.getElementById('car-modal').classList.add('open');
}

function closeCarModal() {
  document.getElementById('car-modal').classList.remove('open');
  editingCarIdx = null;
}

function saveCar() {
  if (!content.cars)         content.cars         = {};
  if (!content.cars.gallery) content.cars.gallery = [];

  const car = {
    id:       editingCarIdx !== null
                ? content.cars.gallery[editingCarIdx].id
                : 'car_' + Date.now(),
    brand:    document.getElementById('m-brand').value.trim(),
    model:    document.getElementById('m-model').value.trim(),
    location: document.getElementById('m-location').value.trim(),
    category: document.getElementById('m-category').value,
    image:    document.getElementById('m-image').value.trim()
  };

  if (editingCarIdx !== null) {
    content.cars.gallery[editingCarIdx] = car;
  } else {
    content.cars.gallery.push(car);
  }

  buildCarList();
  closeCarModal();
}

function deleteCar(idx) {
  if (!confirm('Remove this car from the gallery?')) return;
  content.cars.gallery.splice(idx, 1);
  buildCarList();
}

/* ════════════════════════════════════════
   SETTINGS
   ════════════════════════════════════════ */
function renderTokenStatus() {
  const wrap = document.getElementById('token-status-wrap');
  if (!wrap) return;
  if (token) {
    wrap.innerHTML = `<div class="token-status ok"><span class="dot"></span> Token active &mdash; ${token.slice(0, 8)}…</div>`;
  } else {
    wrap.innerHTML = `<div class="token-status err"><span class="dot"></span> No token set</div>`;
  }
}

function updateToken() {
  const t = document.getElementById('cfg-token').value.trim();
  if (!t) return;
  token = t;
  sessionStorage.setItem('wcg_token', t);
  document.getElementById('cfg-token').value = '';
  renderTokenStatus();
  showStatus('Token updated.', 'ok');
}

function logout() {
  sessionStorage.removeItem('wcg_token');
  token   = '';
  content = {};
  document.getElementById('app').style.display       = 'none';
  document.getElementById('auth-gate').style.display = 'flex';
  document.getElementById('token-input').value        = '';
  document.getElementById('auth-err').style.display   = 'none';
}

/* ════════════════════════════════════════
   UI HELPERS
   ════════════════════════════════════════ */
function switchTab(name) {
  const names = ['home', 'about', 'cars', 'services', 'settings'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', names[i] === name);
  });
  document.querySelectorAll('.panel').forEach(p => {
    p.classList.toggle('active', p.id === 'panel-' + name);
  });
}

function toggleCard(head) {
  head.parentElement.classList.toggle('open');
}

function previewImg(input, previewId) {
  const prev = document.getElementById(previewId);
  if (prev) prev.src = input.value;
}

function showStatus(msg, type) {
  const el = document.getElementById('status-msg');
  if (!el) return;
  el.textContent = msg;
  el.className   = 'status-msg' + (msg ? ' show' : '') + (type ? ' ' + type : '');
  if (type === 'ok') setTimeout(() => el.classList.remove('show'), 5000);
}

/* ════════════════════════════════════════
   PATH HELPERS  (dot-notation)
   ════════════════════════════════════════ */
function getPath(obj, path) {
  return path.split('.').reduce(
    (o, k) => (o != null && o[k] !== undefined ? o[k] : undefined), obj
  );
}

function setPath(obj, path, value) {
  const keys = path.split('.');
  let cur    = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!cur[keys[i]] || typeof cur[keys[i]] !== 'object') cur[keys[i]] = {};
    cur = cur[keys[i]];
  }
  cur[keys[keys.length - 1]] = value;
}

/* Read value from an element by id, fallback to default */
function val(id, fallback) {
  const el = document.getElementById(id);
  return el ? el.value : (fallback || '');
}

/* HTML-escape a string */
function esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ════════════════════════════════════════
   BOOT — restore session on page load
   ════════════════════════════════════════ */
(function boot() {
  // Enter key on token field
  const tokenInput = document.getElementById('token-input');
  if (tokenInput) {
    tokenInput.addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
  }

  // Close modal when clicking overlay (outside the modal box)
  const overlay = document.getElementById('car-modal');
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeCarModal();
    });
  }

  // Restore saved token
  const stored = sessionStorage.getItem('wcg_token');
  if (stored) {
    token = stored;
    init();
  }
})();
