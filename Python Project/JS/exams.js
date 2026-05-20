async function renderExams() {

  const ca = document.getElementById('content-area');

  ca.innerHTML = `

    <div class="page-header">

      <div>

        <h1 class="page-title">
          Exams & Marks
        </h1>

        <p class="page-subtitle">
          Create exam timetables and manage marks
        </p>

      </div>

    </div>



    <div class="tabs">

      <button class="tab active"
              onclick="switchExamTab(this,'create')">

        Create Timetable

      </button>

      <button class="tab"
              onclick="switchExamTab(this,'marks')">

        Enter Marks

      </button>

      <button class="tab"
              onclick="switchExamTab(this,'update')">

        Update Marks

      </button>

    </div>



    <!-- CREATE TIMETABLE -->

    <div id="exam-tab-create">

      <div class="card">

        <div class="card-header">

          <span class="card-title">

            Create Exam Timetable

          </span>

        </div>



        <div class="card-body">

          <div class="form-row">

            <div class="form-group">

              <label>Exam Name</label>

              <input
                id="tt-exam-name"
                type="text"
                placeholder="Half Yearly"
              />

            </div>



            <div class="form-group">

              <label>Class</label>

              <input
                id="tt-class"
                type="text"
                placeholder="8"
              />

            </div>



            <div class="form-group">

              <label>Section</label>

              <input
                id="tt-section"
                type="text"
                placeholder="A"
              />

            </div>

          </div>



          <div id="timetable-subjects"></div>



          <button
            class="btn-secondary"
            onclick="addSubjectRow()">

            + Add Subject

          </button>



          <br><br>



          <button
            class="btn-primary"
            onclick="submitTimetable()">

            Generate Timetable

          </button>



          <button
            class="btn-secondary"
            onclick="downloadTimetablePDF()">

            Download PDF

          </button>

        </div>

      </div>

    </div>



    <!-- ENTER MARKS -->

    <div id="exam-tab-marks" class="hidden">

      <div class="class-section-selector">

        <div class="form-group">

          <label>Class</label>

          <input
            id="m-class"
            type="text"
            placeholder="e.g. 8"
          />

        </div>



        <div class="form-group">

          <label>Section</label>

          <input
            id="m-section"
            type="text"
            placeholder="e.g. A"
          />

        </div>



        <button
          class="btn-primary"
          onclick="loadExamsForMarks()">

          Load Exams

        </button>

      </div>



      <div id="marks-area"></div>

    </div>



    <!-- UPDATE MARKS -->

    <div id="exam-tab-update" class="hidden">

      <div class="card">

        <div class="card-header">

          <span class="card-title">

            Update Marks

          </span>

        </div>



        <div class="card-body">

          <div class="form-row">

            <div class="form-group">

              <label>Class</label>

              <input
                id="um-class"
                type="text"
                placeholder="e.g. 8"
              />

            </div>



            <div class="form-group">

              <label>Section</label>

              <input
                id="um-section"
                type="text"
                placeholder="e.g. A"
              />

            </div>

          </div>



          <div id="um-exam-select">

            <button
              class="btn-secondary"
              onclick="loadExamsForUpdate()">

              Load Exams

            </button>

          </div>

        </div>

      </div>

    </div>

  `;



  // Auto add first subject row

  setTimeout(() => {

    if (timetableCount === 0) {

      addSubjectRow();

    }

  }, 100);

}

async function submitTimetable() {

  if (!currentUser) {

    showToast('Login required', 'error');

    return;
  }

  const exam_name =
    document.getElementById('tt-exam-name')
    .value
    .trim();

  const class_name =
    document.getElementById('tt-class')
    .value
    .trim();

  const section_name =
    document.getElementById('tt-section')
    .value
    .trim()
    .toUpperCase();

  let subjects = [];

  for (let i = 1; i <= timetableCount; i++) {

    const subject =
      document.getElementById(`subject-${i}`)?.value;

    if (!subject) continue;

    subjects.push({

      subject_name: subject,

      exam_date:
        document.getElementById(`date-${i}`).value,

      start_time:
        document.getElementById(`start-${i}`).value,

      end_time:
        document.getElementById(`end-${i}`).value,

      max_marks:
        parseInt(
          document.getElementById(`marks-${i}`).value
        )

    });
  }

  if (
    !exam_name ||
    !class_name ||
    !section_name ||
    subjects.length === 0
  ) {

    showToast('All fields required', 'error');

    return;
  }

  try {

    const res = await api.post('/exams/timetable', {

      teacher_id: currentUser.teacher_id,

      exam_name,

      class_name,

      section_name,

      subjects

    });
    document.getElementById('tt-exam-name').value = '';

document.getElementById('tt-class').value = '';

document.getElementById('tt-section').value = '';

document.getElementById('timetable-subjects').innerHTML = '';

timetableCount = 0;

addSubjectRow();
    showToast(res.message);

  }

  catch (e) {

    showToast(e.message, 'error');

  }
}

