// notices.js — Notices: admin/principal can send to all; teachers can send to students only

async function renderNotices() {
  const ca        = document.getElementById('content-area');
  const role      = currentUser?.role;
  const isAdmin   = ['administrator', 'director', 'principal'].includes(role);
  const isTeacher = role === 'teacher';

  try {
    // Pass role-based target so backend returns only relevant notices
    const targetParam = isTeacher ? 'teacher_view' : 'all';
    const res     = await api.get(`/notices?target=${targetParam}`);
    const notices = res.data || [];

    ca.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📢 Notices</h1>
        <button class="btn-primary" onclick="openNoticeModal()">+ Post Notice</button>
      </div>
      <div style="display:flex;gap:8px;margin-bottom:18px;flex-wrap:wrap;">
        <button class="btn-secondary btn-sm notice-filter active" data-filter="all"
          onclick="filterNotices('all')">All</button>
        ${!isTeacher ? `<button class="btn-secondary btn-sm notice-filter" data-filter="teachers"
          onclick="filterNotices('teachers')">For Teachers</button>` : ''}
        <button class="btn-secondary btn-sm notice-filter" data-filter="students"
          onclick="filterNotices('students')">For Students</button>
        <button class="btn-secondary btn-sm notice-filter" data-filter="global"
          onclick="filterNotices('global')">For Everyone</button>
      </div>
      <div id="notices-list">
        ${_renderNoticeCards(notices, isAdmin)}
      </div>`;

    window._allNotices = notices;
  } catch (e) {
    ca.innerHTML = `<div class="error-state">Failed to load notices: ${e.message}</div>`;
  }
}

function _renderNoticeCards(notices, canDelete) {
  if (!notices.length) {
    return `<div style="text-align:center;padding:40px;color:var(--text-muted);">
      <p style="font-size:2rem;">📭</p>
      <p>No notices posted yet.</p>
    </div>`;
  }
  return notices.map(n => `
    <div class="notice-item" data-target="${n.target}"
         style="background:var(--surface);border:1px solid var(--border);border-radius:12px;
                padding:18px 20px;margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="font-weight:600;font-size:1rem;">${n.title}</span>
          <span style="display:inline-block;padding:2px 10px;border-radius:20px;font-size:0.72rem;font-weight:600;
            background:${n.target==='all'?'#dbeafe':n.target==='teachers'?'#fef3c7':'#d1fae5'};
            color:${n.target==='all'?'#1e40af':n.target==='teachers'?'#92400e':'#065f46'};">
            ${n.target==='all'?'🌐 Everyone':n.target==='teachers'?'👨‍🏫 Teachers':'👩‍🎓 Students'}
          </span>
        </div>
        <div style="display:flex;align-items:center;gap:10px;flex-shrink:0;">
          <span style="font-size:0.75rem;color:var(--text-muted);">${n.created_by} • ${_fmtNoticeDate(n.created_at)}</span>
          ${canDelete || currentUser?.name === n.created_by ? `
            <button class="btn-danger btn-sm" onclick="deleteNotice(${n.id})">🗑</button>` : ''}
        </div>
      </div>
      <div style="font-size:0.87rem;color:var(--text-secondary);line-height:1.6;white-space:pre-wrap;">${n.content}</div>
    </div>`).join('');
}

function filterNotices(filter) {
  document.querySelectorAll('.notice-filter').forEach(b => b.classList.remove('active'));
  const btn = document.querySelector(`.notice-filter[data-filter="${filter}"]`);
  if (btn) btn.classList.add('active');
  const list = window._allNotices || [];
  let filtered = list;
  if (filter === 'teachers') filtered = list.filter(n => n.target === 'teachers');
  else if (filter === 'students') filtered = list.filter(n => n.target === 'students');
  else if (filter === 'global') filtered = list.filter(n => n.target === 'all');
  const isAdmin = ['administrator', 'director', 'principal'].includes(currentUser?.role);
  document.getElementById('notices-list').innerHTML = _renderNoticeCards(filtered, isAdmin);
}

function openNoticeModal() {
  const role = currentUser?.role;
  const isTeacher = role === 'teacher';

  // Teachers can only send to students
  const targetOptions = isTeacher
    ? `<option value="students">👩‍🎓 Students Only</option>`
    : `<option value="all">🌐 Everyone (Teachers + Students)</option>
       <option value="teachers">👨‍🏫 Teachers Only</option>
       <option value="students">👩‍🎓 Students Only</option>`;

  openModal('Post a Notice', `
    <div class="form-group">
      <label>Title</label>
      <input type="text" id="notice-title" class="form-input" placeholder="Notice title"/>
    </div>
    <div class="form-group">
      <label>Content</label>
      <textarea id="notice-content" class="form-input" rows="5"
        placeholder="Write your notice here…" style="resize:vertical;"></textarea>
    </div>
    <div class="form-group">
      <label>Send To</label>
      <select id="notice-target" class="form-input">
        ${targetOptions}
      </select>
    </div>`,
    [
      { label: 'Cancel', class: 'btn-secondary', action: 'closeModal()' },
      { label: 'Post Notice', class: 'btn-primary', action: 'submitNotice()' },
    ]);
}

async function submitNotice() {
  const title   = document.getElementById('notice-title').value.trim();
  const content = document.getElementById('notice-content').value.trim();
  const target  = document.getElementById('notice-target').value;
  if (!title || !content) { showToast('Title and content are required', 'error'); return; }
  try {
    await api.post('/notices', { title, content, target, created_by: currentUser.name });
    closeModal();
    showToast('Notice posted successfully!', 'success');
    renderNotices();
  } catch (e) {
    showToast(e.message || 'Failed to post notice', 'error');
  }
}

async function deleteNotice(id) {
  if (!confirm('Delete this notice?')) return;
  try {
    await api.delete(`/notices/${id}`);
    showToast('Notice deleted', 'success');
    renderNotices();
  } catch (e) {
    showToast(e.message || 'Failed to delete notice', 'error');
  }
}

function _fmtNoticeDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}