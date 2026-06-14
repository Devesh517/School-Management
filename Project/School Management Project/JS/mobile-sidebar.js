/* ============================================================
   mobile-sidebar.js
   Add this BEFORE the closing </body> tag in index.html
   and student.html  (after all other script tags)
   ============================================================ */

(function () {
  // --- Inject hamburger button and backdrop into the DOM ---
  function initMobileSidebar() {
    // Only inject once
    if (document.getElementById('hamburger-btn')) return;

    const hamburger = document.createElement('button');
    hamburger.id = 'hamburger-btn';
    hamburger.className = 'hamburger';
    hamburger.setAttribute('aria-label', 'Open menu');
    hamburger.innerHTML = '&#9776;'; // ☰
    document.body.appendChild(hamburger);

    const backdrop = document.createElement('div');
    backdrop.className = 'sidebar-backdrop';
    backdrop.id = 'sidebar-backdrop';
    document.body.appendChild(backdrop);

    const sidebar = document.querySelector('.sidebar');
    if (!sidebar) return;

    function openSidebar() {
      sidebar.classList.add('open');
      backdrop.classList.add('visible');
      hamburger.innerHTML = '&#10005;'; // ✕
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      backdrop.classList.remove('visible');
      hamburger.innerHTML = '&#9776;'; // ☰
    }

    hamburger.addEventListener('click', function () {
      sidebar.classList.contains('open') ? closeSidebar() : openSidebar();
    });

    backdrop.addEventListener('click', closeSidebar);

    // Close sidebar when a nav item is tapped on mobile
    sidebar.addEventListener('click', function (e) {
      if (window.innerWidth <= 768 && e.target.closest('.nav-item')) {
        closeSidebar();
      }
    });

    // Close on resize to desktop
    window.addEventListener('resize', function () {
      if (window.innerWidth > 768) closeSidebar();
    });
  }

  // Run after DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileSidebar);
  } else {
    initMobileSidebar();
  }
})();