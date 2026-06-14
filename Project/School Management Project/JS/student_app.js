// student_app.js  –  Student Portal main logic

let currentUser = JSON.parse(localStorage.getItem('studentUser')) || null;

// ── LOGIN ────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errEl    = document.getElementById('login-error');
  const btn      = e.target.querySelector('.btn-primary');

  btn.disabled = true;
  errEl.classList.add('hidden');

  try {
    const res = await api.post('/login', { username, password });

    if (res.data.role !== 'student') {
      throw { message: 'This portal is for students only. Use the staff login.' };
    }

    currentUser = res.data;
    localStorage.setItem('studentUser', JSON.stringify(currentUser));
    _applyUserToUI();
    document.getElementById('page-login').classList.replace('active', 'hidden');
    document.getElementById('page-app').classList.remove('hidden');
    navigate('dashboard');
  } catch (err) {
    errEl.textContent = err.message || 'Invalid credentials';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('studentUser');
  document.getElementById('page-app').classList.add('hidden');
  document.getElementById('page-login').classList.replace('hidden', 'active');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function _applyUserToUI() {
  const si = currentUser.student_info;
  document.getElementById('user-name').textContent   = currentUser.name;
  document.getElementById('user-avatar').textContent = currentUser.name[0].toUpperCase();
  document.getElementById('user-role').textContent   =
    `Class ${si.class_name} – Sec ${si.section_name}`;
}

// ── NAVIGATION ───────────────────────────────────────────────────────────────
function navigate(page) {
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading('Loading…');

  const renderers = {
    dashboard:   renderStudentDashboard,
    'my-marks':  renderMyMarks,
    exams:       renderExamTimetable,
    timetable:   renderStudentTimetable,
    attendance:  renderMyAttendance,
    notices:     renderStudentNotices,
    'report-card': renderReportCard,
  };
  if (renderers[page]) renderers[page]();
}

document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
});

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// ── DASHBOARD ────────────────────────────────────────────────────────────────
async function renderStudentDashboard() {
  const si  = currentUser.student_info;
  const ca  = document.getElementById('content-area');

  try {
    // fetch marks + upcoming exams in parallel
    const [marksRes, examsRes, noticesRes] = await Promise.all([
      api.get(`/student/my-marks?student_db_id=${si.student_db_id}`),
      api.get(`/student/upcoming-exams?student_db_id=${si.student_db_id}`),
      api.get('/notices?target=student_view'),
    ]);

    const marks      = marksRes.data || [];
    const allExams   = examsRes.data || [];
    const notices    = (noticesRes.data || []).slice(0, 3);
    const today      = new Date().toISOString().split('T')[0];
    const upcoming   = allExams.filter(e => e.exam_date && e.exam_date >= today).slice(0, 5);

    // overall percentage
    let totPct = 0, pctCount = 0;
    marks.forEach(m => { if (m.percentage != null) { totPct += m.percentage; pctCount++; } });
    const avgPct = pctCount ? (totPct / pctCount).toFixed(1) : null;

    ca.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">My Dashboard</h1>
      </div>

      <div class="student-welcome-banner">
        <div class="welcome-avatar">${currentUser.name[0].toUpperCase()}</div>
        <div class="welcome-text">
          <h2>Welcome back, ${currentUser.name}!</h2>
          <p>Class ${si.class_name} &nbsp;•&nbsp; Section ${si.section_name}</p>
        </div>
      </div>

      <div class="student-stats-row">
        <div class="student-stat-card">
          <div class="student-stat-icon">📝</div>
          <div class="student-stat-info">
            <div class="stat-value">${marks.length}</div>
            <div class="stat-label">Exams Appeared</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon">📊</div>
          <div class="student-stat-info">
            <div class="stat-value">${avgPct !== null ? avgPct + '%' : '–'}</div>
            <div class="stat-label">Avg Percentage</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon">📅</div>
          <div class="student-stat-info">
            <div class="stat-value">${upcoming.length}</div>
            <div class="stat-label">Upcoming Exams</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon">📢</div>
          <div class="student-stat-info">
            <div class="stat-value">${notices.length}</div>
            <div class="stat-label">New Notices</div>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;flex-wrap:wrap;">

        <!-- upcoming exams -->
        <div class="card" style="grid-column:1">
          <div class="card-header">
            <h3 class="card-title">📅 Upcoming Exams</h3>
            <button class="btn-secondary btn-sm" onclick="navigate('exams')">View All</button>
          </div>
          ${upcoming.length ? upcoming.map(e => `
            <div class="upcoming-exam-pill">
              <div class="uep-date">${_fmtDateShort(e.exam_date)}</div>
              <div>
                <div class="uep-subject">${e.subject_name}</div>
                <div class="uep-exam">${e.exam_name}</div>
              </div>
              <div class="uep-time">${e.start_time ? e.start_time.slice(0,5) : ''}</div>
            </div>
          `).join('') : `<div class="student-empty"><div class="empty-icon">✅</div><p>No upcoming exams</p></div>`}
        </div>

        <!-- recent notices -->
        <div class="card" style="grid-column:2">
          <div class="card-header">
            <h3 class="card-title">📢 Recent Notices</h3>
            <button class="btn-secondary btn-sm" onclick="navigate('notices')">View All</button>
          </div>
          ${notices.length ? notices.map(n => `
            <div class="notice-card" style="margin-bottom:10px;">
              <div class="notice-card-header">
                <div class="notice-card-title">${n.title}</div>
                <div class="notice-card-meta">${_fmtDate(n.created_at)}</div>
              </div>
              <div class="notice-card-body">${n.content.slice(0,120)}${n.content.length > 120 ? '…' : ''}</div>
            </div>
          `).join('') : `<div class="student-empty"><div class="empty-icon">📭</div><p>No notices yet</p></div>`}
        </div>

      </div>

      <!-- recent results -->
      ${marks.length ? `
      <div class="card" style="margin-top:20px;">
        <div class="card-header">
          <h3 class="card-title">📋 Recent Results</h3>
          <button class="btn-secondary btn-sm" onclick="navigate('my-marks')">View All</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Exam</th><th>Date</th><th>Total</th><th>Percentage</th><th>Grade</th></tr></thead>
          <tbody>
            ${marks.slice(-5).reverse().map(m => `
              <tr>
                <td>${m.exam_name}</td>
                <td>${m.exam_date ? _fmtDate(m.exam_date) : '–'}</td>
                <td>${m.total}/${m.max_total}</td>
                <td>${m.percentage}%</td>
                <td><span class="grade-badge grade-${m.grade}">${m.grade}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>` : ''}
    `;
  } catch (e) {
    ca.innerHTML = `<div class="error-state">Failed to load dashboard: ${e.message}</div>`;
  }
}

// ── REPORT CARD PAGE ─────────────────────────────────────────────────────────
async function renderReportCard() {
  const si = currentUser.student_info;
  const ca = document.getElementById('content-area');

  try {
    const res = await api.get(
      `/report-card/preview/${si.student_id}?class_name=${si.class_name}&section_name=${si.section_name}`
    );
    const d = res.data;

    ca.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📄 My Report Card</h1>
      </div>

      <div class="report-download-card">
        <div>
          <h3>${d.student_name}</h3>
          <p>Class ${d.class_name} – Section ${d.section_name} &nbsp;•&nbsp;
             Overall: ${d.final_percent}% &nbsp;•&nbsp;
             Grade: ${d.final_grade} &nbsp;•&nbsp;
             Result: <strong>${d.result}</strong></p>
        </div>
        <button class="btn-download-rc" onclick="downloadReportCard()">⬇ Download PDF</button>
      </div>

      ${d.exam_results.map(er => `
        <div class="card" style="margin-bottom:16px;">
          <div class="card-header">
            <div>
              <h3 class="card-title">${er.exam_name}</h3>
              <p style="font-size:0.8rem;color:var(--text-muted);margin-top:2px;">
                ${er.start_date ? _fmtDate(er.start_date) : ''}
              </p>
            </div>
            <div style="text-align:right;">
              <span class="grade-badge grade-${er.grade}">${er.grade}</span>
              <p style="font-size:0.82rem;margin-top:4px;color:var(--text-muted);">${er.percentage}%</p>
            </div>
          </div>
          <table class="data-table">
            <thead><tr><th>Subject</th><th>Marks Obtained</th><th>Max Marks</th></tr></thead>
            <tbody>
              ${er.subjects.map(s => `
                <tr>
                  <td>${s.subject_name}</td>
                  <td>${s.marks_obtained}</td>
                  <td>${er.max_marks}</td>
                </tr>
              `).join('')}
              <tr style="font-weight:700;background:var(--surface2);">
                <td>Total</td><td>${er.total}</td><td>${er.max_total}</td>
              </tr>
            </tbody>
          </table>
          <div style="margin-top:10px;">
            <div style="display:flex;justify-content:space-between;font-size:0.8rem;color:var(--text-muted);margin-bottom:4px;">
              <span>Performance</span><span>${er.percentage}%</span>
            </div>
            <div class="progress-bar-wrap">
              <div class="progress-bar-fill ${_pctClass(er.percentage)}" style="width:${er.percentage}%"></div>
            </div>
          </div>
        </div>
      `).join('')}

      <div class="card" style="background:linear-gradient(135deg,var(--surface),var(--surface2));margin-top:8px;">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;">
          <div>
            <p style="font-size:0.8rem;color:var(--text-muted);">Overall Result</p>
            <p style="font-size:1.5rem;font-weight:700;">${d.final_total} / ${d.final_max}
              &nbsp;<span class="grade-badge grade-${d.final_grade}">${d.final_grade}</span>
            </p>
            <p style="font-size:0.85rem;color:var(--text-muted);">${d.final_percent}% — <strong>${d.result}</strong></p>
          </div>
          <button class="btn-primary" onclick="downloadReportCard()">⬇ Download Full Report Card PDF</button>
        </div>
      </div>
    `;
  } catch (e) {
    ca.innerHTML = `
      <div class="page-header"><h1 class="page-title">📄 My Report Card</h1></div>
      <div class="student-empty">
        <div class="empty-icon">📭</div>
        <h3>No results available yet</h3>
        <p>Your report card will appear here once your teacher enters your marks.</p>
      </div>`;
  }
}

async function downloadReportCard() {
  const si = currentUser.student_info;
  const url = `${api.BASE}/student/report-card/${si.student_db_id}`;
  window.open(url, '_blank');
}

// ── ATTENDANCE PAGE ──────────────────────────────────────────────────────────
async function renderMyAttendance() {
  const si = currentUser.student_info;
  const ca = document.getElementById('content-area');

  try {
    const res = await api.get(`/student/attendance?student_db_id=${si.student_db_id}`);
    const d   = res.data;

    const r   = 38, circ = 2 * Math.PI * r;
    const dashOffset = circ - (d.percentage / 100) * circ;
    const ringColor  = d.percentage >= 75 ? '#10b981' : d.percentage >= 60 ? '#f59e0b' : '#ef4444';

    ca.innerHTML = `
      <div class="page-header"><h1 class="page-title">✅ My Attendance</h1></div>

      <div class="att-summary-row">
        <div class="att-ring-wrap">
          <svg viewBox="0 0 90 90">
            <circle cx="45" cy="45" r="${r}" fill="none" stroke="var(--border)" stroke-width="8"/>
            <circle cx="45" cy="45" r="${r}" fill="none" stroke="${ringColor}" stroke-width="8"
              stroke-dasharray="${circ}" stroke-dashoffset="${dashOffset}"
              stroke-linecap="round"/>
          </svg>
          <div class="att-ring-pct">${d.percentage}%</div>
        </div>
        <div class="att-summary-stats">
          <div class="att-summary-stat">
            <div class="s-val" style="color:#10b981">${d.present}</div>
            <div class="s-lbl">Present</div>
          </div>
          <div class="att-summary-stat">
            <div class="s-val" style="color:#ef4444">${d.absent}</div>
            <div class="s-lbl">Absent</div>
          </div>
          <div class="att-summary-stat">
            <div class="s-val">${d.total}</div>
            <div class="s-lbl">Total Days</div>
          </div>
        </div>
      </div>

      ${d.percentage < 75 ? `
        <div class="alert alert-warning" style="margin-bottom:18px;padding:12px 16px;background:#fef3c7;border:1px solid #f59e0b;border-radius:10px;color:#92400e;font-size:0.87rem;">
          ⚠️ Your attendance is below 75%. Please improve attendance to avoid issues.
        </div>` : ''}

      <div class="card">
        <div class="card-header"><h3 class="card-title">Attendance Log</h3></div>
        <table class="data-table">
          <thead><tr><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            ${d.records.length ? d.records.map(r => `
              <tr>
                <td>${_fmtDate(r.date)}</td>
                <td>
                  ${r.status === 'P'
                    ? '<span style="color:#10b981;font-weight:600;">✓ Present</span>'
                    : '<span style="color:#ef4444;font-weight:600;">✗ Absent</span>'}
                </td>
              </tr>
            `).join('') : '<tr><td colspan="2" style="text-align:center;color:var(--text-muted)">No records yet</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } catch (e) {
    ca.innerHTML = `<div class="error-state">Failed to load attendance: ${e.message}</div>`;
  }
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function _fmtDate(d) {
  if (!d) return '–';
  return new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
}
function _fmtDateShort(d) {
  if (!d) return '–';
  const dt = new Date(d);
  return `${dt.toLocaleDateString('en-IN',{day:'2-digit',month:'short'})}`;
}
function _pctClass(p) {
  if (p >= 75) return 'success';
  if (p >= 50) return 'warning';
  return 'danger';
}

// ── INIT ─────────────────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (currentUser && currentUser.role === 'student') {
    _applyUserToUI();
    document.getElementById('page-login').classList.replace('active','hidden');
    document.getElementById('page-app').classList.remove('hidden');
    navigate('dashboard');
  }
});

