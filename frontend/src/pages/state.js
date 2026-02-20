/**
 * State Officer Dashboard – District comparison, policy overview, PDF/CSV export
 */
import { Chart, ArcElement, Tooltip, Legend, PieController, BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler } from 'chart.js';
import { api, getState } from '../main.js';
import { createDashboardLayout, ICONS, riskBadge, statCard } from '../components/layout.js';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

Chart.register(ArcElement, Tooltip, Legend, PieController, BarController, BarElement, CategoryScale, LinearScale, LineController, LineElement, PointElement, Filler);

let charts = [];

export async function renderStateDashboard(container) {
    const user = getState().user;
    const sidebarItems = [
        { id: 'overview', label: 'State Overview', icon: ICONS.dashboard },
        { id: 'districts', label: 'District Comparison', icon: ICONS.chart },
        { id: 'policy', label: 'Policy Effectiveness', icon: ICONS.shield },
        { id: 'export', label: 'Reports & Export', icon: ICONS.download },
    ];

    let activeSection = 'overview';
    const mainContent = createDashboardLayout(container, {
        role: 'state_officer',
        sidebarItems,
        activeItem: activeSection,
        onItemClick: (id) => {
            activeSection = id;
            loadSection(mainContent, activeSection);
            container.querySelectorAll('[data-nav]').forEach(l => l.classList.toggle('active', l.dataset.nav === id));
        }
    });

    document.getElementById('pageTitle').textContent = 'State Officer Dashboard';
    loadSection(mainContent, activeSection);
}

async function loadSection(content, section) {
    charts.forEach(c => c.destroy());
    charts = [];

    switch (section) {
        case 'overview': await renderOverview(content); break;
        case 'districts': await renderDistrictComparison(content); break;
        case 'policy': await renderPolicyEffectiveness(content); break;
        case 'export': await renderExport(content); break;
    }
}

async function renderOverview(content) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const [overview, impact, districts] = await Promise.all([
            api('/analytics/overview'),
            api('/impact'),
            api('/analytics/districts')
        ]);

        const dist = overview.risk_distribution || {};

        content.innerHTML = `
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard('Total Students', impact.total_students, 'navy', ICONS.students)}
        ${statCard('High-Risk Students', impact.high_risk_students, 'red', ICONS.alert)}
        ${statCard('Dropout Reduction', impact.reduction_percent + '%', 'green', ICONS.chart)}
        ${statCard('Model Precision', impact.model_precision + '%', 'saffron', ICONS.shield)}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">State Risk Distribution</h3>
          <div style="max-width: 280px; margin: 0 auto;"><canvas id="statePie"></canvas></div>
        </div>

        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">District Risk Comparison</h3>
          <canvas id="districtBar" height="220"></canvas>
        </div>
      </div>

      <!-- Impact Banner -->
      <div class="card gradient-navy p-6">
        <h3 class="text-white font-bold mb-4">Statewide Impact Summary</h3>
        <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div class="text-center">
            <p class="text-2xl font-black text-saffron">${impact.total_students}</p>
            <p class="text-xs text-white/50">Students Tracked</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-black text-red-400">${impact.baseline_dropout_rate}%</p>
            <p class="text-xs text-white/50">Baseline Dropout</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-black text-green-400">${impact.current_dropout_rate}%</p>
            <p class="text-xs text-white/50">Current Dropout</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-black text-saffron">${impact.reduction_percent}%</p>
            <p class="text-xs text-white/50">Reduction</p>
          </div>
          <div class="text-center">
            <p class="text-2xl font-black text-blue-400">${impact.improvement_rate}%</p>
            <p class="text-xs text-white/50">Improvement Rate</p>
          </div>
        </div>
      </div>
    `;

        // Pie
        charts.push(new Chart(document.getElementById('statePie'), {
            type: 'pie',
            data: {
                labels: ['Low', 'Moderate', 'High', 'Critical'],
                datasets: [{ data: [dist.Low || 0, dist.Moderate || 0, dist.High || 0, dist.Critical || 0], backgroundColor: ['#10B981', '#F59E0B', '#F97316', '#EF4444'], borderWidth: 2, borderColor: '#fff' }]
            },
            options: { responsive: true, plugins: { legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 } } } } }
        }));

        // District bar
        if (districts.length) {
            charts.push(new Chart(document.getElementById('districtBar'), {
                type: 'bar',
                data: {
                    labels: districts.map(d => d.district_name),
                    datasets: [{
                        label: 'Avg Risk Score',
                        data: districts.map(d => Math.round(d.avg_risk * 10) / 10),
                        backgroundColor: districts.map(d => d.avg_risk > 50 ? '#EF4444' : d.avg_risk > 35 ? '#FF9933' : '#10B981'),
                        borderRadius: 6, barThickness: 24
                    }]
                },
                options: {
                    responsive: true,
                    plugins: { legend: { display: false } },
                    scales: { y: { beginAtZero: true, max: 100, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } }
                }
            }));
        }
    } catch (err) {
        content.innerHTML = `<div class="card p-8 text-center text-slate-500">Error loading state data. Ensure backend is running.</div>`;
    }
}

