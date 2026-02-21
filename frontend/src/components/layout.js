/**
 * Shared Dashboard Layout: Sidebar + Topbar + Main content area
 */
import { getState, logout, navigate, api } from '../main.js';

const ICONS = {
  dashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
  students: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
  alert: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  chart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>`,
  map: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>`,
  shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  bell: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`,
  logout: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>`,
  download: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`,
  plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  search: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  eye: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>`,
  intervention: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`,
  home: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
};

export { ICONS };

export function createDashboardLayout(container, { role, sidebarItems, activeItem, onItemClick }) {
  const user = getState().user;
  const roleLabels = {
    teacher: 'Teacher',
    school_admin: 'School Admin',
    district_officer: 'District Officer',
    state_officer: 'State Officer'
  };

  container.innerHTML = `
    <div class="flex h-screen overflow-hidden">
      <!-- Sidebar -->
      <aside id="sidebar" class="w-64 gradient-navy flex flex-col shrink-0 transition-all duration-300 max-md:fixed max-md:z-40 max-md:h-full max-md:-translate-x-full">
        <!-- Logo -->
        <div class="p-5 border-b border-white/10">
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg gradient-saffron flex items-center justify-center">
              ${ICONS.shield}
            </div>
            <div>
              <h1 class="text-white text-sm font-bold tracking-wide">SHIKSHA SHIELD</h1>
              <p class="text-white/50 text-[10px] font-medium uppercase tracking-wider">AI Risk Intelligence</p>
            </div>
          </div>
        </div>

        <!-- Nav Links -->
        <nav class="flex-1 p-3 space-y-1 overflow-y-auto">
          ${sidebarItems.map(item => `
            <a href="#" class="sidebar-link ${item.id === activeItem ? 'active' : ''}" data-nav="${item.id}">
              ${item.icon}
              <span>${item.label}</span>
            </a>
          `).join('')}
        </nav>

        <!-- User Info -->
        <div class="p-4 border-t border-white/10">
          <div class="flex items-center gap-3 mb-3">
            <div class="w-8 h-8 rounded-full bg-gradient-to-br from-saffron to-orange-500 flex items-center justify-center text-white text-sm font-bold">
              ${(user?.name || 'U').charAt(0)}
            </div>
            <div class="min-w-0">
              <p class="text-white text-sm font-medium truncate">${user?.name || 'User'}</p>
              <p class="text-white/50 text-xs">${roleLabels[user?.role] || ''}</p>
            </div>
          </div>
          <button id="logoutBtn" class="sidebar-link w-full text-red-300 hover:text-red-200 hover:bg-red-500/10">
            ${ICONS.logout}
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      <!-- Main Content -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <!-- Topbar -->
        <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
          <div class="flex items-center gap-4">
            <button id="menuToggle" class="md:hidden p-2 rounded-lg hover:bg-slate-100">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
            <h2 class="text-lg font-bold text-slate-800" id="pageTitle"></h2>
          </div>
          <div class="flex items-center gap-3">
            <button id="notifBtn" class="relative p-2 rounded-lg hover:bg-slate-100 transition-colors">
              ${ICONS.bell}
              <span class="notification-badge hidden" id="notifCount">0</span>
            </button>
          </div>
        </header>

        <!-- Page Content -->
        <main class="flex-1 overflow-y-auto p-6 bg-transparent relative z-10" id="mainContent">
        </main>
      </div>
    </div>

    <!-- Notification Panel -->
    <div id="notifPanel" class="fixed right-0 top-16 w-96 max-md:w-full bg-white border-l border-slate-200 shadow-xl z-30 h-[calc(100%-64px)] translate-x-full transition-transform duration-300">
      <div class="p-4 border-b border-slate-200 flex items-center justify-between">
        <h3 class="font-bold text-slate-800">Notifications</h3>
        <button id="closeNotif" class="p-1 rounded hover:bg-slate-100">✕</button>
      </div>
      <div id="notifList" class="p-4 space-y-3 overflow-y-auto h-[calc(100%-60px)]"></div>
    </div>

    <!-- Mobile sidebar overlay -->
    <div id="sidebarOverlay" class="fixed inset-0 bg-black/40 z-30 hidden md:hidden"></div>
  `;

  // Event handlers
  container.querySelectorAll('[data-nav]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      onItemClick(link.dataset.nav);
    });
  });

  document.getElementById('logoutBtn').addEventListener('click', logout);

  // Mobile menu toggle
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  document.getElementById('menuToggle')?.addEventListener('click', () => {
    sidebar.classList.toggle('max-md:-translate-x-full');
    overlay.classList.toggle('hidden');
  });
  overlay?.addEventListener('click', () => {
    sidebar.classList.add('max-md:-translate-x-full');
    overlay.classList.add('hidden');
  });

  // Notification panel
  const notifPanel = document.getElementById('notifPanel');
  document.getElementById('notifBtn')?.addEventListener('click', async () => {
    notifPanel.classList.toggle('translate-x-full');
    if (!notifPanel.classList.contains('translate-x-full')) {
      await loadNotifications();
    }
  });
  document.getElementById('closeNotif')?.addEventListener('click', () => {
    notifPanel.classList.add('translate-x-full');
  });

  // Load notification count
  loadNotificationCount();

  return document.getElementById('mainContent');
}

async function loadNotificationCount() {
  try {
    const notifs = await api('/notifications?user_id=1');
    const unread = notifs.filter(n => !n.is_read).length;
    const badge = document.getElementById('notifCount');
    if (badge && unread > 0) {
      badge.textContent = unread;
      badge.classList.remove('hidden');
    }
  } catch (e) { }
}

async function loadNotifications() {
  const list = document.getElementById('notifList');
  if (!list) return;
  try {
    const notifs = await api('/notifications?user_id=1');
    list.innerHTML = notifs.length ? notifs.map(n => `
      <div class="p-3 rounded-lg ${n.is_read ? 'bg-white' : 'bg-saffron/5 border border-saffron/20'} text-sm animate-slide-in">
        <p class="text-slate-700">${n.message}</p>
        <p class="text-slate-400 text-xs mt-1">${new Date(n.created_at).toLocaleDateString()}</p>
      </div>
    `).join('') : '<p class="text-slate-400 text-center py-8">No notifications</p>';
  } catch (e) {
    list.innerHTML = '<p class="text-slate-400 text-center py-8">Could not load notifications</p>';
  }
}

// ─── Shared Utilities ───────────────────────────────────
export function riskBadge(category) {
  const cls = `risk-${(category || 'low').toLowerCase()}`;
  return `<span class="${cls} px-2.5 py-1 rounded-full text-xs font-semibold">${category}</span>`;
}

export function riskDot(category) {
  const cls = `risk-dot-${(category || 'low').toLowerCase()}`;
  return `<span class="inline-block w-2.5 h-2.5 rounded-full ${cls}"></span>`;
}

export function statCard(label, value, color, icon) {
  const colorMap = {
    navy: 'from-[#0A192F] to-[#1a365d]',
    green: 'from-emerald-500 to-emerald-600',
    yellow: 'from-amber-400 to-amber-500',
    orange: 'from-orange-500 to-orange-600',
    red: 'from-red-500 to-red-600',
    saffron: 'from-[#FF9933] to-[#FF6600]',
    blue: 'from-blue-500 to-blue-600',
  };
  return `
    <div class="card p-5 animate-fade-in">
      <div class="flex items-start justify-between">
        <div>
          <p class="text-slate-500 text-xs font-semibold uppercase tracking-wider">${label}</p>
          <p class="text-2xl font-bold text-slate-800 mt-1">${value}</p>
        </div>
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${colorMap[color] || colorMap.navy} flex items-center justify-center text-white">
          ${icon || ''}
        </div>
      </div>
    </div>
  `;
}
