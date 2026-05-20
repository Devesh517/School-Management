async function renderDashboard() {
  const ca = document.getElementById('content-area');
  try {
    const res = await api.get('/stats');
    const s = res.data;
    ca.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Dashboard</h1>
          <p class="page-subtitle">Welcome back, ${currentUser?.name || 'User'}! Here's your school overview.</p>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card blue">
          <div class="stat-icon">👨‍🎓</div>
          <div class="stat-label">Total Students</div>
          <div class="stat-value">${s.total_students}</div>
        </div>
        <div class="stat-card gold">
          <div class="stat-icon">👨‍🏫</div>
          <div class="stat-label">Total Teachers</div>
          <div class="stat-value">${s.total_teachers}</div>
        </div>
        <div class="stat-card green">
          <div class="stat-icon">🏫</div>
          <div class="stat-label">Active Classes</div>
          <div class="stat-value">${s.total_classes}</div>
        </div>
        <div class="stat-card purple">
          <div class="stat-icon">📝</div>
          <div class="stat-label">Exams Created</div>
          <div class="stat-value">${s.total_exams}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="card">
          <div class="card-header"><span class="card-title">📌 Quick Actions</span></div>
          <div class="card-body" style="display:flex;flex-direction:column;gap:12px">
            ${currentUser?.role === 'admin' ? `
              <button class="btn-secondary full-width" onclick="navigate('classes')">🏫 Manage Classes</button>
              <button class="btn-secondary full-width" onclick="navigate('students')">👨‍🎓 Manage Students</button>
              <button class="btn-secondary full-width" onclick="navigate('teachers')">👨‍🏫 Manage Teachers</button>
              <button class="btn-secondary full-width" onclick="navigate('salary')">💰 Process Salary</button>
            ` : `
              <button class="btn-secondary full-width" onclick="navigate('attendance')">✅ Mark Attendance</button>
              <button class="btn-secondary full-width" onclick="navigate('exams')">📝 Enter Marks</button>
              <button class="btn-secondary full-width" onclick="navigate('report')">📄 View Report Cards</button>
            `}
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">ℹ️ System Info</span></div>
          <div class="card-body">
            <table>
              <tbody>
                <tr><td>System</td><td><span class="badge badge-green">Online</span></td></tr>
                <tr><td>Database</td><td><span class="badge badge-green">MySQL Connected</span></td></tr>
                <tr><td>Excel Sync</td><td><span class="badge badge-blue">Enabled</span></td></tr>
                <tr><td>Your Role</td><td><span class="badge badge-gold">${currentUser?.role === 'admin' ? 'Administrator' : 'Teacher'}</span></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) {
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('⚠️', 'Cannot connect to server', 'Make sure the Flask backend is running on port 5000')}</div></div>`;
  }
}