// Boot System Module
// Handles system initialization, login, and boot sequence

class BootManager {
  constructor(config) {
    this.config = config || {};
    this.initElements();
    this.initTimings();
  }

  initElements() {
    this.bootScreen = document.getElementById('boot-screen');
    this.messagesContainer = document.getElementById('boot-messages');
    this.cursor = document.getElementById('boot-cursor');
    this.desktop = document.getElementById('desktop');
    this.taskbarContainer = document.getElementById('taskbar-container');
    this.desktopIcons = document.getElementById('desktop-icons');
  }

  initTimings() {
    const defaultTimings = {
      messageDelayMin: 200,
      messageDelayMax: 1000,
      stageFadeIn: 500,
      stageDelay: 300,
      iconStagger: 100
    };
    this.timings = { ...defaultTimings, ...this.config.boot?.timings };
  }

  shouldBoot() {
    if (!this.config.boot?.enabled) return false;
    
    const lastVisit = localStorage.getItem('arc.lastVisit');
    if (!lastVisit) return true;
    
    const now = new Date();
    const lastVisitTime = new Date(lastVisit);
    const minutesSinceLastVisit = (now - lastVisitTime) / (1000 * 60);
    
    return minutesSinceLastVisit > (this.config.boot.timeoutMinutes || 1);
  }

  async displayBootMessages() {
    const messageGroups = this.config.boot?.messageGroups || {};
    const allMessages = Object.values(messageGroups).flat();
    
    this.messagesContainer.innerHTML = '';
    
    for (const message of allMessages) {
      const delay = Math.random() * (this.timings.messageDelayMax - this.timings.messageDelayMin) + this.timings.messageDelayMin;
      
      const messageEl = document.createElement('div');
      messageEl.textContent = message;
      this.messagesContainer.appendChild(messageEl);
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }

    await new Promise(resolve => setTimeout(resolve, 800));
  }

  async runBootSequence() {
    debugLog('Starting boot sequence', 'boot');
    
    await this.displayBootMessages();
    await this.showLoginScreen();
  }

  async showLoginScreen() {
    debugLog('Showing login screen', 'boot');
    
    // Remove any existing login screen first
    const existingLogin = document.getElementById('login-screen-container');
    if (existingLogin) {
      debugLog('Removing existing login screen', 'boot');
      existingLogin.remove();
    }
    
    const loginTemplate = await loadTemplate('templates/login-screen.html', 'login-screen');
    if (!loginTemplate) {
      debugLog('Failed to load login screen, proceeding to desktop', 'boot');
      this.proceedToDesktop();
      return;
    }

    const templateEl = document.querySelector(loginTemplate);
    debugLog(`Template element found: ${!!templateEl}`, 'boot');
    
    if (!templateEl) {
      debugLog('Login template element not found in DOM, proceeding to desktop', 'boot');
      this.proceedToDesktop();
      return;
    }

    const loginContainer = document.createElement('div');
    loginContainer.id = 'login-screen-container';

    // Force fallback login screen since template loading is problematic
    debugLog('Using fallback login screen creation', 'boot');
    this.createFallbackLoginScreen(loginContainer);
  }
  
