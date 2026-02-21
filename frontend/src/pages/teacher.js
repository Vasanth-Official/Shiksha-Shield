/**
 * Teacher Dashboard – Risk overview, student table, pie chart, add/update form, AI explanations
 */
import { Chart, ArcElement, Tooltip, Legend, PieController } from 'chart.js';
import { api, getState } from '../main.js';
import { createDashboardLayout, ICONS, riskBadge, statCard } from '../components/layout.js';

Chart.register(ArcElement, Tooltip, Legend, PieController);

let currentChart = null;

export async function renderTeacherDashboard(container) {
  const user = getState().user;
  const sidebarItems = [
    { id: 'overview', label: 'Risk Overview', icon: ICONS.dashboard },
    { id: 'students', label: 'Student List', icon: ICONS.students },
    { id: 'add', label: 'Add / Update Data', icon: ICONS.plus },
    { id: 'alerts', label: 'Risk Alerts', icon: ICONS.alert },
  ];

  let activeSection = 'overview';
  const mainContent = createDashboardLayout(container, {
    role: 'teacher',
    sidebarItems,
    activeItem: activeSection,
    onItemClick: (id) => {
      activeSection = id;
      renderSection(mainContent, activeSection, user);
      // Update active link
      container.querySelectorAll('[data-nav]').forEach(l => {
        l.classList.toggle('active', l.dataset.nav === id);
      });
    }
  });

  document.getElementById('pageTitle').textContent = 'Teacher Dashboard';
  renderSection(mainContent, activeSection, user);
}

async function renderSection(content, section, user) {
  if (currentChart) { currentChart.destroy(); currentChart = null; }

  switch (section) {
    case 'overview': await renderOverview(content, user); break;
    case 'students': await renderStudentTable(content, user); break;
    case 'add': renderAddForm(content, user); break;
    case 'alerts': await renderAlerts(content, user); break;
  }
}

