/**
 * SHIKSHA SHIELD – Main Entry Point
 * SPA Router + Auth State + Page Orchestration
 */
import './style.css';
import { renderLanding } from './pages/landing.js';
import { renderLogin } from './pages/login.js';
import { renderTeacherDashboard } from './pages/teacher.js';
import { renderSchoolAdminDashboard } from './pages/schoolAdmin.js';
import { renderDistrictDashboard } from './pages/district.js';
import { renderStateDashboard } from './pages/state.js';

// ─── State ──────────────────────────────────────────────
const state = {
    user: JSON.parse(localStorage.getItem('shiksha_user') || 'null'),
    currentPage: 'landing',
    notifications: []
};

export function getState() { return state; }

export function setUser(user) {
    state.user = user;
    if (user) {
        localStorage.setItem('shiksha_user', JSON.stringify(user));
    } else {
        localStorage.removeItem('shiksha_user');
    }
    navigate(user ? getDashboardRoute(user.role) : 'landing');
}

export function logout() {
    setUser(null);
}

function getDashboardRoute(role) {
    const routes = {
        teacher: 'teacher',
        school_admin: 'school-admin',
        district_officer: 'district',
        state_officer: 'state'
    };
    return routes[role] || 'landing';
}

// ─── API Helper ──────────────────────────────────────────
export async function api(path, options = {}) {
    const res = await fetch(`/api${path}`, {
        headers: { 'Content-Type': 'application/json', ...options.headers },
        ...options,
        body: options.body ? JSON.stringify(options.body) : undefined
    });
    return res.json();
}

// ─── Router ──────────────────────────────────────────────
export function navigate(page) {
    state.currentPage = page;
    window.history.pushState({}, '', `#${page}`);
    render();
}

function render() {
    const app = document.getElementById('app');

    // Reset and Apply Background Classes
    app.className = 'bg-blend-page';
    const bgMap = {
        'landing': 'bg-home',
        'login': 'bg-login',
        'teacher': 'bg-teacher',
        'district': 'bg-district',
        'state': 'bg-state',
        'school-admin': 'bg-home' // Defaulting to home for school admin
    };
    if (bgMap[state.currentPage]) {
        app.classList.add(bgMap[state.currentPage]);
    }

    app.innerHTML = '';

    switch (state.currentPage) {
        case 'landing':
            renderLanding(app);
            break;
        case 'login':
            renderLogin(app);
            break;
        case 'teacher':
            if (state.user) renderTeacherDashboard(app);
            else navigate('login');
            break;
        case 'school-admin':
            if (state.user) renderSchoolAdminDashboard(app);
            else navigate('login');
            break;
        case 'district':
            if (state.user) renderDistrictDashboard(app);
            else navigate('login');
            break;
        case 'state':
            if (state.user) renderStateDashboard(app);
            else navigate('login');
            break;
        default:
            renderLanding(app);
    }
}

// ─── Init ──────────────────────────────────────────────
window.addEventListener('hashchange', () => {
    state.currentPage = window.location.hash.slice(1) || 'landing';
    render();
});

// Initial route
state.currentPage = window.location.hash.slice(1) || 'landing';
if (state.user && state.currentPage === 'landing') {
    state.currentPage = getDashboardRoute(state.user.role);
}
render();
