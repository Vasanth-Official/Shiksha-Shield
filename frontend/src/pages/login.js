/**
 * Login Page – Government-style secure login with role selection
 */
import { api, setUser, navigate } from '../main.js';

export function renderLogin(container) {
  container.innerHTML = `
    <div class="min-h-screen gradient-hero flex items-center justify-center p-4 relative overflow-hidden">
      <div class="w-full max-w-md relative z-10">
        <!-- Header -->
        <div class="text-center mb-8">
          <div class="w-16 h-16 rounded-2xl gradient-saffron flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h1 class="text-2xl font-bold text-white mb-1">SHIKSHA SHIELD</h1>
          <p class="text-white/50 text-sm">AI Risk Intelligence System</p>
          <div class="flex items-center justify-center gap-2 mt-3">
            <div class="w-8 h-px bg-white/20"></div>
            <span class="text-white/40 text-xs uppercase tracking-wider">Secure Access</span>
            <div class="w-8 h-px bg-white/20"></div>
          </div>
        </div>

        <!-- Login Card -->
        <div class="card p-8">
          <form id="loginForm" class="space-y-5">
            <div>
              <label class="form-label">Username</label>
              <input type="text" id="username" class="form-input" placeholder="Enter your username" autocomplete="username" required />
            </div>

            <div>
              <label class="form-label">Password</label>
              <input type="password" id="password" class="form-input" placeholder="Enter your password" autocomplete="current-password" required />
            </div>

            <div>
              <label class="form-label">Role</label>
              <select id="roleSelect" class="form-input">
                <option value="teacher">Teacher</option>
                <option value="school_admin">School Admin</option>
                <option value="district_officer">District Officer</option>
                <option value="state_officer">State Officer</option>
              </select>
            </div>

            <div id="loginError" class="hidden bg-red-50 border border-red-200 text-red-600 text-sm p-3 rounded-lg"></div>

            <button type="submit" class="btn-primary w-full py-3 text-base">
              Sign In Securely
            </button>
          </form>

          <!-- Demo Credentials -->
          <div class="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Demo Credentials</p>
            <div class="space-y-2">
              ${[
      { user: 'teacher1', role: 'Teacher', label: 'teacher' },
      { user: 'schooladmin1', role: 'School Admin', label: 'school_admin' },
      { user: 'district1', role: 'District Officer', label: 'district_officer' },
      { user: 'state1', role: 'State Officer', label: 'state_officer' },
    ].map(c => `
                <button class="demo-cred w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition-all text-left" data-user="${c.user}" data-role="${c.label}">
                  <div>
                    <span class="text-sm font-medium text-slate-700">${c.role}</span>
                    <span class="text-xs text-slate-400 ml-2">${c.user}</span>
                  </div>
                  <span class="text-xs text-saffron font-medium">Use →</span>
                </button>
              `).join('')}
            </div>
            <p class="text-[11px] text-slate-400 mt-3">Password for all: <code class="bg-slate-200 px-1.5 py-0.5 rounded text-slate-600">demo123</code></p>
          </div>
        </div>

        <!-- Back link -->
        <div class="text-center mt-6">
          <button id="backToLanding" class="text-sm text-white/50 hover:text-white transition-colors">← Back to Home</button>
        </div>
      </div>
    </div>
  `;

  // Demo credential auto-fill
  container.querySelectorAll('.demo-cred').forEach(btn => {
    btn.addEventListener('click', () => {
      document.getElementById('username').value = btn.dataset.user;
      document.getElementById('password').value = 'demo123';
      document.getElementById('roleSelect').value = btn.dataset.role;
    });
  });

  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('loginError');
    errorEl.classList.add('hidden');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const res = await api('/auth/login', {
        method: 'POST',
        body: { username, password }
      });

      if (res.success) {
        setUser(res.user);
      } else {
        errorEl.textContent = res.message || 'Invalid credentials. Please try again.';
        errorEl.classList.remove('hidden');
      }
    } catch (err) {
      errorEl.textContent = 'Connection error. Please ensure the backend server is running.';
      errorEl.classList.remove('hidden');
    }
  });

  document.getElementById('backToLanding').addEventListener('click', () => navigate('landing'));
}