let timetableCount = 0;

function addSubjectRow() {

  timetableCount++;

  const div = document.createElement('div');

  div.className = 'form-row';

  div.style.marginBottom = '16px';

  div.innerHTML = `

    <div class="form-group">
      <label>Subject</label>
      <input type="text"
             id="subject-${timetableCount}"
             placeholder="English"/>
    </div>

    <div class="form-group">
      <label>Date</label>
      <input type="date"
             id="date-${timetableCount}"/>
    </div>

    <div class="form-group">
      <label>Start Time</label>
      <input type="time"
             id="start-${timetableCount}"/>
    </div>

    <div class="form-group">
      <label>End Time</label>
      <input type="time"
             id="end-${timetableCount}"/>
    </div>

    <div class="form-group">
      <label>Max Marks</label>
      <input type="number"
             id="marks-${timetableCount}"
             value="100"/>
    </div>

  `;

  document
    .getElementById('timetable-subjects')
    .appendChild(div);
}

function downloadTimetablePDF() {

  const exam_name =
    document.getElementById('tt-exam-name')
    .value
    .trim();

  const class_name =
    document.getElementById('tt-class')
    .value
    .trim();

  const section_name =
    document.getElementById('tt-section')
    .value
    .trim();

  if (!exam_name || !class_name || !section_name) {

    showToast('Fill exam details first', 'error');

    return;
  }

  window.open(

    `http://localhost:5000/api/exams/timetable/pdf?class_name=${class_name}&section_name=${section_name}&exam_name=${exam_name}`,

    '_blank'

  );
}

function switchExamTab(el, tab) {
  ['create','marks','update'].forEach(t => {
    document.getElementById(`exam-tab-${t}`).classList.toggle('hidden', t !== tab);
  });
  document.querySelectorAll('.tabs .tab').forEach(b => b.classList.remove('active'));
  el.classList.add('active');
}

async function loadExamsForMarks() {
  const cn = document.getElementById('m-class').value.trim();
  const sn = document.getElementById('m-section').value.trim().toUpperCase();
  if (!cn || !sn) { showToast('Enter class and section', 'error'); return; }
  const area = document.getElementById('marks-area');
  area.innerHTML = loading();
  try {
    const [eRes, cRes] = await Promise.all([
      api.get(`/exams?class_name=${cn}&section_name=${sn}`),
      api.get('/classes')
    ]);
    const exams = eRes.data || [];
    const cls = cRes.data?.find(c => c.class_name === cn);
    if (!cls) { area.innerHTML = `<div class="error-msg">Class not found</div>`; return; }
    const subRes = await api.get(`/classes/${cls.id}/subjects`);
    const subjects = subRes.data || [];
    const stdRes = await api.get(`/students?class_name=${cn}&section_name=${sn}`);
    const students = stdRes.data || [];

    area.innerHTML = `
      <div class="card">
        <div class="card-header"><span class="card-title">Enter Marks</span></div>
        <div class="card-body">
          <div class="form-row">
            <div class="form-group">
              <label>Select Exam</label>
              <select id="sel-exam">
                <option value="">Select exam...</option>
                ${exams.map(e => `<option value="${e.id}" data-max="${e.max_marks}">${e.exam_name} (Max: ${e.max_marks})</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label>Select Student</label>
              <select id="sel-student">
                <option value="">Select student...</option>
                ${students.map(s => `<option value="${s.student_id}">${s.name} (#${s.student_id})</option>`).join('')}
              </select>
            </div>
          </div>
          <div id="marks-entry-form"></div>
          <button class="btn-secondary" onclick="loadMarksEntry(${JSON.stringify(subjects).replace(/"/g,'&quot;')})">Load Marks Form</button>
        </div>
      </div>`;
    window._marksSubjects = subjects;
  } catch (e) { area.innerHTML = `<div class="error-msg">${e.message}</div>`; }
}

function loadMarksEntry(subjects) {
  const examSel = document.getElementById('sel-exam');
  const max = examSel.options[examSel.selectedIndex]?.dataset.max || 100;
  document.getElementById('marks-entry-form').innerHTML = `
    <div class="marks-subject-row" style="margin:16px 0">
      ${subjects.map(s => `
        <div class="mark-entry">
          <div class="mark-subject">${s.subject_name}</div>
          <input class="mark-input" id="mark-${s.id}" type="number" min="0" max="${max}" placeholder="0–${max}"/>
          <span style="color:var(--text3);font-size:12px">/ ${max}</span>
        </div>
      `).join('')}
    </div>
    <button class="btn-primary" onclick="submitMarks(${JSON.stringify(subjects).replace(/"/g,'&quot;')})">Save Marks</button>`;
}

