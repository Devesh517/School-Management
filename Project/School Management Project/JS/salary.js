// salary.js — Unified salary management
// Director: give salary to ALL staff (teachers + administrators + principals)
//           and download salary slips for everyone
// Others: view their own salary records

// ─── ENTRY POINT ─────────────────────────────────────────────────────────────
async function renderSalary() {
  if (currentUser?.role === 'director') {
    return renderDirectorSalary();
  }
  return renderSelfSalary();
}

// ─── DIRECTOR VIEW ────────────────────────────────────────────────────────────
async function renderDirectorSalary() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading('Loading salary dashboard...');

  try {
    const [teachRes, staffRes] = await Promise.all([
      api.get('/teachers'),
      api.get('/staff'),
    ]);
    const teachers = teachRes.data || [];
    const staff    = staffRes.data || [];

    const months = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
    const year = new Date().getFullYear();
    const monthOptions = months.map(m =>
      `<option value="${m}-${year}">${m} ${year}</option>`).join('');

    ca.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">💰 Salary Management</h1>
          <p class="page-subtitle">Process monthly salaries for all staff</p>
        </div>
      </div>

      <!-- TABS -->
      <div class="tabs">
        <button class="tab active" onclick="switchSalTab(this,'teachers')">👩‍🏫 Teachers</button>
        <button class="tab" onclick="switchSalTab(this,'staff')">🏫 Admin / Principal</button>
        <button class="tab" onclick="switchSalTab(this,'overview')">📊 Overview</button>
      </div>

      <!-- ── TAB: TEACHERS ── -->
      <div id="sal-tab-teachers">
        <div class="card" style="margin-bottom:20px">
          <div class="card-header"><span class="card-title">Process Teacher Salary</span></div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group"><label>Teacher</label>
                <select id="dir-teacher-sel" class="form-control">
                  <option value="">Select Teacher...</option>
                  ${teachers.map(t =>
                    `<option value="${t.teacher_id}" data-name="${t.name}">${t.name} (#${t.teacher_id})</option>`
                  ).join('')}
                </select></div>
              <div class="form-group"><label>Month</label>
                <select id="dir-teacher-month" class="form-control">${monthOptions}</select></div>
            </div>
            <div style="background:var(--bg2);padding:12px;border-radius:8px;border:1px solid var(--border);margin-bottom:12px;font-size:13px">
              <strong>Salary Structure:</strong><br>
              Class Teacher: ₹55,000 Basic + ₹10,000 Incentive &nbsp;|&nbsp;
              Subject Teacher: ₹40,000 Basic + ₹10,000 Incentive &nbsp;|&nbsp;
              Deductions: PF 12% + PT ₹200 + TDS 5%
            </div>
            <button class="btn-primary" onclick="processTeacherSalary()">💾 Process Salary</button>
          </div>
        </div>

        <!-- View teacher salary history + slip -->
        <div class="card">
          <div class="card-header"><span class="card-title">Teacher Salary Records & Slips</span></div>
          <div class="card-body">
            <div class="form-row" style="margin-bottom:12px">
              <div class="form-group"><label>Select Teacher</label>
                <select id="view-teacher-sel" class="form-control">
                  <option value="">Select Teacher...</option>
                  ${teachers.map(t =>
                    `<option value="${t.teacher_id}">${t.name} (#${t.teacher_id})</option>`
                  ).join('')}
                </select></div>
              <div style="display:flex;align-items:flex-end">
                <button class="btn-secondary" onclick="loadTeacherSalaryTable()">View Records</button>
              </div>
            </div>
            <div id="teacher-salary-records"></div>
          </div>
        </div>
      </div>

      <!-- ── TAB: STAFF (admin/principal) ── -->
      <div id="sal-tab-staff" class="hidden">
        <div class="card" style="margin-bottom:20px">
          <div class="card-header"><span class="card-title">Process Admin / Principal Salary</span></div>
          <div class="card-body">
            <div class="form-row">
              <div class="form-group"><label>Staff Member</label>
                <select id="dir-staff-sel" class="form-control">
                  <option value="">Select Staff...</option>
                  ${staff.map(s =>
                    `<option value="${s.id}" data-name="${s.name}" data-basic="${s.basic_salary||0}">
                      ${s.name} (${s.role}) — Basic: ₹${(+s.basic_salary||0).toLocaleString()}
                    </option>`
                  ).join('')}
                </select></div>
              <div class="form-group"><label>Month</label>
                <select id="dir-staff-month" class="form-control">${monthOptions}</select></div>
              <div class="form-group"><label>Incentive (₹)</label>
                <input type="number" id="dir-staff-incentive" class="form-control" value="0" min="0"/></div>
            </div>
            <div id="staff-salary-preview" style="display:none;background:var(--bg2);padding:12px;border-radius:8px;border:1px solid var(--border);margin-bottom:12px;font-size:13px"></div>
            <button class="btn-secondary" onclick="previewStaffSalary()" style="margin-right:8px">👁 Preview</button>
            <button class="btn-primary" onclick="processStaffSalary()">💾 Process Salary</button>
          </div>
        </div>

        <!-- View staff salary history + slip -->
        <div class="card">
          <div class="card-header"><span class="card-title">Staff Salary Records & Slips</span></div>
          <div class="card-body">
            <div class="form-row" style="margin-bottom:12px">
              <div class="form-group"><label>Select Staff Member</label>
                <select id="view-staff-sel" class="form-control">
                  <option value="">Select Staff...</option>
                  ${staff.map(s =>
                    `<option value="${s.id}">${s.name} (${s.role})</option>`
                  ).join('')}
                </select></div>
              <div style="display:flex;align-items:flex-end">
                <button class="btn-secondary" onclick="loadStaffSalaryTable()">View Records</button>
              </div>
            </div>
            <div id="staff-salary-records"></div>
          </div>
        </div>
      </div>

      <!-- ── TAB: OVERVIEW ── -->
      <div id="sal-tab-overview" class="hidden">
        <div class="form-row" style="margin-bottom:16px">
          <div class="form-group" style="max-width:220px"><label>Filter by Month</label>
            <select id="overview-month" class="form-control" onchange="loadSalaryOverview()">
              <option value="">All Months</option>
              ${monthOptions}
            </select></div>
          <div style="display:flex;align-items:flex-end">
            <button class="btn-secondary" onclick="loadSalaryOverview()">🔄 Refresh</button>
          </div>
        </div>
        <div id="sal-overview-tables">${emptyState('📊','Loading...','Fetching salary overview')}</div>
      </div>
    `;

    // Auto-load overview when switching to that tab
    window._salOverviewLoaded = false;
  } catch(e) {
    document.getElementById('content-area').innerHTML =
      `<div class="error-msg">${e.message}</div>`;
  }
}

function switchSalTab(el, tab) {
  ['teachers','staff','overview'].forEach(t =>
    document.getElementById(`sal-tab-${t}`).classList.toggle('hidden', t !== tab)
  );
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
  if (tab === 'overview' && !window._salOverviewLoaded) {
    window._salOverviewLoaded = true;
    loadSalaryOverview();
  }
}

// ── TEACHER SALARY ────────────────────────────────────────────────────────────
async function processTeacherSalary() {
  const sel   = document.getElementById('dir-teacher-sel');
  const tid   = parseInt(sel.value);
  const month = document.getElementById('dir-teacher-month').value;
  if (!tid)  { showToast('Select a teacher', 'error'); return; }
  if (!month){ showToast('Select a month', 'error'); return; }
  try {
    const res = await api.post('/salary', { teacher_id: tid, month });
    const d   = res.data;
    showToast(`✅ Salary processed! Net: ₹${parseFloat(d.net_salary).toFixed(2)}`, 'success');
    // Auto-load the history for this teacher
    document.getElementById('view-teacher-sel').value = tid;
    loadTeacherSalaryTable();
  } catch(e) { showToast(e.message, 'error'); }
}

async function loadTeacherSalaryTable() {
  const tid = document.getElementById('view-teacher-sel').value;
  if (!tid) { showToast('Select a teacher', 'error'); return; }
  const box = document.getElementById('teacher-salary-records');
  box.innerHTML = loading();
  try {
    const res     = await api.get(`/salary?teacher_id=${tid}`);
    const records = res.data || [];
    box.innerHTML = _salaryTable(records, (r) =>
      `<a href="${api.BASE}/salary/slip/${tid}/${encodeURIComponent(r.month)}"
          target="_blank" class="btn-secondary btn-sm">⬇ Slip</a>`
    );
  } catch(e) { box.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

// ── STAFF SALARY ──────────────────────────────────────────────────────────────
function previewStaffSalary() {
  const sel       = document.getElementById('dir-staff-sel');
  const basic     = parseFloat(sel.options[sel.selectedIndex]?.dataset.basic || 0);
  const incentive = parseFloat(document.getElementById('dir-staff-incentive').value) || 0;
  if (!sel.value) { showToast('Select a staff member', 'error'); return; }
  const gross     = basic + incentive;
  const pf        = +(gross * 0.12).toFixed(2);
  const pt        = 200;
  const tds       = +(gross * 0.05).toFixed(2);
  const deduction = +(pf + pt + tds).toFixed(2);
  const net       = +(gross - deduction).toFixed(2);
  const box = document.getElementById('staff-salary-preview');
  box.style.display = 'block';
  box.innerHTML = `
    <strong>Salary Preview</strong><br><br>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;text-align:center">
      <div><div style="color:var(--text3);font-size:11px">Basic</div><strong>₹${basic.toLocaleString()}</strong></div>
      <div><div style="color:var(--text3);font-size:11px">Incentive</div><strong>₹${incentive.toLocaleString()}</strong></div>
      <div><div style="color:var(--text3);font-size:11px">Gross</div><strong>₹${gross.toLocaleString()}</strong></div>
      <div><div style="color:var(--text3);font-size:11px">PF+PT+TDS</div><strong style="color:var(--red)">−₹${deduction.toLocaleString()}</strong></div>
    </div>
    <div style="margin-top:10px;text-align:center;font-size:16px">
      Net Salary: <strong style="color:var(--green)">₹${net.toLocaleString('en-IN',{minimumFractionDigits:2})}</strong>
    </div>`;
}

async function processStaffSalary() {
  const staff_id  = document.getElementById('dir-staff-sel').value;
  const month     = document.getElementById('dir-staff-month').value;
  const incentive = parseFloat(document.getElementById('dir-staff-incentive').value) || 0;
  if (!staff_id) { showToast('Select a staff member', 'error'); return; }
  if (!month)    { showToast('Select a month', 'error'); return; }
  try {
    const res = await api.post('/staff-salary', { staff_id: parseInt(staff_id), month, incentive });
    const d   = res.data;
    showToast(`✅ Salary processed! Net: ₹${parseFloat(d.net_salary).toFixed(2)}`, 'success');
    document.getElementById('staff-salary-preview').style.display = 'none';
    document.getElementById('view-staff-sel').value = staff_id;
    loadStaffSalaryTable();
  } catch(e) { showToast(e.message, 'error'); }
}

async function loadStaffSalaryTable() {
  const sid = document.getElementById('view-staff-sel').value;
  if (!sid) { showToast('Select a staff member', 'error'); return; }
  const box = document.getElementById('staff-salary-records');
  box.innerHTML = loading();
  try {
    const res     = await api.get(`/staff-salary?staff_id=${sid}`);
    const records = res.data || [];
    box.innerHTML = _salaryTable(records, (r) =>
      `<a href="${api.BASE}/salary/slip/staff/${sid}/${encodeURIComponent(r.month)}"
          target="_blank" class="btn-secondary btn-sm">⬇ Slip</a>`
    );
  } catch(e) { box.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

// ── OVERVIEW ─────────────────────────────────────────────────────────────────
async function loadSalaryOverview() {
  const month = document.getElementById('overview-month')?.value || '';
  const box   = document.getElementById('sal-overview-tables');
  box.innerHTML = loading();
  try {
    const res     = await api.get(`/director/salary-overview?month=${encodeURIComponent(month)}`);
    const data    = res.data || {};
    const records = data.records || [];
    const total   = parseFloat(data.total_payout || 0);

    const byRole = {};
    records.forEach(r => {
      const key = r.staff_type || 'other';
      if (!byRole[key]) byRole[key] = [];
      byRole[key].push(r);
    });

    if (!records.length) {
      box.innerHTML = `<div class="card"><div class="card-body">${emptyState('💰','No Records','No salary has been processed yet')}</div></div>`;
      return;
    }

    const roleLabels = { teacher: '👩‍🏫 Teachers', principal: '🎓 Principals', administrator: '🏫 Administrators' };
    box.innerHTML = `
      <div class="stat-card green" style="padding:16px;margin-bottom:20px;display:inline-block;min-width:200px">
        <div class="stat-label">Total Payout</div>
        <div class="stat-value">₹${total.toLocaleString('en-IN',{minimumFractionDigits:2})}</div>
      </div>
      ${['teacher','principal','administrator'].map(type => {
        const rows = byRole[type] || [];
        if (!rows.length) return '';
        const subtotal = rows.reduce((s,r) => s + parseFloat(r.net_salary||0), 0);
        return `
          <div class="card" style="margin-bottom:20px">
            <div class="card-header">
              <span class="card-title">${roleLabels[type] || type}</span>
              <span style="color:var(--green);font-weight:600">₹${subtotal.toLocaleString('en-IN',{minimumFractionDigits:2})}</span>
            </div>
            <div class="card-body">
              <div class="table-wrap"><table>
                <thead><tr><th>Name</th><th>ID</th><th>Month</th><th>Basic</th><th>Deductions</th><th>Net Salary</th><th>Slip</th></tr></thead>
                <tbody>
                  ${rows.map(r => `<tr>
                    <td>${r.name||'—'}</td>
                    <td>${r.staff_id||'—'}</td>
                    <td>${r.month||'—'}</td>
                    <td>₹${(+r.basic||0).toLocaleString()}</td>
                    <td style="color:var(--red)">−₹${parseFloat(r.total_deduction||0).toFixed(2)}</td>
                    <td><strong style="color:var(--green)">₹${parseFloat(r.net_salary||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></td>
                    <td>${_overviewSlipLink(type, r)}</td>
                  </tr>`).join('')}
                </tbody>
              </table></div>
            </div>
          </div>`;
      }).join('')}`;
  } catch(e) { box.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

function _overviewSlipLink(type, r) {
  if (type === 'teacher') {
    return `<a href="${api.BASE}/salary/slip/${r.staff_id}/${encodeURIComponent(r.month)}"
      target="_blank" class="btn-secondary btn-sm">⬇ Slip</a>`;
  }
  // staff (admin/principal) — r.staff_id is staff.id for staff_salary
  return `<a href="${api.BASE}/salary/slip/staff/${r.db_id||r.staff_id}/${encodeURIComponent(r.month)}"
    target="_blank" class="btn-secondary btn-sm">⬇ Slip</a>`;
}

// ── SHARED TABLE RENDERER ────────────────────────────────────────────────────
function _salaryTable(records, slipFn) {
  if (!records.length)
    return `<div class="card"><div class="card-body">${emptyState('💰','No Records','No salary processed yet for this person')}</div></div>`;
  return `
    <div class="table-wrap"><table>
      <thead><tr><th>Month</th><th>Basic</th><th>Incentive</th><th>Gross</th><th>PF</th><th>PT</th><th>TDS</th><th>Total Deduction</th><th>Net Salary</th><th>Slip</th></tr></thead>
      <tbody>
        ${records.map(r => `<tr>
          <td>${r.month}</td>
          <td>₹${(+r.basic||0).toLocaleString()}</td>
          <td>₹${(+r.incentive||0).toLocaleString()}</td>
          <td>₹${(+r.gross||0).toLocaleString()}</td>
          <td>₹${parseFloat(r.pf||0).toFixed(2)}</td>
          <td>₹${r.professional_tax||200}</td>
          <td>₹${parseFloat(r.tds||0).toFixed(2)}</td>
          <td style="color:var(--red)">₹${parseFloat(r.total_deduction||0).toFixed(2)}</td>
          <td><strong style="color:var(--green)">₹${parseFloat(r.net_salary||0).toLocaleString('en-IN',{minimumFractionDigits:2})}</strong></td>
          <td>${slipFn(r)}</td>
        </tr>`).join('')}
      </tbody>
    </table></div>`;
}

// ── NON-DIRECTOR: VIEW OWN SALARY ────────────────────────────────────────────
async function renderSelfSalary() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading();
  try {
    const tRes     = await api.get('/teachers');
    const teachers = tRes.data || [];
    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">💰 Salary</h1>
          <p class="page-subtitle">Your salary records</p></div>
      </div>
      <div class="class-section-selector">
        <div class="form-group"><label>Teacher</label>
          <select id="sal-teacher-sel" class="form-control">
            <option value="">Select Teacher...</option>
            ${teachers.map(t => `<option value="${t.teacher_id}">${t.name} (#${t.teacher_id})</option>`).join('')}
          </select></div>
        <button class="btn-primary" onclick="loadSalaryHistory()">View Salary</button>
      </div>
      <div id="salary-table">${emptyState('💰','Select a teacher','Choose a teacher to view salary history')}</div>`;
  } catch(e) { ca.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

async function loadSalaryHistory() {
  const tid = document.getElementById('sal-teacher-sel').value;
  if (!tid) { showToast('Select a teacher', 'error'); return; }
  const tbl = document.getElementById('salary-table');
  tbl.innerHTML = loading();
  try {
    const res     = await api.get(`/salary?teacher_id=${tid}`);
    const records = res.data || [];
    tbl.innerHTML = _salaryTable(records, (r) =>
      `<a href="${api.BASE}/salary/slip/${tid}/${encodeURIComponent(r.month)}"
          target="_blank" class="btn-secondary btn-sm">⬇ Slip</a>`
    );
  } catch(e) { tbl.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}