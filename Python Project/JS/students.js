async function renderStudents() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = `
    <div class="page-header">
      <div><h1 class="page-title">Students</h1><p class="page-subtitle">Manage student records</p></div>
      <button class="btn-primary" onclick="showAddStudentModal()">+ Add Student</button>
    </div>
    <div class="class-section-selector">
      <div class="form-group">
        <label>Class</label>
        <input id="s-class" type="text" class="search-input" placeholder="e.g. 8"/>
      </div>
      <div class="form-group">
        <label>Section</label>
        <input id="s-section" type="text" class="search-input" placeholder="e.g. A"/>
      </div>
      <button class="btn-primary" onclick="loadStudents()">Load Students</button>
    </div>
    <div id="students-table">${emptyState('👨‍🎓','Enter class and section','Select a class and section to view students')}</div>`;
}

async function loadStudents() {
  const cn = document.getElementById('s-class').value.trim();
  const sn = document.getElementById('s-section').value.trim().toUpperCase();
  if (!cn || !sn) { showToast('Enter class and section', 'error'); return; }
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
                <tr>
                  <th>ID</th><th>Name</th><th>DOB</th><th>Age</th>
                  <th>Father</th><th>Phone</th><th>Actions</th>
                </tr>
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
    <table>
      <tbody>
        <tr><td><strong>ID</strong></td><td>${s.student_id}</td></tr>
        <tr><td><strong>Name</strong></td><td>${s.name}</td></tr>
        <tr><td><strong>DOB</strong></td><td>${formatDate(s.dob)}</td></tr>
        <tr><td><strong>Age</strong></td><td>${s.age}</td></tr>
        <tr><td><strong>Mother</strong></td><td>${s.mother_name || '—'}</td></tr>
        <tr><td><strong>Father</strong></td><td>${s.father_name || '—'}</td></tr>
        <tr><td><strong>Address</strong></td><td>${s.address || '—'}</td></tr>
        <tr><td><strong>Phone</strong></td><td>${s.phone || '—'}</td></tr>
        <tr><td><strong>Aadhar</strong></td><td>${s.aadhar || '—'}</td></tr>
      </tbody>
    </table>
  `, `<button class="btn-primary" onclick="closeModal()">Close</button>`);
}

function showAddStudentModal() {
  showModal('Add Student', `
    <div class="form-row">
      <div class="form-group"><label>Class</label><input id="m-s-class" type="text" placeholder="e.g. 8"/></div>
      <div class="form-group"><label>Section</label><input id="m-s-sec" type="text" placeholder="e.g. A"/></div>
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
}

async function submitAddStudent() {
  const data = {
    class_name: document.getElementById('m-s-class').value.trim(),
    section_name: document.getElementById('m-s-sec').value.trim(),
    name: document.getElementById('m-s-name').value.trim(),
    dob: document.getElementById('m-s-dob').value,
    phone: document.getElementById('m-s-phone').value.trim(),
    mother_name: document.getElementById('m-s-mname').value.trim(),
    father_name: document.getElementById('m-s-fname').value.trim(),
    address: document.getElementById('m-s-addr').value.trim(),
    aadhar: document.getElementById('m-s-aadhar').value.trim(),
  };
  if (!data.class_name || !data.section_name || !data.name) { showToast('Class, section and name required', 'error'); return; }
  try {
    const res = await api.post('/students', data);
    showToast(`Student added with ID ${res.data.student_id}`);
    closeModal();
    document.getElementById('s-class').value = data.class_name;
    document.getElementById('s-section').value = data.section_name;
    loadStudents();
  } catch (e) { showToast(e.message, 'error'); }
}

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
  ['name','dob','address','phone'].forEach(t => {
    document.getElementById(`student-tab-${t}`).classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function submitUpdateStudent(id) {
  const data = {};
  const name = document.getElementById('upd-s-name')?.value.trim();
  const dob = document.getElementById('upd-s-dob')?.value;
  const addr = document.getElementById('upd-s-addr')?.value.trim();
  const phone = document.getElementById('upd-s-phone')?.value.trim();
  if (name) data.name = name;
  if (dob) data.dob = dob;
  if (addr) data.address = addr;
  if (phone) data.phone = phone;
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