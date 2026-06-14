// exams.js — Role-based exam management with cascading dropdowns

async function renderExams() {
  const ca = document.getElementById('content-area');
  const role = currentUser?.role;
  const isPrincipal = role === 'principal' || role === 'director';
  const isTeacher   = role === 'teacher' || role === 'administrator';

  let tabs = '', tabPanels = '';
  if (isPrincipal) {
    tabs = `
      <button class="tab active" onclick="switchExamTab(this,'create')">📅 Create Timetable</button>
      <button class="tab" onclick="switchExamTab(this,'view')">👁 View Timetable</button>`;
    tabPanels = `
      <div id="exam-tab-create">${_buildCreateTimetableHTML()}</div>
      <div id="exam-tab-view" class="hidden">${_buildViewTimetableHTML()}</div>`;
  } else if (isTeacher) {
    tabs = `
      <button class="tab active" onclick="switchExamTab(this,'marks')">✏️ Enter Marks</button>
      <button class="tab" onclick="switchExamTab(this,'update')">🔄 Update Marks</button>`;
    tabPanels = `
      <div id="exam-tab-marks">${_buildEnterMarksHTML()}</div>
      <div id="exam-tab-update" class="hidden">${_buildUpdateMarksHTML()}</div>`;
  }

  ca.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">📝 Exams & Marks</h1>
        <p class="page-subtitle">${isPrincipal ? 'Manage exam timetables' : 'Enter and update student marks'}</p>
      </div>
    </div>
    <div class="tabs">${tabs}</div>
    ${tabPanels}`;

  // Populate all class dropdowns after render
  await Promise.all([
    isPrincipal ? _fillExamClassSel('tt-class', 'tt-section') : Promise.resolve(),
    isPrincipal ? _fillExamClassSel('vt-class', 'vt-section') : Promise.resolve(),
    isTeacher   ? _fillExamClassSel('m-class',  'm-section')  : Promise.resolve(),
    isTeacher   ? _fillExamClassSel('um-class', 'um-section') : Promise.resolve(),
  ]);

  if (isPrincipal) {
    setTimeout(() => { if (timetableCount === 0) addSubjectRow(); }, 100);
  }
}

// Fill a class <select> and wire its section <select>
async function _fillExamClassSel(classSelId, secSelId) {
  const sel = document.getElementById(classSelId);
  if (!sel) return;
  try {
    const res = await api.get('/classes');
    sel.innerHTML = '<option value="">Select Class...</option>';
    (res.data || []).forEach(c =>
      sel.insertAdjacentHTML('beforeend',
        `<option value="${c.id}" data-name="${c.class_name}">${c.class_name}</option>`)
    );
    sel.onchange = () => _fillExamSectionSel(sel.value, secSelId);
  } catch(e) { console.error('class load failed', e); }
}

async function _fillExamSectionSel(classId, secSelId) {
  const sel = document.getElementById(secSelId);
  if (!sel) return;
  sel.innerHTML = '<option value="">Select Section...</option>';
  if (!classId) return;
  try {
    const res = await api.get(`/classes/${classId}/sections`);
    (res.data || []).forEach(s =>
      sel.insertAdjacentHTML('beforeend',
        `<option value="${s.id}" data-name="${s.section_name}">${s.section_name}</option>`)
    );
  } catch(e) { console.error('section load failed', e); }
}

// Helpers to read selected name/id from a select
function _selName(id)  { const s = document.getElementById(id); return s?.options[s.selectedIndex]?.dataset.name || ''; }
function _selVal(id)   { return document.getElementById(id)?.value || ''; }
function _selId(id)    { return document.getElementById(id)?.value || ''; }

// ── HTML builders ─────────────────────────────────────────────────────────────
function _buildCreateTimetableHTML() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Create Exam Timetable</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Exam Name</label>
            <input id="tt-exam-name" type="text" placeholder="e.g. Half Yearly"/></div>
          <div class="form-group"><label>Class</label>
            <select id="tt-class" class="form-control">
              <option value="">Select Class...</option>
            </select></div>
          <div class="form-group"><label>Section</label>
            <select id="tt-section" class="form-control">
              <option value="">Select Section...</option>
            </select></div>
        </div>
        <div id="timetable-subjects"></div>
        <button class="btn-secondary" onclick="addSubjectRow()">+ Add Subject</button>
        <br><br>
        <button class="btn-primary" onclick="submitTimetable()">Generate Timetable</button>
        <button class="btn-secondary" onclick="downloadTimetablePDF()">⬇ Download PDF</button>
      </div>
    </div>`;
}

