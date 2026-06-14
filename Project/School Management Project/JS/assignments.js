async function renderAssignments() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading();
  try {
    const [aRes, tRes, cRes] = await Promise.all([
      api.get('/assignments'),
      api.get('/teachers'),
      api.get('/classes')
    ]);
    const assignments = aRes.data || [];
    const teachers = tRes.data || [];
    const classes = cRes.data?.filter(c => c.status === 'Active') || [];

    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Teacher Assignments</h1><p class="page-subtitle">Assign teachers to classes and subjects</p></div>
        <button class="btn-primary" onclick="showAssignModal(${JSON.stringify(teachers).replace(/"/g,'&quot;')}, ${JSON.stringify(classes).replace(/"/g,'&quot;')})">+ Assign Teacher</button>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Teacher</th><th>Class</th><th>Section</th><th>Subject</th><th>Role</th></tr>
              </thead>
              <tbody>
                ${assignments.length ? assignments.map(a => `
                  <tr>
                    <td>${a.teacher_name} <small style="color:var(--text3)">#${a.teacher_id}</small></td>
                    <td>Class ${a.class_name}</td>
                    <td>${a.section_name}</td>
                    <td>${a.subject_name}</td>
                    <td><span class="badge ${a.role === 'Class Teacher' ? 'badge-gold' : 'badge-blue'}">${a.role}</span></td>
                  </tr>
                `).join('') : `<tr><td colspan="5">${emptyState('📋','No assignments','Assign teachers to classes to get started')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) { ca.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

function showAssignModal(teachers, classes) {
  showModal('Assign Teacher', `
    <div class="form-group">
      <label>Teacher</label>
      <select id="a-teacher">
        <option value="">Select teacher...</option>
        ${teachers.map(t => `<option value="${t.teacher_id}">${t.name} (#${t.teacher_id})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Class</label>
      <select id="a-class" onchange="loadSectionsSubjects(this.value)">
        <option value="">Select class...</option>
        ${classes.map(c => `<option value="${c.id}" data-name="${c.class_name}">Class ${c.class_name}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Section</label>
      <select id="a-section"><option value="">Select class first...</option></select>
    </div>
    <div class="form-group">
      <label>Subject</label>
      <select id="a-subject"><option value="">Select class first...</option></select>
    </div>
    <div class="form-group">
      <label>Role</label>
      <select id="a-role">
        <option value="Subject Teacher">Subject Teacher</option>
        <option value="Class Teacher">Class Teacher</option>
      </select>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitAssignment()">Assign</button>
  `);
}

async function loadSectionsSubjects(class_id) {
  if (!class_id) return;
  const [sRes, subRes] = await Promise.all([
    api.get(`/classes/${class_id}/sections`),
    api.get(`/classes/${class_id}/subjects`)
  ]);
  const secSel = document.getElementById('a-section');
  const subSel = document.getElementById('a-subject');
  secSel.innerHTML = sRes.data.map(s => `<option value="${s.id}">${s.section_name}</option>`).join('');
  subSel.innerHTML = subRes.data.map(s => `<option value="${s.id}">${s.subject_name}</option>`).join('');
}

async function submitAssignment() {
  const teacher_id = parseInt(document.getElementById('a-teacher').value);
  const class_el = document.getElementById('a-class');
  const class_id = parseInt(class_el.value);
  const section_id = parseInt(document.getElementById('a-section').value);
  const subject_id = parseInt(document.getElementById('a-subject').value);
  const role = document.getElementById('a-role').value;
  if (!teacher_id || !class_id || !section_id || !subject_id) { showToast('All fields required', 'error'); return; }
  try {
    await api.post('/assignments', { teacher_id, class_id, section_id, subject_id, role });
    showToast('Teacher assigned successfully!');
    closeModal();
    renderAssignments();
  } catch (e) { showToast(e.message, 'error'); }
}