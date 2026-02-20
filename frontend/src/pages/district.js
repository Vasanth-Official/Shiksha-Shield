/**
 * District Officer Dashboard – Heatmap, analytics, trends, high-risk schools
 */
import { Chart, ArcElement, Tooltip, Legend, PieController, BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler } from 'chart.js';
import { api, getState } from '../main.js';
import { createDashboardLayout, ICONS, riskBadge, statCard } from '../components/layout.js';

Chart.register(ArcElement, Tooltip, Legend, PieController, BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler);

let charts = [];

export async function renderDistrictDashboard(container) {
    const user = getState().user;
    const sidebarItems = [
        { id: 'overview', label: 'District Overview', icon: ICONS.dashboard },
        { id: 'heatmap', label: 'Risk Heatmap', icon: ICONS.map },
        { id: 'trends', label: 'Trend Analytics', icon: ICONS.chart },
        { id: 'schools', label: 'High-Risk Schools', icon: ICONS.alert },
        { id: 'interventions', label: 'Interventions', icon: ICONS.intervention },
    ];

    let activeSection = 'overview';
    const mainContent = createDashboardLayout(container, {
        role: 'district_officer',
        sidebarItems,
        activeItem: activeSection,
        onItemClick: (id) => {
            activeSection = id;
            loadSection(mainContent, activeSection, user);
            container.querySelectorAll('[data-nav]').forEach(l => l.classList.toggle('active', l.dataset.nav === id));
        }
    });

    document.getElementById('pageTitle').textContent = 'District Officer Dashboard';
    loadSection(mainContent, activeSection, user);
}

async function loadSection(content, section, user) {
    charts.forEach(c => c.destroy());
    charts = [];

    switch (section) {
        case 'overview': await renderOverview(content, user); break;
        case 'heatmap': await renderHeatmap(content, user); break;
        case 'trends': await renderTrends(content, user); break;
        case 'schools': await renderHighRiskSchools(content, user); break;
        case 'interventions': await renderInterventions(content, user); break;
    }
}

