// director.js — Director: manage users, salary overview, fee overview

async function renderDirectorUsers() {
  const ca = document.getElementById('content-area');
  try {
    const res = await api.get('/director/users');
    const users = res.data || [];

    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Manage Admins</h1>
          <p class="page-subtitle">Create and manage Principal & Administrator accounts</p></div>
        <button class="btn-primary" onclick="showCreateUserModal()">+ Create Account</button>
      </div>
      <div class="card">
        <div class="card-body">
          ${users.length === 0 ? emptyState('👤','No accounts yet','Create principals and administrators below.') : `
          <table>
            <thead><tr>
              <th>Username</th><th>Role</th><th>Name</th><th>Phone</th><th>Email</th><th>Created</th><th>Actions</th>
            </tr></thead>
            <tbody>
              ${users.map(u => `<tr>
                <td><strong>${u.username}</strong></td>
                <td><span class="badge ${u.role==='principal'?'badge-blue':'badge-gold'}">${u.role}</span></td>
                <td>${u.staff_name||'—'}</td>
                <td>${u.phone||'—'}</td>
                <td>${u.email||'—'}</td>
                <td>${u.created_at ? u.created_at.slice(0,10) : ''}</td>
                <td>
                  <button class="btn-danger btn-sm" onclick="deleteUser(${u.id},'${u.username}')">Remove</button>
                  <button class="btn-secondary btn-sm" onclick="showSetPermissionsModal(${u.id},'${u.username}')">Permissions</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>`}
        </div>
      </div>`;
  } catch(e) {
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('⚠️','Error',e.message)}</div></div>`;
  }
}

function showCreateUserModal() {
  openModal('Create Account', `
    <div class="form-grid">
      <div class="form-group"><label>Role *</label>
        <select id="cu-role" class="form-control">
          <option value="principal">Principal</option>
          <option value="administrator">Administrator</option>
        </select></div>
      <div class="form-group"><label>Full Name *</label>
        <input id="cu-name" class="form-control" placeholder="Full name"/></div>
      <div class="form-group"><label>Username *</label>
        <input id="cu-username" class="form-control" placeholder="Login username"/></div>
      <div class="form-group"><label>Password *</label>
        <input id="cu-password" type="password" class="form-control" placeholder="Password"/></div>
      <div class="form-group"><label>Phone</label>
        <input id="cu-phone" class="form-control" placeholder="Phone number"/></div>
      <div class="form-group"><label>Email</label>
        <input id="cu-email" class="form-control" placeholder="Email address"/></div>
      <div class="form-group"><label>Basic Salary (₹)</label>
        <input id="cu-salary" type="number" class="form-control" placeholder="50000"/></div>
    </div>`,
    [{ label: 'Create Account', class: 'btn-primary', action: 'createUser()' }]);
}

async function createUser() {
  const body = {
    role:         document.getElementById('cu-role').value,
    name:         document.getElementById('cu-name').value.trim(),
    username:     document.getElementById('cu-username').value.trim(),
    password:     document.getElementById('cu-password').value.trim(),
    phone:        document.getElementById('cu-phone').value.trim(),
    email:        document.getElementById('cu-email').value.trim(),
    basic_salary: parseFloat(document.getElementById('cu-salary').value) || 0,
  };
  try {
    await api.post('/director/users', body);
    showToast('Account created!', 'success');
    closeModal();
    renderDirectorUsers();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteUser(id, username) {
  if (!confirm(`Remove account "${username}"?`)) return;
  try {
    await api.delete(`/director/users/${id}`);
    showToast('Account removed', 'success');
    renderDirectorUsers();
  } catch(e) { showToast(e.message, 'error'); }
}

function showSetPermissionsModal(userId, username) {
  openModal(`Permissions — ${username}`, `
    <p style="margin-bottom:12px;color:var(--text-secondary)">
      Set custom permissions as a JSON object. Leave empty to use role defaults.</p>
    <div class="form-group"><label>Permissions JSON</label>
      <textarea id="perm-json" class="form-control" rows="6" placeholder='{"can_edit_salary":true,"can_delete_students":false}'></textarea>
    </div>`,
    [{ label: 'Save Permissions', class: 'btn-primary', action: `savePermissions(${userId})` }]);
}

async function savePermissions(userId) {
  const raw = document.getElementById('perm-json').value.trim();
  let perms = {};
  if (raw) {
    try { perms = JSON.parse(raw); } catch(e) { showToast('Invalid JSON', 'error'); return; }
  }
  try {
    await api.put(`/director/users/${userId}/permissions`, { permissions: perms });
    showToast('Permissions saved', 'success');
    closeModal();
  } catch(e) { showToast(e.message, 'error'); }
}