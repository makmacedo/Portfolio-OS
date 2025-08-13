// Portfolio OS Kernel - Core System Functions
// This file contains the fundamental system utilities and functions

// Utility functions
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const uid = () => Math.random().toString(36).slice(2,9);

// Configuration system
let config = {};

// Load configuration
async function loadConfig() {
  try {
    const response = await fetch('config.json');
    if (response.ok) {
      config = await response.json();
      window.config = config; // Make config globally available
      debugLog('Config loaded successfully', 'app');
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    console.warn('Error loading config:', error);
    config = {
      debug: { enabled: false },
      app: { defaultLanguage: 'en', autoOpenApp: 'about' },
      ui: { showClock: true, defaultTheme: 'system' },
      development: { templateCaching: true, consoleOutput: false }
    };
    window.config = config; // Make fallback config globally available
  }
}

// Debug logging system
let debugDiv = null;

function initDebugSystem() {
  // Remove existing debug div if present
  const existingDebug = document.getElementById('debug-output');
  if (existingDebug) {
    existingDebug.remove();
    debugDiv = null;
  }
  
  // Check if debug should be enabled
  let debugEnabled = config.debug?.enabled || false;
  
  if (debugEnabled) {
    debugDiv = document.createElement('div');
    debugDiv.id = 'debug-output';
    debugDiv.style.cssText = 'position: fixed; bottom: 60px; right: 10px; background: rgba(0,0,0,0.9); color: lime; padding: 10px; border: 1px solid lime; font-family: monospace; font-size: 11px; max-width: 350px; max-height: 300px; overflow-y: auto; z-index: 9999; border-radius: 4px;';
    
    // Add close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '×';
    closeBtn.style.cssText = 'position: absolute; top: 2px; right: 5px; background: none; border: none; color: lime; cursor: pointer; font-size: 16px;';
    closeBtn.onclick = () => debugDiv.remove();
    debugDiv.appendChild(closeBtn);
    
    const content = document.createElement('div');
    content.style.marginTop = '20px';
    debugDiv.appendChild(content);
    
    document.body.appendChild(debugDiv);
  }
}


function debugLog(message, category = 'general') {
  // Always log to console if development.consoleOutput is enabled
  if (config.development?.consoleOutput) {
    console.log(`[${category.toUpperCase()}] ${message}`);
  }
  
  // Only show visual debug if debug mode is enabled and specific category is enabled
  if (!config.debug?.enabled) return;
  
  const categoryEnabled = {
    'general': true,
    'system': true, // Add system category for boot sound
    'template': config.debug?.showTemplateLoading,
    'app': config.debug?.showAppInitialization,
    'translation': config.debug?.showTranslations
  };
  
  if (!categoryEnabled[category]) return;
  
  if (debugDiv) {
    const content = debugDiv.querySelector('div');
    const timestamp = new Date().toLocaleTimeString();
    content.innerHTML += `<span style="color: #666;">[${timestamp}]</span> ${message}<br>`;
    content.scrollTop = content.scrollHeight;
  }
}

// Translation system
let currentLang = 'en'; // Will be set after config loads
let translations = {};

// Available languages
const availableLanguages = {
  'en': 'English',
  'pt': 'Português',
  'es': 'Español'
};

// Initialize language after config is loaded
function initializeLanguage() {
  currentLang = localStorage.getItem('arc.language') || config.profiles?.default?.language || 'en';
}

async function loadTranslations(lang) {
  lang = lang || currentLang;
  
  try {
    const response = await fetch(`lang/${lang}.json`);
    if (response.ok) {
      translations = await response.json();
      currentLang = lang;
      localStorage.setItem('arc.language', lang);
      debugLog(`Translations loaded for ${lang}`, 'translation');
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  } catch (error) {
    debugLog(`Failed to load translations for ${lang} - falling back to English`, 'translation');
    // Fallback to English
    try {
      if (lang !== 'en') {
        const fallbackResponse = await fetch('lang/en.json');
        if (fallbackResponse.ok) {
          translations = await fallbackResponse.json();
          currentLang = 'en';
          localStorage.setItem('arc.language', 'en');
        }
      }
    } catch (fallbackError) {
      console.error('Failed to load fallback translations:', fallbackError);
      translations = {};
    }
  }
}

// Translation function
function t(key) {
  if (!translations) {
    return key;
  }
  
  const keys = key.split('.');
  let value = translations;
  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      value = undefined;
      break;
    }
  }
  
  const result = value || key;
  if (result === key && config.debug?.showTranslations) {
    debugLog(`Missing translation: ${key}`, 'translation');
  }
  return result;
}

