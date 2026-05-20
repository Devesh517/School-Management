// let currentUser = null;
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;
let currentPage = 'dashboard';
// let currentPage = 'dashboard';

async function handleLogin(e) {
  e.preventDefault();
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value.trim();
  const errEl = document.getElementById('login-error');
  const btn = e.target.querySelector('.btn-primary');
  btn.disabled = true;
  errEl.classList.add('hidden');
  try {
    const res = await api.post('/login', { username, password });
    // currentUser = res.data;
    currentUser = res.data;
    localStorage.setItem('currentUser', JSON.stringify(currentUser));
    document.getElementById('user-name').textContent = currentUser.name;
    document.getElementById('user-role').textContent = currentUser.role === 'admin' ? 'Administrator' : 'Teacher';
    document.getElementById('user-avatar').textContent = currentUser.name[0].toUpperCase();
    // Hide admin-only nav for teachers
    if (currentUser.role !== 'admin') {
      document.getElementById('admin-nav').classList.add('hidden');
    } else {
      document.getElementById('admin-nav').classList.remove('hidden');
    }
    document.getElementById('page-login').classList.replace('active', 'hidden');
    document.getElementById('page-app').classList.remove('hidden');
    navigate('dashboard');
  } catch (err) {
    errEl.textContent = err.message || 'Invalid credentials';
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

function navigate(page) {
  currentPage = page;
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
  const ca = document.getElementById('content-area');
  ca.innerHTML = loading('Loading page...');
  const renderers = {
    dashboard: renderDashboard,
    classes: renderClasses,
    students: renderStudents,
    teachers: renderTeachers,
    assignments: renderAssignments,
    salary: renderSalary,
    attendance: renderAttendance,
    exams: renderExams,
    report: renderReport,
  };
  if (renderers[page]) renderers[page]();
}

// Nav click listeners
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

window.addEventListener('DOMContentLoaded', () => {

  if (currentUser) {

    document.getElementById('user-name').textContent = currentUser.name;

    document.getElementById('user-role').textContent =
      currentUser.role === 'admin'
        ? 'Administrator'
        : 'Teacher';

    document.getElementById('user-avatar').textContent =
      currentUser.name[0].toUpperCase();

    document.getElementById('page-login').classList.remove('active');

    document.getElementById('page-login').classList.add('hidden');

    document.getElementById('page-app').classList.remove('hidden');

    if (currentUser.role !== 'admin') {
      document.getElementById('admin-nav').classList.add('hidden');
    }

    navigate('dashboard');
  }
});