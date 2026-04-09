// ══════════════════════════════════════════
// LIVE DOWNS
// ══════════════════════════════════════════

let liveDowns = [];

async function loadLiveDowns() {
  try {
    const res = await fetch('/api/livedowns');
    liveDowns = await res.json();
    renderLiveBanner();
  } catch (err) { console.error('loadLiveDowns:', err); }
}

// ── Render the red live banner ──
function renderLiveBanner() {
  const banner = document.getElementById('live-banner');
  const list   = document.getElementById('live-list');

  if (!liveDowns.length) {
    banner.style.display = 'none';
    return;
  }

  banner.style.display = 'block';
  list.innerHTML = liveDowns.map(d => {
    const since   = new Date(d.started_at);
    const elapsed = Math.round((Date.now() - since) / 60000);
    return `<div class="live-item">
      <div class="live-item-info">
        <span class="live-machine">⚠ ${d.work_centre}</span>
        <span class="live-tech">${d.technician}</span>
        <span class="live-reason">${d.reason || 'No reason given'}</span>
        <span class="live-elapsed" id="timer-${d.id}">00:00:00</span>
      </div>
      <button class="btn-live-close" onclick="closeLiveDown(${d.id}, '${d.work_centre}', '${d.technician}', '${d.started_at}')">
        ✔ Machine Back Up
      </button>
    </div>`;
  }).join('');
}

// ── Mark a machine as currently down ──
async function markMachineDown() {
  const wc     = document.getElementById('down-machine').value.trim();
  const tech   = document.getElementById('down-tech').value.trim();
  const reason = document.getElementById('down-reason').value.trim();

  if (!wc || !tech) { alert('Please select a machine and technician.'); return; }

  // Check not already down
  const already = liveDowns.find(d => d.work_centre === wc);
  if (already) { alert(`${wc} is already marked as down.`); return; }

  try {
    const res = await fetch('/api/livedowns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wc, tech, reason })
    });
    if (!res.ok) { alert('Failed to mark machine down.'); return; }
    await loadLiveDowns();
    document.getElementById('down-machine').value = '';
    document.getElementById('down-tech').value    = '';
    document.getElementById('down-reason').value  = '';
    showToast('⚠ Machine marked as DOWN');
  } catch (err) { alert('Server error.'); console.error(err); }
}

// ── Close a live down (machine back up) ──
async function closeLiveDown(id, wc, tech, startedAt) {
  // Pre-fill the log form with the breakdown details
  const start = new Date(startedAt);
  const now   = new Date();
  const pad   = n => String(n).padStart(2,'0');

  document.getElementById('workcenter').value   = wc;
  document.getElementById('technician').value   = tech;
  document.getElementById('start-date').value   = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
  document.getElementById('start-hour').value   = pad(start.getHours());
  // Add exact minute if not already in dropdown
  const startMinSel = document.getElementById('start-min');
  const exactMin = pad(start.getMinutes());
  if (!startMinSel.querySelector(`option[value="${exactMin}"]`)) {
    const opt = document.createElement('option');
    opt.value = opt.textContent = exactMin;
    startMinSel.appendChild(opt);
  }
  startMinSel.value = exactMin;
  document.getElementById('end-date').value     = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  document.getElementById('end-hour').value     = pad(now.getHours());
  const endMinSel = document.getElementById('end-min');
  const exactEndMin = pad(now.getMinutes());
  if (!endMinSel.querySelector(`option[value="${exactEndMin}"]`)) {
    const opt = document.createElement('option');
    opt.value = opt.textContent = exactEndMin;
    endMinSel.appendChild(opt);
  }
  endMinSel.value = exactEndMin;

  // Remove the live down record
  await fetch(`/api/livedowns/${id}`, { method: 'DELETE' });
  await loadLiveDowns();

  // Scroll to form
// Show and scroll to form
  const logForm = document.getElementById('card-log-form');
  logForm.style.display = 'block';
  logForm.scrollIntoView({ behavior: 'smooth' });
  showToast('✔ Complete the breakdown form and submit');
}

// ── Refresh elapsed times every minute ──
// ── Live ticker — updates every second ──
function tickTimers() {
  liveDowns.forEach(d => {
    const el = document.getElementById(`timer-${d.id}`);
    if (!el) return;
    const diff = Math.floor((Date.now() - new Date(d.started_at)) / 1000);
    const h    = Math.floor(diff / 3600);
    const m    = Math.floor((diff % 3600) / 60);
    const s    = diff % 60;
    const pad  = n => String(n).padStart(2, '0');
    el.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  });
}
setInterval(tickTimers, 1000);