  createFallbackLoginScreen(container) {
    container.innerHTML = `
      <div class="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center z-[100000]" style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%) !important;">
        <div class="bg-slate-800/90 backdrop-blur-xl border border-slate-700 rounded-2xl p-8 w-96 shadow-2xl" style="background-color: rgba(30, 41, 59, 0.9) !important; border-color: #334155 !important;">
          <div class="text-center mb-8">
            <div class="w-20 h-20 bg-brand-600 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl font-bold">AM</div>
            <h1 class="text-2xl font-bold text-slate-100 mb-2" style="color: #f1f5f9 !important;">Arc OS</h1>
            <p class="text-slate-400 text-sm" style="color: #94a3b8 !important;">Select a user to continue</p>
          </div>
          <div class="space-y-3 mb-6">
            <button id="login-user" class="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 px-4 rounded-lg flex items-center justify-between transition-colors group" style="background-color: #334155 !important; color: #f1f5f9 !important;">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-sm font-bold">AM</div>
                <div class="text-left">
                  <div class="font-semibold" style="color: #f1f5f9 !important;">Arcadio Macedo</div>
                  <div class="text-xs text-slate-400" style="color: #94a3b8 !important;">Standard User</div>
                </div>
              </div>
            </button>
            <button id="login-admin" class="w-full bg-slate-700 hover:bg-slate-600 text-slate-100 py-3 px-4 rounded-lg flex items-center justify-between transition-colors group" style="background-color: #334155 !important; color: #f1f5f9 !important;">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-amber-500 rounded-full flex items-center justify-center text-sm font-bold">🔑</div>
                <div class="text-left">
                  <div class="font-semibold" style="color: #f1f5f9 !important;">Administrator</div>
                  <div class="text-xs text-slate-400" style="color: #94a3b8 !important;">Debug Mode Access</div>
                </div>
              </div>
            </button>
          </div>
          <div id="pin-section" class="hidden">
            <div class="mb-4">
              <label class="block text-sm font-medium text-slate-300 mb-2" style="color: #cbd5e1 !important;">
                Administrator PIN
                <span id="pin-hint" class="text-xs text-slate-500 block mt-1" style="color: #64748b !important;">Hint: Any 4-digit prime number will work</span>
              </label>
              <input type="password" id="pin-input" maxlength="4" class="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-slate-100 placeholder-slate-400 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 text-center text-lg tracking-widest" placeholder="••••" style="background-color: #334155 !important; border-color: #475569 !important; color: #f1f5f9 !important;" />
            </div>
            <div class="flex space-x-3">
              <button id="pin-cancel" class="flex-1 bg-slate-700 hover:bg-slate-600 text-slate-300 py-2 px-4 rounded-lg transition-colors" style="background-color: #334155 !important; color: #cbd5e1 !important;">Cancel</button>
              <button id="pin-login" class="flex-1 bg-brand-600 hover:bg-brand-700 text-white py-2 px-4 rounded-lg transition-colors">Login</button>
            </div>
            <div id="pin-error" class="hidden text-red-400 text-sm mt-2 text-center"></div>
          </div>
          <div class="text-center text-xs text-slate-500 mt-6" style="color: #64748b !important;">Arc OS v2.0 • Portfolio Desktop Environment</div>
        </div>
      </div>
    `;
    
    document.body.appendChild(container);
    
    setTimeout(() => {
      LoginManager.init(this);
    }, 300);
    
    debugLog('Fallback login screen created', 'boot');
  }

  async proceedToDesktop() {
    debugLog('Proceeding to desktop after login', 'boot');
    
    applyDebugUIChanges();
    
    if (this.bootScreen && this.bootScreen.style.display !== 'none') {
      this.bootScreen.style.display = 'none';
    }
    
    this.desktop.classList.remove('opacity-0');
    this.desktop.classList.add('opacity-100', 'transition-opacity', 'duration-500');
    
    await this.loadDesktopComponents();
    
    debugLog('Desktop load complete', 'boot');
    
    localStorage.setItem('arc.lastVisit', new Date().toISOString());
  }

  async loadDesktopComponents() {
    WallpaperManager.loadSettings();
    await this.animateTaskbar();
    await this.animateDesktopIcons();
    await this.launchWelcomeApp();
  }

  async animateTaskbar() {
    await new Promise(resolve => setTimeout(resolve, this.timings.stageDelay));
    
    this.taskbarContainer.classList.remove('opacity-0', 'translate-y-full');
    this.taskbarContainer.classList.add('opacity-100', 'translate-y-0', 'transition-all', 'duration-500');
    
    await new Promise(resolve => setTimeout(resolve, this.timings.stageFadeIn));
  }

  async animateDesktopIcons() {
    await new Promise(resolve => setTimeout(resolve, this.timings.stageDelay));
    
    this.desktopIcons.classList.remove('opacity-0');
    this.desktopIcons.classList.add('opacity-100', 'transition-opacity', 'duration-500');
    
    const icons = this.desktopIcons.querySelectorAll('.icon');
    icons.forEach((icon, index) => {
      setTimeout(() => {
        icon.classList.add('animate-fadeInUp');
      }, index * this.timings.iconStagger);
    });
    
    await new Promise(resolve => setTimeout(resolve, icons.length * this.timings.iconStagger + 300));
  }

  async launchWelcomeApp() {
    await new Promise(resolve => setTimeout(resolve, this.timings.stageDelay));
    
    const profile = ProfileManager.getCurrentProfile();
    const autoOpenApp = profile.autoOpenApp || config.profiles?.default?.autoOpenApp;
    
    if (autoOpenApp && window.openApp) {
      openApp(autoOpenApp);
    }
  }

  async initialize() {
    // Always clear any stored admin session for security
    localStorage.removeItem('arc.adminSession');
    
    if (this.shouldBoot()) {
      await this.runBootSequence();
    } else {
      this.bootScreen.style.display = 'none';
      await this.showLoginScreen();
    }
  }
}

// Export for use in main script
window.BootManager = BootManager;