// Change language function
async function changeLanguage(newLang) {
  if (availableLanguages[newLang]) {
    await loadTranslations(newLang);
    
    // Clear and recreate desktop icons with new translations
    if (typeof initializeDesktopIcons === 'function') {
      initializeDesktopIcons();
    }
    
    // Update UI elements
    updateUI();
    
    // Update ALL open windows with new translations
    if (typeof updateAllOpenWindows === 'function') {
      updateAllOpenWindows();
    }
    
    console.log('Language changed to:', newLang);
  }
}

// Update UI with current translations
function updateUI() {
  // Update all elements with data-i18n attributes
  translateAllElements(document);
  
  // Recreate desktop icons with new translations
  if (typeof initializeDesktopIcons === 'function') {
    initializeDesktopIcons();
  }
  
  // Update start menu
  if (typeof updateStartMenu === 'function') {
    updateStartMenu();
  }
  
  // Update app templates
  if (typeof updateAppTemplates === 'function') {
    updateAppTemplates();
  }
}

// Translate all elements with data-i18n attributes in a container
function translateAllElements(container) {
  // Handle regular text content (data-i18n)
  const textElements = container.querySelectorAll('[data-i18n]');
  textElements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = t(key);
    }
  });
  
  // Handle title attributes (data-i18n-title)  
  const titleElements = container.querySelectorAll('[data-i18n-title]');
  titleElements.forEach(element => {
    const key = element.getAttribute('data-i18n-title');
    if (key) {
      element.title = t(key);
    }
  });
  
  // Handle placeholder attributes (data-i18n-placeholder)
  const placeholderElements = container.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key) {
      element.placeholder = t(key);
    }
  });
}

// Theme system
function applyTheme(theme) {
  const html = document.documentElement;
  
  if (theme === 'system') {
    // Follow system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
  } else if (theme === 'dark') {
    html.classList.add('dark');
  } else if (theme === 'light') {
    html.classList.remove('dark');
  }
  
  // Reapply wallpaper to adjust text colors
  const settings = JSON.parse(localStorage.getItem('arc.settings') || '{}');
  if (settings.wallpaper || settings.wallpaperImage) {
    if (typeof saveAndApplySettings === 'function') {
      saveAndApplySettings(settings);
    }
  }
  
  localStorage.setItem('arc.theme', theme);
}

