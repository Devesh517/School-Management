// fees.js — Director: fee collection overview

async function renderFees() {
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading('Loading fee data...');
  try {
    const [overviewRes, classesRes] = await Promise.all([
      api.get('/director/fee-overview'),
      api.get('/classes'),
    ]);
    const ov = overviewRes.data;
    const summary = ov.summary || {};
    const recent  = ov.recent_payments || [];
    const classes = classesRes.data || [];

    ca.innerHTML = `
      <div class="page-header">
        <div><h1 class="page-title">💳 Fee Collection</h1>
          <p class="page-subtitle">Overall fee status and recent payments</p></div>
        <button class="btn-primary" onclick="showAddPaymentModal(${JSON.stringify(classes).replace(/"/g,'&quot;')})">+ Record Payment</button>
      </div>
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card blue"><div class="stat-icon">👨‍🎓</div>
          <div class="stat-label">Total Students</div>
          <div class="stat-value">${summary.total_students||0}</div></div>
        <div class="stat-card green"><div class="stat-icon">✅</div>
          <div class="stat-label">Total Collected</div>
          <div class="stat-value">₹${(+summary.total_paid||0).toLocaleString()}</div></div>
        <div class="stat-card gold"><div class="stat-icon">⏳</div>
          <div class="stat-label">Total Due</div>
          <div class="stat-value">₹${(+summary.total_due||0).toLocaleString()}</div></div>
        <div class="stat-card purple"><div class="stat-icon">💰</div>
          <div class="stat-label">Total Fee</div>
          <div class="stat-value">₹${(+summary.total_fee||0).toLocaleString()}</div></div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">📋 Recent Payments (Last 50)</span></div>
        <div class="card-body">
          ${recent.length===0 ? emptyState('💳','No payments yet','Record the first fee payment above.') : `
          <table>
            <thead><tr><th>Date</th><th>Student</th><th>Class</th><th>Amount</th><th>Mode</th><th>Receipt</th></tr></thead>
            <tbody>
              ${recent.map(p=>`<tr>
                <td>${p.payment_date||''}</td>
                <td>${p.name} <span style="color:var(--text-secondary)">#${p.student_id}</span></td>
                <td>${p.class_name} - ${p.section_name}</td>
                <td><strong>₹${(+p.amount).toLocaleString()}</strong></td>
                <td>${p.payment_mode||'—'}</td>
                <td>${p.receipt_no||'—'}</td>
              </tr>`).join('')}
            </tbody>
          </table>`}
        </div>
      </div>`;
  } catch(e) {
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('⚠️','Error',e.message)}</div></div>`;
  }
}

function showAddPaymentModal(classes) {
  openModal('Record Fee Payment', `
    <div class="form-grid">
      <div class="form-group"><label>Class *</label>
        <select id="fp-class" class="form-control" onchange="loadSectionsForFee(this.value)">
          <option value="">Select Class</option>
          ${classes.map(c=>`<option value="${c.id}">${c.class_name}</option>`).join('')}
        </select></div>
      <div class="form-group"><label>Section *</label>
        <select id="fp-section" class="form-control" onchange="loadStudentsForFee(document.getElementById('fp-class').value, this.value)">
          <option value="">Select Section</option></select></div>
      <div class="form-group"><label>Student *</label>
        <select id="fp-student" class="form-control"><option value="">Select Student</option></select></div>
      <div class="form-group"><label>Amount (₹) *</label>
        <input id="fp-amount" type="number" class="form-control" placeholder="5000"/></div>
      <div class="form-group"><label>Payment Date</label>
        <input id="fp-date" type="date" class="form-control" value="${new Date().toISOString().slice(0,10)}"/></div>
      <div class="form-group"><label>Mode</label>
        <select id="fp-mode" class="form-control">
          <option>Cash</option><option>Online</option><option>Cheque</option><option>DD</option>
        </select></div>
      <div class="form-group"><label>Receipt No</label>
        <input id="fp-receipt" class="form-control" placeholder="REC-001"/></div>
      <div class="form-group"><label>Remarks</label>
        <input id="fp-remarks" class="form-control" placeholder="Optional remarks"/></div>
    </div>`,
    [{ label: 'Record Payment', class: 'btn-primary', action: 'savePayment()' }]);
}

async function loadSectionsForFee(classId) {
  if (!classId) return;
  const res = await api.get(`/classes/${classId}/sections`);
  const sel = document.getElementById('fp-section');
  sel.innerHTML = '<option value="">Select Section</option>' +
    (res.data||[]).map(s=>`<option value="${s.id}">${s.section_name}</option>`).join('');
}

async function loadStudentsForFee(classId, sectionId) {
  if (!classId || !sectionId) return;
  const res = await api.get(`/students?class_id=${classId}&section_id=${sectionId}`);
  const sel = document.getElementById('fp-student');
  sel.innerHTML = '<option value="">Select Student</option>' +
    (res.data||[]).map(s=>`<option value="${s.id}">${s.name} (#${s.student_id})</option>`).join('');
}

async function savePayment() {
  const body = {
    student_db_id: document.getElementById('fp-student').value,
    amount:        parseFloat(document.getElementById('fp-amount').value),
    payment_date:  document.getElementById('fp-date').value,
    payment_mode:  document.getElementById('fp-mode').value,
    receipt_no:    document.getElementById('fp-receipt').value,
    remarks:       document.getElementById('fp-remarks').value,
    collected_by:  currentUser?.name || '',
  };
  if (!body.student_db_id || !body.amount) { showToast('Student and amount required', 'error'); return; }
  try {
    await api.post('/fee-payments', body);
    showToast('Payment recorded!', 'success');
    closeModal();
    renderFees();
  } catch(e) { showToast(e.message, 'error'); }
}