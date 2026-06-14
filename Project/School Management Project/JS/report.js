// report.js — Generate Report Card with cascading dropdowns

async function renderReport() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Report Cards</h1>
        <p class="page-subtitle">View and download student report cards</p></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Generate Report Card</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Class</label>
            <select id="rc-class" class="form-control"
              onchange="_rcFillSection(this.value)">
              <option value="">Select Class...</option>
            </select></div>
          <div class="form-group"><label>Section</label>
            <select id="rc-section" class="form-control"
              onchange="_rcFillStudents()">
              <option value="">Select Section...</option>
            </select></div>
          <div class="form-group"><label>Student</label>
            <select id="rc-student" class="form-control">
              <option value="">Select Student...</option>
            </select></div>
        </div>
        <div style="display:flex;gap:12px;margin-top:8px">
          <button class="btn-primary" onclick="previewReport()">Preview Report</button>
          <button class="btn-secondary" onclick="downloadReport()">⬇ Download PDF</button>
        </div>
      </div>
    </div>
    <div id="report-preview" style="margin-top:24px"></div>`;

  // Populate class dropdown
  try {
    const res = await api.get('/classes');
    const sel = document.getElementById('rc-class');
    (res.data || []).forEach(c =>
      sel.insertAdjacentHTML('beforeend',
        `<option value="${c.id}" data-name="${c.class_name}">${c.class_name}</option>`)
    );
  } catch(e) { showToast('Failed to load classes', 'error'); }
}

async function _rcFillSection(classId) {
  const secSel = document.getElementById('rc-section');
  const stdSel = document.getElementById('rc-student');
  secSel.innerHTML = '<option value="">Select Section...</option>';
  stdSel.innerHTML = '<option value="">Select Student...</option>';
  if (!classId) return;
  try {
    const res = await api.get(`/classes/${classId}/sections`);
    (res.data || []).forEach(s =>
      secSel.insertAdjacentHTML('beforeend',
        `<option value="${s.id}" data-name="${s.section_name}">${s.section_name}</option>`)
    );
  } catch(e) { showToast('Failed to load sections', 'error'); }
}

async function _rcFillStudents() {
  const classSel = document.getElementById('rc-class');
  const secSel   = document.getElementById('rc-section');
  const stdSel   = document.getElementById('rc-student');
  const cn = classSel.options[classSel.selectedIndex]?.dataset.name || '';
  const sn = secSel.options[secSel.selectedIndex]?.dataset.name || '';
  stdSel.innerHTML = '<option value="">Select Student...</option>';
  if (!cn || !sn) return;
  try {
    const res = await api.get(`/students?class_name=${cn}&section_name=${sn}`);
    (res.data || []).forEach(s =>
      stdSel.insertAdjacentHTML('beforeend',
        `<option value="${s.student_id}" data-dbid="${s.id}">${s.name} (#${s.student_id})</option>`)
    );
  } catch(e) { showToast('Failed to load students', 'error'); }
}

function _rcGetSelected() {
  const classSel = document.getElementById('rc-class');
  const secSel   = document.getElementById('rc-section');
  const stdSel   = document.getElementById('rc-student');
  const cn  = classSel.options[classSel.selectedIndex]?.dataset.name || '';
  const sec = secSel.options[secSel.selectedIndex]?.dataset.name || '';
  const sid = stdSel.value;
  return { cn, sec, sid };
}

async function previewReport() {
  const { cn, sec, sid } = _rcGetSelected();
  if (!cn || !sec || !sid) { showToast('Select class, section and student', 'error'); return; }
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
  const { cn, sec, sid } = _rcGetSelected();
  if (!cn || !sec || !sid) { showToast('Select class, section and student', 'error'); return; }
  const url = `${api.BASE}/report-card/${sid}?class_name=${cn}&section_name=${sec}`;
  window.open(url, '_blank');
}