// app.js — Role-based School Management System
// Roles: director, principal, administrator, teacher, student

let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentPage = 'dashboard';

// ── Navigation config per role ──────────────────────────────────────────────
const NAV_CONFIG = {
  director: [
    { section: 'Overview',       items: [{ page: 'dashboard', icon: '📊', label: 'Dashboard' }] },
    { section: 'Administration', items: [
      { page: 'director-users',   icon: '👤', label: 'Manage Admins' },
      { page: 'salary',           icon: '💰', label: 'All Salaries' },
      { page: 'fees',             icon: '💳', label: 'Fee Collection' },
      { page: 'teachers',         icon: '👨‍🏫', label: 'Teachers' },
      { page: 'students',         icon: '👨‍🎓', label: 'Students' },
      { page: 'classes',          icon: '🏫', label: 'Classes' },
    ]},
    { section: 'Academic', items: [
      { page: 'exams',    icon: '📝', label: 'Exams & Marks' },
      { page: 'report',   icon: '📄', label: 'Report Cards' },
      { page: 'timetable',icon: '📅', label: 'Timetable' },
    ]},
    { section: 'Communication', items: [
      { page: 'notices',        icon: '📢', label: 'Notices' },
      { page: 'student-access', icon: '🔑', label: 'Student Access' },
    ]},
  ],

  principal: [
    { section: 'Overview',  items: [{ page: 'dashboard', icon: '📊', label: 'Dashboard' }] },
    { section: 'Academic',  items: [
      { page: 'principal-academic', icon: '🏫', label: 'Academic Overview' },
      { page: 'assignments',        icon: '📋', label: 'Class Assignments' },
      { page: 'exams',              icon: '📅', label: 'Exam Timetable' },
      { page: 'report',             icon: '📄', label: 'Report Cards' },
      { page: 'timetable',          icon: '🗓', label: 'Class Timetable' },
    ]},
    { section: 'Records', items: [
      { page: 'students', icon: '👨‍🎓', label: 'Students' },
      { page: 'teachers', icon: '👨‍🏫', label: 'Teachers' },
    ]},
    { section: 'Communication', items: [
      { page: 'notices', icon: '📢', label: 'Notices' },
    ]},
  ],

  administrator: [
    { section: 'Overview',    items: [{ page: 'dashboard', icon: '📊', label: 'Dashboard' }] },
    { section: 'Management',  items: [
      { page: 'classes',          icon: '🏫', label: 'Add Classes' },
      { page: 'students',         icon: '👨‍🎓', label: 'Students' },
      { page: 'teachers',         icon: '👨‍🏫', label: 'Teachers' },
      { page: 'student-access',   icon: '🔑', label: 'Student IDs' },
      { page: 'admin-teacher-creds', icon: '🔐', label: 'Teacher IDs' },
    ]},
    { section: 'Communication', items: [
      { page: 'notices', icon: '📢', label: 'Notices' },
    ]},
  ],

  teacher: [
    { section: 'Overview',  items: [{ page: 'dashboard', icon: '📊', label: 'Dashboard' }] },
    { section: 'Teaching',  items: [
      { page: 'exams',      icon: '📝', label: 'Enter / Update Marks' },
      { page: 'timetable',  icon: '📅', label: 'My Timetable' },
    ]},
    { section: 'Communication', items: [
      { page: 'notices', icon: '📢', label: 'Notices' },
    ]},
  ],
};

const ROLE_LABELS = {
  director:      'Director',
  principal:     'Principal',
  administrator: 'Administrator',
  teacher:       'Teacher',
  student:       'Student',
};

// ── Build sidebar nav ────────────────────────────────────────────────────────
function buildNav(role) {
  const nav = document.getElementById('main-nav');
  const config = NAV_CONFIG[role] || NAV_CONFIG['teacher'];
  nav.innerHTML = config.map(section => `
    <div class="nav-section">
      <span class="nav-section-label">${section.section}</span>
      ${section.items.map(item => `
        <a href="#" class="nav-item" data-page="${item.page}">
          <span class="nav-icon">${item.icon}</span><span>${item.label}</span>
        </a>
      `).join('')}
    </div>
  `).join('');

  nav.querySelectorAll('.nav-item').forEach(el => {
    el.addEventListener('click', e => { e.preventDefault(); navigate(el.dataset.page); });
  });
}

// ── Login ────────────────────────────────────────────────────────────────────
async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errEl    = document.getElementById('login-error');
  const btn      = e.target.querySelector('.btn-primary');

  btn.disabled = true;
  errEl.classList.add('hidden');

  try {
    const res = await api.post('/login', { username, password });

    if (res.data.role === 'student') {
      throw { message: 'Students must use the Student Portal →' };
    }

    currentUser = res.data;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    _applyUserToUI();

    document.getElementById('page-login').classList.replace('active', 'hidden');
    document.getElementById('page-app').classList.remove('hidden');
    navigate('dashboard');
  } catch (err2) {
    errEl.textContent = err2.message || 'Invalid credentials';
    errEl.classList.remove('hidden');
  } finally {
    btn.disabled = false;
  }
}

function logout() {
  currentUser = null;
  localStorage.removeItem('currentUser');
  document.getElementById('page-app').classList.add('hidden');
  document.getElementById('page-login').classList.replace('hidden', 'active');
  document.getElementById('login-username').value = '';
  document.getElementById('login-password').value = '';
}

function _applyUserToUI() {
  document.getElementById('user-name').textContent   = currentUser.name;
  document.getElementById('user-role').textContent   = ROLE_LABELS[currentUser.role] || currentUser.role;
  document.getElementById('user-avatar').textContent = currentUser.name[0].toUpperCase();
  buildNav(currentUser.role);
}

// ── Navigate ─────────────────────────────────────────────────────────────────
function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading('Loading...');

  const renderers = {
    dashboard:             renderDashboard,
    classes:               renderClasses,
    students:              renderStudents,
    teachers:              renderTeachers,
    assignments:           renderAssignments,
    salary:                renderSalary,
    attendance:            renderAttendance,
    exams:                 renderExams,
    report:                renderReport,
    notices:               renderNotices,
    'student-access':      renderStudentAccess,
    timetable:             renderTimetable,
    fees:                  renderFees,
    'director-users':      renderDirectorUsers,
    'principal-academic':  renderPrincipalAcademic,
    'admin-teacher-creds': renderAdminTeacherCreds,
  };

  if (renderers[page]) {
    renderers[page]();
  } else {
    ca.innerHTML = `<div class="card"><div class="card-body">${emptyState('🚧', 'Coming Soon', 'This section is under construction.')}</div></div>`;
  }
}

// ── Restore session ──────────────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
  if (currentUser && currentUser.role !== 'student') {
    _applyUserToUI();
    document.getElementById('page-login').classList.remove('active');
    document.getElementById('page-login').classList.add('hidden');
    document.getElementById('page-app').classList.remove('hidden');
    navigate('dashboard');
  }
});
