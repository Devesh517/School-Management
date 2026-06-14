// students.js — with cascading class/section dropdowns everywhere

// ── shared helper: populate class dropdown ───────────────────────────────────
async function _fillClassSel(selId) {
  const res = await api.get('/classes');
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Class...</option>';
  (res.data || []).forEach(c =>
    sel.insertAdjacentHTML('beforeend', `<option value="${c.id}" data-name="${c.class_name}">${c.class_name}</option>`)
  );
}

async function _fillSectionSel(classId, selId, onChangeFn) {
  const sel = document.getElementById(selId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Section...</option>';
  if (!classId) return;
  const res = await api.get(`/classes/${classId}/sections`);
  (res.data || []).forEach(s =>
    sel.insertAdjacentHTML('beforeend', `<option value="${s.id}" data-name="${s.section_name}">${s.section_name}</option>`)
  );
  if (onChangeFn) sel.onchange = onChangeFn;
}

// get class_name text from a select
function _className(selId) {
  const sel = document.getElementById(selId);
  return sel?.options[sel.selectedIndex]?.dataset.name || '';
}
// get section_name text from a select
function _sectionName(selId) {
  const sel = document.getElementById(selId);
  return sel?.options[sel.selectedIndex]?.dataset.name || '';
}

// ── RENDER ───────────────────────────────────────────────────────────────────
async function renderStudents() {
  const ca = document.getElementById('content-area');
  const canAdd = ['administrator', 'director'].includes(currentUser?.role);
  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Students</h1>
        <p class="page-subtitle">${canAdd ? 'Manage student records' : 'View student records'}</p></div>
      ${canAdd ? `<button class="btn-primary" onclick="showAddStudentModal()">+ Add Student</button>` : ''}
    </div>
    <div class="class-section-selector">
      <div class="form-group">
        <label>Class</label>
        <select id="s-class" class="form-control" onchange="_fillSectionSel(this.value,'s-section')">
          <option value="">Select Class...</option>
        </select>
      </div>
      <div class="form-group">
        <label>Section</label>
        <select id="s-section" class="form-control">
          <option value="">Select Section...</option>
        </select>
      </div>
      <button class="btn-primary" onclick="loadStudents()">Load Students</button>
    </div>
    <div id="students-table">${emptyState('👨‍🎓','Select class and section','Choose class and section to view students')}</div>`;
  await _fillClassSel('s-class');
}

async function loadStudents() {
  const cn = _className('s-class');
  const sn = _sectionName('s-section');
  if (!cn || !sn) { showToast('Select class and section', 'error'); return; }
  const tbl = document.getElementById('students-table');
  tbl.innerHTML = loading();
  try {
    const res = await api.get(`/students?class_name=${cn}&section_name=${sn}`);
    const students = res.data || [];
    tbl.innerHTML = `
      <div class="card">
        <div class="card-header">
          <span class="card-title">Class ${cn}${sn} — ${students.length} Students</span>
        </div>
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>ID</th><th>Name</th><th>DOB</th><th>Age</th>
                  <th>Father</th><th>Phone</th><th>Actions</th></tr>
              </thead>
              <tbody>
                ${students.length ? students.map(s => `
                  <tr>
                    <td>${s.student_id}</td>
                    <td>${s.name}</td>
                    <td>${formatDate(s.dob)}</td>
                    <td>${s.age}</td>
                    <td>${s.father_name || '—'}</td>
                    <td>${s.phone || '—'}</td>
                    <td>
                      <button class="btn-secondary btn-sm" onclick="viewStudentDetail(${JSON.stringify(s).replace(/"/g,'&quot;')})">View</button>
                      <button class="btn-secondary btn-sm" onclick="showUpdateStudentModal(${s.id}, '${s.name}')">Edit</button>
                      <button class="btn-danger btn-sm" onclick="removeStudentConfirm(${s.id}, '${s.name}')">Remove</button>
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="7">${emptyState('👨‍🎓','No students','No students enrolled in this section')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) {
    tbl.innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function viewStudentDetail(s) {
  showModal(`Student: ${s.name}`, `
    <table><tbody>
      <tr><td><strong>ID</strong></td><td>${s.student_id}</td></tr>
      <tr><td><strong>Name</strong></td><td>${s.name}</td></tr>
      <tr><td><strong>DOB</strong></td><td>${formatDate(s.dob)}</td></tr>
      <tr><td><strong>Age</strong></td><td>${s.age}</td></tr>
      <tr><td><strong>Mother</strong></td><td>${s.mother_name || '—'}</td></tr>
      <tr><td><strong>Father</strong></td><td>${s.father_name || '—'}</td></tr>
      <tr><td><strong>Address</strong></td><td>${s.address || '—'}</td></tr>
      <tr><td><strong>Phone</strong></td><td>${s.phone || '—'}</td></tr>
      <tr><td><strong>Aadhar</strong></td><td>${s.aadhar || '—'}</td></tr>
    </tbody></table>
  `, `<button class="btn-primary" onclick="closeModal()">Close</button>`);
}

// ── ADD STUDENT MODAL (with cascading dropdowns) ─────────────────────────────
async function showAddStudentModal() {
  showModal('Add Student', `
    <div class="form-row">
      <div class="form-group"><label>Class</label>
        <select id="m-s-class" class="form-control" onchange="_modalFillSection(this.value)">
          <option value="">Select Class...</option>
        </select>
      </div>
      <div class="form-group"><label>Section</label>
        <select id="m-s-sec" class="form-control">
          <option value="">Select Section...</option>
        </select>
      </div>
    </div>
    <div class="form-group"><label>Student Name</label><input id="m-s-name" type="text" placeholder="Full name"/></div>
    <div class="form-row">
      <div class="form-group"><label>Date of Birth</label><input id="m-s-dob" type="date"/></div>
      <div class="form-group"><label>Phone</label><input id="m-s-phone" type="text" placeholder="10-digit"/></div>
    </div>
    <div class="form-row">
      <div class="form-group"><label>Mother's Name</label><input id="m-s-mname" type="text"/></div>
      <div class="form-group"><label>Father's Name</label><input id="m-s-fname" type="text"/></div>
    </div>
    <div class="form-group"><label>Address</label><textarea id="m-s-addr" placeholder="Full address"></textarea></div>
    <div class="form-group"><label>Aadhar Number</label><input id="m-s-aadhar" type="text" placeholder="12-digit Aadhar"/></div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitAddStudent()">Add Student</button>
  `);
  await _fillClassSel('m-s-class');
}

async function _modalFillSection(classId) {
  await _fillSectionSel(classId, 'm-s-sec');
}

async function submitAddStudent() {
  const classOpt = document.getElementById('m-s-class');
  const secOpt   = document.getElementById('m-s-sec');
  const data = {
    class_name:   classOpt.options[classOpt.selectedIndex]?.dataset.name || '',
    section_name: secOpt.options[secOpt.selectedIndex]?.dataset.name || '',
    name:         document.getElementById('m-s-name').value.trim(),
    dob:          document.getElementById('m-s-dob').value,
    phone:        document.getElementById('m-s-phone').value.trim(),
    mother_name:  document.getElementById('m-s-mname').value.trim(),
    father_name:  document.getElementById('m-s-fname').value.trim(),
    address:      document.getElementById('m-s-addr').value.trim(),
    aadhar:       document.getElementById('m-s-aadhar').value.trim(),
  };
  if (!data.class_name || !data.section_name || !data.name) {
    showToast('Class, section and name required', 'error'); return;
  }
  try {
    const res = await api.post('/students', data);
    showToast(`Student added with ID ${res.data.student_id}`);
    closeModal();
    loadStudents();
  } catch (e) { showToast(e.message, 'error'); }
}

// ── UPDATE / REMOVE ──────────────────────────────────────────────────────────
function showUpdateStudentModal(id, name) {
  showModal(`Update: ${name}`, `
    <div class="tabs">
      <button class="tab active" onclick="showStudentTab(this,'name')">Name</button>
      <button class="tab" onclick="showStudentTab(this,'dob')">DOB</button>
      <button class="tab" onclick="showStudentTab(this,'address')">Address</button>
      <button class="tab" onclick="showStudentTab(this,'phone')">Phone</button>
    </div>
    <div id="student-tab-name"><div class="form-group"><label>New Name</label><input id="upd-s-name" type="text" placeholder="Full name"/></div></div>
    <div id="student-tab-dob" class="hidden"><div class="form-group"><label>New Date of Birth</label><input id="upd-s-dob" type="date"/></div></div>
    <div id="student-tab-address" class="hidden"><div class="form-group"><label>New Address</label><textarea id="upd-s-addr"></textarea></div></div>
    <div id="student-tab-phone" class="hidden"><div class="form-group"><label>New Phone</label><input id="upd-s-phone" type="text" placeholder="10-digit"/></div></div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitUpdateStudent(${id})">Update</button>
  `);
}

function showStudentTab(el, tab) {
  ['name','dob','address','phone'].forEach(t =>
    document.getElementById(`student-tab-${t}`).classList.toggle('hidden', t !== tab));
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function submitUpdateStudent(id) {
  const data = {};
  const name  = document.getElementById('upd-s-name')?.value.trim();
  const dob   = document.getElementById('upd-s-dob')?.value;
  const addr  = document.getElementById('upd-s-addr')?.value.trim();
  const phone = document.getElementById('upd-s-phone')?.value.trim();
  if (name)  data.name    = name;
  if (dob)   data.dob     = dob;
  if (addr)  data.address = addr;
  if (phone) data.phone   = phone;
  if (!Object.keys(data).length) { showToast('Enter a value to update', 'error'); return; }
  try {
    await api.put(`/students/${id}`, data);
    showToast('Student updated!');
    closeModal();
    loadStudents();
  } catch (e) { showToast(e.message, 'error'); }
}

function removeStudentConfirm(id, name) {
  showModal('Remove Student', `<p>Remove <strong>${name}</strong>? This cannot be undone.</p>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn-danger" onclick="doRemoveStudent(${id})">Remove</button>`);
}

async function doRemoveStudent(id) {
  try {
    await api.delete(`/students/${id}`);
    showToast('Student removed');
    closeModal();
    loadStudents();
  } catch (e) { showToast(e.message, 'error'); }
}