async function renderDistrictComparison(content) {
    content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

    try {
        const districts = await api('/analytics/districts');

        content.innerHTML = `
      <div class="card overflow-hidden mb-6">
        <div class="p-4 border-b border-slate-200">
          <h3 class="font-bold text-slate-800">District-wise Comparison</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="data-table">
            <thead>
              <tr><th>District</th><th>Students</th><th>Avg Risk</th><th>Critical</th><th>High</th><th>Avg Attendance</th><th>Status</th></tr>
            </thead>
            <tbody>
              ${districts.map((d, i) => {
            const cat = d.avg_risk <= 30 ? 'Low' : d.avg_risk <= 50 ? 'Moderate' : d.avg_risk <= 75 ? 'High' : 'Critical';
            return `
                  <tr class="animate-slide-in" style="animation-delay: ${i * 0.05}s">
                    <td class="font-medium">${d.district_name}</td>
                    <td>${d.student_count}</td>
                    <td class="font-bold">${Math.round(d.avg_risk * 10) / 10}</td>
                    <td class="font-bold text-red-500">${d.critical_count}</td>
                    <td class="font-bold text-orange-500">${d.high_count}</td>
                    <td>${Math.round(d.avg_attendance * 10) / 10}%</td>
                    <td>${riskBadge(cat)}</td>
                  </tr>
                `;
        }).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="card p-6">
        <h3 class="font-bold text-slate-800 mb-4">Comparative Chart</h3>
        <canvas id="compareChart" height="300"></canvas>
      </div>
    `;

        // Grouped bar
        charts.push(new Chart(document.getElementById('compareChart'), {
            type: 'bar',
            data: {
                labels: districts.map(d => d.district_name),
                datasets: [
                    { label: 'Avg Risk', data: districts.map(d => Math.round(d.avg_risk)), backgroundColor: '#FF9933', borderRadius: 4, barThickness: 16 },
                    { label: 'Critical Count', data: districts.map(d => d.critical_count), backgroundColor: '#EF4444', borderRadius: 4, barThickness: 16 },
                    { label: 'High Count', data: districts.map(d => d.high_count), backgroundColor: '#F97316', borderRadius: 4, barThickness: 16 }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } } },
                scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false }, ticks: { font: { size: 10 } } } }
            }
        }));
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading district data.</div>';
    }
}

async function renderPolicyEffectiveness(content) {
    try {
        const [trends, impact] = await Promise.all([
            api('/analytics/trends'),
            api('/impact')
        ]);

        content.innerHTML = `
      <div class="card p-6 mb-6">
        <h3 class="font-bold text-slate-800 mb-2">Policy Effectiveness Overview</h3>
        <p class="text-sm text-slate-500 mb-6">Evaluating impact of Beti Bachao Beti Padhao and NEP 2020 aligned interventions.</p>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div class="card p-5 border-l-4 border-l-emerald-500">
            <p class="text-sm font-semibold text-slate-500 mb-1">Dropout Trend</p>
            <p class="text-3xl font-black text-emerald-600">↓ ${(impact.baseline_dropout_rate - impact.current_dropout_rate).toFixed(1)}%</p>
            <p class="text-xs text-slate-400 mt-1">From ${impact.baseline_dropout_rate}% to ${impact.current_dropout_rate}%</p>
          </div>
          <div class="card p-5 border-l-4 border-l-saffron">
            <p class="text-sm font-semibold text-slate-500 mb-1">Intervention Reach</p>
            <p class="text-3xl font-black text-saffron">${impact.interventions_completed}</p>
            <p class="text-xs text-slate-400 mt-1">Completed interventions</p>
          </div>
          <div class="card p-5 border-l-4 border-l-blue-500">
            <p class="text-sm font-semibold text-slate-500 mb-1">Student Improvement</p>
            <p class="text-3xl font-black text-blue-600">${impact.improvement_rate}%</p>
            <p class="text-xs text-slate-400 mt-1">Students improved after intervention</p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Risk Score Trend (Policy Impact)</h3>
          <canvas id="policyRiskTrend" height="250"></canvas>
        </div>
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Attendance Recovery Trend</h3>
          <canvas id="policyAttendanceTrend" height="250"></canvas>
        </div>
      </div>
    `;

        charts.push(new Chart(document.getElementById('policyRiskTrend'), {
            type: 'line',
            data: {
                labels: trends.months,
                datasets: [{
                    label: 'Avg Risk Score',
                    data: trends.avg_risk_score,
                    borderColor: '#FF9933', backgroundColor: 'rgba(255,153,51,0.1)',
                    fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#FF9933'
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } } }
        }));

        charts.push(new Chart(document.getElementById('policyAttendanceTrend'), {
            type: 'line',
            data: {
                labels: trends.months,
                datasets: [{
                    label: 'Avg Attendance %',
                    data: trends.avg_attendance,
                    borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.1)',
                    fill: true, tension: 0.4, pointRadius: 5, pointBackgroundColor: '#10B981'
                }]
            },
            options: { responsive: true, plugins: { legend: { display: false } }, scales: { y: { grid: { color: '#f1f5f9' }, ticks: { callback: v => v + '%' } }, x: { grid: { display: false } } } }
        }));
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading policy data.</div>';
    }
}

