// ══════════════════════════════════════════
// LOG TAB
// ══════════════════════════════════════════

// ── Populate hour/minute dropdowns ──
function buildTimeDropdowns() {
  ['start-hour','end-hour'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">HH</option>';
    for (let h = 0; h < 24; h++) {
      const v = String(h).padStart(2,'0');
      sel.innerHTML += `<option value="${v}">${v}</option>`;
    }
  });
  ['start-min','end-min'].forEach(id => {
    const sel = document.getElementById(id);
    sel.innerHTML = '<option value="">MM</option>';
    for (let m = 0; m < 60; m += 5) {
      const v = String(m).padStart(2,'0');
      sel.innerHTML += `<option value="${v}">${v}</option>`;
    }
    [1,2,3,4].forEach(m => {
      const v = String(m).padStart(2,'0');
      if (!sel.querySelector(`option[value="${v}"]`)) {
        sel.innerHTML += `<option value="${v}">${v}</option>`;
      }
    });
  });
}

// ── Set start date/time to now ──
function setNow() {
  const now = new Date();
  now.setSeconds(0, 0);
  const pad  = n => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const hour = pad(now.getHours());
  const min  = pad(Math.floor(now.getMinutes() / 5) * 5);
  document.getElementById('start-date').value = date;
  document.getElementById('start-hour').value = hour;
  document.getElementById('start-min').value  = min;
}

// ── Show/hide Other detail field ──
function toggleOther(sel) {
  const other = document.getElementById('other-detail');
  other.style.display = sel.value === 'Other' ? 'block' : 'none';
  if (sel.value !== 'Other') other.value = '';
}

// ── Log a new breakdown ──
async function logEntry() {
  const wc        = document.getElementById('workcenter').value.trim();
  const tech      = document.getElementById('technician').value.trim();
  const startDate = document.getElementById('start-date').value;
  const startHour = document.getElementById('start-hour').value;
  const startMin  = document.getElementById('start-min').value;
  const endDate   = document.getElementById('end-date').value;
  const endHour   = document.getElementById('end-hour').value;
  const endMin    = document.getElementById('end-min').value;
  const catSel    = document.getElementById('fault-category').value.trim();
  const otherVal  = document.getElementById('other-detail').value.trim();
  const category  = catSel === 'Other' ? `Other — ${otherVal || 'unspecified'}` : catSel;
  const reason    = document.getElementById('reason').value.trim();

  if (!wc || !tech || !startDate || !startHour || !startMin || !endDate || !endHour || !endMin || !catSel || !reason) {
    alert('Please fill in all fields before logging.'); return;
  }
  if (catSel === 'Other' && !otherVal) {
    alert('Please specify the fault in the "Other" field.'); return;
  }

  const start = `${startDate}T${startHour}:${startMin}`;
  const end   = `${endDate}T${endHour}:${endMin}`;

  if (new Date(end) <= new Date(start)) {
    alert('"Machine Back Up" must be after "Breakdown Start".'); return;
  }

  const durationMins = Math.round((new Date(end) - new Date(start)) / 60000);
  const editId = document.getElementById('edit-entry-id').value;

  try {
    const method = editId ? 'PUT' : 'POST';
    const url    = editId ? `/api/breakdowns/${editId}` : '/api/breakdowns';
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wc, tech, start, end, durationMins, category, reason })
    });
    if (!res.ok) { alert('Failed to save breakdown.'); return; }
    document.getElementById('edit-entry-id').value = '';
    await loadEntries();
    resetForm();
    showToast(editId ? '✔ Breakdown Updated' : '✔ Breakdown Logged');
  } catch (err) { alert('Server error.'); console.error(err); }
}

// ── Build a table row ──
function buildRow(e) {
  const fmt = val => val ? new Date(val).toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12: false
  }) : '—';
  return `<tr data-id="${e.id}" onclick="openModal(${e.id})" style="cursor:pointer">
    <td class="td-wc">${e.work_centre}</td>
    <td>${e.technician||'—'}</td>
    <td class="td-date">${fmt(e.start_time)}</td>
    <td class="td-date">${fmt(e.end_time)}</td>
    <td class="td-dur">${formatDuration(e.duration_mins)}</td>
    <td><span class="badge ${badgeClass(e.category)}">${e.category||'—'}</span></td>
    <td class="td-reason">${e.reason}</td>
    <td><button class="btn-action btn-edit" onclick="event.stopPropagation();editEntry(${e.id})">Edit</button></td>
    <td><button class="btn-action btn-del" onclick="event.stopPropagation();deleteEntry(${e.id})">Delete</button></td>
    <td><button class="btn-action" style="background:#1a3a2a;color:#40c080" onclick="event.stopPropagation();showFollowUpForm(${e.id}, '${e.work_centre}')">🔧 Follow-up</button></td>
  </tr>`;
}

// ── Render log table ──
function renderTable() {
  const body  = document.getElementById('log-body');
  const table = document.getElementById('log-table');
  const empty = document.getElementById('empty-state');

  if (!entries.length) {
    table.style.display = 'none'; empty.style.display = 'block'; return;
  }
  table.style.display = 'table'; empty.style.display = 'none';
  body.innerHTML = entries.map(buildRow).join('');
}

