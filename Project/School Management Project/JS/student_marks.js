// student_marks.js  –  My Marks page for student portal

async function renderMyMarks() {
  const si = currentUser.student_info;
  const ca = document.getElementById('content-area');

  try {
    const res   = await api.get(`/student/my-marks?student_db_id=${si.student_db_id}`);
    const marks = res.data || [];

    if (!marks.length) {
      ca.innerHTML = `
        <div class="page-header"><h1 class="page-title">📝 My Marks</h1></div>
        <div class="student-empty">
          <div class="empty-icon">📭</div>
          <h3>No marks entered yet</h3>
          <p>Your marks will appear here once your teacher enters them.</p>
        </div>`;
      return;
    }

    // overall stats
    const avgPct = (marks.reduce((s, m) => s + m.percentage, 0) / marks.length).toFixed(1);
    const best   = marks.reduce((a, b) => a.percentage > b.percentage ? a : b);
    const worst  = marks.reduce((a, b) => a.percentage < b.percentage ? a : b);

    ca.innerHTML = `
      <div class="page-header"><h1 class="page-title">📝 My Marks</h1></div>

      <div class="student-stats-row">
        <div class="student-stat-card">
          <div class="student-stat-icon">📊</div>
          <div class="student-stat-info">
            <div class="stat-value">${avgPct}%</div>
            <div class="stat-label">Average Score</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon">🏆</div>
          <div class="student-stat-info">
            <div class="stat-value">${best.percentage}%</div>
            <div class="stat-label">Best: ${best.exam_name}</div>
          </div>
        </div>
        <div class="student-stat-card">
          <div class="student-stat-icon">📈</div>
          <div class="student-stat-info">
            <div class="stat-value">${marks.length}</div>
            <div class="stat-label">Exams Taken</div>
          </div>
        </div>
      </div>

      <div id="marks-accordion">
        ${marks.map((m, i) => `
          <div class="exam-accordion">
            <div class="exam-accordion-header" onclick="toggleAccordion(${i})">
              <div>
                <div class="exam-acc-title">${m.exam_name}</div>
                <div class="exam-acc-meta">
                  ${m.exam_date ? _fmtDate(m.exam_date) : ''}
                  &nbsp;•&nbsp; ${m.total} / ${m.max_total} marks
                </div>
              </div>
              <div class="exam-acc-right">
                <div>
                  <div class="progress-bar-wrap" style="width:100px;">
                    <div class="progress-bar-fill ${_pctClass(m.percentage)}" style="width:${m.percentage}%"></div>
                  </div>
                  <div style="font-size:0.75rem;color:var(--text-muted);margin-top:3px;text-align:right">${m.percentage}%</div>
                </div>
                <span class="grade-badge grade-${m.grade}">${m.grade}</span>
                <span class="exam-acc-chevron">▼</span>
              </div>
            </div>
            <div class="exam-accordion-body" id="acc-body-${i}">
              <table class="data-table" style="margin-top:8px;">
                <thead><tr><th>Subject</th><th>Marks Obtained</th><th>Max Marks</th><th>%</th></tr></thead>
                <tbody>
                  ${m.subjects.map(s => `
                    <tr>
                      <td>${s.subject_name}</td>
                      <td>${s.marks_obtained}</td>
                      <td>${m.max_marks}</td>
                      <td>${((s.marks_obtained / m.max_marks) * 100).toFixed(1)}%</td>
                    </tr>
                  `).join('')}
                  <tr style="font-weight:700;background:var(--surface2);">
                    <td>Total</td>
                    <td>${m.total}</td>
                    <td>${m.max_total}</td>
                    <td>${m.percentage}%</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  } catch (e) {
    ca.innerHTML = `<div class="error-state">Failed to load marks: ${e.message}</div>`;
  }
}

function toggleAccordion(i) {
  const header = document.querySelectorAll('.exam-accordion-header')[i];
  const body   = document.getElementById(`acc-body-${i}`);
  header.classList.toggle('open');
  body.classList.toggle('open');
}