function _buildViewTimetableHTML() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">View & Download Timetable</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Class</label>
            <select id="vt-class" class="form-control">
              <option value="">Select Class...</option>
            </select></div>
          <div class="form-group"><label>Section</label>
            <select id="vt-section" class="form-control">
              <option value="">Select Section...</option>
            </select></div>
          <div class="form-group"><label>Exam Name</label>
            <input id="vt-exam" type="text" placeholder="e.g. Half Yearly"/></div>
        </div>
        <button class="btn-primary" onclick="viewAndDownloadTimetable()">⬇ Download PDF</button>
        <div id="vt-result" style="margin-top:16px"></div>
      </div>
    </div>`;
}

function _buildEnterMarksHTML() {
  return `
    <div class="class-section-selector">
      <div class="form-group"><label>Class</label>
        <select id="m-class" class="form-control">
          <option value="">Select Class...</option>
        </select></div>
      <div class="form-group"><label>Section</label>
        <select id="m-section" class="form-control">
          <option value="">Select Section...</option>
        </select></div>
      <button class="btn-primary" onclick="loadExamsForMarks()">Load Exams</button>
    </div>
    <div id="marks-area"></div>`;
}

function _buildUpdateMarksHTML() {
  return `
    <div class="card">
      <div class="card-header"><span class="card-title">Update Marks</span></div>
      <div class="card-body">
        <div class="form-row">
          <div class="form-group"><label>Class</label>
            <select id="um-class" class="form-control">
              <option value="">Select Class...</option>
            </select></div>
          <div class="form-group"><label>Section</label>
            <select id="um-section" class="form-control">
              <option value="">Select Section...</option>
            </select></div>
        </div>
        <div id="um-exam-select" style="margin-top:12px">
          <button class="btn-secondary" onclick="loadExamsForUpdate()">Load Exams</button>
        </div>
      </div>
    </div>`;
}

function switchExamTab(el, tab) {
  document.querySelectorAll('[id^="exam-tab-"]').forEach(d => d.classList.add('hidden'));
  const target = document.getElementById(`exam-tab-${tab}`);
  if (target) target.classList.remove('hidden');
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

// ── CREATE TIMETABLE ─────────────────────────────────────────────────────────
async function submitTimetable() {
  if (!currentUser) { showToast('Login required', 'error'); return; }
  const exam_name    = document.getElementById('tt-exam-name').value.trim();
  const class_name   = _selName('tt-class');
  const section_name = _selName('tt-section');
  let subjects = [];
  for (let i = 1; i <= timetableCount; i++) {
    const subject = document.getElementById(`subject-${i}`)?.value;
    if (!subject) continue;
    subjects.push({
      subject_name: subject,
      exam_date:    document.getElementById(`date-${i}`).value,
      start_time:   document.getElementById(`start-${i}`).value,
      end_time:     document.getElementById(`end-${i}`).value,
      max_marks:    parseInt(document.getElementById(`marks-${i}`).value)
    });
  }
  if (!exam_name || !class_name || !section_name || subjects.length === 0) {
    showToast('All fields required', 'error'); return;
  }
  try {
    const res = await api.post('/exams/timetable', {
      teacher_id: currentUser.teacher_id,
      sender_role: currentUser.role,
      exam_name, class_name, section_name, subjects
    });
    document.getElementById('tt-exam-name').value = '';
    document.getElementById('tt-class').value = '';
    document.getElementById('tt-section').innerHTML = '<option value="">Select Section...</option>';
    document.getElementById('timetable-subjects').innerHTML = '';
    timetableCount = 0;
    addSubjectRow();
    showToast(res.message || 'Timetable created!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}

let timetableCount = 0;

function addSubjectRow() {
  timetableCount++;
  const div = document.createElement('div');
  div.className = 'form-row';
  div.style.marginBottom = '16px';
  div.innerHTML = `
    <div class="form-group"><label>Subject</label>
      <input type="text" id="subject-${timetableCount}" placeholder="e.g. English"/></div>
    <div class="form-group"><label>Date</label>
      <input type="date" id="date-${timetableCount}"/></div>
    <div class="form-group"><label>Start Time</label>
      <input type="time" id="start-${timetableCount}"/></div>
    <div class="form-group"><label>End Time</label>
      <input type="time" id="end-${timetableCount}"/></div>
    <div class="form-group"><label>Max Marks</label>
      <input type="number" id="marks-${timetableCount}" value="100"/></div>`;
  document.getElementById('timetable-subjects').appendChild(div);
}

function downloadTimetablePDF() {
  const exam_name    = document.getElementById('tt-exam-name').value.trim();
  const class_name   = _selName('tt-class');
  const section_name = _selName('tt-section');
  if (!exam_name || !class_name || !section_name) {
    showToast('Fill exam details first', 'error'); return;
  }
  window.open(
    `${api.BASE}/exams/timetable/pdf?class_name=${encodeURIComponent(class_name)}&section_name=${encodeURIComponent(section_name)}&exam_name=${encodeURIComponent(exam_name)}`,
    '_blank'
  );
}

function viewAndDownloadTimetable() {
  const class_name   = _selName('vt-class');
  const section_name = _selName('vt-section');
  const exam_name    = document.getElementById('vt-exam').value.trim();
  if (!class_name || !section_name || !exam_name) {
    showToast('Fill all fields first', 'error'); return;
  }
  window.open(
    `${api.BASE}/exams/timetable/pdf?class_name=${encodeURIComponent(class_name)}&section_name=${encodeURIComponent(section_name)}&exam_name=${encodeURIComponent(exam_name)}`,
    '_blank'
  );
}

// ── ENTER MARKS ──────────────────────────────────────────────────────────────
async function loadExamsForMarks() {
  const cn = _selName('m-class');
  const sn = _selName('m-section');
  if (!cn || !sn) { showToast('Select class and section', 'error'); return; }
  const area = document.getElementById('marks-area');
  area.innerHTML = loading();
  try {
    const classId = _selId('m-class');
    const [eRes, subRes, stdRes] = await Promise.all([
      api.get(`/exams?class_name=${cn}&section_name=${sn}`),
      api.get(`/classes/${classId}/subjects`),
      api.get(`/students?class_name=${cn}&section_name=${sn}`),
    ]);
    const exams    = eRes.data || [];
    const students = stdRes.data || [];

    if (!exams.length) {
      area.innerHTML = `<div class="card"><div class="card-body">${emptyState('📝','No Exams Found','No exam timetable created for this class/section yet.')}</div></div>`;
      return;
    }

    // Group by exam_name
    const examMap = {};
    exams.forEach(e => {
      if (!examMap[e.exam_name]) examMap[e.exam_name] = { name: e.exam_name, max_marks: e.max_marks, subjects: [] };
      examMap[e.exam_name].subjects.push({ exam_id: e.id, subject_name: e.subject_name, subject_id: e.subject_id, max_marks: e.max_marks });
    });
    window._examMap = examMap;
    const uniqueExams = Object.values(examMap);

    area.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Enter Marks — Class ${cn} ${sn}</span></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group"><label>Select Exam</label>
              <select id="sel-exam" onchange="onExamChange()">
                <option value="">Select exam...</option>
                ${uniqueExams.map(e => `<option value="${e.name}" data-max="${e.max_marks}">${e.name} (Max: ${e.max_marks})</option>`).join('')}
              </select></div>
            <div class="form-group"><label>Select Student</label>
              <select id="sel-student">
                <option value="">Select student...</option>
                ${students.map(s => `<option value="${s.student_id}">${s.name} (#${s.student_id})</option>`).join('')}
              </select></div>
          </div>
          <div id="marks-entry-form"></div>
          <button class="btn-secondary" onclick="loadMarksEntry()">Load Marks Form</button>
        </div>
      </div>`;
  } catch (e) { area.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

function onExamChange() {
  document.getElementById('marks-entry-form').innerHTML = '';
}

function loadMarksEntry() {
  const examSel  = document.getElementById('sel-exam');
  const examName = examSel.value;
  if (!examName) { showToast('Select an exam first', 'error'); return; }
  const examData = window._examMap?.[examName];
  if (!examData) { showToast('Exam data not loaded', 'error'); return; }
  const subjects = examData.subjects;
  const max = examData.max_marks || 100;
  document.getElementById('marks-entry-form').innerHTML = `
    <div class="marks-subject-row" style="margin:16px 0">
      ${subjects.map(s => `
        <div class="mark-entry">
          <div class="mark-subject">${s.subject_name}</div>
          <input class="mark-input" id="mark-${s.exam_id}" type="number" min="0" max="${max}" placeholder="0–${max}"/>
          <span style="color:var(--text3);font-size:12px">/ ${max}</span>
        </div>`).join('')}
    </div>
    <button class="btn-primary" onclick="submitMarks()">Save Marks</button>`;
  window._currentExamSubjects = subjects;
}

async function submitMarks() {
  const examName   = document.getElementById('sel-exam').value;
  const student_id = parseInt(document.getElementById('sel-student').value);
  if (!examName)   { showToast('Select an exam first', 'error'); return; }
  if (!student_id) { showToast('Select a student', 'error'); return; }
  const subjects = window._currentExamSubjects;
  if (!subjects?.length) { showToast('Load the marks form first', 'error'); return; }
  try {
    for (const s of subjects) {
      const marks_obtained = parseInt(document.getElementById(`mark-${s.exam_id}`)?.value || 0);
      await api.post('/marks', {
        exam_id:    s.exam_id,
        student_id: student_id,
        marks:      [{ subject_id: s.subject_id, marks_obtained }]
      });
    }
    showToast('Marks saved!', 'success');
    document.getElementById('marks-entry-form').innerHTML = '';
    document.getElementById('sel-student').value = '';
  } catch (e) { showToast(e.message, 'error'); }
}

// ── UPDATE MARKS ─────────────────────────────────────────────────────────────
async function loadExamsForUpdate() {
  const cn = _selName('um-class');
  const sn = _selName('um-section');
  if (!cn || !sn) { showToast('Select class and section', 'error'); return; }
  try {
    const [eRes, stdRes] = await Promise.all([
      api.get(`/exams?class_name=${cn}&section_name=${sn}`),
      api.get(`/students?class_name=${cn}&section_name=${sn}`),
    ]);
    const exams    = eRes.data || [];
    const students = stdRes.data || [];
    if (!exams.length) { showToast('No exams found for this class/section', 'error'); return; }

    // Group exams by name for the dropdown
    const examMap = {};
    exams.forEach(e => { if (!examMap[e.exam_name]) examMap[e.exam_name] = []; examMap[e.exam_name].push(e); });
    window._updateExamMap = examMap;

    document.getElementById('um-exam-select').innerHTML = `
      <div class="form-row">
        <div class="form-group"><label>Exam</label>
          <select id="um-exam">
            <option value="">Select Exam...</option>
            ${Object.keys(examMap).map(name => `<option value="${name}">${name}</option>`).join('')}
          </select></div>
        <div class="form-group"><label>Student</label>
          <select id="um-student">
            <option value="">Select Student...</option>
            ${students.map(s => `<option value="${s.student_id}">${s.name} (#${s.student_id})</option>`).join('')}
          </select></div>
      </div>
      <button class="btn-secondary" onclick="loadUpdateMarksForm()">Load Marks</button>
      <div id="um-form"></div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadUpdateMarksForm() {
  const examName   = document.getElementById('um-exam').value;
  const student_id = document.getElementById('um-student').value;
  if (!examName)   { showToast('Select an exam', 'error'); return; }
  if (!student_id) { showToast('Select a student', 'error'); return; }

  const examRows = window._updateExamMap?.[examName] || [];
  if (!examRows.length) { showToast('No exam rows found', 'error'); return; }

  const umForm = document.getElementById('um-form');
  umForm.innerHTML = loading();

  try {
    // Fetch existing marks for each exam row (one per subject)
    const allMarks = [];
    for (const row of examRows) {
      const res = await api.get(`/marks?exam_id=${row.id}&student_id=${student_id}`);
      (res.data || []).forEach(m => allMarks.push({ ...m, exam_id: row.id, max_marks: row.max_marks }));
    }

    if (!allMarks.length) {
      umForm.innerHTML = `<div class="error-msg" style="margin-top:12px">No marks found for this student in this exam. Enter marks first.</div>`;
      return;
    }

    const max = allMarks[0]?.max_marks || 100;
    umForm.innerHTML = `
      <div class="marks-subject-row" style="margin:16px 0">
        ${allMarks.map(m => `
          <div class="mark-entry">
            <div class="mark-subject">${m.subject_name}</div>
            <input class="mark-input" id="um-mark-${m.exam_id}-${m.subject_id}"
              type="number" value="${m.marks_obtained}" min="0" max="${m.max_marks}"/>
            <span style="color:var(--text3);font-size:12px">/ ${m.max_marks}</span>
          </div>`).join('')}
      </div>
      <button class="btn-primary" onclick="submitUpdateMarks(${student_id}, ${JSON.stringify(allMarks).replace(/"/g,'&quot;')})">
        Update Marks
      </button>`;
  } catch (e) { umForm.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

async function submitUpdateMarks(student_id, allMarks) {
  try {
    for (const m of allMarks) {
      const val = parseInt(document.getElementById(`um-mark-${m.exam_id}-${m.subject_id}`)?.value || 0);
      await api.post('/marks', {
        exam_id:    m.exam_id,
        student_id: student_id,
        marks:      [{ subject_id: m.subject_id, marks_obtained: val }]
      });
    }
    showToast('Marks updated!', 'success');
  } catch (e) { showToast(e.message, 'error'); }
}