async function renderExport(content) {
    try {
        const [districts, impact] = await Promise.all([
            api('/analytics/districts'),
            api('/impact')
        ]);

        content.innerHTML = `
      <div class="max-w-3xl mx-auto space-y-6">
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-2">📄 Download Reports</h3>
          <p class="text-sm text-slate-500 mb-6">Export data for offline analysis and reporting.</p>

          <div class="space-y-4">
            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p class="font-semibold text-slate-800">PDF Report</p>
                <p class="text-xs text-slate-500">Complete state overview with district comparison and impact metrics</p>
              </div>
              <button id="downloadPdf" class="btn-primary py-2 px-5 flex items-center gap-2">
                ${ICONS.download} <span>Download PDF</span>
              </button>
            </div>

            <div class="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
              <div>
                <p class="font-semibold text-slate-800">CSV Export</p>
                <p class="text-xs text-slate-500">Raw student data with risk scores for further analysis</p>
              </div>
              <button id="downloadCsv" class="btn-secondary py-2 px-5 flex items-center gap-2">
                ${ICONS.download} <span>Download CSV</span>
              </button>
            </div>
          </div>
        </div>

        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Report Preview</h3>
          <div class="p-4 bg-slate-50 rounded-xl text-sm text-slate-600 space-y-2">
            <p><strong>Report Date:</strong> ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}</p>
            <p><strong>Total Students:</strong> ${impact.total_students}</p>
            <p><strong>Districts:</strong> ${districts.length}</p>
            <p><strong>Baseline Dropout Rate:</strong> ${impact.baseline_dropout_rate}%</p>
            <p><strong>Current Dropout Rate:</strong> ${impact.current_dropout_rate}%</p>
            <p><strong>Relative Reduction:</strong> ${impact.reduction_percent}%</p>
            <p><strong>Model Precision Target:</strong> ${impact.model_precision}%</p>
          </div>
        </div>
      </div>
    `;

        // PDF Download
        document.getElementById('downloadPdf')?.addEventListener('click', () => {
            const doc = new jsPDF();

            // Title
            doc.setFontSize(18);
            doc.setTextColor(10, 25, 47);
            doc.text('SHIKSHA SHIELD', 14, 22);
            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text('AI Risk Intelligence System – State Report', 14, 30);
            doc.text(`Generated: ${new Date().toLocaleDateString('en-IN', { dateStyle: 'long' })}`, 14, 36);

            // Impact
            doc.setFontSize(12);
            doc.setTextColor(10, 25, 47);
            doc.text('Impact Summary', 14, 48);

            autoTable(doc, {
                startY: 52,
                head: [['Metric', 'Value']],
                body: [
                    ['Total Students', impact.total_students.toString()],
                    ['Baseline Dropout Rate', impact.baseline_dropout_rate + '%'],
                    ['Current Dropout Rate', impact.current_dropout_rate + '%'],
                    ['Relative Reduction', impact.reduction_percent + '%'],
                    ['Model Precision Target', impact.model_precision + '%'],
                    ['Students Improved', impact.students_improved.toString()],
                ],
                theme: 'striped',
                headStyles: { fillColor: [10, 25, 47] }
            });

            // District comparison
            doc.text('District Comparison', 14, doc.lastAutoTable.finalY + 14);
            autoTable(doc, {
                startY: doc.lastAutoTable.finalY + 18,
                head: [['District', 'Students', 'Avg Risk', 'Critical', 'High', 'Avg Attendance']],
                body: districts.map(d => [
                    d.district_name,
                    d.student_count,
                    Math.round(d.avg_risk * 10) / 10,
                    d.critical_count,
                    d.high_count,
                    Math.round(d.avg_attendance * 10) / 10 + '%'
                ]),
                theme: 'striped',
                headStyles: { fillColor: [255, 153, 51] }
            });

            doc.save('shiksha_shield_state_report.pdf');
        });

        // CSV Download
        document.getElementById('downloadCsv')?.addEventListener('click', () => {
            window.open('/api/export/csv', '_blank');
        });
    } catch (err) {
        content.innerHTML = '<div class="card p-8 text-center text-slate-500">Error loading export data.</div>';
    }
}
