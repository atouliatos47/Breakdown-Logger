// ══════════════════════════════════════════
// APP.JS — Boot, state, data loaders, tabs
// ══════════════════════════════════════════

let entries = [];
let machines = [];
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

const TAB_NAMES = ['log', 'overview', 'pareto', 'faults', 'mtbf', 'technician', 'equipment', 'team', 'reasons', 'followups'];

function switchTab(name) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    b.classList.toggle('active', TAB_NAMES[i] === name);
  });
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');

  if (name === 'overview') renderOverview();
  if (name === 'pareto') renderPareto();
  if (name === 'faults') renderFaults();
  if (name === 'mtbf') renderMTBF();
  if (name === 'technician') renderTechChart();
  if (name === 'equipment') renderEquipmentList();
  if (name === 'team') renderTeamList();
}

// ══════════════════════════════════════════
// PWA
// ══════════════════════════════════════════

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => { });
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
// ══════════════════════════════════════════
// PUSH NOTIFICATIONS
// ══════════════════════════════════════════

const VAPID_PUBLIC_KEY = 'BPMCV-Haw-JzlyY5TE_L21WKq2PB-pPCQN2JZcj1zYdK8n7HIvwvt40IwOHFSOHnhwDHmzKIAGF0daLkAqY6GY8';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
    });
    await fetch('/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sub)
    });
    console.log('Push subscription registered');
  } catch (err) { console.error('Push subscribe error:', err); }
}

async function requestNotificationPermission() {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    subscribeToPush();
  } else if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') subscribeToPush();
  }
}

requestNotificationPermission();
