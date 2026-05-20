async function renderAttendance() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Attendance</h1><p class="page-subtitle">Mark and view student attendance</p></div>
    </div>
    <div class="tabs">
      <button class="tab active" onclick="switchAttTab(this,'mark')">Mark Attendance</button>
      <button class="tab" onclick="switchAttTab(this,'view')">View Attendance</button>
    </div>
    <div id="att-tab-mark">
      <div class="class-section-selector">
        <div class="form-group"><label>Class</label><input id="att-class" type="text" placeholder="e.g. 8"/></div>
        <div class="form-group"><label>Section</label><input id="att-section" type="text" placeholder="e.g. A"/></div>
        <div class="form-group"><label>Date</label><input id="att-date" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
        <button class="btn-primary" onclick="loadAttendanceStudents()">Load Students</button>
      </div>
      <div id="att-list">${emptyState('✅','Ready to mark','Enter class and section above')}</div>
    </div>
    <div id="att-tab-view" class="hidden">
      <div class="class-section-selector">
        <div class="form-group"><label>Class</label><input id="vatt-class" type="text" placeholder="e.g. 8"/></div>
        <div class="form-group"><label>Section</label><input id="vatt-section" type="text" placeholder="e.g. A"/></div>
        <div class="form-group"><label>Date</label><input id="vatt-date" type="date" value="${new Date().toISOString().slice(0,10)}"/></div>
        <button class="btn-primary" onclick="loadViewAttendance()">View</button>
      </div>
      <div id="vatt-table"></div>
    </div>`;
}

function switchAttTab(el, tab) {
  document.getElementById('att-tab-mark').classList.toggle('hidden', tab !== 'mark');
  document.getElementById('att-tab-view').classList.toggle('hidden', tab !== 'view');
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

let attStudents = [];

async function loadAttendanceStudents() {
  const cn = document.getElementById('att-class').value.trim();
  const sn = document.getElementById('att-section').value.trim().toUpperCase();
  if (!cn || !sn) { showToast('Enter class and section', 'error'); return; }
  const listEl = document.getElementById('att-list');
  listEl.innerHTML = loading();
  try {
    const res = await api.get(`/students?class_name=${cn}&section_name=${sn}`);
    attStudents = res.data || [];
    if (!attStudents.length) {
      listEl.innerHTML = emptyState('👨‍🎓','No students found','No students enrolled in this section');
      return;
    }
    listEl.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Mark Attendance — ${attStudents.length} Students</span>
          <div>
            <button class="btn-secondary btn-sm" onclick="markAll('P')">✅ All Present</button>
            <button class="btn-secondary btn-sm" onclick="markAll('A')">❌ All Absent</button>
          </div>
        </div>
        <div class="card-body">
          ${attStudents.map(s => `
            <div class="att-row">
              <div>
                <strong>${s.name}</strong>
                <span style="color:var(--text3);font-size:12px;margin-left:8px">ID: ${s.student_id}</span>
              </div>
              <div class="att-toggle">
                <button class="att-btn p" id="att-p-${s.student_id}" onclick="toggleAtt('${s.student_id}','P')">P</button>
                <button class="att-btn a" id="att-a-${s.student_id}" onclick="toggleAtt('${s.student_id}','A')">A</button>
              </div>
            </div>
          `).join('')}
          <div style="margin-top:20px">
            <button class="btn-primary full-width" onclick="submitAttendance()">💾 Save Attendance</button>
          </div>
        </div>
      </div>`;
    markAll('P'); // Default all present
  } catch (e) { listEl.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

function toggleAtt(sid, status) {
  document.getElementById(`att-p-${sid}`).classList.toggle('active', status === 'P');
  document.getElementById(`att-a-${sid}`).classList.toggle('active', status === 'A');
}

function markAll(status) {
  attStudents.forEach(s => toggleAtt(s.student_id, status));
}

async function submitAttendance() {
  const cn = document.getElementById('att-class').value.trim();
  const sn = document.getElementById('att-section').value.trim().toUpperCase();
  const date = document.getElementById('att-date').value;
  const records = attStudents.map(s => ({
    student_id: s.student_id,
    name: s.name,
    status: document.getElementById(`att-p-${s.student_id}`)?.classList.contains('active') ? 'P' : 'A'
  }));
  try {
    await api.post('/attendance', { class_name: cn, section_name: sn, date, records });
    showToast('Attendance saved successfully!');
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadViewAttendance() {
  const cn = document.getElementById('vatt-class').value.trim();
  const sn = document.getElementById('vatt-section').value.trim().toUpperCase();
  const date = document.getElementById('vatt-date').value;
  const tbl = document.getElementById('vatt-table');
  tbl.innerHTML = loading();
  try {
    const res = await api.get(`/attendance?class_name=${cn}&section_name=${sn}&date=${date}`);
    const rows = res.data || [];
    const present = rows.filter(r => r.status === 'P').length;
    const absent = rows.filter(r => r.status === 'A').length;
    tbl.innerHTML = `
      <div style="display:flex;gap:16px;margin-bottom:20px">
        <div class="stat-card green" style="flex:1;padding:16px">
          <div class="stat-label">Present</div>
          <div class="stat-value">${present}</div>
        </div>
        <div class="stat-card" style="flex:1;padding:16px;border-color:var(--red)">
          <div class="stat-label">Absent</div>
          <div class="stat-value" style="color:var(--red)">${absent}</div>
        </div>
        <div class="stat-card blue" style="flex:1;padding:16px">
          <div class="stat-label">Total</div>
          <div class="stat-value">${rows.length}</div>
        </div>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead><tr><th>ID</th><th>Name</th><th>Status</th></tr></thead>
              <tbody>
                ${rows.map(r => `
                  <tr>
                    <td>${r.student_id}</td>
                    <td>${r.name}</td>
                    <td><span class="badge ${r.status === 'P' ? 'badge-green' : 'badge-red'}">${r.status === 'P' ? 'Present' : r.status === 'A' ? 'Absent' : 'Not Marked'}</span></td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) { tbl.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}