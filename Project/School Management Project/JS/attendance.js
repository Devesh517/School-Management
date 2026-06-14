// attendance.js — with cascading class/section dropdowns

async function renderAttendance() {
  const ca = document.getElementById('content-area');
  const today = new Date().toISOString().slice(0,10);
  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Attendance</h1>
        <p class="page-subtitle">Mark and view student attendance</p></div>
    </div>
    <div class="tabs">
      <button class="tab active" onclick="switchAttTab(this,'mark')">Mark Attendance</button>
      <button class="tab" onclick="switchAttTab(this,'view')">View Attendance</button>
    </div>

    <!-- MARK TAB -->
    <div id="att-tab-mark">
      <div class="class-section-selector">
        <div class="form-group"><label>Class</label>
          <select id="att-class" class="form-control"
            onchange="_attFillSection(this.value,'att-section')">
            <option value="">Select Class...</option>
          </select></div>
        <div class="form-group"><label>Section</label>
          <select id="att-section" class="form-control">
            <option value="">Select Section...</option>
          </select></div>
        <div class="form-group"><label>Date</label>
          <input id="att-date" type="date" value="${today}"/></div>
        <button class="btn-primary" onclick="loadAttendanceStudents()">Load Students</button>
      </div>
      <div id="att-list">${emptyState('✅','Ready to mark','Select class and section above')}</div>
    </div>

    <!-- VIEW TAB -->
    <div id="att-tab-view" class="hidden">
      <div class="class-section-selector">
        <div class="form-group"><label>Class</label>
          <select id="vatt-class" class="form-control"
            onchange="_attFillSection(this.value,'vatt-section')">
            <option value="">Select Class...</option>
          </select></div>
        <div class="form-group"><label>Section</label>
          <select id="vatt-section" class="form-control">
            <option value="">Select Section...</option>
          </select></div>
        <div class="form-group"><label>Date</label>
          <input id="vatt-date" type="date" value="${today}"/></div>
        <button class="btn-primary" onclick="loadViewAttendance()">View</button>
      </div>
      <div id="vatt-table"></div>
    </div>`;

  // Load classes into both selects
  try {
    const res = await api.get('/classes');
    ['att-class','vatt-class'].forEach(selId => {
      const sel = document.getElementById(selId);
      (res.data||[]).forEach(c =>
        sel.insertAdjacentHTML('beforeend',
          `<option value="${c.id}" data-name="${c.class_name}">${c.class_name}</option>`)
      );
    });
  } catch(e) { showToast('Failed to load classes', 'error'); }
}

async function _attFillSection(classId, secSelId) {
  const sel = document.getElementById(secSelId);
  sel.innerHTML = '<option value="">Select Section...</option>';
  if (!classId) return;
  try {
    const res = await api.get(`/classes/${classId}/sections`);
    (res.data||[]).forEach(s =>
      sel.insertAdjacentHTML('beforeend',
        `<option value="${s.id}" data-name="${s.section_name}">${s.section_name}</option>`)
    );
  } catch(e) { showToast('Failed to load sections', 'error'); }
}

function _attSelName(id) {
  const s = document.getElementById(id);
  return s?.options[s.selectedIndex]?.dataset.name || '';
}

function switchAttTab(el, tab) {
  document.getElementById('att-tab-mark').classList.toggle('hidden', tab !== 'mark');
  document.getElementById('att-tab-view').classList.toggle('hidden', tab !== 'view');
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

let attStudents = [];

async function loadAttendanceStudents() {
  const cn = _attSelName('att-class');
  const sn = _attSelName('att-section');
  if (!cn || !sn) { showToast('Select class and section', 'error'); return; }
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
    markAll('P');
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
  const cn   = _attSelName('att-class');
  const sn   = _attSelName('att-section');
  const date = document.getElementById('att-date').value;
  const records = attStudents.map(s => ({
    student_id: s.student_id, name: s.name,
    status: document.getElementById(`att-p-${s.student_id}`)?.classList.contains('active') ? 'P' : 'A'
  }));
  try {
    await api.post('/attendance', { class_name: cn, section_name: sn, date, records });
    showToast('Attendance saved successfully!');
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadViewAttendance() {
  const cn   = _attSelName('vatt-class');
  const sn   = _attSelName('vatt-section');
  const date = document.getElementById('vatt-date').value;
  if (!cn || !sn) { showToast('Select class and section', 'error'); return; }
  const tbl = document.getElementById('vatt-table');
  tbl.innerHTML = loading();
  try {
    const res = await api.get(`/attendance?class_name=${cn}&section_name=${sn}&date=${date}`);
    const rows = res.data || [];
    const present = rows.filter(r => r.status === 'P').length;
    const absent  = rows.filter(r => r.status === 'A').length;
    tbl.innerHTML = `
      <div style="display:flex;gap:16px;margin-bottom:20px">
        <div class="stat-card green" style="flex:1;padding:16px">
          <div class="stat-label">Present</div><div class="stat-value">${present}</div>
        </div>
        <div class="stat-card" style="flex:1;padding:16px;border-color:var(--red)">
          <div class="stat-label">Absent</div><div class="stat-value" style="color:var(--red)">${absent}</div>
        </div>
        <div class="stat-card blue" style="flex:1;padding:16px">
          <div class="stat-label">Total</div><div class="stat-value">${rows.length}</div>
        </div>
      </div>
      <div class="card"><div class="card-body"><div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Status</th></tr></thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td>${r.student_id}</td><td>${r.name}</td>
                <td><span class="badge ${r.status==='P'?'badge-green':'badge-red'}">
                  ${r.status==='P'?'Present':r.status==='A'?'Absent':'Not Marked'}
                </span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div></div></div>`;
  } catch (e) { tbl.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}