async function submitMarks(subjects) {
  const exam_id = parseInt(document.getElementById('sel-exam').value);
  const student_id = parseInt(document.getElementById('sel-student').value);
  if (!exam_id || !student_id) { showToast('Select exam and student', 'error'); return; }
  const marks = subjects.map(s => ({
    subject_id: s.id,
    marks_obtained: parseInt(document.getElementById(`mark-${s.id}`)?.value || 0)
  }));
  try {
    await api.post('/marks', { exam_id, student_id, marks });
    showToast('Marks saved!');
    document.getElementById('marks-entry-form').innerHTML = '';
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadExamsForUpdate() {
  const cn = document.getElementById('um-class').value.trim();
  const sn = document.getElementById('um-section').value.trim().toUpperCase();
  if (!cn || !sn) { showToast('Enter class and section', 'error'); return; }
  try {
    const res = await api.get(`/exams?class_name=${cn}&section_name=${sn}`);
    const exams = res.data || [];
    document.getElementById('um-exam-select').innerHTML = `
      <div class="form-group">
        <label>Exam</label>
        <select id="um-exam">
          ${exams.map(e => `<option value="${e.id}" data-max="${e.max_marks}">${e.exam_name}</option>`).join('')}
        </select>
      </div>
      <div class="form-group"><label>Student ID</label><input id="um-sid" type="number" placeholder="Student ID"/></div>
      <button class="btn-secondary" onclick="loadUpdateMarksForm('${cn}','${sn}')">Load Marks</button>
      <div id="um-form"></div>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function loadUpdateMarksForm(cn, sn) {
  const exam_id = document.getElementById('um-exam').value;
  const student_id = document.getElementById('um-sid').value;
  if (!student_id) { showToast('Enter student ID', 'error'); return; }
  try {
    const res = await api.get(`/marks?exam_id=${exam_id}&student_id=${student_id}`);
    const marks = res.data || [];
    const examSel = document.getElementById('um-exam');
    const max = examSel.options[examSel.selectedIndex]?.dataset.max || 100;
    document.getElementById('um-form').innerHTML = `
      <div class="marks-subject-row" style="margin:16px 0">
        ${marks.map(m => `
          <div class="mark-entry">
            <div class="mark-subject">${m.subject_name}</div>
            <input class="mark-input" id="um-mark-${m.subject_id}" type="number" value="${m.marks_obtained}" min="0" max="${max}"/>
            <span style="color:var(--text3);font-size:12px">/ ${max}</span>
          </div>
        `).join('')}
      </div>
      <button class="btn-primary" onclick="submitUpdateMarks(${exam_id}, ${student_id}, ${JSON.stringify(marks).replace(/"/g,'&quot;')})">Update Marks</button>`;
  } catch (e) { showToast(e.message, 'error'); }
}

async function submitUpdateMarks(exam_id, student_id, marks) {
  const updatedMarks = marks.map(m => ({
    subject_id: m.subject_id,
    marks_obtained: parseInt(document.getElementById(`um-mark-${m.subject_id}`)?.value || 0)
  }));
  try {
    await api.post('/marks', { exam_id, student_id, marks: updatedMarks });
    showToast('Marks updated!');
  } catch (e) { showToast(e.message, 'error'); }
}