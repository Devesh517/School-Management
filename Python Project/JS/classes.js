async function renderClasses() {
  const ca = document.getElementById('content-area');
  try {
    const res = await api.get('/classes');
    const classes = res.data || [];
    ca.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">Classes</h1>
          <p class="page-subtitle">Manage school classes, sections, and subjects</p>
        </div>
        <button class="btn-primary" onclick="showAddClassModal()">+ Add New Class</button>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Class Name</th>
                  <th>Sections</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                ${classes.length ? classes.map((c, i) => `
                  <tr>
                    <td>${i+1}</td>
                    <td>Class ${c.class_name}</td>
                    <td><span class="badge badge-blue">${c.total_sections} Section(s)</span></td>
                    <td><span class="badge ${c.status === 'Active' ? 'badge-green' : 'badge-red'}">${c.status}</span></td>
                    <td>
                      <button class="btn-secondary btn-sm" onclick="viewClassSections(${c.id}, '${c.class_name}')">Sections</button>
                      <button class="btn-secondary btn-sm" onclick="showAddSectionModal(${c.id}, '${c.class_name}')">+ Section</button>
                      ${c.status === 'Active' ? `<button class="btn-danger btn-sm" onclick="removeClassConfirm(${c.id}, '${c.class_name}')">Remove</button>` : ''}
                    </td>
                  </tr>
                `).join('') : `<tr><td colspan="5">${emptyState('🏫','No classes found','Add your first class to get started')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) {
    document.getElementById('content-area').innerHTML = `<div class="error-msg">${e.message}</div>`;
  }
}

function showAddClassModal() {
  showModal('Add New Class', `
    <div class="form-group">
      <label>Class Name (e.g. 8, 9, 10)</label>
      <input id="m-class-name" type="text" placeholder="e.g. 8"/>
    </div>
    <div class="form-group">
      <label>First Section</label>
      <input id="m-section" type="text" placeholder="e.g. A"/>
    </div>
    <div class="form-group">
      <label>Subjects (comma-separated)</label>
      <textarea id="m-subjects" placeholder="e.g. Mathematics, Science, English, Hindi, Social Studies"></textarea>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitAddClass()">Create Class</button>
  `);
}

async function submitAddClass() {
  const class_name = document.getElementById('m-class-name').value.trim();
  const section_name = document.getElementById('m-section').value.trim();
  const subjects_raw = document.getElementById('m-subjects').value.trim();
  if (!class_name || !section_name || !subjects_raw) { showToast('All fields required', 'error'); return; }
  const subjects = subjects_raw.split(',').map(s => s.trim()).filter(Boolean);
  try {
    await api.post('/classes', { class_name, section_name, subjects });
    showToast('Class created successfully!');
    closeModal();
    renderClasses();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

function showAddSectionModal(class_id, class_name) {
  showModal(`Add Section to Class ${class_name}`, `
    <div class="form-group">
      <label>Section Name</label>
      <input id="m-new-section" type="text" placeholder="e.g. B"/>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitAddSection(${class_id})">Add Section</button>
  `);
}

async function submitAddSection(class_id) {
  const section_name = document.getElementById('m-new-section').value.trim().toUpperCase();
  if (!section_name) { showToast('Section name required', 'error'); return; }
  try {
    await api.post(`/classes/${class_id}/sections`, { section_name });
    showToast('Section added!');
    closeModal();
    renderClasses();
  } catch (e) {
    showToast(e.message, 'error');
  }
}

async function viewClassSections(class_id, class_name) {
  const res = await api.get(`/classes/${class_id}/sections`);
  const subs = await api.get(`/classes/${class_id}/subjects`);
  const sections = res.data || [];
  const subjects = subs.data || [];
  showModal(`Class ${class_name} — Details`, `
    <div style="margin-bottom:16px">
      <div class="card-title" style="margin-bottom:8px">Sections</div>
      ${sections.map(s => `<span class="badge badge-blue" style="margin:4px">${s.section_name}</span>`).join('') || '<p style="color:var(--text3)">No sections</p>'}
    </div>
    <div>
      <div class="card-title" style="margin-bottom:8px">Subjects</div>
      ${subjects.map(s => `<span class="subject-tag">${s.subject_name}</span>`).join('') || '<p style="color:var(--text3)">No subjects</p>'}
    </div>
  `, `<button class="btn-primary" onclick="closeModal()">Close</button>`);
}

function removeClassConfirm(class_id, class_name) {
  showModal('Remove Class', `<p>Are you sure you want to remove <strong>Class ${class_name}</strong>? This will mark it as Inactive.</p>`,
    `<button class="btn-secondary" onclick="closeModal()">Cancel</button>
     <button class="btn-danger" onclick="doRemoveClass(${class_id})">Remove</button>`);
}

async function doRemoveClass(class_id) {
  try {
    await api.delete(`/classes/${class_id}`);
    showToast('Class removed');
    closeModal();
    renderClasses();
  } catch (e) {
    showToast(e.message, 'error');
  }
}