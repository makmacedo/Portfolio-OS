// Main Script
// Coordinating module for Portfolio OS

document.addEventListener('DOMContentLoaded', function() {

// Global DOM element cache
const DOM = {
  desktop: $('#desktop'),
  iconTpl: $('#icon-tpl'),
  startMenu: $('#start-menu'),
  startList: $('#start-list'),
  taskbar: $('#taskbar')
};

// Clock and UI updates
setInterval(updateClock, 1000);
updateClock();

// System theme change listener (theme will be applied after ProfileManager init)
window.matchMedia('(prefers-color-scheme: dark)').addListener(() => {
  const currentTheme = localStorage.getItem('arc.theme');
  if (currentTheme === 'system') {
    applyTheme('system');
  }
});

// Start menu functionality
$('#start-btn').addEventListener('click', () => DOM.startMenu.classList.toggle('hidden'));
DOM.desktop.addEventListener('click', (e) => { 
  if (!DOM.startMenu.contains(e.target) && e.target.id !== 'start-btn') {
    DOM.startMenu.classList.add('hidden'); 
  }
});

// Settings and lock buttons
$('#settings-btn').addEventListener('click', () => {
  openApp('settings');
  DOM.startMenu.classList.add('hidden');
});

$('#lock-desktop').addEventListener('click', async () => {
  const currentProfile = ProfileManager.getCurrentProfile();
  const isAdmin = currentProfile && currentProfile.name === 'Administrator';
  
  if (isAdmin) {
    debugLog('Admin lock - performing logout and clearing session', 'system');
    
    // Clear admin session for security
    localStorage.removeItem('arc.adminSession');
    
    // Force admin to re-authenticate by showing login with PIN required
    await showLoginScreen(true); // forceAdminAuth = true
  } else {
    debugLog('User lock - showing standard login screen', 'system');
    await showStandardLockScreen();
  }
});

// Desktop icon management
function initializeDesktopIcons() {
  const iconGrid = $('#desktop-icons');
  const savedPositions = JSON.parse(localStorage.getItem('arc.iconPositions') || '{}');

  iconGrid.innerHTML = '';
  DOM.startList.innerHTML = '';

  const desktopApps = AppManager.getDesktopApps();
  const uiConfig = config.ui?.desktop || {};
  const iconSize = uiConfig.iconSize || 80;
  const iconSpacing = uiConfig.iconSpacing || 16;
  
  desktopApps.forEach((app, index) => {
    createDesktopIcon(app, index, iconGrid, savedPositions, iconSize, iconSpacing);
    createStartMenuEntry(app);
  });
}

function createDesktopIcon(app, index, iconGrid, savedPositions, iconSize, iconSpacing) {
  const iconEl = DOM.iconTpl.content.cloneNode(true).firstElementChild;
  const iconDiv = iconEl.querySelector('div');
  const iconLabel = iconEl.querySelector('span');
  
  iconDiv.textContent = app.icon;
  // Translate the title using the translation function
  const translatedTitle = typeof app.title === 'function' ? app.title() : t(app.title);
  iconLabel.textContent = translatedTitle;
  iconEl.title = translatedTitle;
  iconEl.dataset.appId = app.id;
  
  iconEl.style.position = 'absolute';
  iconEl.style.width = `${iconSize}px`;
  
  // Position icon
  if (savedPositions[app.id]) {
    iconEl.style.left = savedPositions[app.id].left;
    iconEl.style.top = savedPositions[app.id].top;
  } else {
    const containerWidth = iconGrid.clientWidth || window.innerWidth || 1200;
    const iconsPerRow = Math.max(1, Math.floor((containerWidth - iconSpacing * 2) / (iconSize + iconSpacing)));
    const row = Math.floor(index / iconsPerRow);
    const col = index % iconsPerRow;
    
    iconEl.style.left = (iconSpacing + col * (iconSize + iconSpacing)) + 'px';
    iconEl.style.top = (iconSpacing + row * (iconSize + iconSpacing)) + 'px';
  }
  
  iconEl.ondblclick = () => openApp(app.id);
  makeIconDraggable(iconEl, iconSize);
  iconGrid.appendChild(iconEl);
}

function createStartMenuEntry(app) {
  const li = document.createElement('li');
  li.className = 'px-3 py-2 rounded cursor-pointer hover:bg-slate-800';
  li.innerHTML = `${app.icon} ${typeof app.title === 'function' ? app.title() : t(app.title)}`;
  li.onclick = () => {
    openApp(app.id);
    DOM.startMenu.classList.add('hidden');
  };
  DOM.startList.appendChild(li);
}

function makeIconDraggable(iconBtn, iconSize) {
  let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false;
  let dragTimeout;
  
  const onPointerDown = (e) => {
    const point = getPointerPosition(e);
    startX = point.x;
    startY = point.y;
    const rect = iconBtn.getBoundingClientRect();
    currentX = rect.left;
    currentY = rect.top;
    
    dragTimeout = setTimeout(() => {
      isDragging = true;
      iconBtn.style.zIndex = '1000';
      iconBtn.style.opacity = '0.8';
      globalThis.addEventListener('pointermove', onPointerMove);
      e.preventDefault();
    }, 200);
    
    globalThis.addEventListener('pointerup', onPointerUp);
  };
  
  const onPointerMove = (e) => {
    if (!isDragging) return;
    const point = getPointerPosition(e);
    iconBtn.style.position = 'absolute';
    iconBtn.style.left = currentX + (point.x - startX) + 'px';
    iconBtn.style.top = currentY + (point.y - startY) + 'px';
  };
  
  const onPointerUp = () => {
    clearTimeout(dragTimeout);
    
    if (isDragging) {
      const appId = iconBtn.dataset.appId;
      const positions = JSON.parse(localStorage.getItem('arc.iconPositions') || '{}');
      positions[appId] = {
        left: iconBtn.style.left,
        top: iconBtn.style.top
      };
      localStorage.setItem('arc.iconPositions', JSON.stringify(positions));
      
      iconBtn.style.zIndex = '';
      iconBtn.style.opacity = '';
      isDragging = false;
    }
    
    globalThis.removeEventListener('pointermove', onPointerMove);
    globalThis.removeEventListener('pointerup', onPointerUp);
  };
  
  iconBtn.addEventListener('pointerdown', onPointerDown);
}

function getPointerPosition(e) {
  return e.touches ? 
    { x: e.touches[0].clientX, y: e.touches[0].clientY } : 
    { x: e.clientX, y: e.clientY };
}

// Translation update functions
function updateAllOpenWindows() {
  for (const [, window] of WM.windows || new Map()) {
    const appId = window.dataset.app;
    const updateFn = window[`updateOpen${appId.charAt(0).toUpperCase() + appId.slice(1)}Window`];
    if (typeof updateFn === 'function') {
      updateFn(window);
    }
  }
}

function updateStartMenu() {
  if (DOM.startMenu) {
    translateAllElements(DOM.startMenu);
  }
}

function updateAppTemplates() {
  const templates = ['app-notes', 'app-about', 'app-resume', 'app-ttt'];
  templates.forEach(templateId => {
    const template = $(`#${templateId}`);
    if (template) {
      translateAllElements(template.content);
    }
  });
}

// Debug UI management
function applyDebugUIChanges() {
  if (config.debug?.enabled) {
    debugLog("Debug mode enabled - allowing text selection and right-click", 'system');
    
    document.body.classList.remove('select-none');
    document.body.classList.add('select-text');
    
    document.addEventListener('contextmenu', function(e) {
      e.stopPropagation();
    }, true);
    
    debugLog("Text selection and right-click enabled for debugging", 'system');
  } else {
    document.body.classList.remove('select-text');
    document.body.classList.add('select-none');
    
    document.addEventListener('contextmenu', function(e) {
      e.preventDefault();
      return false;
    });
  }
}

// Export for use in modules
window.applyDebugUIChanges = applyDebugUIChanges;

// Helper function to show standard lock screen (for regular users)
async function showStandardLockScreen() {
  debugLog('Showing standard lock screen with proper LoginManager', 'system');
  
  // Clear any admin session for security
  localStorage.removeItem('arc.adminSession');
  
  // Use BootManager for consistent login experience
  if (window.BootManager) {
    const bootManager = new BootManager(config);
    await bootManager.showLoginScreen();
  } else {
    // Fallback to template loading
    const loginTemplate = await loadTemplate('templates/login-screen.html', 'login-screen');
    if (!loginTemplate) {
      debugLog('Failed to load login screen for lock', 'system');
      return;
    }
    
    const loginContainer = document.createElement('div');
    loginContainer.id = 'lock-login-screen';
    loginContainer.className = 'fixed inset-0 z-[99999]';
    
    const templateEl = document.querySelector(loginTemplate);
    if (templateEl) {
      const content = templateEl.content.cloneNode(true);
      if (!content || !content.firstChild) {
        debugLog('Lock screen template content is empty or invalid', 'system');
        return;
      }
      loginContainer.appendChild(content);
      document.body.appendChild(loginContainer);
      
      const debugPanel = document.getElementById('debug-output');
      if (debugPanel) debugPanel.style.display = 'none';
      
      // Use LoginManager instead of simplified handlers
      setTimeout(() => {
        if (window.LoginManager) {
          LoginManager.init({ proceedToDesktop: () => {
            loginContainer.remove();
            if (debugPanel && config.debug?.enabled) {
              debugPanel.style.display = 'block';
            }
          }});
        } else {
          initLockLoginHandlers(loginContainer, debugPanel);
        }
      }, 100);
    }
  }
}

// Helper function to show login screen with admin logout behavior
async function showLoginScreen(forceAdminAuth = false) {
  debugLog(`Showing login screen - forceAdminAuth: ${forceAdminAuth}`, 'system');
  
  // Switch back to default user profile when admin logs out
  if (forceAdminAuth) {
    ProfileManager.switchToProfile('default');
  }
  
  // Use BootManager to show proper login screen
  if (window.BootManager) {
    const bootManager = new BootManager(config);
    await bootManager.showLoginScreen();
  } else {
    // Fallback to standard lock screen
    await showStandardLockScreen();
  }
}

// Lock screen handlers
function initLockLoginHandlers(loginContainer, debugPanel) {
  // Implementation moved to LoginManager in future refactor
  // For now, keeping simplified version for compatibility
  debugLog('Initializing lock login screen handlers', 'system');
  
  const userBtn = document.getElementById('login-user');
  const adminBtn = document.getElementById('login-admin');

  if (!userBtn || !adminBtn) {
    debugLog('Lock login buttons not found in DOM', 'system');
    return;
  }

  const unlockDesktop = (profileName) => {
    debugLog(`Desktop unlocked - Profile: ${profileName}`, 'system');
    
    // Switch to the selected profile and apply all settings
    ProfileManager.switchToProfile(profileName);

    loginContainer.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    
    setTimeout(() => {
      loginContainer.remove();
      if (debugPanel && config.debug?.enabled) {
        debugPanel.style.display = 'block';
      }
    }, 500);
  };

  userBtn.onclick = () => {
    debugLog('Regular user unlock selected', 'system');
    unlockDesktop('default');
  };

  adminBtn.onclick = () => {
    debugLog('Administrator unlock selected - showing PIN input', 'system');
    
    // Clear any admin session to force authentication
    localStorage.removeItem('arc.adminSession');
    
    // Check if we have LoginManager elements available in current screen
    const pinSection = document.getElementById('pin-section');
    const pinInput = document.getElementById('pin-input');
    
    if (pinSection && pinInput) {
      // Use existing LoginManager on current screen
      debugLog('Using existing PIN section for authentication', 'system');
      pinSection.classList.remove('hidden');
      pinInput.focus();
      
      // Set up PIN authentication if not already set
      if (!pinInput.hasEventListener) {
        pinInput.hasEventListener = true;
        
        pinInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            attemptPinLogin();
          }
        });
        
        const pinLoginBtn = document.getElementById('pin-login');
        const pinCancelBtn = document.getElementById('pin-cancel');
        
        if (pinLoginBtn) {
          pinLoginBtn.onclick = attemptPinLogin;
        }
        
        if (pinCancelBtn) {
          pinCancelBtn.onclick = () => {
            pinSection.classList.add('hidden');
            pinInput.value = '';
          };
        }
      }
    } else {
      // Fallback: recreate login screen with PIN
      debugLog('PIN section not found, recreating login screen', 'system');
      loginContainer.remove();
      
      setTimeout(async () => {
        if (window.BootManager) {
          const bootManager = new BootManager(config);
          await bootManager.showLoginScreen();
        }
      }, 100);
    }
  };

  debugLog('Lock login screen handlers initialized successfully', 'system');
  
  // Helper function for PIN authentication
  function attemptPinLogin() {
    const pinInput = document.getElementById('pin-input');
    const pinError = document.getElementById('pin-error');
    
    if (!pinInput) return;
    
    const adminProfile = ProfileManager.getAdminProfile();
    if (!adminProfile) {
      showPinError('Admin profile not configured');
      return;
    }
    
    const inputValue = pinInput.value;
    const isValid = ProfileManager.authenticateAdmin(
      adminProfile.passwordType,
      adminProfile.password,
      inputValue
    );
    
    if (isValid) {
      debugLog('PIN authentication successful', 'system');
      unlockDesktop('admin');
    } else {
      const errorMessage = adminProfile.passwordType === 'prime' 
        ? 'Invalid PIN. Try a 4-digit prime number.'
        : 'Invalid PIN.';
      showPinError(errorMessage);
      pinInput.value = '';
    }
  }
  
  // Helper function to show PIN errors
  function showPinError(message) {
    const pinError = document.getElementById('pin-error');
    if (pinError) {
      pinError.textContent = message;
      pinError.classList.remove('hidden');
    }
  }
}

