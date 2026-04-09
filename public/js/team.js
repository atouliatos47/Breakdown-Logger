// ══════════════════════════════════════════
// TEAM TAB
// ══════════════════════════════════════════

function renderTeamList() {
  const wrap = document.getElementById('team-list');
  if (!technicians.length) {
    wrap.innerHTML = '<div class="empty-state">No technicians added yet</div>'; return;
  }
  wrap.innerHTML = `
    <table class="mtbf-table">
      <thead><tr><th>Name</th><th>Role</th><th>Notes</th><th></th></tr></thead>
      <tbody>
        ${technicians.map(t => `<tr>
          <td class="td-wc">${t.name}</td>
          <td>${t.role||'—'}</td>
          <td>${t.notes||'—'}</td>
          <td style="white-space:nowrap; text-align:right">
            <button class="btn-action btn-edit" onclick="editTechnician(${t.id})">Edit</button>
            <button class="btn-action btn-del"  onclick="deleteTechnician(${t.id})">Delete</button>
          </td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

async function saveTechnician() {
  const id    = document.getElementById('team-edit-id').value;
  const name  = document.getElementById('team-name').value.trim();
  const role  = document.getElementById('team-role').value.trim();
  const notes = document.getElementById('team-notes').value.trim();
  if (!name) { alert('Name is required.'); return; }

  const method = id ? 'PUT' : 'POST';
  const url    = id ? `/api/technicians/${id}` : '/api/technicians';

  try {
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, role, notes })
    });
    if (!res.ok) { alert('Failed to save.'); return; }
    await loadTechnicians();
    cancelTeamEdit();
    showToast('✔ Technician Saved');
  } catch (err) { alert('Server error.'); }
}

function editTechnician(id) {
  const t = technicians.find(x => x.id === id);
  if (!t) return;
  document.getElementById('team-edit-id').value = t.id;
  document.getElementById('team-name').value    = t.name;
  document.getElementById('team-role').value    = t.role || '';
  document.getElementById('team-notes').value   = t.notes || '';
  document.getElementById('team-form-label').textContent = 'Edit Technician';
  document.getElementById('team-name').focus();
}

function cancelTeamEdit() {
  document.getElementById('team-edit-id').value = '';
  document.getElementById('team-name').value    = '';
  document.getElementById('team-role').value    = '';
  document.getElementById('team-notes').value   = '';
  document.getElementById('team-form-label').textContent = 'Add New Technician';
}

async function deleteTechnician(id) {
  if (!confirm('Delete this technician?')) return;
  try {
    await fetch(`/api/technicians/${id}`, { method: 'DELETE' });
    await loadTechnicians();
    showToast('✔ Technician Deleted');
  } catch (err) { alert('Server error.'); }
}
