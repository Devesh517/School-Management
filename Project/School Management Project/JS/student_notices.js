// student_notices.js  –  Notices page for student portal

async function renderStudentNotices() {
  const ca = document.getElementById('content-area');

  try {
    const res     = await api.get('/notices?target=student_view');
    const notices = res.data || [];

    ca.innerHTML = `
      <div class="page-header">
        <h1 class="page-title">📢 Notices</h1>
        <p style="color:var(--text-muted);font-size:0.85rem;margin-top:4px;">
          ${notices.length} notice(s) for you
        </p>
      </div>

      ${!notices.length ? `
        <div class="student-empty">
          <div class="empty-icon">📭</div>
          <h3>No notices yet</h3>
          <p>Notices from your admin and teachers will appear here.</p>
        </div>` :

        notices.map(n => `
          <div class="notice-card">
            <div class="notice-card-header">
              <div>
                <span class="notice-card-title">${n.title}</span>
                <span class="notice-tag ${n.target === 'all' ? 'notice-tag-all' : 'notice-tag-students'}">
                  ${n.target === 'all' ? '🌐 Everyone' : '👩‍🎓 Students'}
                </span>
              </div>
              <div class="notice-card-meta">
                <div>${n.created_by}</div>
                <div>${_fmtDate(n.created_at)}</div>
              </div>
            </div>
            <div class="notice-card-body">${n.content}</div>
          </div>
        `).join('')}
    `;
  } catch (e) {
    ca.innerHTML = `<div class="error-state">Failed to load notices: ${e.message}</div>`;
  }
}
