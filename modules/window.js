// Window Management System
// Handles window creation, management, focus, and taskbar integration

class WindowManager {
  constructor() {
    this.z = 10;
    this.windows = new Map();
    this.taskButtons = new Map();
    this.templates = new Map();
    this.initTemplates();
  }

  initTemplates() {
    this.desktop = $('#desktop');
    this.windowTemplate = $('#window-tpl');
    this.taskTemplate = $('#taskbtn-tpl');
    this.taskbar = $('#taskbar');
  }

  async openApp(appId) {
    debugLog(`Opening app: ${appId}`, 'window');
    
    const appConfig = AppManager.getAppConfig(appId);
    if (!appConfig) {
      debugLog(`App config not found: ${appId}`, 'window');
      return null;
    }

    // Focus if already exists
    const existingWindow = this.findWindowByApp(appId);
    if (existingWindow) {
      this.focusWindow(existingWindow);
      return existingWindow;
    }

    const window = await this.createWindow(appConfig);
    if (window) {
      this.registerWindow(window, appConfig);
      this.focusWindow(window);
    }

    return window;
  }

  findWindowByApp(appId) {
    for (const [, window] of this.windows) {
      if (window.dataset.app === appId) {
        return window;
      }
    }
    return null;
  }

  async createWindow(appConfig) {
    debugLog(`Creating window for: ${appConfig.id}`, 'window');

    let templateSelector = appConfig.template;
    
    if (appConfig.templateFile && appConfig.templateId) {
      templateSelector = await loadTemplate(appConfig.templateFile, appConfig.templateId);
      if (!templateSelector) {
        console.error(`Failed to load template for ${appConfig.id}`);
        return null;
      }
    }

    const window = this.windowTemplate.content.cloneNode(true).firstElementChild;
    window.dataset.app = appConfig.id;
    
    const templateElement = $(templateSelector);
    if (templateElement) {
      const content = templateElement.content.cloneNode(true);
      $('.content', window).appendChild(content);
    } else {
      $('.content', window).innerHTML = `<div class="p-4">Template ${templateSelector} not found</div>`;
    }
    
    const title = typeof appConfig.title === 'function' ? appConfig.title() : t(appConfig.title || appConfig.id);
    $('[data-role="title"]', window).textContent = title;
    
    this.desktop.appendChild(window);
    translateAllElements(window);
    
    this.setupWindowBehavior(window, appConfig);
    this.applyWindowConfig(window, appConfig);

    return window;
  }

  setupWindowBehavior(window, appConfig) {
    this.makeDraggable(window);
    this.makeResizable(window);
    this.bindChromeControls(window);

    // Initialize app-specific functionality
    this.initializeApp(window, appConfig);
  }

  applyWindowConfig(window, appConfig) {
    const windowDefaults = config.ui?.windowDefaults || {};
    const appWindow = appConfig.window || {};

    window.style.left = `${appWindow.left || windowDefaults.left || 100}px`;
    window.style.top = `${appWindow.top || windowDefaults.top || 100}px`;
    window.style.width = `${appWindow.width || windowDefaults.width || 640}px`;
    window.style.height = `${appWindow.height || windowDefaults.height || 420}px`;
  }

  async initializeApp(window, appConfig) {
    if (appConfig.type === 'external' && appConfig.url) {
      if (typeof initExternal === 'function') {
        initExternal(window, appConfig.url, appConfig);
      }
    } else if (appConfig.type === 'native') {
      const initFunctionName = `init${appConfig.id.charAt(0).toUpperCase() + appConfig.id.slice(1)}`;
      
      setTimeout(() => {
        if (typeof window[initFunctionName] === 'function') {
          debugLog(`Calling ${initFunctionName} for native app`, 'window');
          try {
            window[initFunctionName](window);
          } catch (error) {
            console.error(`Error calling ${initFunctionName}:`, error);
            debugLog(`Init function error: ${error.message}`, 'window');
          }
        }
      }, 50);
    }
  }

