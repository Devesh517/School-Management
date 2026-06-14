// principal.js — Principal: academic overview, assign class teacher

async function renderPrincipalAcademic() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading('Loading academic data...');
  try {
    const res = await api.get('/principal/academic-summary');
    const { classes, teachers } = res.data;

    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">🏫 Academic Overview</h1>
          <p class="page-subtitle">Classes, teachers, and student distribution</p></div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <div class="card">
          <div class="card-header"><span class="card-title">Classes & Sections</span></div>
          <div class="card-body">
            <table>
              <thead><tr><th>Class</th><th>Sections</th><th>Students</th><th>Status</th></tr></thead>
              <tbody>
                ${(classes||[]).map(c=>`<tr>
                  <td><strong>${c.class_name}</strong></td>
                  <td>${c.total_sections}</td>
                  <td>${c.total_students}</td>
                  <td><span class="badge badge-green">${c.status}</span></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">Teacher Workload</span></div>
          <div class="card-body">
            <table>
              <thead><tr><th>Teacher</th><th>ID</th><th>Classes</th><th>Action</th></tr></thead>
              <tbody>
                ${(teachers||[]).map(t=>`<tr>
                  <td>${t.name}</td>
                  <td>${t.teacher_id}</td>
                  <td><span class="badge badge-blue">${t.classes_assigned}</span></td>
                  <td><button class="btn-secondary btn-sm" onclick="navigate('assignments')">View</button></td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="card" style="margin-top:24px">
        <div class="card-header"><span class="card-title">📋 Assign Class Teacher to Section</span></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-group"><label>Class</label>
              <select id="act-class" class="form-control" onchange="loadSectionsForCT(this.value)">
                <option value="">Select Class</option>
                ${(classes||[]).map(c=>`<option value="${c.id}">${c.class_name}</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Section</label>
              <select id="act-section" class="form-control"><option value="">Select Section</option></select></div>
            <div class="form-group"><label>Class Teacher</label>
              <select id="act-teacher" class="form-control">
                <option value="">Select Teacher</option>
                ${(teachers||[]).map(t=>`<option value="${t.id}">${t.name}</option>`).join('')}
              </select></div>
          </div>
          <button class="btn-primary" onclick="assignClassTeacher()" style="margin-top:16px">Assign Class Teacher</button>
        </div>
      </div>`;
  } catch(e) {
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('⚠️','Error',e.message)}</div></div>`;
  }
}

async function loadSectionsForCT(classId) {
  if (!classId) return;
  const res = await api.get(`/classes/${classId}/sections`);
  const sel = document.getElementById('act-section');
  sel.innerHTML = '<option value="">Select Section</option>' +
    (res.data||[]).map(s=>`<option value="${s.id}">${s.section_name}</option>`).join('');
}

async function assignClassTeacher() {
  const sectionId = document.getElementById('act-section').value;
  const teacherId = document.getElementById('act-teacher').value;
  if (!sectionId || !teacherId) { showToast('Select section and teacher', 'error'); return; }
  try {
    await api.post('/principal/assign-class-teacher', { section_id: sectionId, teacher_id: teacherId });
    showToast('Class teacher assigned!', 'success');
  } catch(e) { showToast(e.message, 'error'); }
}
