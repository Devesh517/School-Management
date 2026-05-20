// report.js — add this file to your JS/ folder
// and add <script src="JS/report.js"></script> in index.html

async function renderReport() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Report Cards</h1><p class="page-subtitle">View and download student report cards</p></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Generate Report Card</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Class</label><input id="rc-class" type="text" placeholder="e.g. 8"/></div>
          <div class="form-group"><label>Section</label><input id="rc-section" type="text" placeholder="e.g. A"/></div>
          <div class="form-group"><label>Student ID</label><input id="rc-sid" type="number" placeholder="e.g. 1"/></div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button class="btn-primary" onclick="previewReport()">Preview Report</button>
          <button class="btn-secondary" onclick="downloadReport()">⬇ Download PDF</button>
        </div>
      </div>
    </div>
    <div id="report-preview" style="margin-top:24px"></div>`;
}

async function previewReport() {
  const cn  = document.getElementById('rc-class').value.trim();
  const sec = document.getElementById('rc-section').value.trim().toUpperCase();
  const sid = document.getElementById('rc-sid').value.trim();
  if (!cn || !sec || !sid) { showToast('Fill all fields', 'error'); return; }

  const prev = document.getElementById('report-preview');
  prev.innerHTML = loading();
  try {
    const res = await api.get(`/report-card/preview/${sid}?class_name=${cn}&section_name=${sec}`);
    const d = res.data;
    prev.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">📄 Report Card — ${d.student_name}</span>
        </div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
            <div class="stat-card blue" style="padding:12px">
              <div class="stat-label">Total Marks</div>
              <div class="stat-value">${d.final_total}/${d.final_max}</div>
            </div>
            <div class="stat-card gold" style="padding:12px">
              <div class="stat-label">Percentage</div>
              <div class="stat-value">${d.final_percent}%</div>
            </div>
            <div class="stat-card" style="padding:12px">
              <div class="stat-label">Grade</div>
              <div class="stat-value">${d.final_grade}</div>
            </div>
            <div class="stat-card ${d.result === 'PASS' ? 'green' : ''}" style="padding:12px;${d.result !== 'PASS' ? 'border-color:var(--red)' : ''}">
              <div class="stat-label">Result</div>
              <div class="stat-value" style="color:${d.result === 'PASS' ? 'var(--green)' : 'var(--red)'}">${d.result}</div>
            </div>
          </div>
          ${d.exam_results.map(er => `
            <div style="margin-bottom:20px">
              <h4 style="margin-bottom:8px;color:var(--accent)">${er.exam_name} — ${er.percentage}% (${er.grade})</h4>
              <div class="table-wrap">
                <table>
                  <thead><tr><th>Subject</th><th>Marks</th><th>Max</th></tr></thead>
                  <tbody>
                    ${er.subjects.map(s => `
                      <tr>
                        <td>${s.subject_name}</td>
                        <td><strong>${s.marks_obtained}</strong></td>
                        <td>${er.max_marks}</td>
                      </tr>
                    `).join('')}
                    <tr style="background:var(--bg2)">
                      <td><strong>Total</strong></td>
                      <td><strong>${er.total}</strong></td>
                      <td><strong>${er.max_total}</strong></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          `).join('')}
        </div>
      </div>`;
  } catch (e) {
    prev.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

async function downloadReport() {
  const cn  = document.getElementById('rc-class').value.trim();
  const sec = document.getElementById('rc-section').value.trim().toUpperCase();
  const sid = document.getElementById('rc-sid').value.trim();
  if (!cn || !sec || !sid) { showToast('Fill all fields', 'error'); return; }
  const url = `http://localhost:5000/api/report-card/${sid}?class_name=${cn}&section_name=${sec}`;
  window.open(url, '_blank');
}
