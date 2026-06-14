// timetable.js — Timetable management (principal creates, teacher/student views)

const DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

async function renderTimetable() {
  const ca = document.getElementById('content-area');
  const role = currentUser?.role;

  // Teacher: show their own timetable
  if (role === 'teacher') {
    return renderTeacherTimetable(ca);
  }
  // Principal/Director/Administrator: manage timetable
  renderManageTimetable(ca);
}

async function renderTeacherTimetable(ca) {
  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">📅 My Timetable</h1>
        <p class="page-subtitle">Your weekly class schedule</p></div>
    </div>
    <div class="card">
      <div class="card-body">
        <div class="form-grid" style="margin-bottom:20px">
          <div class="form-group"><label>Class</label>
            <select id="tt-class" class="form-control" onchange="loadTTSections(this.value)">
              <option value="">Select Class</option></select></div>
          <div class="form-group"><label>Section</label>
            <select id="tt-section" class="form-control" onchange="loadTimetableGrid()">
              <option value="">Select Section</option></select></div>
        </div>
        <div id="tt-grid"></div>
      </div>
    </div>`;
  const res = await api.get('/classes');
  const sel = document.getElementById('tt-class');
  (res.data||[]).forEach(c => sel.insertAdjacentHTML('beforeend', `<option value="${c.id}">${c.class_name}</option>`));
}

async function renderManageTimetable(ca) {
  ca.innerHTML = loading('Loading timetable...');
  const res = await api.get('/classes');
  const classes = res.data || [];

  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">📅 Manage Timetable</h1>
        <p class="page-subtitle">Set weekly class schedules</p></div>
    </div>
    <div class="card">
      <div class="card-header"><span class="card-title">Select Class & Section</span></div>
      <div class="card-body">
        <div class="form-grid">
          <div class="form-group"><label>Class</label>
            <select id="tt-class" class="form-control" onchange="loadTTSections(this.value)">
              <option value="">Select Class</option>
              ${classes.map(c=>`<option value="${c.id}">${c.class_name}</option>`).join('')}
            </select></div>
          <div class="form-group"><label>Section</label>
            <select id="tt-section" class="form-control" onchange="loadTimetableGrid()">
              <option value="">Select Section</option></select></div>
        </div>
      </div>
    </div>
    <div id="tt-grid" style="margin-top:24px"></div>`;
}

async function loadTTSections(classId) {
  if (!classId) return;
  const res = await api.get(`/classes/${classId}/sections`);
  const sel = document.getElementById('tt-section');
  sel.innerHTML = '<option value="">Select Section</option>' +
    (res.data||[]).map(s=>`<option value="${s.id}">${s.section_name}</option>`).join('');
}

async function loadTimetableGrid() {
  const classId   = document.getElementById('tt-class').value;
  const sectionId = document.getElementById('tt-section').value;
  const grid = document.getElementById('tt-grid');
  if (!classId || !sectionId) return;

  grid.innerHTML = loading('Loading...');
  const [ttRes, subRes, teachRes] = await Promise.all([
    api.get(`/timetable?class_id=${classId}&section_id=${sectionId}`),
    api.get(`/classes/${classId}/subjects`),
    api.get('/teachers'),
  ]);

  const entries  = ttRes.data || [];
  const subjects = subRes.data || [];
  const teachers = teachRes.data || [];

  // Build map: day -> period -> entry
  const map = {};
  entries.forEach(e => { if (!map[e.day_of_week]) map[e.day_of_week]={}; map[e.day_of_week][e.period_no]=e; });

  const PERIODS = [1,2,3,4,5,6,7,8];
  const canEdit = ['director','principal','administrator'].includes(currentUser?.role);

  grid.innerHTML = `
    <div class="card">
      <div class="card-header"><span class="card-title">Weekly Timetable</span>
        ${canEdit ? `<button class="btn-primary btn-sm" onclick="showAddPeriodModal(${classId},${sectionId},${JSON.stringify(subjects).replace(/"/g,'&quot;')},${JSON.stringify(teachers).replace(/"/g,'&quot;')})">+ Add Period</button>` : ''}
      </div>
      <div class="card-body" style="overflow-x:auto">
        <table>
          <thead>
            <tr>
              <th>Day</th>
              ${PERIODS.map(p=>`<th>Period ${p}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${DAYS.map(day=>`<tr>
              <td><strong>${day}</strong></td>
              ${PERIODS.map(p => {
                const e = map[day]?.[p];
                if (e) return `<td style="background:var(--bg-secondary);border-radius:6px;padding:8px;">
                  <div style="font-weight:600;font-size:12px">${e.subject_name}</div>
                  <div style="font-size:11px;color:var(--text-secondary)">${e.teacher_name}</div>
                  <div style="font-size:10px;color:var(--text-tertiary)">${e.start_time||''} - ${e.end_time||''}</div>
                  ${canEdit ? `<button class="btn-danger btn-sm" style="margin-top:4px;font-size:10px" onclick="deleteTTEntry(${e.id})">✕</button>` : ''}
                </td>`;
                return `<td style="color:var(--text-tertiary);font-size:11px">—</td>`;
              }).join('')}
            </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>`;
}

function showAddPeriodModal(classId, sectionId, subjects, teachers) {
  showModal('Add Timetable Period', `
    <div class="form-grid">
      <div class="form-group"><label>Day *</label>
        <select id="ap-day" class="form-control">
          ${DAYS.map(d=>`<option>${d}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Period No *</label>
        <select id="ap-period" class="form-control">
          ${[1,2,3,4,5,6,7,8].map(p=>`<option value="${p}">Period ${p}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Subject *</label>
        <select id="ap-subject" class="form-control">
          ${subjects.map(s=>`<option value="${s.id}">${s.subject_name}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Teacher *</label>
        <select id="ap-teacher" class="form-control">
          ${teachers.map(t=>`<option value="${t.id}">${t.name} (#${t.teacher_id})</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Start Time</label>
        <input id="ap-start" type="time" class="form-control"/></div>
      <div class="form-group"><label>End Time</label>
        <input id="ap-end" type="time" class="form-control"/></div>
    </div>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn-primary" onclick="savePeriod(${classId},${sectionId})">Save Period</button>`);
}

async function savePeriod(classId, sectionId) {
  const body = {
    class_id:   classId,
    section_id: sectionId,
    day_of_week: document.getElementById('ap-day').value,
    period_no:  parseInt(document.getElementById('ap-period').value),
    subject_id: document.getElementById('ap-subject').value,
    teacher_id: document.getElementById('ap-teacher').value,
    start_time: document.getElementById('ap-start').value,
    end_time:   document.getElementById('ap-end').value,
  };
  try {
    await api.post('/timetable', body);
    showToast('Period saved!', 'success');
    closeModal();
    loadTimetableGrid();
  } catch(e) { showToast(e.message, 'error'); }
}

async function deleteTTEntry(id) {
  if (!confirm('Remove this period?')) return;
  try {
    await api.delete(`/timetable/${id}`);
    showToast('Period removed', 'success');
    loadTimetableGrid();
  } catch(e) { showToast(e.message, 'error'); }
}