/**
 * School Admin Dashboard – School-level aggregate view
 */
import { Chart, ArcElement, Tooltip, Legend, PieController, BarController, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { api, getState } from '../main.js';
import { createDashboardLayout, ICONS, riskBadge, statCard } from '../components/layout.js';

Chart.register(ArcElement, Tooltip, Legend, PieController, BarController, BarElement, CategoryScale, LinearScale);

let charts = [];

export async function renderSchoolAdminDashboard(container) {
    const user = getState().user;
    const sidebarItems = [
        { id: 'overview', label: 'School Overview', icon: ICONS.dashboard },
        { id: 'students', label: 'All Students', icon: ICONS.students },
        { id: 'interventions', label: 'Interventions', icon: ICONS.intervention },
    ];

    let activeSection = 'overview';
    const mainContent = createDashboardLayout(container, {
        role: 'school_admin',
        sidebarItems,
        activeItem: activeSection,
        onItemClick: (id) => {
            activeSection = id;
            loadSection(mainContent, activeSection, user);
            container.querySelectorAll('[data-nav]').forEach(l => l.classList.toggle('active', l.dataset.nav === id));
        }
    });

    document.getElementById('pageTitle').textContent = 'School Admin Dashboard';
    loadSection(mainContent, activeSection, user);
}

async function loadSection(content, section, user) {
    charts.forEach(c => c.destroy());
    charts = [];

    if (section === 'overview') await renderOverview(content, user);
    else if (section === 'students') await renderStudents(content, user);
    else if (section === 'interventions') await renderInterventions(content, user);
}

async function renderOverview(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const [overview, trends] = await Promise.all([
            api(`/analytics/overview?school_id=${user.school_id || 1}`),
            api('/analytics/trends')
        ]);

        const dist = overview.risk_distribution || {};

        content.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard('Total Students', overview.total_students, 'navy', ICONS.students)}
        ${statCard('Avg Risk Score', overview.avg_risk_score, 'saffron', ICONS.alert)}
        ${statCard('Avg Attendance', overview.avg_attendance + '%', 'green', ICONS.chart)}
        ${statCard('Interventions', overview.interventions?.total || 0, 'blue', ICONS.intervention)}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Risk Distribution</h3>
          <div style="max-width: 280px; margin: 0 auto;"><canvas id="schoolPie"></canvas></div>
        </div>
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Top Risk Causes</h3>
          <canvas id="schoolBar" height="200"></canvas>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="font-bold text-slate-800 mb-4">Monthly Attendance Trend</h3>
        <div class="grid grid-cols-7 gap-2">
          ${trends.months.map((m, i) => `
            <div class="text-center">
              <div class="h-32 flex items-end justify-center">
                <div class="w-full max-w-[40px] rounded-t-lg gradient-saffron" style="height: ${trends.avg_attendance[i]}%"></div>
              </div>
              <p class="text-xs font-medium text-slate-500 mt-2">${m}</p>
              <p class="text-xs font-bold text-slate-700">${trends.avg_attendance[i]}%</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

        // Pie Chart
        const pieCtx = document.getElementById('schoolPie');
        if (pieCtx) {
            charts.push(new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ['Low', 'Moderate', 'High', 'Critical'],
                    datasets: [{ data: [dist.Low || 0, dist.Moderate || 0, dist.High || 0, dist.Critical || 0], backgroundColor: ['#10B981', '#F59E0B', '#F97316', '#EF4444'], borderWidth: 2, borderColor: '#fff' }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 12 } } } } }
            }));
        }

        // Bar Chart
        const barCtx = document.getElementById('schoolBar');
        if (barCtx && overview.top_causes?.length) {
            charts.push(new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: overview.top_causes.map(c => c.cause),
                    datasets: [{ data: overview.top_causes.map(c => c.count), backgroundColor: ['#FF9933', '#F97316', '#EF4444', '#F59E0B', '#10B981'], borderRadius: 6, barThickness: 32 }]
                },
                options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
            }));
        }
    } catch (err) {
        content.innerHTML = `<div class="card p-8 text-center"><p class="text-slate-500">Error loading overview. Ensure backend is running.</p></div>`;
    }
}

async function renderStudents(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';
    try {
        const students = await api(`/students?school_id=${user.school_id || 1}`);
        content.innerHTML = `
      <div class="card overflow-hidden">
        <div class="p-4 border-b border-slate-200">
          <h3 class="font-bold text-slate-800">All Students</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Name</th><th>Class</th><th>Attendance</th><th>Score</th><th>Risk</th><th>Category</th><th>Cause</th></tr></thead>
            <tbody>
              ${students.map(s => `<tr>
                <td class="font-mono text-xs">${s.student_uid}</td><td class="font-medium">${s.name}</td><td>${s.class}</td>
                <td>${s.attendance}%</td><td>${s.academic_score}</td><td class="font-bold">${s.risk_score}</td>
                <td>${riskBadge(s.risk_category)}</td><td class="text-sm">${s.cause}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading students.</div>';
    }
}

async function renderInterventions(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';
    try {
        const interventions = await api('/interventions');
        const completed = interventions.filter(i => i.follow_up_status === 'completed');
        const pending = interventions.filter(i => i.follow_up_status !== 'completed');

        content.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        ${statCard('Total Interventions', interventions.length, 'navy', ICONS.intervention)}
        ${statCard('Completed', completed.length, 'green', ICONS.intervention)}
        ${statCard('Pending', pending.length, 'orange', ICONS.alert)}
      </div>

      <div class="card overflow-hidden">
        <div class="p-4 border-b border-slate-200">
          <h3 class="font-bold text-slate-800">Intervention Log</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead><tr><th>Student</th><th>Cause</th><th>Action</th><th>Status</th><th>Risk Before</th><th>Risk After</th><th>Date</th></tr></thead>
            <tbody>
              ${interventions.slice(0, 50).map(i => `<tr>
                <td class="font-medium">${i.student_name || i.student_uid || i.student_id}</td>
                <td class="text-sm">${i.cause_type}</td>
                <td class="text-sm">${i.action_taken}</td>
                <td><span class="px-2 py-1 rounded-full text-xs font-semibold ${i.follow_up_status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                i.follow_up_status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    'bg-yellow-100 text-yellow-700'
            }">${i.follow_up_status}</span></td>
                <td class="font-bold">${i.risk_score_before?.toFixed(1) || '-'}</td>
                <td class="font-bold ${i.risk_score_after < i.risk_score_before ? 'text-emerald-600' : ''}">${i.risk_score_after?.toFixed(1) || '-'}</td>
                <td class="text-xs text-slate-500">${new Date(i.date).toLocaleDateString()}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading interventions.</div>';
    }
}