// Update start menu with current user profile
function updateStartMenuProfile() {
  const currentProfile = ProfileManager.getCurrentProfile();
  if (!currentProfile) return;
  
  const avatarEl = $('#start-user-avatar');
  const nameEl = $('#start-user-name');
  const subtitleEl = $('#start-user-subtitle');
  
  if (avatarEl) avatarEl.textContent = currentProfile.avatar || 'AM';
  if (nameEl) nameEl.textContent = currentProfile.name || 'User';
  if (subtitleEl) subtitleEl.textContent = currentProfile.subtitle || 'Standard User';
  
  debugLog(`Start menu updated for profile: ${currentProfile.name}`, 'profile');
}

// Window management
const WM = { z: 10, wins: new Map(), tasks: new Map() };

async function openApp(id) {
  debugLog(`Opening app: ${id}`, 'app');
  
  // Use WindowManager if available
  if (typeof WindowManager !== 'undefined' && window.windowManager) {
    return await window.windowManager.openApp(id);
  } else {
    debugLog('WindowManager not initialized', 'app');
    return null;
  }
}

// Export for global use
window.openApp = openApp;
window.updateStartMenuProfile = updateStartMenuProfile;
window.WM = WM;

// Main initialization
async function initializeApp() {
  debugLog("Initializing Portfolio OS...", 'system');
  
  try {
    await loadConfig();
    debugLog("Configuration loaded", 'system');
    
    initDebugSystem();
    applyDebugUIChanges();
    
    initializeLanguage();
    await loadTranslations();
    debugLog("Translations loaded", 'system');
    
    // Initialize all managers
    ProfileManager.init(config);
    AppManager.init(config);
    WallpaperManager.init(config);
    
    // Apply initial theme - prioritize user's saved choice over profile default
    const savedTheme = localStorage.getItem('arc.theme');
    const currentProfile = ProfileManager.getCurrentProfile();
    const initialTheme = savedTheme || currentProfile?.theme || 'system';
    
    debugLog(`Applying initial theme: ${initialTheme} (saved: ${savedTheme}, profile: ${currentProfile?.theme})`, 'system');
    applyTheme(initialTheme);
    localStorage.setItem('arc.theme', initialTheme);
    
    // Initialize window manager
    window.windowManager = new WindowManager();
    debugLog("Window manager initialized", 'system');
    
    initializeDesktopIcons();
    debugLog("Desktop icons initialized", 'system');
    
    // Initialize start menu with default profile
    updateStartMenuProfile();
    
    updateUI();
    debugLog("UI updated", 'system');
    
    // Initialize and run boot sequence
    const bootManager = new BootManager(config);
    window.continueToDesktop = () => bootManager.proceedToDesktop();
    
    await bootManager.initialize();
    
    debugLog("Portfolio OS initialization complete", 'system');
    
  } catch (error) {
    console.error("Initialization error:", error);
    debugLog(`ERROR: ${error.message}`, 'system');
  }
}

// Export necessary functions for global access
window.updateAllOpenWindows = updateAllOpenWindows;
window.updateStartMenu = updateStartMenu;
window.updateAppTemplates = updateAppTemplates;

// Start the application
initializeApp();

}); // End of DOMContentLoaded
