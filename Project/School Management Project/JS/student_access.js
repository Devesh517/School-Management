// student_access.js  –  Admin page: create/reset student portal credentials

async function renderStudentAccess() {
  const ca = document.getElementById('content-area');

  // Load all classes for the filter dropdown
  try {
    const classRes = await api.get('/classes');
    const classes  = (classRes.data || []).filter(c => c.status === 'Active');

    ca.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">🔑 Student Portal Access</h1>
        
      </div>

      <!-- Class / Section selector -->
      <div class="card" style="margin-bottom:20px;">
        <div class="card-header"><h3 class="card-title">Select Class & Section</h3></div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:flex-end; margin:12px 14px 18px 14px;">
          <div class="form-group" style="min-width:160px;margin:0;">
            <label>Class</label>
            <select id="sa-class" class="form-input" onchange="loadSASection()">
              <option value="">-- Select Class --</option>
              ${classes.map(c => `<option value="${c.id}" data-name="${c.class_name}">${c.class_name}</option>`).join('')}
            </select>
          </div>
          <div class="form-group" style="min-width:140px;margin:0;">
            <label>Section</label>
            <select id="sa-section" class="form-input" disabled>
              <option value="">-- Select Section --</option>
            </select>
          </div>
          <button class="btn-primary" onclick="loadSAStudents()">Load Students</button>
        </div>
      </div>

      <div id="sa-students-area"></div>
    `;
  } catch (e) {
    ca.innerHTML = `<div class="error-state">Failed to load: ${e.message}</div>`;
  }
}

async function loadSASection() {
  const classSelect   = document.getElementById('sa-class');
  const sectionSelect = document.getElementById('sa-section');
  const classId       = classSelect.value;

  sectionSelect.innerHTML = '<option value="">Loading…</option>';
  sectionSelect.disabled  = true;

  if (!classId) {
    sectionSelect.innerHTML = '<option value="">-- Select Section --</option>';
    return;
  }

  try {
    const res      = await api.get(`/classes/${classId}/sections`);
    const sections = res.data || [];
    sectionSelect.innerHTML =
      '<option value="">-- Select Section --</option>' +
      sections.map(s => `<option value="${s.section_name}">${s.section_name}</option>`).join('');
    sectionSelect.disabled = false;
  } catch (e) {
    sectionSelect.innerHTML = '<option value="">Error loading sections</option>';
  }
}

async function loadSAStudents() {
  const classEl   = document.getElementById('sa-class');
  const sectionEl = document.getElementById('sa-section');
  const className   = classEl.options[classEl.selectedIndex]?.dataset?.name;
  const sectionName = sectionEl.value;
  const area        = document.getElementById('sa-students-area');

  if (!className || !sectionName) {
    showToast('Please select both class and section', 'error');
    return;
  }

  area.innerHTML = loading('Loading students…');

  try {
    const res      = await api.get(`/students?class_name=${className}&section_name=${sectionName}`);
    const students = res.data || [];

    if (!students.length) {
      area.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-muted);">
        No students found in ${className}-${sectionName}</div>`;
      return;
    }

    // Check login status for each student in parallel
    const loginChecks = await Promise.all(
      students.map(s =>
        api.get(`/student-credentials/${s.id}`)
          .then(r => ({ id: s.id, ...r.data }))
          .catch(() => ({ id: s.id, has_login: false, username: null }))
      )
    );
    const loginMap = {};
    loginChecks.forEach(l => { loginMap[l.id] = l; });

    area.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Students — ${className} (${sectionName})</h3>
          <span style="font-size:0.82rem;color:var(--text-muted);">${students.length} students</span>
        </div>

        <div style="margin-bottom:14px;padding:12px 14px;background:var(--surface2);border-radius:10px;font-size:0.82rem;color:var(--text-muted);">
          💡 <strong>Tip:</strong> Create a username and password for each student.
          They will use these to log in at <em>student.html</em>.
        </div>

        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Student Name</th>
              <th>Portal Status</th>
              <th>Username</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            ${students.map(s => {
              const login = loginMap[s.id] || { has_login: false, username: null };
              return `
                <tr>
                  <td>${s.student_id}</td>
                  <td>${s.name}</td>
                  <td>
                    ${login.has_login
                      ? '<span style="color:#10b981;font-weight:600;">✅ Active</span>'
                      : '<span style="color:#ef4444;font-weight:600;">❌ No Login</span>'}
                  </td>
                  <td style="font-family:monospace;font-size:0.85rem;">
                    ${login.username || '–'}
                  </td>
                  <td>
                    ${login.has_login
                      ? `<button class="btn-secondary btn-sm" onclick="openResetModal(${s.id},'${s.name.replace(/'/g,"\\'")}')">
                           🔄 Reset Password
                         </button>`
                      : `<button class="btn-primary btn-sm" onclick="openCreateModal(${s.id},'${s.name.replace(/'/g,"\\'")}')">
                           + Create Login
                         </button>`}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    area.innerHTML = `<div class="error-state">Error: ${e.message}</div>`;
  }
}

// ── Create new student login ─────────────────────────────────────────────────
function openCreateModal(studentDbId, studentName) {
  openModal(`Create Login — ${studentName}`, `
    <div class="form-group">
      <label>Username</label>
      <input type="text" id="sc-username" class="form-input"
        placeholder="e.g. rahul2025 or roll number"/>
    </div>
    <div class="form-group">
      <label>Password</label>
      <input type="password" id="sc-password" class="form-input" placeholder="Set a password"/>
    </div>
    <div class="form-group">
      <label>Confirm Password</label>
      <input type="password" id="sc-confirm" class="form-input" placeholder="Confirm password"/>
    </div>
    <p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px;">
      Share these credentials with the student so they can log in at <strong>student.html</strong>
    </p>
  `, [
    { label: 'Cancel',       class: 'btn-secondary', action: 'closeModal()' },
    { label: 'Create Login', class: 'btn-primary',   action: `submitCreateLogin(${studentDbId})` },
  ]);
}

async function submitCreateLogin(studentDbId) {
  const username = document.getElementById('sc-username').value.trim();
  const password = document.getElementById('sc-password').value.trim();
  const confirm  = document.getElementById('sc-confirm').value.trim();

  if (!username || !password) {
    showToast('Username and password are required', 'error');
    return;
  }
  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }

  try {
    const res = await api.post('/student-credentials', { student_db_id: studentDbId, username, password });
    closeModal();
    showToast(res.message || 'Login created!', 'success');
    loadSAStudents();
  } catch (e) {
    showToast(e.message || 'Failed to create login', 'error');
  }
}

// ── Reset student password ───────────────────────────────────────────────────
function openResetModal(studentDbId, studentName) {
  openModal(`Reset Password — ${studentName}`, `
    <div class="form-group">
      <label>New Password</label>
      <input type="password" id="sr-password" class="form-input" placeholder="New password"/>
    </div>
    <div class="form-group">
      <label>Confirm New Password</label>
      <input type="password" id="sr-confirm" class="form-input" placeholder="Confirm new password"/>
    </div>
  `, [
    { label: 'Cancel',         class: 'btn-secondary', action: 'closeModal()' },
    { label: 'Reset Password', class: 'btn-primary',   action: `submitResetPassword(${studentDbId})` },
  ]);
}

async function submitResetPassword(studentDbId) {
  const password = document.getElementById('sr-password').value.trim();
  const confirm  = document.getElementById('sr-confirm').value.trim();

  if (!password) {
    showToast('New password is required', 'error');
    return;
  }
  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }

  try {
    await api.put(`/student-credentials/${studentDbId}`, { password });
    closeModal();
    showToast('Password reset successfully!', 'success');
    loadSAStudents();
  } catch (e) {
    showToast(e.message || 'Failed to reset password', 'error');
  }
}
// (duplicate stub removed – async renderStudentAccess above is the real implementation)