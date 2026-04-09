// ══════════════════════════════════════════
// APP.JS — Boot, state, data loaders, tabs
// ══════════════════════════════════════════

let entries     = [];
let machines    = [];
let technicians = [];

// ── Clock ──
function tick() {
  document.getElementById('clock').textContent =
    new Date().toLocaleTimeString('en-GB', { hour12: false });
}
tick(); setInterval(tick, 1000);

// ── Boot ──
async function boot() {
  buildTimeDropdowns();
  setNow();
  await Promise.all([loadEntries(), loadMachines(), loadTechnicians(), loadLiveDowns(), loadReasons(), loadFollowUps()]);
}
boot();

// ══════════════════════════════════════════
// DATA LOADERS
// ══════════════════════════════════════════

async function loadEntries() {
  try {
    const res = await fetch('/api/breakdowns');
    entries = await res.json();
    renderTable();
  } catch (err) { console.error('loadEntries:', err); }
}

async function loadMachines() {
  try {
    const res = await fetch('/api/machines');
    machines = await res.json();
    populateMachineDropdown();
    populateDownMachineDropdown();
    renderEquipmentList();
  } catch (err) { console.error('loadMachines:', err); }
}

async function loadTechnicians() {
  try {
    const res = await fetch('/api/technicians');
    technicians = await res.json();
    populateTechDropdown();
    populateDownTechDropdown();
    renderTeamList();
  } catch (err) { console.error('loadTechnicians:', err); }
}

// ── Populate log form dropdowns ──
function populateMachineDropdown() {
  const sel = document.getElementById('workcenter');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Select Machine —</option>';
  machines.forEach(m => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = m.name;
    sel.appendChild(opt);
  });
  sel.value = cur;
}

function populateTechDropdown() {
  const sel = document.getElementById('technician');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Select Technician —</option>';
  technicians.forEach(t => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = t.name;
    sel.appendChild(opt);
  });
  sel.value = cur;
}

// ── Populate Mark Down dropdowns ──
function populateDownMachineDropdown() {
  const sel = document.getElementById('down-machine');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Select Machine —</option>';
  machines.forEach(m => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = m.name;
    sel.appendChild(opt);
  });
  sel.value = cur;
}

function populateDownTechDropdown() {
  const sel = document.getElementById('down-tech');
  const cur = sel.value;
  sel.innerHTML = '<option value="">— Select Technician —</option>';
  technicians.forEach(t => {
    const opt = document.createElement('option');
    opt.value = opt.textContent = t.name;
    sel.appendChild(opt);
  });
  sel.value = cur;
}

// ══════════════════════════════════════════
// TAB SWITCHING
// ══════════════════════════════════════════

const TAB_NAMES = ['log','overview','pareto','faults','mtbf','technician','equipment','team','reasons','followups'];

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', TAB_NAMES[i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');

  if (name === 'overview')   renderOverview();
  if (name === 'pareto')     renderPareto();
  if (name === 'faults')     renderFaults();
  if (name === 'mtbf')       renderMTBF();
  if (name === 'technician') renderTechChart();
  if (name === 'equipment')  renderEquipmentList();
  if (name === 'team')       renderTeamList();
}

// ══════════════════════════════════════════
// PWA
// ══════════════════════════════════════════

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

let deferredPrompt = null;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault(); deferredPrompt = e;
  document.getElementById('btn-install').classList.add('visible');
});
window.addEventListener('appinstalled', () => {
  document.getElementById('btn-install').classList.remove('visible');
  deferredPrompt = null;
});
function installApp() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then(() => { deferredPrompt = null; });
}
