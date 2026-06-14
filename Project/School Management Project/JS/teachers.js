async function renderTeachers() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading();
  const canAdd = ['administrator', 'director'].includes(currentUser?.role);
  try {
    const res = await api.get('/teachers');
    const teachers = res.data || [];
    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Teachers</h1><p class="page-subtitle">${canAdd ? 'Manage teacher records and profiles' : 'View teacher records'}</p></div>
        ${canAdd ? `<button class="btn-primary" onclick="showAddTeacherModal()">+ Add Teacher</button>` : ''}
      </div>
      <div class="card">
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Name</th><th>Age</th><th>Phone</th><th>Email</th><th>Bank</th><th>Actions</th></tr>
              </thead>
              <tbody>
                ${teachers.length ? teachers.map(t => `
                  <tr>
                    <td>${t.teacher_id}</td>
                    <td>${t.name}</td>
                    <td>${t.age}</td>
                    <td>${t.phone}</td>
                    <td>${t.email}</td>
                    <td>${t.bank_name || '—'}</td>
                    <td>
                      <button class="btn-secondary btn-sm" onclick="viewTeacherAssignments(${t.teacher_id}, '${t.name}')">Assignments</button>
                      <button class="btn-secondary btn-sm" onclick="showUpdateTeacherModal(${t.teacher_id}, '${t.name}')">Edit</button>
                      <button class="btn-danger btn-sm" onclick="removeTeacherConfirm(${t.teacher_id}, '${t.name}')">Remove</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="7">${emptyState('👨‍🏫','No teachers','Add your first teacher to get started')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) { ca.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

function showAddTeacherModal() {
  showModal('Add Teacher', `
    <div class="form-row">
      <div class="form-group"><label>Full Name</label><input id="t-name" type="text" placeholder="Teacher name"/></div>
      <div class="form-group"><label>Password</label><input id="t-pass" type="password" placeholder="Min 8 chars"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Date of Birth</label><input id="t-dob" type="date"/></div>
      <div class="form-group"><label>Phone</label><input id="t-phone" type="text" placeholder="10-digit"/></div>
    </div>
    <div class="form-group"><label>Email</label><input id="t-email" type="email" placeholder="teacher@school.com"/></div>
    <div class="form-group"><label>Address</label><textarea id="t-addr" placeholder="Full address"></textarea></div>
    <div class="form-row">
      <div class="form-group"><label>Aadhar Number</label><input id="t-aadhar" type="text" placeholder="12-digit"/></div>
      <div class="form-group"><label>Account Number</label><input id="t-account" type="text" placeholder="Bank account"/></div>
    </div>
    <div class="form-group"><label>Bank Name</label><input id="t-bank" type="text" placeholder="Bank name"/></div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitAddTeacher()">Add Teacher</button>
  `);
}

async function submitAddTeacher() {
  const data = {
    name: document.getElementById('t-name').value.trim(),
    password: document.getElementById('t-pass').value.trim(),
    dob: document.getElementById('t-dob').value,
    phone: document.getElementById('t-phone').value.trim(),
    email: document.getElementById('t-email').value.trim(),
    address: document.getElementById('t-addr').value.trim(),
    aadhar: document.getElementById('t-aadhar').value.trim(),
    account_number: document.getElementById('t-account').value.trim(),
    bank_name: document.getElementById('t-bank').value.trim(),
  };
  for (const [k, v] of Object.entries(data)) {
    if (!v) { showToast(`${k} is required`, 'error'); return; }
  }
  try {
    const res = await api.post('/teachers', data);
    showToast(`Teacher added! ID: ${res.data.teacher_id}`);
    closeModal();
    renderTeachers();
  } catch (e) { showToast(e.message, 'error'); }
}

function showUpdateTeacherModal(tid, name) {
  showModal(`Update: ${name}`, `
    <div class="form-group"><label>New Phone</label><input id="upd-t-phone" type="text" placeholder="10-digit phone"/></div>
    <div class="form-group"><label>New Email</label><input id="upd-t-email" type="email" placeholder="email"/></div>
    <div class="form-group"><label>New Address</label><textarea id="upd-t-addr" placeholder="address"></textarea></div>
    <div class="form-group"><label>New Password (leave blank to keep)</label><input id="upd-t-pass" type="password"/></div>
    <div class="form-group"><label>New Bank Name</label><input id="upd-t-bank" type="text"/></div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitUpdateTeacher(${tid})">Update</button>
  `);
}

async function submitUpdateTeacher(tid) {
  const data = {};
  const phone = document.getElementById('upd-t-phone').value.trim();
  const email = document.getElementById('upd-t-email').value.trim();
  const addr = document.getElementById('upd-t-addr').value.trim();
  const pass = document.getElementById('upd-t-pass').value.trim();
  const bank = document.getElementById('upd-t-bank').value.trim();
  if (phone) data.phone = phone;
  if (email) data.email = email;
  if (addr) data.address = addr;
  if (pass) data.password = pass;
  if (bank) data.bank_name = bank;
  if (!Object.keys(data).length) { showToast('Enter at least one field to update', 'error'); return; }
  try {
    await api.put(`/teachers/${tid}`, data);
    showToast('Teacher updated!');
    closeModal();
    renderTeachers();
  } catch (e) { showToast(e.message, 'error'); }
}

async function viewTeacherAssignments(tid, name) {
  const res = await api.get(`/assignments?teacher_id=${tid}`);
  const assignments = res.data || [];
  showModal(`${name}'s Assignments`, `
    ${assignments.length ? `
      <table>
        <thead><tr><th>Class</th><th>Section</th><th>Subject</th><th>Role</th></tr></thead>
        <tbody>
          ${assignments.map(a => `
            <tr>
              <td>${a.class_name}</td>
              <td>${a.section_name}</td>
              <td>${a.subject_name}</td>
              <td><span class="badge ${a.role === 'Class Teacher' ? 'badge-gold' : 'badge-blue'}">${a.role}</span></td>
            </tr>
          `).join('')}
        </tbody>
      </table>` : emptyState('📋','No assignments','Teacher has no class assignments yet')}
  `, `<button class="btn-primary" onclick="closeModal()">Close</button>`);
}

function removeTeacherConfirm(tid, name) {
  showModal('Remove Teacher', `
    <p>Remove <strong>${name}</strong>?</p>
    <div class="form-group" style="margin-top:16px"><label>Reason</label><textarea id="remove-reason" placeholder="Reason for removal"></textarea></div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-danger" onclick="doRemoveTeacher(${tid})">Remove</button>
  `);
}

async function doRemoveTeacher(tid) {
  const reason = document.getElementById('remove-reason').value.trim() || 'Not specified';
  try {
    await api.delete(`/teachers/${tid}`, { reason });
    showToast('Teacher removed');
    closeModal();
    renderTeachers();
  } catch (e) { showToast(e.message, 'error'); }
}