// ══════════════════════════════════════════
// EQUIPMENT TAB
// ══════════════════════════════════════════

function renderEquipmentList() {
  const wrap = document.getElementById('eq-list');
  if (!machines.length) {
    wrap.innerHTML = '<div class="empty-state">No machines added yet</div>'; return;
  }
  wrap.innerHTML = `
    <table class="mtbf-table">
      <thead><tr><th>Machine</th><th>Location</th><th>Notes</th><th></th></tr></thead>
      <tbody>
        ${machines.map(m => `<tr>
          <td class="td-wc">${m.name}</td>
          <td>${m.location||'—'}</td>
          <td>${m.notes||'—'}</td>
          <td style="white-space:nowrap; text-align:right">
            <button class="btn-action btn-edit" onclick="editMachine(${m.id})">Edit</button>
            <button class="btn-action btn-del"  onclick="deleteMachine(${m.id})">Delete</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function saveMachine() {
  const id       = document.getElementById('eq-edit-id').value;
  const name     = document.getElementById('eq-name').value.trim();
  const location = document.getElementById('eq-location').value.trim();
  const notes    = document.getElementById('eq-notes').value.trim();
  if (!name) { alert('Machine name is required.'); return; }

  // Check for duplicate (only when adding new, not editing)
  if (!id) {
    const exists = machines.find(m => m.name.toLowerCase() === name.toLowerCase());
  if (exists) {
    alert(`"${name}" already exists in the machine list.`);
    document.getElementById('eq-name').value = '';
    document.getElementById('eq-name').focus();
    return;
  }
  }

  const method = id ? 'PUT' : 'POST';
  const url    = id ? `/api/machines/${id}` : '/api/machines';

  try {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, location, notes })
    });
    if (!res.ok) { alert('Failed to save.'); return; }
    await loadMachines();
    cancelEqEdit();
    showToast('✔ Machine Saved');
  } catch (err) { alert('Server error.'); }
}

function editMachine(id) {
  const m = machines.find(x => x.id === id);
  if (!m) return;
  document.getElementById('eq-edit-id').value  = m.id;
  document.getElementById('eq-name').value     = m.name;
  document.getElementById('eq-location').value = m.location || '';
  document.getElementById('eq-notes').value    = m.notes || '';
  document.getElementById('eq-form-label').textContent = 'Edit Machine';
  document.getElementById('eq-name').focus();
}

function cancelEqEdit() {
  document.getElementById('eq-edit-id').value  = '';
  document.getElementById('eq-name').value     = '';
  document.getElementById('eq-form-label').textContent = 'Add New Machine';
}

async function deleteMachine(id) {
  if (!confirm('Delete this machine?')) return;
  try {
    await fetch(`/api/machines/${id}`, { method: 'DELETE' });
    await loadMachines();
    showToast('✔ Machine Deleted');
  } catch (err) { alert('Server error.'); }
}
