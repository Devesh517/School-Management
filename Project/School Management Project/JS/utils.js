function showToast(msg, type = 'success', duration = 3000) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = `toast ${type}`;
  t.classList.remove('hidden');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.add('hidden'), duration);
}

function showModal(title, bodyHTML, footerHTML = '') {
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-body').innerHTML = bodyHTML;
  document.getElementById('modal-footer').innerHTML = footerHTML;
  document.getElementById('modal-overlay').classList.remove('hidden');
}

/**
 * openModal – extended variant used by notices.js and student_access.js
 * @param {string} title
 * @param {string} bodyHTML
 * @param {Array<{label,class,action}>} buttons
 */
function openModal(title, bodyHTML, buttons = []) {
  const footerHTML = buttons.map(b =>
    `<button class="${b.class}" onclick="${b.action}">${b.label}</button>`
  ).join('');
  showModal(title, bodyHTML, footerHTML);
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

document.getElementById('modal-overlay').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

function setHTML(id, html) {
  document.getElementById(id).innerHTML = html;
}

function loading(text = 'Loading...') {
  return `<div class="loading"><div class="spinner"></div>${text}</div>`;
}

function emptyState(icon, title, msg) {
  return `<div class="empty-state"><div class="icon">${icon}</div><h3>${title}</h3><p>${msg}</p></div>`;
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: '2-digit' });
}
