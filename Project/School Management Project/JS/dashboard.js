async function renderDashboard() {
  const ca = document.getElementById('content-area');
  const role = currentUser?.role;

  try {
    const res = await api.get('/stats');
    const s = res.data;

    const roleLabel = { director:'Director', principal:'Principal', administrator:'Administrator', teacher:'Teacher' };
    const roleBadge = { director:'badge-purple', principal:'badge-blue', administrator:'badge-gold', teacher:'badge-green' };

    // ── DIRECTOR DASHBOARD ──────────────────────────────────────────────────
    if (role === 'director') {
      ca.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">📊 Director Dashboard</h1>
            <p class="page-subtitle">Welcome, ${currentUser?.name}! Full school overview.</p>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card blue"><div class="stat-icon">👨‍🎓</div><div class="stat-label">Total Students</div><div class="stat-value">${s.total_students}</div></div>
          <div class="stat-card gold"><div class="stat-icon">👨‍🏫</div><div class="stat-label">Total Teachers</div><div class="stat-value">${s.total_teachers}</div></div>
          <div class="stat-card green"><div class="stat-icon">🏫</div><div class="stat-label">Active Classes</div><div class="stat-value">${s.total_classes}</div></div>
          <div class="stat-card purple"><div class="stat-icon">📝</div><div class="stat-label">Exams Created</div><div class="stat-value">${s.total_exams}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div class="card">
            <div class="card-header"><span class="card-title">📌 Quick Actions</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <button class="btn-secondary full-width" onclick="navigate('director-users')">👤 Manage Admins</button>
              <button class="btn-secondary full-width" onclick="navigate('fees')">💳 Fee Collection</button>
              <button class="btn-secondary full-width" onclick="navigate('salary')">💰 All Salaries</button>
              <button class="btn-secondary full-width" onclick="navigate('teachers')">👨‍🏫 Manage Teachers</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title">ℹ️ System Info</span></div>
            <div class="card-body">
              <table><tbody>
                <tr><td>System</td><td><span class="badge badge-green">Online</span></td></tr>
                <tr><td>Database</td><td><span class="badge badge-green">MySQL Connected</span></td></tr>
                <tr><td>Excel Sync</td><td><span class="badge badge-blue">Enabled</span></td></tr>
                <tr><td>Your Role</td><td><span class="badge badge-purple">Director</span></td></tr>
              </tbody></table>
            </div>
          </div>
        </div>`;
      return;
    }

    // ── PRINCIPAL DASHBOARD ─────────────────────────────────────────────────
    if (role === 'principal') {
      ca.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">🏫 Principal Dashboard</h1>
            <p class="page-subtitle">Welcome, ${currentUser?.name}! Academic overview.</p>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card blue"><div class="stat-icon">👨‍🎓</div><div class="stat-label">Total Students</div><div class="stat-value">${s.total_students}</div></div>
          <div class="stat-card gold"><div class="stat-icon">👨‍🏫</div><div class="stat-label">Total Teachers</div><div class="stat-value">${s.total_teachers}</div></div>
          <div class="stat-card green"><div class="stat-icon">🏫</div><div class="stat-label">Active Classes</div><div class="stat-value">${s.total_classes}</div></div>
          <div class="stat-card purple"><div class="stat-icon">📝</div><div class="stat-label">Exams Scheduled</div><div class="stat-value">${s.total_exams}</div></div>
        </div>
        <div class="card" style="margin-top:0">
          <div class="card-header"><span class="card-title">📌 Quick Actions</span></div>
          <div class="card-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px">
            <button class="btn-secondary full-width" onclick="navigate('principal-academic')">🏫 Academic Overview</button>
            <button class="btn-secondary full-width" onclick="navigate('exams')">📅 Exam Timetable</button>
            <button class="btn-secondary full-width" onclick="navigate('assignments')">📋 Assign Teachers</button>
            <button class="btn-secondary full-width" onclick="navigate('report')">📄 Report Cards</button>
            <button class="btn-secondary full-width" onclick="navigate('notices')">📢 Post Notice</button>
            <button class="btn-secondary full-width" onclick="navigate('students')">👨‍🎓 View Students</button>
          </div>
        </div>`;
      return;
    }

    // ── ADMINISTRATOR DASHBOARD ─────────────────────────────────────────────
    if (role === 'administrator') {
      ca.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">📊 Administrator Dashboard</h1>
            <p class="page-subtitle">Welcome, ${currentUser?.name}! School management overview.</p>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card blue"><div class="stat-icon">👨‍🎓</div><div class="stat-label">Total Students</div><div class="stat-value">${s.total_students}</div></div>
          <div class="stat-card gold"><div class="stat-icon">👨‍🏫</div><div class="stat-label">Total Teachers</div><div class="stat-value">${s.total_teachers}</div></div>
          <div class="stat-card green"><div class="stat-icon">🏫</div><div class="stat-label">Active Classes</div><div class="stat-value">${s.total_classes}</div></div>
          <div class="stat-card purple"><div class="stat-icon">📝</div><div class="stat-label">Exams Created</div><div class="stat-value">${s.total_exams}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div class="card">
            <div class="card-header"><span class="card-title">📌 Quick Actions</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <button class="btn-secondary full-width" onclick="navigate('classes')">🏫 Add Classes</button>
              <button class="btn-secondary full-width" onclick="navigate('students')">👨‍🎓 Manage Students</button>
              <button class="btn-secondary full-width" onclick="navigate('admin-teacher-creds')">🔐 Teacher IDs</button>
              <button class="btn-secondary full-width" onclick="navigate('student-access')">🔑 Student IDs</button>
            </div>
          </div>
          <div class="card">
            <div class="card-header"><span class="card-title">ℹ️ System Info</span></div>
            <div class="card-body">
              <table><tbody>
                <tr><td>System</td><td><span class="badge badge-green">Online</span></td></tr>
                <tr><td>Database</td><td><span class="badge badge-green">MySQL Connected</span></td></tr>
                <tr><td>Excel Sync</td><td><span class="badge badge-blue">Enabled</span></td></tr>
                <tr><td>Your Role</td><td><span class="badge badge-gold">Administrator</span></td></tr>
              </tbody></table>
            </div>
          </div>
        </div>`;
      return;
    }

    // ── TEACHER DASHBOARD ───────────────────────────────────────────────────
    if (role === 'teacher') {
      // Fetch teacher's own assignments
      let myClasses = [];
      try {
        const assignRes = await api.get('/assignments');
        myClasses = (assignRes.data || []).filter(a => a.teacher_id === currentUser?.teacher_id);
      } catch(_) {}

      ca.innerHTML = `
        <div class="page-header">
          <div>
            <h1 class="page-title">👨‍🏫 Teacher Dashboard</h1>
            <p class="page-subtitle">Welcome, ${currentUser?.name}!</p>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card gold"><div class="stat-icon">🏫</div><div class="stat-label">My Classes</div><div class="stat-value">${myClasses.length || '—'}</div></div>
          <div class="stat-card blue"><div class="stat-icon">👨‍🎓</div><div class="stat-label">Total Students</div><div class="stat-value">${s.total_students}</div></div>
          <div class="stat-card purple"><div class="stat-icon">📝</div><div class="stat-label">Exams</div><div class="stat-value">${s.total_exams}</div></div>
          <div class="stat-card green"><div class="stat-icon">📢</div><div class="stat-label">Active Classes</div><div class="stat-value">${s.total_classes}</div></div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <div class="card">
            <div class="card-header"><span class="card-title">📌 Quick Actions</span></div>
            <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
              <button class="btn-secondary full-width" onclick="navigate('exams')">✏️ Enter / Update Marks</button>
              <button class="btn-secondary full-width" onclick="navigate('timetable')">📅 My Timetable</button>
              <button class="btn-secondary full-width" onclick="navigate('notices')">📢 Post Notice to Students</button>
            </div>
          </div>
          ${myClasses.length ? `
          <div class="card">
            <div class="card-header"><span class="card-title">📚 My Assigned Classes</span></div>
            <div class="card-body">
              <table><thead><tr><th>Class</th><th>Section</th><th>Subject</th></tr></thead>
              <tbody>${myClasses.slice(0,8).map(a=>`<tr>
                <td>${a.class_name||'—'}</td>
                <td>${a.section_name||'—'}</td>
                <td>${a.subject_name||'—'}</td>
              </tr>`).join('')}</tbody></table>
            </div>
          </div>` : `
          <div class="card">
            <div class="card-header"><span class="card-title">📚 My Classes</span></div>
            <div class="card-body">${emptyState('📋','No assignments yet','You have not been assigned any classes.')}</div>
          </div>`}
        </div>`;
      return;
    }

    // ── FALLBACK ────────────────────────────────────────────────────────────
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('👋','Welcome','Dashboard loading...')}</div></div>`;

  } catch (e) {
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('⚠️', 'Cannot connect to server', 'Make sure the Flask backend is running on port 5000')}</div></div>`;
  }
}
