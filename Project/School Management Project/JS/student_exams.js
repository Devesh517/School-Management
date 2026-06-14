// student_exams.js  –  Exam timetable page for student portal

async function renderExamTimetable() {
  const si = currentUser.student_info;
  const ca = document.getElementById('content-area');

  try {
    const res  = await api.get(`/student/upcoming-exams?student_db_id=${si.student_db_id}`);
    const rows = res.data || [];

    if (!rows.length) {
      ca.innerHTML = `
        <div class="page-header"><h1 class="page-title">📅 Exam Timetable</h1></div>
        <div class="student-empty">
          <div class="empty-icon">📭</div>
          <h3>No exams scheduled yet</h3>
          <p>Your exam timetable will appear here once your class teacher creates it.</p>
        </div>`;
      return;
    }

    // Group by exam_name
    const groups = {};
    rows.forEach(r => {
      if (!groups[r.exam_name]) groups[r.exam_name] = [];
      groups[r.exam_name].push(r);
    });

    const today = new Date().toISOString().split('T')[0];

    ca.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📅 Exam Timetable</h1>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">
          Class ${si.class_name} – Section ${si.section_name}
        </p>
      </div>

      <!-- Download section -->
      <div class="card" style="margin-bottom:24px;">
        <div class="card-header"><h3 class="card-title">⬇ Download Timetable PDF</h3></div>
        ${Object.keys(groups).map(examName => `
          <div class="exam-download-row">
            <div>
              <div class="exam-name">${examName}</div>
              <div class="exam-sub-count">${groups[examName].length} subject(s)</div>
            </div>
            <button class="btn-primary btn-sm" onclick="downloadTimetablePDF('${examName.replace(/'/g,"\\'")}')">
              ⬇ Download PDF
            </button>
          </div>
        `).join('')}
      </div>

      <!-- Timetable by exam group -->
      ${Object.entries(groups).map(([examName, exams]) => {
        const upcoming = exams.filter(e => e.exam_date && e.exam_date >= today);
        const past     = exams.filter(e => !e.exam_date || e.exam_date < today);
        return `
          <div class="timetable-group">
            <div class="timetable-group-title">📋 ${examName}</div>
            <table class="data-table">
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Start Time</th>
                  <th>End Time</th>
                  <th>Max Marks</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${exams.map(e => {
                  const isPast = e.exam_date && e.exam_date < today;
                  const isToday = e.exam_date === today;
                  return `
                    <tr ${isToday ? 'style="background:var(--accent-subtle,#ede9fe);"' : ''}>
                      <td><strong>${e.subject_name}</strong></td>
                      <td>${e.exam_date ? _fmtDate(e.exam_date) : '–'}</td>
                      <td>${e.start_time ? e.start_time.slice(0,5) : '–'}</td>
                      <td>${e.end_time   ? e.end_time.slice(0,5)   : '–'}</td>
                      <td>${e.max_marks}</td>
                      <td>
                        ${isToday
                          ? '<span style="color:#f59e0b;font-weight:600;">📌 Today</span>'
                          : isPast
                            ? '<span style="color:var(--text-muted);">Completed</span>'
                            : '<span style="color:#10b981;font-weight:600;">Upcoming</span>'}
                      </td>
                    </tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}
    `;
  } catch (e) {
    ca.innerHTML = `<div class="error-state">Failed to load timetable: ${e.message}</div>`;
  }
}

async function downloadTimetablePDF(examName) {
  const si  = currentUser.student_info;
  const url = `${api.BASE}/student/timetable-pdf?student_db_id=${si.student_db_id}&exam_name=${encodeURIComponent(examName)}`;
  window.open(url, '_blank');
}