  registerWindow(window, appConfig) {
    const windowId = uid();
    window.dataset.appId = windowId;
    
    this.windows.set(windowId, window);
    
    const taskButton = this.createTaskButton(appConfig, window);
    this.taskButtons.set(windowId, taskButton);
    
    debugLog(`Window registered: ${appConfig.id}`, 'window');
  }

  createTaskButton(appConfig, window) {
    const taskButton = this.taskTemplate.content.cloneNode(true).firstElementChild;
    const title = typeof appConfig.title === 'function' ? appConfig.title() : t(appConfig.title);
    
    taskButton.textContent = title;
    taskButton.addEventListener('click', () => this.toggleMinimize(window));
    
    taskButton.classList.remove('bg-slate-800/60');
    taskButton.classList.add('bg-slate-700/80');
    
    this.taskbar.appendChild(taskButton);
    return taskButton;
  }

  focusWindow(window) {
    this.z += 1;
    window.style.zIndex = this.z;
    
    $$('.win').forEach(w => w.classList.remove('ring-2', 'ring-brand-500'));
    window.classList.add('ring-2', 'ring-brand-500');
    
    this.updateTaskbarStates(window);
  }

  updateTaskbarStates(activeWindow) {
    $$('.task').forEach(btn => {
      btn.classList.remove('border-brand-500', 'bg-slate-500');
      btn.classList.add('bg-slate-700/80', 'border-transparent');
      btn.classList.remove('bg-slate-800/60');
    });
    
    if (activeWindow && activeWindow.dataset.appId) {
      const activeTask = this.taskButtons.get(activeWindow.dataset.appId);
      if (activeTask) {
        activeTask.classList.remove('bg-slate-700/80', 'border-transparent');
        activeTask.classList.add('border-brand-500', 'bg-slate-500');
      }
    }
  }

  closeWindow(window) {
    const windowId = window.dataset.appId;
    this.windows.delete(windowId);
    
    const taskButton = this.taskButtons.get(windowId);
    if (taskButton) {
      taskButton.remove();
      this.taskButtons.delete(windowId);
    }
    
    window.remove();
    
    const remainingWindows = Array.from(this.windows.values());
    if (remainingWindows.length > 0) {
      const topWindow = remainingWindows.reduce((top, current) => 
        parseInt(current.style.zIndex || 0) > parseInt(top.style.zIndex || 0) ? current : top
      );
      this.updateTaskbarStates(topWindow);
    } else {
      this.updateTaskbarStates(null);
    }
  }

  minimizeWindow(window) {
    window.dataset.min = '1';
    window.style.display = 'none';
    
    const remainingWindows = Array.from(this.windows.values()).filter(w => w.style.display !== 'none');
    if (remainingWindows.length > 0) {
      const topWindow = remainingWindows.reduce((top, current) => 
        parseInt(current.style.zIndex || 0) > parseInt(top.style.zIndex || 0) ? current : top
      );
      this.updateTaskbarStates(topWindow);
    } else {
      this.updateTaskbarStates(null);
    }
  }

  toggleMinimize(window) {
    if (window.style.display === 'none') {
      window.style.display = 'block';
      window.dataset.min = '0';
      this.focusWindow(window);
    } else {
      this.minimizeWindow(window);
    }
  }

  maximizeWindow(window) {
    if (window.dataset.max === '1') {
      window.style.left = window.dataset.prevLeft || '100px';
      window.style.top = window.dataset.prevTop || '100px';
      window.style.width = window.dataset.prevWidth || '600px';
      window.style.height = window.dataset.prevHeight || '400px';
      window.dataset.max = '0';
    } else {
      window.dataset.prevLeft = window.style.left;
      window.dataset.prevTop = window.style.top;
      window.dataset.prevWidth = window.style.width;
      window.dataset.prevHeight = window.style.height;
      window.style.left = '0px';
      window.style.top = '0px';
      window.style.width = '100vw';
      window.style.height = 'calc(100vh - 56px)';
      window.dataset.max = '1';
    }
  }