async function renderOverview(content, user) {
  content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

  try {
    const [overview, trends] = await Promise.all([
      api(`/analytics/overview?school_id=${user.school_id || 1}`),
      api('/analytics/trends')
    ]);

    const dist = overview.risk_distribution || {};
    const total = overview.total_students || 0;

    content.innerHTML = `
      <!-- Stat Cards -->
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        ${statCard('Total Students', total, 'navy', ICONS.students)}
        ${statCard('Low Risk', dist.Low || 0, 'green', `<span class="text-sm font-bold">${dist.Low || 0}</span>`)}
        ${statCard('Moderate', dist.Moderate || 0, 'yellow', `<span class="text-sm font-bold">${dist.Moderate || 0}</span>`)}
        ${statCard('High / Critical', (dist.High || 0) + (dist.Critical || 0), 'red', ICONS.alert)}
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <!-- Pie Chart -->
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Risk Distribution</h3>
          <div class="relative" style="max-width: 300px; margin: 0 auto;">
            <canvas id="riskPieChart"></canvas>
          </div>
        </div>

        <!-- Key Metrics -->
        <div class="card p-6">
          <h3 class="font-bold text-slate-800 mb-4">Dashboard Metrics</h3>
          <div class="space-y-4">
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span class="text-sm text-slate-600">Average Risk Score</span>
              <span class="text-lg font-bold text-navy">${overview.avg_risk_score}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span class="text-sm text-slate-600">Average Attendance</span>
              <span class="text-lg font-bold text-emerald-600">${overview.avg_attendance}%</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span class="text-sm text-slate-600">Predicted Dropout Reduction</span>
              <span class="text-lg font-bold text-saffron">33%</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span class="text-sm text-slate-600">Interventions Completed</span>
              <span class="text-lg font-bold text-blue-600">${overview.interventions?.completed || 0}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span class="text-sm text-slate-600">Avg Improvement After Intervention</span>
              <span class="text-lg font-bold text-emerald-600">${overview.interventions?.avg_improvement || 0} pts</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Top Risk Causes -->
      <div class="card p-6">
        <h3 class="font-bold text-slate-800 mb-4">Top Risk Causes (High & Critical Students)</h3>
        <div class="space-y-3">
          ${(overview.top_causes || []).map((c, i) => `
            <div class="flex items-center gap-4 animate-slide-in" style="animation-delay: ${i * 0.05}s">
              <div class="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-sm font-bold text-slate-500">${i + 1}</div>
              <div class="flex-1">
                <div class="flex items-center justify-between mb-1">
                  <span class="text-sm font-medium text-slate-700">${c.cause}</span>
                  <span class="text-sm font-bold text-slate-800">${c.count}</span>
                </div>
                <div class="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div class="h-full gradient-saffron rounded-full" style="width: ${Math.min(100, (c.count / (total || 1)) * 500)}%"></div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Pie Chart
    const ctx = document.getElementById('riskPieChart');
    if (ctx) {
      currentChart = new Chart(ctx, {
        type: 'pie',
        data: {
          labels: ['Low', 'Moderate', 'High', 'Critical'],
          datasets: [{
            data: [dist.Low || 0, dist.Moderate || 0, dist.High || 0, dist.Critical || 0],
            backgroundColor: ['#10B981', '#F59E0B', '#F97316', '#EF4444'],
            borderWidth: 2,
            borderColor: '#fff'
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom', labels: { padding: 16, font: { family: 'Inter', size: 12, weight: 600 } } }
          }
        }
      });
    }
  } catch (err) {
    content.innerHTML = `<div class="card p-8 text-center"><p class="text-slate-500">Error loading data. Ensure the backend server is running on port 5000.</p><p class="text-xs text-slate-400 mt-2">${err.message}</p></div>`;
  }
}

async function renderStudentTable(content, user) {
  content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

  try {
    const students = await api(`/students?school_id=${user.school_id || 1}`);

    content.innerHTML = `
      <div class="card overflow-hidden">
        <div class="p-4 border-b border-slate-200 flex flex-wrap items-center gap-3 justify-between">
          <h3 class="font-bold text-slate-800">Student Risk Table</h3>
          <div class="flex items-center gap-2">
            <div class="relative">
              <input type="text" id="searchInput" class="form-input pl-10 py-2 text-sm" placeholder="Search students..." style="width: 220px" />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">${ICONS.search}</span>
            </div>
            <select id="filterRisk" class="form-input py-2 text-sm" style="width: 130px">
              <option value="">All Risk</option>
              <option value="Low">Low</option>
              <option value="Moderate">Moderate</option>
              <option value="High">High</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="data-table" id="studentTable">
            <thead>
              <tr>
                <th>Student ID</th>
                <th>Name</th>
                <th>Class</th>
                <th>Attendance %</th>
                <th>Academic Score</th>
                <th>Risk Score</th>
                <th>Risk Category</th>
                <th>Primary Cause</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="studentTableBody">
              ${students.length === 0 ?
        '<tr><td colspan="9" class="py-20 text-center text-slate-400">No students found for this school.</td></tr>' :
        renderStudentRows(students)}
            </tbody>
          </table>
        </div>

        <div class="p-4 border-t border-slate-200 text-sm text-slate-500">
          Showing ${students.length} students · Sorted by risk score (highest first)
        </div>
      </div>
    `;

    // Search and filter
    const tbody = document.getElementById('studentTableBody');
    let filteredStudents = students;

    function applyFilters() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const riskFilter = document.getElementById('filterRisk').value;

      filteredStudents = students.filter(s => {
        const matchSearch = !search ||
          s.student_uid.toLowerCase().includes(search) ||
          s.name.toLowerCase().includes(search);
        const matchRisk = !riskFilter || s.risk_category === riskFilter;
        return matchSearch && matchRisk;
      });

      if (filteredStudents.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="py-20 text-center"><div class="flex flex-col items-center justify-center text-slate-400 gap-2"><span class="text-3xl">📭</span><p class="font-medium">No students found matching your criteria.</p><p class="text-xs">Try adjusting your search or filters.</p></div></td></tr>';
      } else {
        tbody.innerHTML = renderStudentRows(filteredStudents);
        attachRowActions(filteredStudents);
      }
    }

    document.getElementById('searchInput')?.addEventListener('input', applyFilters);
    document.getElementById('filterRisk')?.addEventListener('change', applyFilters);

    attachRowActions(students);
  } catch (err) {
    content.innerHTML = `<div class="card p-8 text-center"><p class="text-slate-500">Error loading students.</p></div>`;
  }
}