async function renderOverview(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const [overview, trends] = await Promise.all([
            api(`/analytics/overview?district_id=${user.district_id || 1}`),
            api('/analytics/trends')
        ]);

        const dist = overview.risk_distribution || {};
        const interventionRate = overview.interventions?.total > 0
            ? Math.round((overview.interventions.completed / overview.interventions.total) * 100)
            : 0;

        content.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard('Total Students', overview.total_students, 'navy', ICONS.students)}
        ${statCard('Avg Risk Score', overview.avg_risk_score, 'saffron', ICONS.alert)}
        ${statCard('High/Critical', (dist.High || 0) + (dist.Critical || 0), 'red', ICONS.alert)}
        ${statCard('Intervention Success', interventionRate + '%', 'green', ICONS.intervention)}
      </div>

      <!-- Dashboard Metrics -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Risk Distribution</h3>
          <div style="max-width: 250px; margin: 0 auto;"><canvas id="distPie"></canvas></div>
        </div>

        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Monthly Dropout Trend</h3>
          <canvas id="dropoutTrend" height="200"></canvas>
        </div>

        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Top 5 Risk Causes</h3>
          <canvas id="causesBar" height="200"></canvas>
        </div>
      </div>

      <!-- Impact Metrics -->
      <div class="card p-6">
        <h3 class="font-bold text-slate-800 mb-4">Key Performance Metrics</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="text-center p-4 bg-slate-50 rounded-xl">
            <p class="text-3xl font-black text-navy">33%</p>
            <p class="text-xs text-slate-500 mt-1">Predicted Dropout Reduction</p>
          </div>
          <div class="text-center p-4 bg-slate-50 rounded-xl">
            <p class="text-3xl font-black text-navy">${overview.avg_risk_score}</p>
            <p class="text-xs text-slate-500 mt-1">Average Risk Score</p>
          </div>
          <div class="text-center p-4 bg-slate-50 rounded-xl">
            <p class="text-3xl font-black text-emerald-600">${overview.interventions?.avg_improvement || 0}</p>
            <p class="text-xs text-slate-500 mt-1">Avg Score Improvement</p>
          </div>
          <div class="text-center p-4 bg-slate-50 rounded-xl">
            <p class="text-3xl font-black text-saffron">${overview.avg_attendance}%</p>
            <p class="text-xs text-slate-500 mt-1">Monthly Attendance Trend</p>
          </div>
        </div>
      </div>
    `;

        // Pie chart
        const pieCtx = document.getElementById('distPie');
        if (pieCtx) {
            charts.push(new Chart(pieCtx, {
                type: 'pie',
                data: {
                    labels: ['Low', 'Moderate', 'High', 'Critical'],
                    datasets: [{ data: [dist.Low || 0, dist.Moderate || 0, dist.High || 0, dist.Critical || 0], backgroundColor: ['#10B981', '#F59E0B', '#F97316', '#EF4444'], borderWidth: 2, borderColor: '#fff' }]
                },
                options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 } } } } }
            }));
        }

        // Line chart - dropout trend
        const lineCtx = document.getElementById('dropoutTrend');
        if (lineCtx) {
            charts.push(new Chart(lineCtx, {
                type: 'line',
                data: {
                    labels: trends.months,
                    datasets: [{
                        label: 'Dropout Rate %',
                        data: trends.dropout_rate,
                        borderColor: '#EF4444',
                        backgroundColor: 'rgba(239,68,68,0.1)',
                        fill: true,
                        tension: 0.4,
                        pointRadius: 4,
                        pointBackgroundColor: '#EF4444'
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { beginAtZero: false, grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } },
                        x: { grid: { display: false } }
                    }
                }
            }));
        }

        // Bar chart - causes
        const barCtx = document.getElementById('causesBar');
        if (barCtx && overview.top_causes?.length) {
            charts.push(new Chart(barCtx, {
                type: 'bar',
                data: {
                    labels: overview.top_causes.map(c => c.cause.length > 15 ? c.cause.slice(0, 15) + '…' : c.cause),
                    datasets: [{ data: overview.top_causes.map(c => c.count), backgroundColor: ['#FF9933', '#F97316', '#EF4444', '#F59E0B', '#6366F1'], borderRadius: 6, barThickness: 28 }]
                },
                options: {
                    responsive: true,
                    indexAxis: 'y',
                    plugins: { legend: { display: false } },
                    scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
                }
            }));
        }
    } catch (err) {
        content.innerHTML = `<div class="card p-8 text-center"><p class="text-slate-500">Error loading data. Ensure backend is running.</p></div>`;
    }
}

async function renderHeatmap(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const heatData = await api(`/analytics/district-heatmap?district_id=${user.district_id || 1}`);

        content.innerHTML = `
      <div class="card p-6 mb-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="font-bold text-slate-800">Village/School Risk Heatmap</h3>
          <div class="flex items-center gap-4 text-xs">
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded heat-low"></span> Low</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded heat-moderate"></span> Moderate</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded heat-high"></span> High</span>
            <span class="flex items-center gap-1"><span class="w-3 h-3 rounded heat-critical"></span> Critical</span>
          </div>
        </div>
        <p class="text-sm text-slate-500 mb-6">Schools color-coded by average dropout risk density. Click a school for details.</p>

        <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          ${heatData.map((s, i) => {
            const riskLevel = s.avg_risk <= 30 ? 'low' : s.avg_risk <= 50 ? 'moderate' : s.avg_risk <= 75 ? 'high' : 'critical';
            return `
              <div class="heat-${riskLevel} rounded-xl p-4 cursor-pointer hover:scale-105 transition-transform animate-fade-in" style="animation-delay: ${i * 0.03}s">
                <p class="font-bold text-sm text-slate-800 truncate">${s.school_name}</p>
                <p class="text-xs text-slate-600 mt-0.5">${s.village}</p>
                <div class="flex items-center justify-between mt-3">
                  <div>
                    <p class="text-lg font-black text-slate-800">${Math.round(s.avg_risk)}</p>
                    <p class="text-[10px] text-slate-500">Avg Risk</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm font-bold text-slate-700">${s.student_count}</p>
                    <p class="text-[10px] text-slate-500">Students</p>
                  </div>
                </div>
                <div class="mt-2 text-xs">
                  <span class="font-semibold text-red-600">${s.high_risk_count}</span>
                  <span class="text-slate-500"> high-risk</span>
                </div>
              </div>
            `;
        }).join('')}
        </div>
      </div>
    `;
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading heatmap data.</div>';
    }
}

async function renderTrends(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const trends = await api('/analytics/trends');

        content.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Monthly Dropout Rate Trend</h3>
          <canvas id="trendDropout" height="250"></canvas>
        </div>
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Average Risk Score Trend</h3>
          <canvas id="trendRisk" height="250"></canvas>
        </div>
        <div class="card p-6 lg:col-span-2">
          <h3 class="font-bold text-slate-800 mb-4">Attendance Improvement Trend</h3>
          <canvas id="trendAttendance" height="200"></canvas>
        </div>
      </div>
    `;

        // Dropout trend
        charts.push(new Chart(document.getElementById('trendDropout'), {
            type: 'line',
            data: {
                labels: trends.months,
                datasets: [{
                    label: 'Dropout Rate %',
                    data: trends.dropout_rate,
                    borderColor: '#EF4444',
                    backgroundColor: 'rgba(239,68,68,0.08)',
                    fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#EF4444'
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } } }
        }));

        // Risk trend
        charts.push(new Chart(document.getElementById('trendRisk'), {
            type: 'line',
            data: {
                labels: trends.months,
                datasets: [{
                    label: 'Avg Risk Score',
                    data: trends.avg_risk_score,
                    borderColor: '#FF9933',
                    backgroundColor: 'rgba(255,153,51,0.08)',
                    fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#FF9933'
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        }));

        // Attendance trend
        charts.push(new Chart(document.getElementById('trendAttendance'), {
            type: 'line',
            data: {
                labels: trends.months,
                datasets: [{
                    label: 'Avg Attendance %',
                    data: trends.avg_attendance,
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16,185,129,0.08)',
                    fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10B981'
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } } }
        }));
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading trends.</div>';
    }
}