  bindChromeControls(window) {
    window.addEventListener('mousedown', () => this.focusWindow(window));
    $('[data-act="close"]', window).onclick = () => this.closeWindow(window);
    $('[data-act="min"]', window).onclick = () => this.minimizeWindow(window);
    $('[data-act="max"]', window).onclick = () => this.maximizeWindow(window);
  }

  makeDraggable(window) {
    const titlebar = $('.titlebar', window);
    let startX = 0, startY = 0, currentX = 0, currentY = 0, isDragging = false;

    const onPointerDown = (e) => {
      if (e.target.closest('[data-act]')) return;

      const point = this.getPointerPosition(e);
      startX = point.x;
      startY = point.y;
      const rect = window.getBoundingClientRect();
      currentX = rect.left;
      currentY = rect.top;
      isDragging = true;
      window.style.userSelect = 'none';

      const iframe = $('iframe', window);
      let dragOverlay;
      if (iframe) {
        dragOverlay = document.createElement('div');
        dragOverlay.className = 'absolute inset-0 z-50 bg-transparent pointer-events-auto';
        dragOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;';
        window.appendChild(dragOverlay);
      }

      const onPointerMove = (e) => {
        if (!isDragging) return;
        const point = this.getPointerPosition(e);
        window.style.left = currentX + (point.x - startX) + 'px';
        window.style.top = Math.max(0, currentY + (point.y - startY)) + 'px';
      };

      const onPointerUp = () => {
        isDragging = false;
        window.style.userSelect = '';
        
        if (dragOverlay && dragOverlay.parentElement) {
          dragOverlay.remove();
        }
        
        globalThis.removeEventListener('pointermove', onPointerMove);
        globalThis.removeEventListener('pointerup', onPointerUp);
      };

      globalThis.addEventListener('pointermove', onPointerMove);
      globalThis.addEventListener('pointerup', onPointerUp);
    };

    titlebar.addEventListener('pointerdown', onPointerDown);
    
    Object.assign(window.style, { 
      left: (64 + Math.random() * 120) + 'px', 
      top: (64 + Math.random() * 80) + 'px' 
    });
  }

  makeResizable(window) {
    const handle = $('.resize-handle', window);
    if (!handle) return;

    let startX = 0, startY = 0, startWidth = 0, startHeight = 0, isResizing = false;

    const onPointerDown = (e) => {
      const point = this.getPointerPosition(e);
      startX = point.x;
      startY = point.y;
      const rect = window.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      isResizing = true;

      const iframe = $('iframe', window);
      let resizeOverlay;
      if (iframe) {
        resizeOverlay = document.createElement('div');
        resizeOverlay.className = 'absolute inset-0 z-50 bg-transparent pointer-events-auto';
        resizeOverlay.style.cssText = 'position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 9999;';
        window.appendChild(resizeOverlay);
      }

      const onPointerMove = (e) => {
        if (!isResizing) return;
        const point = this.getPointerPosition(e);
        const minWidth = config.ui?.windowDefaults?.minWidth || 200;
        const minHeight = config.ui?.windowDefaults?.minHeight || 150;
        
        window.style.width = Math.max(minWidth, startWidth + (point.x - startX)) + 'px';
        window.style.height = Math.max(minHeight, startHeight + (point.y - startY)) + 'px';
      };

      const onPointerUp = () => {
        isResizing = false;
        
        if (resizeOverlay && resizeOverlay.parentElement) {
          resizeOverlay.remove();
        }
        
        globalThis.removeEventListener('pointermove', onPointerMove);
        globalThis.removeEventListener('pointerup', onPointerUp);
      };

      globalThis.addEventListener('pointermove', onPointerMove);
      globalThis.addEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', onPointerDown);
  }

  getPointerPosition(e) {
    return e.touches ? 
      { x: e.touches[0].clientX, y: e.touches[0].clientY } : 
      { x: e.clientX, y: e.clientY };
  }
}

// Create global instance
const WM = new WindowManager();

// Export functions for backward compatibility
window.openApp = (appId) => WM.openApp(appId);
window.updateTaskbarStates = (activeWindow) => WM.updateTaskbarStates(activeWindow);

// Export class for advanced usage
window.WindowManager = WindowManager;