// ── Reset form ──
function resetForm() {
  ['workcenter','technician','fault-category','reason',
   'start-date','end-date','start-hour','start-min','end-hour','end-min'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('other-detail').value         = '';
  document.getElementById('other-detail').style.display = 'none';
  setNow();
  document.getElementById('card-log-form').style.display = 'none';
}

// ── Delete single entry ──
async function deleteEntry(id) {
  if (!confirm('Delete this breakdown entry?')) return;
  try {
    await fetch(`/api/breakdowns/${id}`, { method: 'DELETE' });
    await loadEntries();
    showToast('✔ Entry Deleted');
  } catch (err) { alert('Error deleting entry.'); }
}

// ── Clear all ──
async function clearLog() {
  if (!entries.length) return;
  if (!confirm('Clear ALL breakdowns from the database? This cannot be undone.')) return;
  try {
    await Promise.all(entries.map(e => fetch(`/api/breakdowns/${e.id}`, { method: 'DELETE' })));
    await loadEntries();
  } catch (err) { alert('Error clearing log.'); }
}

// ── Toggle log visibility ──
function toggleLog() {
  const wrap   = document.getElementById('log-table-wrap');
  const btn    = document.getElementById('btn-toggle');
  const hidden = wrap.style.display === 'none';
  wrap.style.display = hidden ? 'block' : 'none';
  btn.textContent    = hidden ? '▲ Hide' : '▼ Show';
}

// ── Date filter ──
function applyFilter() {
  const filter = document.getElementById('log-filter').value;
  const now    = new Date();
  let filtered;

  if (filter === 'all') {
    filtered = entries;
  } else if (filter === 'week') {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    filtered = entries.filter(e => new Date(e.start_time) >= start);
  } else if (filter === 'month') {
    filtered = entries.filter(e => {
      const d = new Date(e.start_time);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
  } else if (filter === '3months') {
    const start = new Date(now);
    start.setMonth(now.getMonth() - 3);
    filtered = entries.filter(e => new Date(e.start_time) >= start);
  }

  renderFilteredTable(filtered);
}

function renderFilteredTable(data) {
  const body  = document.getElementById('log-body');
  const table = document.getElementById('log-table');
  const empty = document.getElementById('empty-state');

  if (!data.length) {
    table.style.display = 'none';
    empty.style.display = 'block';
    empty.textContent   = 'No breakdowns found for this period';
    return;
  }
  table.style.display = 'table';
  empty.style.display = 'none';
  body.innerHTML = data.map(buildRow).join('');
}

// ── Edit a breakdown ──
function editEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;

  const pad   = n => String(n).padStart(2,'0');
  const start = new Date(e.start_time);
  const end   = new Date(e.end_time);

  document.getElementById('workcenter').value      = e.work_centre;
  document.getElementById('technician').value      = e.technician;
  document.getElementById('start-date').value      = `${start.getFullYear()}-${pad(start.getMonth()+1)}-${pad(start.getDate())}`;
  document.getElementById('start-hour').value      = pad(start.getHours());
  document.getElementById('start-min').value       = pad(Math.floor(start.getMinutes()/5)*5);
  document.getElementById('end-date').value        = `${end.getFullYear()}-${pad(end.getMonth()+1)}-${pad(end.getDate())}`;
  document.getElementById('end-hour').value        = pad(end.getHours());
  document.getElementById('end-min').value         = pad(Math.floor(end.getMinutes()/5)*5);
  document.getElementById('fault-category').value  = e.category;
  document.getElementById('reason').value          = e.reason;
  document.getElementById('edit-entry-id').value   = id;

  document.getElementById('card-log-form').style.display = 'block';
  window.scrollTo({ top: 0, behavior: 'smooth' });
  showToast('✏ Editing entry — make changes and re-submit');
}

// ── Open breakdown detail modal ──
async function openModal(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;

  const fmt = val => val ? new Date(val).toLocaleString('en-GB', {
    day:'2-digit', month:'short', year:'numeric',
    hour:'2-digit', minute:'2-digit', hour12: false
  }) : '—';

  document.getElementById('modal-machine').textContent  = e.work_centre;
  document.getElementById('modal-tech').textContent     = e.technician || '—';
  document.getElementById('modal-duration').textContent = formatDuration(e.duration_mins);
  document.getElementById('modal-start').textContent    = fmt(e.start_time);
  document.getElementById('modal-end').textContent      = fmt(e.end_time);
  document.getElementById('modal-category').textContent = e.category || '—';
  document.getElementById('modal-reason').textContent   = e.reason || '—';

  try {
    const res  = await fetch(`/api/followups/breakdown/${id}`);
    const fups = await res.json();
    const container = document.getElementById('modal-followups');
    if (!fups.length) {
      container.innerHTML = '<div class="empty-state" style="padding:20px">No follow-ups for this breakdown</div>';
    } else {
      container.innerHTML = fups.map(f => `
        <div class="fault-item">
          <div>
            <div class="fault-name">${f.description}</div>
            ${f.part ? `<div style="font-family:var(--font-mono);font-size:11px;color:var(--muted);margin-top:4px">🔩 ${f.part}</div>` : ''}
          </div>
          <span class="badge" style="background:${f.status==='Ordered'?'#1a3a1a':'#3a2a10'};color:${f.status==='Ordered'?'#40c080':'#d0a030'}">
            ${f.status}
          </span>
        </div>
      `).join('');
    }
  } catch (err) { console.error('modal followups:', err); }

  document.getElementById('breakdown-modal').style.display = 'flex';
}

// ── Close modal when clicking outside ──
function closeModal(e) {
  if (e.target === document.getElementById('breakdown-modal')) {
    document.getElementById('breakdown-modal').style.display = 'none';
  }
}
