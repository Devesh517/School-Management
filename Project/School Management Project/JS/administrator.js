// administrator.js — Administrator: generate credentials

async function renderAdminTeacherCreds() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading('Loading teachers...');
  try {
    const res = await api.get('/teachers');
    const teachers = res.data || [];

    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">🔐 Teacher IDs & Passwords</h1>
          <p class="page-subtitle">Generate or reset login credentials for teachers</p></div>
      </div>
      <div class="card">
        <div class="card-body">
          <table>
            <thead><tr><th>Teacher ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Action</th></tr></thead>
            <tbody>
              ${teachers.map(t=>`<tr>
                <td>${t.teacher_id}</td>
                <td>${t.name}</td>
                <td>${t.email||'—'}</td>
                <td>${t.phone||'—'}</td>
                <td>
                  <button class="btn-primary btn-sm" onclick="showTeacherCredModal(${t.id},'${t.name}')">
                    Set Credentials
                  </button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card" style="margin-top:24px">
        <div class="card-header"><span class="card-title">⚡ Bulk Generate Student Credentials</span></div>
        <div class="card-body">
          <p style="color:var(--text-secondary);margin-bottom:16px">
            Auto-generate username/password for all students in a section who don't have credentials yet.
          </p>
          <div class="form-grid">
            <div class="form-group"><label>Class</label>
              <select id="bg-class" class="form-control" onchange="loadBGSections(this.value)">
                <option value="">Select Class</option></select></div>
            <div class="form-group"><label>Section</label>
              <select id="bg-section" class="form-control"><option value="">Select Section</option></select></div>
            <div class="form-group"><label>Username Prefix</label>
              <input id="bg-prefix" class="form-control" value="STU" placeholder="STU"/></div>
          </div>
          <button class="btn-primary" onclick="bulkGenerate()" style="margin-top:16px">Generate All</button>
          <div id="bg-result"></div>
        </div>
      </div>`;

    const classRes = await api.get('/classes');
    const sel = document.getElementById('bg-class');
    (classRes.data||[]).forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.class_name}</option>`));

  } catch(e) {
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('⚠️','Error',e.message)}</div></div>`;
  }
}

async function loadBGSections(classId) {
  if (!classId) return;
  const res = await api.get(`/classes/${classId}/sections`);
  const sel = document.getElementById('bg-section');
  sel.innerHTML = '<option value="">Select Section</option>' +
    (res.data||[]).map(s=>`<option value="${s.id}">${s.section_name}</option>`).join('');
}

async function bulkGenerate() {
  const classId   = document.getElementById('bg-class').value;
  const sectionId = document.getElementById('bg-section').value;
  const prefix    = document.getElementById('bg-prefix').value.trim() || 'STU';
  if (!classId || !sectionId) { showToast('Select class and section', 'error'); return; }
  try {
    const res = await api.post('/administrator/bulk-generate', { class_id: classId, section_id: sectionId, prefix });
    const created = res.data?.created || [];
    const resultEl = document.getElementById('bg-result');
    if (created.length === 0) {
      resultEl.innerHTML = `<p style="color:var(--text-secondary);margin-top:12px">All students already have credentials.</p>`;
      return;
    }
    resultEl.innerHTML = `
      <div class="card" style="margin-top:20px">
        <div class="card-header"><span class="card-title">✅ ${created.length} Credentials Created</span></div>
        <div class="card-body"><table>
          <thead><tr><th>Name</th><th>Username</th><th>Password</th></tr></thead>
          <tbody>${created.map(c=>`<tr>
            <td>${c.name}</td>
            <td><strong>${c.username}</strong></td>
            <td><code>${c.password}</code></td>
          </tr>`).join('')}</tbody>
        </table></div>
      </div>`;
    showToast(`${created.length} credentials generated!`, 'success');
  } catch(e) { showToast(e.message, 'error'); }
}

function showTeacherCredModal(teacherDbId, teacherName) {
  openModal(`Set Credentials — ${teacherName}`, `
    <div class="form-grid">
      <div class="form-group"><label>Username *</label>
        <input id="tc-username" class="form-control" placeholder="Login username"/></div>
      <div class="form-group"><label>Password *</label>
        <input id="tc-password" type="password" class="form-control" placeholder="Password"/></div>
    </div>`,
    [{ label: 'Save', class: 'btn-primary', action: `saveTeacherCreds(${teacherDbId})` }]);
}

async function saveTeacherCreds(teacherDbId) {
  const username = document.getElementById('tc-username').value.trim();
  const password = document.getElementById('tc-password').value.trim();
  if (!username || !password) { showToast('Username and password required', 'error'); return; }
  try {
    await api.post('/administrator/generate-teacher-credentials', {
      teacher_db_id: teacherDbId, username, password
    });
    showToast('Teacher credentials saved!', 'success');
    closeModal();
  } catch(e) { showToast(e.message, 'error'); }
}