async function renderHighRiskSchools(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const schools = await api(`/analytics/high-risk-schools?district_id=${user.district_id || 1}`);

        content.innerHTML = `
      <div class="card overflow-hidden">
        <div class="p-4 border-b border-slate-200">
          <h3 class="font-bold text-slate-800">High-Risk Schools (Ranked by Average Risk Score)</h3>
          <p class="text-sm text-slate-500 mt-1">Top 10 schools requiring priority intervention</p>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>#</th><th>School</th><th>Village</th><th>Students</th><th>Avg Risk</th><th>High Risk Count</th><th>Risk Level</th></tr>
            </thead>
            <tbody>
              ${schools.map((s, i) => {
            const cat = s.avg_risk <= 30 ? 'Low' : s.avg_risk <= 50 ? 'Moderate' : s.avg_risk <= 75 ? 'High' : 'Critical';
            return `
                  <tr class="animate-slide-in" style="animation-delay: ${i * 0.05}s">
                    <td class="font-bold text-slate-400">${i + 1}</td>
                    <td class="font-medium">${s.name}</td>
                    <td>${s.village}</td>
                    <td>${s.student_count}</td>
                    <td class="font-bold">${Math.round(s.avg_risk * 10) / 10}</td>
                    <td><span class="font-bold text-red-500">${s.high_risk_count}</span></td>
                    <td>${riskBadge(cat)}</td>
                  </tr>
                `;
        }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading schools data.</div>';
    }
}

async function renderInterventions(content, user) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const interventions = await api('/interventions');
        const completed = interventions.filter(i => i.follow_up_status === 'completed');
        const improved = completed.filter(i => i.risk_score_after !== null && i.risk_score_after < i.risk_score_before);

        content.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard('Total', interventions.length, 'navy', ICONS.intervention)}
        ${statCard('Completed', completed.length, 'green', ICONS.intervention)}
        ${statCard('Improved', improved.length, 'blue', ICONS.chart)}
        ${statCard('Success Rate', completed.length > 0 ? Math.round((improved.length / completed.length) * 100) + '%' : '0%', 'saffron', ICONS.intervention)}
      </div>

      <div class="card p-6 mb-6">
        <h3 class="font-bold text-slate-800 mb-4">Intervention Effectiveness Tracker</h3>
        <p class="text-sm text-slate-500 mb-4">Comparing risk scores before and after intervention for completed cases.</p>
        <div class="space-y-3">
          ${completed.slice(0, 15).map((i, idx) => `
            <div class="flex items-center gap-4 animate-slide-in" style="animation-delay: ${idx * 0.03}s">
              <span class="text-sm font-medium text-slate-600 w-32 truncate">${i.student_name || 'Student ' + i.student_id}</span>
              <div class="flex-1 flex items-center gap-2">
                <span class="text-sm font-bold text-red-500 w-12 text-right">${i.risk_score_before?.toFixed(0)}</span>
                <div class="flex-1 h-2 bg-slate-100 rounded-full relative overflow-hidden">
                  <div class="absolute left-0 top-0 h-full bg-red-300 rounded-full" style="width: ${i.risk_score_before}%"></div>
                  ${i.risk_score_after !== null ? `<div class="absolute left-0 top-0 h-full bg-emerald-400 rounded-full" style="width: ${i.risk_score_after}%"></div>` : ''}
                </div>
                <span class="text-sm font-bold ${i.risk_score_after < i.risk_score_before ? 'text-emerald-500' : 'text-slate-400'} w-12">${i.risk_score_after?.toFixed(0) || '—'}</span>
              </div>
              <span class="text-xs font-bold ${i.risk_score_after < i.risk_score_before ? 'text-emerald-500' : 'text-slate-400'} w-16 text-right">
                ${i.risk_score_after !== null ? (i.risk_score_after < i.risk_score_before ? '↓' : '↑') + Math.abs(i.risk_score_before - i.risk_score_after).toFixed(0) + ' pts' : '—'}
              </span>
            </div>
          `).join('')}
        </div>
      </div>
    `;
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading interventions.</div>';
    }
}