// Clock system
function updateClock() {
  const clock = $('#clock');
  if (!clock) return;
  
  const settings = JSON.parse(localStorage.getItem('arc.settings') || '{}');
  const showDate = settings.showDate !== false; // default true
  const dateFormat = settings.dateFormat || 'dd/mm/yyyy';
  const timeFormat = settings.timeFormat || '24h';
  
  const now = new Date();
  let timeText = '';
  let dateText = '';
  
  // Time format
  if (timeFormat === '12h') {
    timeText = now.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } else {
    timeText = now.toLocaleTimeString('pt-PT', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  }
  
  // Date format
  if (showDate) {
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    
    switch (dateFormat) {
      case 'mm/dd/yyyy':
        dateText = `${month}/${day}/${year}`;
        break;
      case 'yyyy-mm-dd':
        dateText = `${year}-${month}-${day}`;
        break;
      default: // dd/mm/yyyy
        dateText = `${day}/${month}/${year}`;
    }
  }
  
  clock.innerHTML = showDate ? `<div class="text-xs">${dateText}</div><div>${timeText}</div>` : timeText;
}

// Template cache to avoid repeated HTTP requests
const templateCache = new Map();

// Load template from external file
async function loadTemplate(templateFile, templateId) {
  debugLog(`Loading template: ${templateFile}`, 'template');
  
  // Check cache first
  if (config.development?.templateCaching && templateCache.has(templateFile)) {
    debugLog(`Template found in cache: ${templateFile}`, 'template');
    return templateCache.get(templateFile);
  }
  
  try {
    debugLog(`Fetching template: ${templateFile}`, 'template');
    const response = await fetch(templateFile);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    debugLog(`Raw HTML received (${html.length} chars)`, 'template');
    
    // Parse the HTML to extract the template content
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const sourceTemplate = doc.querySelector('template');
    debugLog(`Source template found: ${!!sourceTemplate}`, 'template');
    
    if (!sourceTemplate) {
      console.error(`No template element found in ${templateFile}`);
      debugLog(`Document body: ${doc.body.innerHTML}`, 'template');
      throw new Error(`No template element found in ${templateFile}`);
    }
    
    debugLog(`Source template innerHTML (${sourceTemplate.innerHTML.length} chars)`, 'template');
    
    // Create template element and add to document
    const templateElement = document.createElement('template');
    templateElement.id = templateId;
    templateElement.innerHTML = sourceTemplate.innerHTML;
    
    // Add to document head for consistency with existing system
    document.head.appendChild(templateElement);
    debugLog(`Template added to document head with ID: ${templateId}`, 'template');
    
    // Execute any script tags in the template
    const scriptTags = doc.querySelectorAll('script');
    scriptTags.forEach(scriptTag => {
      const scriptContent = scriptTag.textContent;
      if (scriptContent.trim()) {
        debugLog(`Executing script from template: ${templateFile}`, 'template');
        try {
          // Create a new script element and execute it
          const newScript = document.createElement('script');
          newScript.textContent = scriptContent;
          document.head.appendChild(newScript);
          document.head.removeChild(newScript); // Clean up
        } catch (error) {
          console.error(`Error executing script from template ${templateFile}:`, error);
          debugLog(`Script execution error: ${error.message}`, 'template');
        }
      }
    });
    
    // Verify template was added
    const addedTemplate = document.getElementById(templateId);
    debugLog(`Template verification - found in DOM: ${!!addedTemplate}`, 'template');
    
    // Cache the template selector
    const selector = `#${templateId}`;
    if (config.development?.templateCaching) {
      templateCache.set(templateFile, selector);
    }
    
    debugLog(`Template loaded successfully: ${templateFile} → ${selector}`, 'template');
    return selector;
  } catch (error) {
    console.error(`Failed to load template ${templateFile}:`, error);
    debugLog(`Failed to load template: ${error.message}`, 'template');
    return null;
  }
}

// Helper function to resolve wallpaper reference from config
function resolveDefaultWallpaper() {
  const defaultWallpaperRef = config?.ui?.defaultWallpaper;
  debugLog(`Default wallpaper reference: ${defaultWallpaperRef}`, 'app');
  
  if (!defaultWallpaperRef) return null;
  
  const [category, id] = defaultWallpaperRef.split('.');
  const wallpapers = config?.ui?.wallpapers;
  if (!wallpapers || !wallpapers[category]) {
    debugLog(`Wallpaper category '${category}' not found`, 'app');
    return null;
  }
  
  const wallpaper = wallpapers[category].find(w => w.id === id);
  if (wallpaper) {
    debugLog(`Resolved default wallpaper: ${wallpaper.name || wallpaper.id}`, 'app');
  } else {
    debugLog(`Wallpaper with id '${id}' not found in category '${category}'`, 'app');
  }
  
  return wallpaper;
}

// Export functions to global scope for compatibility
window.$ = $;
window.$$ = $$;
window.uid = uid;
window.loadConfig = loadConfig;
window.debugLog = debugLog;
window.initDebugSystem = initDebugSystem;
window.loadTranslations = loadTranslations;
window.changeLanguage = changeLanguage;
window.t = t;
window.updateUI = updateUI;
window.translateAllElements = translateAllElements;
window.applyTheme = applyTheme;
window.updateClock = updateClock;
window.loadTemplate = loadTemplate;
window.resolveDefaultWallpaper = resolveDefaultWallpaper;
window.availableLanguages = availableLanguages;
window.currentLang = () => currentLang;
