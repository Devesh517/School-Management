async function renderSalary() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading();
  try {
    const tRes = await api.get('/teachers');
    const teachers = tRes.data || [];
    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">Salary Management</h1><p class="page-subtitle">Calculate and track teacher salaries</p></div>
        <button class="btn-primary" onclick="showCalcSalaryModal(${JSON.stringify(teachers).replace(/"/g,'&quot;')})">+ Calculate Salary</button>
      </div>
      <div class="class-section-selector">
        <div class="form-group">
          <label>Teacher</label>
          <select id="sal-teacher-sel">
            <option value="">Select teacher...</option>
            ${teachers.map(t => `<option value="${t.teacher_id}">${t.name} (#${t.teacher_id})</option>`).join('')}
          </select>
        </div>
        <button class="btn-primary" onclick="loadSalaryHistory()">View Salary History</button>
      </div>
      <div id="salary-table">${emptyState('💰','Select a teacher','Choose a teacher to view salary history')}</div>`;
  } catch (e) { ca.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

async function loadSalaryHistory() {
  const tid = document.getElementById('sal-teacher-sel').value;
  if (!tid) { showToast('Select a teacher', 'error'); return; }
  const tbl = document.getElementById('salary-table');
  tbl.innerHTML = loading();
  try {
    const res = await api.get(`/salary?teacher_id=${tid}`);
    const records = res.data || [];
    tbl.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Salary Records</span></div>
        <div class="card-body">
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Month</th><th>Basic</th><th>Incentive</th><th>Gross</th><th>PF</th><th>PT</th><th>TDS</th><th>Deduction</th><th>Net Salary</th></tr>
              </thead>
              <tbody>
                ${records.length ? records.map(r => `
                  <tr>
                    <td>${r.month}</td>
                    <td>₹${r.basic}</td>
                    <td>₹${r.incentive}</td>
                    <td>₹${r.gross}</td>
                    <td>₹${parseFloat(r.pf).toFixed(2)}</td>
                    <td>₹${r.professional_tax}</td>
                    <td>₹${parseFloat(r.tds).toFixed(2)}</td>
                    <td>₹${parseFloat(r.total_deduction).toFixed(2)}</td>
                    <td><strong style="color:var(--green)">₹${parseFloat(r.net_salary).toFixed(2)}</strong></td>
                  </tr>
                `).join('') : `<tr><td colspan="9">${emptyState('💰','No salary records','Process salary to see records')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
      </div>`;
  } catch (e) { tbl.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

function showCalcSalaryModal(teachers) {
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const year = new Date().getFullYear();
  showModal('Calculate Salary', `
    <div class="form-group">
      <label>Teacher</label>
      <select id="cs-teacher">
        <option value="">Select teacher...</option>
        ${teachers.map(t => `<option value="${t.teacher_id}">${t.name} (#${t.teacher_id})</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Month</label>
      <select id="cs-month">
        ${months.map(m => `<option value="${m}-${year}">${m} ${year}</option>`).join('')}
      </select>
    </div>
    <div style="background:var(--bg2);padding:16px;border-radius:8px;border:1px solid var(--border);margin-top:8px">
      <p style="font-size:13px;color:var(--text2);margin-bottom:8px"><strong>Salary Structure:</strong></p>
      <p style="font-size:12px;color:var(--text3)">• Class Teacher: ₹55,000 Basic + ₹10,000 Incentive</p>
      <p style="font-size:12px;color:var(--text3)">• Subject Teacher: ₹40,000 Basic + ₹10,000 Incentive</p>
      <p style="font-size:12px;color:var(--text3)">• Deductions: PF 12% + PT ₹200 + TDS 5%</p>
    </div>
  `, `
    <button class="btn-secondary" onclick="closeModal()">Cancel</button>
    <button class="btn-primary" onclick="submitSalary()">Calculate & Save</button>
  `);
}

async function submitSalary() {
  const teacher_id = parseInt(document.getElementById('cs-teacher').value);
  const month = document.getElementById('cs-month').value;
  if (!teacher_id) { showToast('Select a teacher', 'error'); return; }
  try {
    const res = await api.post('/salary', { teacher_id, month });
    const d = res.data;
    showToast(`Net Salary: ₹${parseFloat(d.net_salary).toFixed(2)}`);
    closeModal();
    document.getElementById('sal-teacher-sel').value = teacher_id;
    loadSalaryHistory();
  } catch (e) { showToast(e.message, 'error'); }
}