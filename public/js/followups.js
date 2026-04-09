// ══════════════════════════════════════════
// FOLLOW-UPS
// ══════════════════════════════════════════

let followUps = [];

async function loadFollowUps() {
  try {
    const res = await fetch('/api/followups');
    followUps = await res.json();
    renderFollowUpsTab();
    refreshFollowUpBadges();
  } catch (err) { console.error('loadFollowUps:', err); }
}

// ── Render the Follow-ups tab ──
function renderFollowUpsTab() {
  const container = document.getElementById('followups-list');
  if (!followUps.length) {
    container.innerHTML = '<div class="empty-state">No open follow-ups</div>';
    return;
  }

  // Group by machine
  const grouped = {};
  followUps.forEach(f => {
    const key = f.work_centre || 'Unknown';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(f);
  });

  container.innerHTML = Object.entries(grouped).map(([machine, items]) => `
    <div style="margin-bottom:24px">
      <div style="font-family:var(--font-mono);font-size:11px;letter-spacing:2px;
                  text-transform:uppercase;color:var(--accent);margin-bottom:10px">
        🏭 ${machine}
      </div>
      ${items.map(f => `
        <div class="fault-item" style="flex-wrap:wrap;gap:10px">
          <div style="flex:1;min-width:200px">
            <div class="fault-name">${f.description}</div>
            ${f.part ? `<div style="font-family:var(--font-mono);font-size:11px;color:var(--muted);margin-top:4px">🔩 ${f.part}</div>` : ''}
          </div>
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <select class="status-select" onchange="updateFollowUpStatus(${f.id}, this.value)"
              style="background:var(--panel);border:1px solid var(--border);color:var(--text);
                     font-family:var(--font-mono);font-size:11px;padding:6px 10px;letter-spacing:1px">
              <option ${f.status==='Pending' ?'selected':''}>Pending</option>
              <option ${f.status==='Ordered' ?'selected':''}>Ordered</option>
              <option ${f.status==='Complete'?'selected':''}>Complete</option>
            </select>
            <button class="btn-action btn-del" onclick="deleteFollowUp(${f.id})">Delete</button>
          </div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

// ── Add badge to breakdown rows that have open follow-ups ──
function refreshFollowUpBadges() {
  // Clear existing badges
  document.querySelectorAll('.followup-badge').forEach(b => b.remove());

  followUps.forEach(f => {
    const row = document.querySelector(`tr[data-id="${f.breakdown_id}"]`);
    if (!row) return;
    const firstCell = row.querySelector('td');
    if (!firstCell) return;
    if (!firstCell.querySelector('.followup-badge')) {
      const badge = document.createElement('span');
      badge.className = 'followup-badge';
      badge.textContent = '🔧';
      badge.title = 'Has open follow-up';
      badge.style.cssText = 'margin-left:6px;cursor:pointer;font-size:14px';
      badge.onclick = () => switchTab('followups');
      firstCell.appendChild(badge);
    }
  });
}

// ── Show the add follow-up form for a breakdown ──
function showFollowUpForm(breakdownId, machineName) {
  document.getElementById('fu-breakdown-id').value = breakdownId;
  document.getElementById('fu-machine-name').textContent = machineName;
  document.getElementById('fu-description').value = '';
  document.getElementById('fu-part').value = '';
  document.getElementById('followup-form-card').style.display = 'block';
  switchTab('followups');
  setTimeout(() => {
    document.getElementById('followup-form-card').scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// ── Save a new follow-up ──
async function saveFollowUp() {
  const breakdownId  = document.getElementById('fu-breakdown-id').value;
  const description  = document.getElementById('fu-description').value.trim();
  const part         = document.getElementById('fu-part').value.trim();

  if (!description) { alert('Please enter a description.'); return; }

  try {
    const res = await fetch('/api/followups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ breakdownId, description, part })
    });
    if (!res.ok) { alert('Failed to save follow-up.'); return; }
    await loadFollowUps();
    cancelFollowUp();
    showToast('✔ Follow-up Saved');
  } catch (err) { alert('Server error.'); console.error(err); }
}

// ── Update status ──
async function updateFollowUpStatus(id, status) {
  try {
    await fetch(`/api/followups/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    await loadFollowUps();
    showToast('✔ Status Updated');
  } catch (err) { alert('Server error.'); console.error(err); }
}

// ── Delete follow-up ──
async function deleteFollowUp(id) {
  if (!confirm('Delete this follow-up?')) return;
  try {
    await fetch(`/api/followups/${id}`, { method: 'DELETE' });
    await loadFollowUps();
    showToast('✔ Follow-up Deleted');
  } catch (err) { alert('Error deleting follow-up.'); }
}

// ── Cancel / hide form ──
function cancelFollowUp() {
  document.getElementById('followup-form-card').style.display = 'none';
  document.getElementById('fu-breakdown-id').value = '';
  document.getElementById('fu-description').value  = '';
  document.getElementById('fu-part').value         = '';
}