// Student timetable view
async function renderStudentTimetable() {
  const ca = document.getElementById('content-area');
  const si = currentUser?.student_info;
  if (!si) { ca.innerHTML = `<div class="card"><div class="card-body">Please login first.</div></div>`; return; }

  ca.innerHTML = loading('Loading timetable...');
  try {
    const res = await api.get(`/timetable?class_id=${si.class_id}&section_id=${si.section_id}`);
    const entries = res.data || [];

    const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const PERIODS = [1,2,3,4,5,6,7,8];
    const map = {};
    entries.forEach(e => { if (!map[e.day_of_week]) map[e.day_of_week]={}; map[e.day_of_week][e.period_no]=e; });

    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">📅 My Timetable</h1>
          <p class="page-subtitle">${si.class_name} — Section ${si.section_name}</p></div>
      </div>
      <div class="card">
        <div class="card-body" style="overflow-x:auto">
          ${entries.length === 0
            ? '<p style="text-align:center;color:var(--text-secondary)">Timetable not published yet.</p>'
            : `<table>
              <thead><tr>
                <th>Day</th>
                ${PERIODS.map(p=>`<th>P${p}</th>`).join('')}
              </tr></thead>
              <tbody>
                ${DAYS.map(day=>`<tr>
                  <td><strong>${day.slice(0,3)}</strong></td>
                  ${PERIODS.map(p => {
                    const e = map[day]?.[p];
                    if (e) return `<td style="background:var(--bg-secondary);border-radius:6px;padding:6px;font-size:12px">
                      <div style="font-weight:600">${e.subject_name}</div>
                      <div style="color:var(--text-secondary);font-size:10px">${e.teacher_name}</div>
                      <div style="color:var(--text-tertiary);font-size:10px">${e.start_time||''}</div>
                    </td>`;
                    return `<td style="color:var(--text-tertiary)">—</td>`;
                  }).join('')}
                </tr>`).join('')}
              </tbody>
            </table>`}
        </div>
      </div>`;
  } catch(e) {
    ca.innerHTML = `<div class="card"><div class="card-body">${e.message}</div></div>`;
  }
}