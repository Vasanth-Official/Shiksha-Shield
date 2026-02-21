/**
 * Landing Page – Hero, Impact Stats, CTA
 */
import { navigate } from '../main.js';

export function renderLanding(container) {
  container.innerHTML = `
    <!-- Navbar -->
    <nav class="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/50">
      <div class="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg gradient-saffron flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <span class="font-bold text-navy text-lg tracking-tight">SHIKSHA SHIELD</span>
        </div>
        <div class="flex items-center gap-4">
          <a href="#" class="text-sm font-medium text-slate-600 hover:text-navy transition-colors hidden sm:block" id="aboutLink">About</a>
          <button class="btn-primary text-sm" id="loginNavBtn">Sign In →</button>
        </div>
      </div>
    </nav>

    <!-- Hero Section -->
    <section class="gradient-hero min-h-screen flex items-center relative overflow-hidden pt-16">
      <div class="max-w-7xl mx-auto px-6 py-24 relative z-10">
        <div class="max-w-3xl">
          <div class="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
            <span class="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span class="text-white/80 text-sm font-medium">Aligned with Beti Bachao Beti Padhao & NEP 2020</span>
          </div>

          <h1 class="text-5xl md:text-6xl lg:text-7xl font-black text-white leading-[1.1] mb-6">
            AI-Powered<br/>
            <span class="bg-gradient-to-r from-[#FF9933] to-[#FFB366] bg-clip-text text-transparent">Preventive Governance</span><br/>
            for Girl Child Education
          </h1>

          <p class="text-xl text-white/70 mb-10 max-w-xl leading-relaxed">
            From reactive surveys to <strong class="text-white">predictive intelligence</strong>. 
            Identifying at-risk students before dropout occurs.
          </p>

          <div class="flex flex-wrap gap-4">
            <button class="btn-primary text-base px-8 py-3.5" id="heroCTA">View Dashboard Demo →</button>
            <button class="btn-outline text-white border-white/30 hover:border-white hover:text-white text-base px-8 py-3.5" id="learnMore">Learn More</button>
          </div>
        </div>
      </div>
    </section>

    <!-- Impact Stats -->
    <section class="py-20 bg-white" id="impactSection">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <p class="text-saffron font-semibold text-sm uppercase tracking-wider mb-2">Proven Impact</p>
          <h2 class="text-3xl md:text-4xl font-bold text-navy">Measurable Results Through AI</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <div class="card p-8 text-center animate-fade-in">
            <div class="w-16 h-16 rounded-2xl gradient-saffron flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <p class="text-4xl font-black text-navy mb-2">80%</p>
            <p class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Model Precision Target</p>
            <p class="text-sm text-slate-400 mt-2">Accurately predicting at-risk students using multi-factor analysis</p>
          </div>

          <div class="card p-8 text-center animate-fade-in" style="animation-delay: 0.1s">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>
            </div>
            <p class="text-4xl font-black text-navy mb-2">5–10%</p>
            <p class="text-sm font-semibold text-slate-500 uppercase tracking-wider">Dropout Reduction Potential</p>
            <p class="text-sm text-slate-400 mt-2">Significant decrease through early intervention and targeted support</p>
          </div>

          <div class="card p-8 text-center animate-fade-in" style="animation-delay: 0.2s">
            <div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-5">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            </div>
            <p class="text-4xl font-black text-navy mb-2">30%</p>
            <p class="text-sm font-semibold text-slate-500 uppercase tracking-wider">High-Risk Case Improvement</p>
            <p class="text-sm text-slate-400 mt-2">Improvement rate in students receiving targeted interventions</p>
          </div>
        </div>

        <!-- Simulated Impact Banner -->
        <div class="card gradient-navy p-8 md:p-10">
          <div class="grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
            <div class="md:col-span-1">
              <p class="text-white/60 text-sm font-semibold uppercase tracking-wider mb-1">Simulated Study</p>
              <p class="text-white text-lg font-bold">50 Students</p>
            </div>
            <div class="text-center">
              <p class="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Baseline Dropout</p>
              <p class="text-3xl font-black text-red-400">18%</p>
            </div>
            <div class="text-center">
              <p class="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">After Intervention</p>
              <p class="text-3xl font-black text-green-400">12%</p>
            </div>
            <div class="text-center">
              <p class="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Relative Reduction</p>
              <p class="text-3xl font-black text-saffron">33%</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- How It Works -->
    <section class="py-20 bg-slate-50">
      <div class="max-w-7xl mx-auto px-6">
        <div class="text-center mb-16">
          <p class="text-saffron font-semibold text-sm uppercase tracking-wider mb-2">Platform Overview</p>
          <h2 class="text-3xl md:text-4xl font-bold text-navy">How SHIKSHA SHIELD Works</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
          ${[
      { num: '01', title: 'Data Collection', desc: 'Teachers input attendance, academic, health, and socio-economic indicators monthly.', color: 'from-blue-500 to-blue-600' },
      { num: '02', title: 'AI Analysis', desc: 'Our risk engine processes multi-factor data to generate predictive risk scores (0–100).', color: 'from-[#FF9933] to-[#FF6600]' },
      { num: '03', title: 'Smart Alerts', desc: 'Real-time notifications for high-risk cases with cause classification and explanations.', color: 'from-red-500 to-red-600' },
      { num: '04', title: 'Intervention', desc: 'AI-recommended schemes and actions matched to specific risk causes for each student.', color: 'from-emerald-500 to-emerald-600' },
    ].map(s => `
            <div class="card p-6 animate-fade-in">
              <div class="w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white font-bold text-sm mb-4">${s.num}</div>
              <h3 class="font-bold text-navy text-lg mb-2">${s.title}</h3>
              <p class="text-sm text-slate-500 leading-relaxed">${s.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- Footer CTA -->
    <section class="py-20 gradient-hero">
      <div class="max-w-3xl mx-auto px-6 text-center">
        <h2 class="text-3xl md:text-4xl font-bold text-white mb-4">Ready to Protect Every Girl's Right to Education?</h2>
        <p class="text-white/60 mb-8">Access the demo dashboard to explore AI-powered dropout prevention in action.</p>
        <button class="btn-primary text-lg px-10 py-4" id="footerCTA">View Dashboard Demo →</button>
      </div>
    </section>

    <!-- Footer -->
    <footer class="bg-navy-dark py-8">
      <div class="max-w-7xl mx-auto px-6 text-center">
        <p class="text-white/40 text-sm">SHIKSHA SHIELD © 2026 · Aligned with Beti Bachao Beti Padhao & National Education Policy 2020</p>
        <p class="text-white/30 text-xs mt-2">Government of India Initiative · All data is anonymized · No Aadhaar data collected</p>
      </div>
    </footer>
  `;

  // Event listeners
  document.getElementById('loginNavBtn')?.addEventListener('click', () => navigate('login'));
  document.getElementById('heroCTA')?.addEventListener('click', () => navigate('login'));
  document.getElementById('footerCTA')?.addEventListener('click', () => navigate('login'));
  document.getElementById('learnMore')?.addEventListener('click', () => {
    document.getElementById('impactSection')?.scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('aboutLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('impactSection')?.scrollIntoView({ behavior: 'smooth' });
  });

  // Initialize AI Chatbot
  initChatbot(container);
}

function initChatbot(container) {
  const chatHtml = `
    <div id="shiksha-chatbot" class="fixed bottom-6 right-6 z-[9999] flex flex-col items-end">
      <!-- Chat Window -->
      <div id="chat-window" class="hidden w-80 md:w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden mb-4 transition-all duration-300 scale-95 opacity-0 origin-bottom-right">
        <!-- Header -->
        <div class="gradient-navy p-4 text-white flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center text-xl">🛡️</div>
            <div>
              <p class="font-bold text-sm">Ankita</p>
              <p class="text-[10px] text-white/70">AI Student Counselor</p>
            </div>
          </div>
          <button id="close-chat" class="p-1 hover:bg-white/10 rounded-full">✕</button>
        </div>
        
        <!-- Messages -->
        <div id="chat-messages" class="flex-1 h-96 overflow-y-auto p-4 space-y-4 bg-slate-50">
          <div class="flex gap-2">
            <div class="w-8 h-8 rounded-full gradient-saffron flex items-center justify-center text-xs shrink-0">AI</div>
            <div class="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700">
              Namaste! I am Ankita. How are you feeling today? If you're facing any challenges with school, I'm here to listen and help.
            </div>
          </div>
        </div>
        
        <!-- Input -->
        <div class="p-4 bg-white border-t border-slate-100">
          <form id="chat-form" class="flex gap-2">
            <input type="text" id="chat-input" class="form-input text-sm py-2" placeholder="Type your message..." required />
            <button type="submit" class="p-2 gradient-navy text-white rounded-xl hover:scale-105 transition-transform flex items-center justify-center">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>
            </button>
          </form>
        </div>
      </div>
      
      <!-- Toggle Button -->
      <button id="toggle-chat" class="w-14 h-14 rounded-full gradient-saffron text-white shadow-xl flex items-center justify-center text-2xl hover:scale-110 active:scale-95 transition-all animate-bounce-slow">
        💬
      </button>
    </div>
  `;

  const div = document.createElement('div');
  div.innerHTML = chatHtml;
  container.appendChild(div.firstElementChild);

  const toggleBtn = document.getElementById('toggle-chat');
  const chatWin = document.getElementById('chat-window');
  const closeBtn = document.getElementById('close-chat');
  const chatForm = document.getElementById('chat-form');
  const chatInput = document.getElementById('chat-input');
  const chatMsgs = document.getElementById('chat-messages');

  let chatHistory = [];

  toggleBtn.onclick = () => {
    chatWin.classList.toggle('hidden');
    setTimeout(() => {
      chatWin.classList.toggle('scale-100');
      chatWin.classList.toggle('opacity-100');
    }, 10);
  };

  closeBtn.onclick = () => {
    chatWin.classList.remove('scale-100', 'opacity-100');
    setTimeout(() => chatWin.classList.add('hidden'), 300);
  };

  chatForm.onsubmit = async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // Add user message
    addMessage('user', text);
    chatInput.value = '';

    // Loading state
    const loadingId = 'loading-' + Date.now();
    addMessage('ai', 'Thinking...', loadingId);

    try {
      const response = await api('/chat', {
        method: 'POST',
        body: { message: text, history: chatHistory }
      });

      // Remove loading
      document.getElementById(loadingId)?.parentElement?.parentElement?.remove();

      if (response.reply) {
        addMessage('ai', response.reply);
        chatHistory.push({ role: 'user', text: text });
        chatHistory.push({ role: 'ai', text: response.reply });
        // Keep history manageable
        if (chatHistory.length > 20) chatHistory = chatHistory.slice(-20);
      } else {
        addMessage('ai', "I'm sorry, I am having a little trouble connecting. Can you try again?");
      }
    } catch (err) {
      document.getElementById(loadingId)?.parentElement?.parentElement?.remove();
      addMessage('ai', "I apologize, but I am offline right now. Please try again later.");
    }
  };

  function addMessage(role, text, id = null) {
    const msgDiv = document.createElement('div');
    msgDiv.className = 'flex gap-2' + (role === 'user' ? ' justify-end' : '');

    msgDiv.innerHTML = role === 'ai' ? `
      <div class="w-8 h-8 rounded-full gradient-saffron flex items-center justify-center text-xs shrink-0">AI</div>
      <div ${id ? `id="${id}"` : ''} class="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm text-sm text-slate-700 whitespace-pre-wrap">
        ${text}
      </div>
    ` : `
      <div class="bg-navy text-white p-3 rounded-2xl rounded-tr-none shadow-sm text-sm whitespace-pre-wrap max-w-[80%]">
        ${text}
      </div>
    `;

    chatMsgs.appendChild(msgDiv);
    chatMsgs.scrollTop = chatMsgs.scrollHeight;
  }
}