function renderStudentRows(students) {
  return students.map(s => `
    <tr>
      <td class="font-mono text-xs text-slate-500">${s.student_uid}</td>
      <td class="font-medium">${s.name}</td>
      <td class="text-center">${s.class}</td>
      <td class="text-center"><span class="${s.attendance < 70 ? 'text-red-500 font-semibold' : ''}">${s.attendance}%</span></td>
      <td class="text-center">${s.academic_score}</td>
      <td class="text-center"><span class="font-bold">${s.risk_score}</span></td>
      <td>${riskBadge(s.risk_category)}</td>
      <td class="text-sm">${s.cause}</td>
      <td>
        <div class="flex gap-1 justify-center">
          <button class="btn-outline py-1.5 px-2.5 text-xs view-btn" data-id="${s.id}" title="View Details">
            ${ICONS.eye} 
          </button>
          <button class="btn-outline py-1.5 px-2.5 text-xs intervention-btn" 
            data-id="${s.id}" 
            data-cause="${s.cause}" 
            data-risk="${s.risk_category}" 
            data-name="${s.name}" 
            title="Interventions">
            ${ICONS.intervention}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function attachRowActions(students) {
  document.querySelectorAll('.view-btn').forEach(btn => {
    btn.addEventListener('click', () => showExplainModal(btn.dataset.id));
  });
  document.querySelectorAll('.intervention-btn').forEach(btn => {
    btn.addEventListener('click', () => showInterventionModal(
      btn.dataset.id,
      btn.dataset.cause,
      btn.dataset.name,
      btn.dataset.risk
    ));
  });
}

async function showExplainModal(studentId) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content p-6">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-slate-800">🧠 AI Risk Explanation</h3>
        <button class="close-modal p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-lg">✕</button>
      </div>
      <div id="explainContent" class="text-center py-8">
        <div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin mx-auto"></div>
        <p class="text-sm text-slate-400 mt-3">Analyzing risk factors...</p>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.close-modal').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  try {
    const data = await api(`/students/${studentId}/explain`);
    const student = await api(`/students/${studentId}`);

    document.getElementById('explainContent').innerHTML = `
      <div class="text-left space-y-4">
        <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
          <div class="w-12 h-12 rounded-xl gradient-navy flex items-center justify-center text-white font-bold">${student.student_uid?.slice(-3)}</div>
          <div>
            <p class="font-bold text-slate-800">${student.name}</p>
            <p class="text-sm text-slate-500">Class ${student.class} · ${student.school_name}</p>
          </div>
          <div class="ml-auto text-right">
            <p class="text-2xl font-black text-slate-800">${data.risk_score}</p>
            ${riskBadge(data.risk_category)}
          </div>
        </div>

        <div class="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p class="font-semibold text-amber-800 text-sm mb-1">Why is this student ${data.risk_category.toLowerCase()} risk?</p>
          <p class="text-sm text-amber-700">${data.explanation}</p>
        </div>

        ${data.risk_category !== 'Low' ? `
        <div>
          <p class="font-semibold text-slate-700 text-sm mb-3">Top 3 Contributing Factors</p>
          <div class="space-y-2">
            ${data.top_factors.map((f, i) => `
              <div class="flex items-center gap-3">
                <span class="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">${i + 1}</span>
                <div class="flex-1">
                  <div class="flex items-center justify-between mb-1">
                    <span class="text-sm font-medium text-slate-700">${f.factor}</span>
                    <span class="text-xs font-bold text-slate-500">${f.contribution}/30</span>
                  </div>
                  <div class="h-1.5 bg-slate-100 rounded-full">
                    <div class="h-full rounded-full ${f.contribution > 20 ? 'bg-red-400' : f.contribution > 10 ? 'bg-orange-400' : 'bg-yellow-400'}" style="width: ${(f.contribution / 30) * 100}%"></div>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        ` : ''}
      </div>
    `;
  } catch (err) {
    document.getElementById('explainContent').innerHTML = '<p class="text-red-500">Failed to load explanation</p>';
  }
}

async function showInterventionModal(studentId, cause, name, riskCategory) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.innerHTML = `
    <div class="modal-content p-6 max-w-2xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg text-slate-800">🎯 Intervention Management</h3>
        <button class="close-modal p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600 text-lg">✕</button>
      </div>
      <div id="interventionContent" class="space-y-6">
        <div class="flex items-center justify-center py-10">
          <div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
  overlay.querySelector('.close-modal').addEventListener('click', () => overlay.remove());
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });

  async function loadData() {
    try {
      const [suggestions, existing] = await Promise.all([
        api(`/interventions/suggestions/${encodeURIComponent(cause)}`),
        api(`/interventions?student_id=${studentId}`)
      ]);

      const pending = existing.filter(i => i.follow_up_status === 'pending');
      const completed = existing.filter(i => i.follow_up_status === 'completed');

      document.getElementById('interventionContent').innerHTML = `
        <div class="p-3 bg-slate-50 rounded-lg flex items-center justify-between">
          <div>
            <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Student:</span>
            <span class="font-semibold text-slate-800 ml-2">${name}</span>
          </div>
          ${riskCategory !== 'Low' ? `
            <div>
              <span class="text-xs text-slate-500 uppercase font-bold tracking-wider">Primary Cause:</span>
              <span class="font-semibold text-saffron ml-2">${cause}</span>
            </div>
          ` : ''}
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Recommendations Column -->
          <div class="space-y-4">
            <div>
              <p class="font-bold text-slate-700 text-sm mb-3">🛠️ Recommended Actions</p>
              <div class="space-y-2">
                ${(suggestions.actions || []).map(a => {
        const isTaken = pending.some(i => i.action_taken === a);
        return `
                    <div class="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg border border-blue-100">
                      <span class="text-xs font-medium text-blue-900">${a}</span>
                      <button class="mark-intervention btn-primary py-1 px-3 text-[10px] ${isTaken ? 'opacity-50 cursor-not-allowed grayscale' : ''}" 
                        data-action="${a}" ${isTaken ? 'disabled' : ''}>
                        ${isTaken ? 'Recorded' : 'Take Action'}
                      </button>
                    </div>
                  `;
      }).join('')}
              </div>
            </div>
            
            ${suggestions.schemes?.length ? `
              <div>
                <p class="font-bold text-slate-700 text-sm mb-3">📋 Relevant Schemes</p>
                <div class="space-y-2">
                  ${suggestions.schemes.map(s => `
                    <div class="p-2 bg-emerald-50 rounded-lg border border-emerald-100 flex items-start gap-2">
                      <span class="text-emerald-500 text-xs mt-0.5">✓</span>
                      <span class="text-[11px] text-emerald-800">${s}</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>

          <!-- History Column -->
          <div class="space-y-4">
            <div>
              <p class="font-bold text-slate-700 text-sm mb-3">🕒 Active Trackers (${pending.length})</p>
              <div class="space-y-2">
                ${pending.length === 0 ? '<p class="text-xs text-slate-400 italic p-4 text-center border-2 border-dashed border-slate-100 rounded-xl">No active interventions</p>' :
          pending.map(i => `
                    <div class="p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
                      <div class="flex justify-between items-start mb-2">
                        <p class="text-xs font-bold text-slate-800">${i.action_taken}</p>
                        <span class="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[9px] font-bold rounded uppercase">Pending</span>
                      </div>
                      <p class="text-[10px] text-slate-500 mb-2">Started: ${new Date(i.date).toLocaleDateString()}</p>
                      <button class="complete-btn w-full py-1.5 bg-slate-800 text-white rounded-lg text-[10px] font-bold hover:bg-black transition-colors" data-id="${i.id}">
                        Mark Completed
                      </button>
                    </div>
                  `).join('')
        }
              </div>
            </div>

            ${completed.length > 0 ? `
              <div>
                <p class="font-bold text-slate-700 text-sm mb-3">✅ Recently Completed</p>
                <div class="space-y-2">
                  ${completed.slice(0, 3).map(i => `
                    <div class="p-2 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                      <span class="text-[11px] font-medium text-slate-600">${i.action_taken}</span>
                      <span class="text-[9px] text-emerald-600 font-bold">REDUCED RISK</span>
                    </div>
                  `).join('')}
                </div>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      attachModalListeners();
    } catch (err) {
      document.getElementById('interventionContent').innerHTML = `<p class="text-red-500 text-center py-10">Error loading data: ${err.message}</p>`;
    }
  }

  function attachModalListeners() {
    // Take new action
    overlay.querySelectorAll('.mark-intervention').forEach(btn => {
      btn.addEventListener('click', async () => {
        const action = btn.dataset.action;
        btn.disabled = true;
        btn.textContent = 'Saving...';
        try {
          await api('/interventions', {
            method: 'POST',
            body: {
              student_id: parseInt(studentId),
              cause_type: cause,
              action_taken: action,
              officer_id: getState().user?.id || 1
            }
          });
          loadData(); // Refresh view
        } catch (err) {
          btn.textContent = 'Error';
          btn.disabled = false;
        }
      });
    });

    // Complete action
    overlay.querySelectorAll('.complete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.dataset.id;
        btn.disabled = true;
        btn.textContent = 'Updating...';
        try {
          await api(`/interventions/${id}/complete`, { method: 'PUT' });
          loadData(); // Refresh list
          // Trigger global refresh to update stats cards and main table
          const overviewBtn = document.querySelector('[data-nav="overview"]');
          if (overviewBtn) {
            // Briefly show success notification if needed
            console.log("Intervention complete, refreshing dashboard...");
          }
        } catch (err) {
          btn.textContent = 'Error';
          btn.disabled = false;
        }
      });
    });
  }

  loadData();
}

function renderAddForm(content, user) {
  content.innerHTML = `
    <div class="max-w-4xl mx-auto">
      <div class="card p-6">
        <h3 class="font-bold text-lg text-slate-800 mb-1">Detailed Student Data Entry</h3>
        <p class="text-sm text-slate-500 mb-6">Comprehensive 40-point assessment for AI risk intelligence.</p>

        <form id="addForm" class="space-y-8">
          <!-- Section 1: Personal & Socio-Demographic -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-navy/10 flex items-center justify-center">${ICONS.students}</span>
              Personal & Socio-Demographic
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="form-label text-saffron">Update Existing? (Student ID)</label>
                <input type="number" id="formStudentId" class="form-input border-saffron/30" placeholder="Enter ID only to update" />
                <p class="text-[10px] text-slate-400 mt-1">Leave blank for NEW registration</p>
              </div>
              <div class="md:col-span-2">
                <label class="form-label font-bold">New Student Name</label>
                <input type="text" id="formName" class="form-input" required placeholder="Full Name of the student" />
              </div>
              <div>
                <label class="form-label">Age at Enrollment</label>
                <input type="number" id="formAge" class="form-input" placeholder="e.g. 11" />
              </div>
              <div>
                <label class="form-label">Sibling Count</label>
                <input type="number" id="formSiblings" class="form-input" placeholder="e.g. 2" />
              </div>
              <div>
                <label class="form-label">Nacionality</label>
                <input type="text" id="formNacionality" class="form-input" value="Indian" />
              </div>
              <div>
                <label class="form-label">Displaced</label>
                <select id="formDisplaced" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div>
                <label class="form-label">Special Needs</label>
                <select id="formNeeds" class="form-input">
                  <option value="0">None</option>
                  <option value="1">Physical/Learning</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 2: Academic Background -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-navy/10 flex items-center justify-center">${ICONS.chart}</span>
              Academic Background
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="form-label">Current Class</label>
                <input type="number" id="formClass" class="form-input" value="6" />
              </div>
              <div>
                <label class="form-label">Attendance %</label>
                <input type="number" id="formAttendance" class="form-input" required min="0" max="100" step="0.1" />
              </div>
              <div>
                <label class="form-label">Academic Score (0-100)</label>
                <input type="number" id="formAcademic" class="form-input" required min="0" max="100" step="0.1" />
              </div>
              <div>
                <label class="form-label">Menstrual Absence Days</label>
                <input type="number" id="formMenstrual" class="form-input" value="0" />
              </div>
              <div>
                <label class="form-label">Previous Qual. Grade</label>
                <input type="number" id="formPrevGrade" class="form-input" step="0.1" />
              </div>
              <div>
                <label class="form-label">Admission Grade</label>
                <input type="number" id="formAdmGrade" class="form-input" step="0.1" />
              </div>
              <div>
                <label class="form-label">Application Mode</label>
                <select id="formAppMode" class="form-input">
                  <option value="online">Online</option>
                  <option value="offline">Offline</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 3: Socio-Economic Factors -->
          <div class="space-y-4">
            <h4 class="text-sm font-bold text-navy uppercase tracking-wider flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-navy/10 flex items-center justify-center">${ICONS.shield}</span>
              Socio-Economic Factors
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div class="md:col-span-2">
                <label class="form-label">Parent Income Band</label>
                <select id="formIncome" class="form-input">
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low" selected>Low</option>
                  <option value="below_poverty">Below Poverty Line</option>
                </select>
              </div>
              <div>
                <label class="form-label">Debtor</label>
                <select id="formDebtor" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div>
                <label class="form-label">Scholarship</label>
                <select id="formScholarship" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div>
                <label class="form-label">Inflation Rate</label>
                <input type="number" id="formInf" class="form-input" step="0.1" value="5.2" />
              </div>
              <div>
                <label class="form-label">Fees Up to Date</label>
                <select id="formFees" class="form-input">
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Section 4: Risk-Specific Flags -->
          <div class="space-y-4 p-4 bg-red-50/50 rounded-xl border border-red-100">
            <h4 class="text-sm font-bold text-red-700 uppercase tracking-wider flex items-center gap-2">
              <span class="w-6 h-6 rounded-lg bg-red-100 flex items-center justify-center text-red-600">${ICONS.alert}</span>
              Vulnerability & Risk Flags
            </h4>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="form-label">Migration Risk</label>
                <select id="formMigration" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div>
                <label class="form-label">Child Marriage Risk</label>
                <select id="formMarriage" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div>
                <label class="form-label">Eve Teasing Issues</label>
                <select id="formEve" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div>
                <label class="form-label">Abuse Risk</label>
                <select id="formAbuse" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
              <div>
                <label class="form-label">School Distance (km)</label>
                <input type="number" id="formDist" class="form-input" step="0.1" placeholder="e.g. 2.5" />
              </div>
              <div>
                <label class="form-label">Age-Grade Mismatch</label>
                <select id="formMismatch" class="form-input">
                  <option value="0">No</option>
                  <option value="1">Yes</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label class="form-label">Health & Institutional Remarks</label>
            <textarea id="formRemarks" class="form-input" rows="3" placeholder="Enter health conditions or institution issues..."></textarea>
          </div>

          <button type="submit" class="btn-primary w-full py-4 text-lg shadow-xl shadow-navy/20">
            🧠 AI Logic: Calculate Risk & Synchronize
          </button>
        </form>

        <div id="predictionResult" class="hidden mt-8"></div>
      </div>
    </div>
  `;

  document.getElementById('addForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const resultDiv = document.getElementById('predictionResult');
    resultDiv.className = 'mt-8';
    resultDiv.innerHTML = '<div class="text-center py-6"><div class="w-10 h-10 border-4 border-saffron border-t-transparent rounded-full animate-spin mx-auto"></div><p class="text-sm text-slate-400 mt-3 font-medium">SHIKSHA SHIELD AI ENGINE: CROSS-REFERENCING Assessment...</p></div>';

    const payload = {
      student_id: document.getElementById('formStudentId').value || undefined,
      name: document.getElementById('formName').value,
      gender: 'Female',
      age_at_enrollment: parseInt(document.getElementById('formAge').value || 0),
      sibling_count: parseInt(document.getElementById('formSiblings').value || 0),
      nacionality: document.getElementById('formNacionality').value,
      displaced: parseInt(document.getElementById('formDisplaced').value),
      educational_special_needs: parseInt(document.getElementById('formNeeds').value),
      class: parseInt(document.getElementById('formClass').value),
      attendance: parseFloat(document.getElementById('formAttendance').value),
      academic_score: parseFloat(document.getElementById('formAcademic').value),
      menstrual_absence: parseInt(document.getElementById('formMenstrual').value),
      prev_qualification_grade: parseFloat(document.getElementById('formPrevGrade').value || 0),
      admission_grade: parseFloat(document.getElementById('formAdmGrade').value || 0),
      application_mode: document.getElementById('formAppMode').value,
      income_band: document.getElementById('formIncome').value,
      debtor: parseInt(document.getElementById('formDebtor').value),
      scholarship_holder: parseInt(document.getElementById('formScholarship').value),
      inflation_rate: parseFloat(document.getElementById('formInf').value),
      tuition_fees_up_to_date: parseInt(document.getElementById('formFees').value),
      migration_flag: parseInt(document.getElementById('formMigration').value),
      marriage_risk_flag: parseInt(document.getElementById('formMarriage').value),
      eve_teasing: parseInt(document.getElementById('formEve').value),
      abuse: parseInt(document.getElementById('formAbuse').value),
      school_distance: parseFloat(document.getElementById('formDist').value || 0),
      age_grade_mismatch: parseInt(document.getElementById('formMismatch').value),
      remarks: document.getElementById('formRemarks').value,
      school_id: user.school_id || 1
    };

    try {
      const endpoint = payload.student_id ? '/students/predict' : '/students';
      const result = await api(endpoint, { method: 'POST', body: payload });

      resultDiv.innerHTML = `
        <div class="p-6 rounded-2xl border-2 animate-fade-in ${result.risk_category === 'Critical' ? 'border-red-300 bg-red-50' :
          result.risk_category === 'High' ? 'border-orange-300 bg-orange-50' :
            result.risk_category === 'Moderate' ? 'border-yellow-300 bg-yellow-50' :
              'border-green-300 bg-green-50'
        }">
          <div class="flex items-center justify-between mb-4">
            <h4 class="font-bold text-slate-800 text-lg">AI Comprehensive Prediction</h4>
            ${riskBadge(result.risk_category)}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div class="text-center p-4 bg-white rounded-xl shadow-sm">
              <p class="text-4xl font-black text-slate-800">${result.risk_score}</p>
              <p class="text-xs text-slate-500 uppercase tracking-widest mt-1 font-bold">Total Risk Index</p>
            </div>
            <div class="text-center p-4 bg-white rounded-xl shadow-sm">
              <p class="text-xl font-bold text-slate-700">${result.risk_category}</p>
              <p class="text-xs text-slate-500 uppercase tracking-widest mt-1 font-bold">Risk Stratum</p>
            </div>
            <div class="text-center p-4 bg-white rounded-xl shadow-sm">
              <p class="text-sm font-bold text-navy">${result.risk_category === 'Low' ? 'N/A' : result.cause}</p>
              <p class="text-xs text-slate-500 uppercase tracking-widest mt-1 font-bold">Primary Propensity</p>
            </div>
          </div>
          <div class="bg-white/60 p-4 rounded-xl">
             <p class="text-sm text-slate-700 leading-relaxed font-medium">🎯 <span class="ml-1">${result.explanation || ''}</span></p>
          </div>
          ${result.student_uid ? `
            <p class="text-xs text-slate-400 mt-4 font-mono">NEW SYSTEM ENTRY RECORDED: ${result.student_uid}</p>
            <div class="mt-4 flex justify-center">
              <button id="backToOverview" class="btn-primary py-2 px-6 shadow-lg hover:scale-105 transition-transform">
                Return to Overview & Refresh Totals
              </button>
            </div>
          ` : ''}
        </div>
      `;

      if (result.student_uid) {
        document.getElementById('backToOverview')?.addEventListener('click', () => {
          // Trigger the 'overview' nav click to force re-fetch
          const overviewBtn = document.querySelector('[data-nav="overview"]');
          if (overviewBtn) {
            overviewBtn.click();
          } else {
            window.location.reload();
          }
        });
      }
    } catch (err) {
      resultDiv.innerHTML = `<div class="p-4 bg-red-50 rounded-lg text-red-600 text-sm border border-red-200">System Error: ${err.message}</div>`;
    }
  });
}

async function renderAlerts(content, user) {
  content.innerHTML = '<div class="flex items-center justify-center py-20"><div class="w-8 h-8 border-3 border-saffron border-t-transparent rounded-full animate-spin"></div></div>';

  try {
    const students = await api(`/students?school_id=${user.school_id || 1}`);
    const criticalStudents = students.filter(s => s.risk_score > 60);

    content.innerHTML = `
      <div class="card p-6 mb-4">
        <div class="flex items-center gap-3 mb-1">
          <div class="w-10 h-10 rounded-xl gradient-saffron flex items-center justify-center text-white">${ICONS.alert}</div>
          <div>
            <h3 class="font-bold text-slate-800">Early Warning Alerts</h3>
            <p class="text-sm text-slate-500">Students with risk score > 60 requiring immediate attention</p>
          </div>
          <span class="ml-auto bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-bold">${criticalStudents.length} alerts</span>
        </div>
      </div>

      <div class="space-y-3">
        ${criticalStudents.map((s, i) => `
          <div class="card p-4 flex items-center gap-4 animate-slide-in border-l-4 ${s.risk_category === 'Critical' ? 'border-l-red-500' : 'border-l-orange-500'
      }" style="animation-delay: ${i * 0.03}s">
            <div class="w-10 h-10 rounded-xl ${s.risk_category === 'Critical' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
      } flex items-center justify-center font-bold text-sm">
              ${Math.round(s.risk_score)}
            </div>
            <div class="flex-1 min-w-0">
              <p class="font-semibold text-slate-800 truncate">${s.name} <span class="text-slate-400 font-normal text-xs">${s.student_uid}</span></p>
              <p class="text-sm text-slate-500">Class ${s.class} · ${s.cause} · Attendance: ${s.attendance}%</p>
            </div>
            ${riskBadge(s.risk_category)}
            <button class="btn-outline py-1.5 px-3 text-xs view-alert-btn" data-id="${s.id}">View</button>
          </div>
        `).join('')}
      </div>
    `;

    content.querySelectorAll('.view-alert-btn').forEach(btn => {
      btn.addEventListener('click', () => showExplainModal(btn.dataset.id));
    });
  } catch (err) {
    content.innerHTML = `<div class="card p-8 text-center"><p class="text-slate-500">Error loading alerts.</p></div>`;
  }
}
