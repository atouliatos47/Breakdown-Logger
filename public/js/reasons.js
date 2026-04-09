// ══════════════════════════════════════════
// FAULT REASONS / CATEGORIES
// ══════════════════════════════════════════

const DEFAULT_REASONS = [
  'Electrical — Control / PLC',
  'Electrical — Motor / Drive',
  'Electrical — Sensor / Switch',
  'Electrical — Wiring / Connection',
  'Mechanical — Bearing / Shaft',
  'Mechanical — Belt / Chain',
  'Mechanical — Gearbox / Clutch',
  'Mechanical — Tooling / Die',
  'Hydraulic — Pump / Valve',
  'Hydraulic — Leak / Seal',
  'Pneumatic — Valve / Cylinder',
  'Pneumatic — Leak',
  'Operator Error',
  'Other'
];

let reasons = [];

async function loadReasons() {
  try {
    const res = await fetch('/api/reasons');
    reasons = await res.json();

    // Seed defaults if database is empty
    if (reasons.length === 0) {
      await Promise.all(DEFAULT_REASONS.map(name =>
        fetch('/api/reasons', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        })
      ));
      const res2 = await fetch('/api/reasons');
      reasons = await res2.json();
    }

    renderReasonsList();
    populateReasonDropdown();
  } catch (err) { console.error('loadReasons:', err); }
}

function renderReasonsList() {
  const container = document.getElementById('reasons-list');
  if (!reasons.length) {
    container.innerHTML = '<div class="empty-state">No categories yet</div>';
    return;
  }
  container.innerHTML = reasons.map(r => `
    <div class="fault-item">
      <span class="fault-name">${r.name}</span>
      <div style="display:flex; gap:8px;">
        <button class="btn-action btn-edit" onclick="editReason(${r.id}, '${r.name.replace(/'/g,"\\'")}')">Edit</button>
        <button class="btn-action btn-del" onclick="deleteReason(${r.id})">Delete</button>
      </div>
    </div>
  `).join('');
}

function populateReasonDropdown() {
  const sel = document.getElementById('fault-category');
  const current = sel.value;
  sel.innerHTML = '<option value="">— Select Category —</option>';
  reasons.forEach(r => {
    sel.innerHTML += `<option value="${r.name}">${r.name}</option>`;
  });
  sel.value = current;
}

async function saveReason() {
  const name  = document.getElementById('reason-name').value.trim();
  const editId = document.getElementById('reason-edit-id').value;
  if (!name) { alert('Please enter a category name.'); return; }

  const method = editId ? 'PUT' : 'POST';
  const url    = editId ? `/api/reasons/${editId}` : '/api/reasons';

  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name })
    });
    if (!res.ok) { alert('Failed to save category.'); return; }
    await loadReasons();
    cancelReasonEdit();
    showToast('✔ Category Saved');
  } catch (err) { alert('Server error.'); console.error(err); }
}

function editReason(id, name) {
  document.getElementById('reason-edit-id').value = id;
  document.getElementById('reason-name').value    = name;
  document.getElementById('reason-form-label').textContent = 'Edit Reason';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function cancelReasonEdit() {
  document.getElementById('reason-edit-id').value = '';
  document.getElementById('reason-name').value    = '';
  document.getElementById('reason-form-label').textContent = 'Add / Edit Reason';
  document.getElementById('reasons-form-card').style.display = 'none';
}


async function deleteReason(id) {
  if (!confirm('Delete this fault category?')) return;
  try {
    await fetch(`/api/reasons/${id}`, { method: 'DELETE' });
    await loadReasons();
    showToast('✔ Category Deleted');
  } catch (err) { alert('Error deleting category.'); }
}