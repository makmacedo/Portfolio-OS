// Wallpaper Management System
// Handles wallpaper loading, processing, and application

class WallpaperManager {
  static wallpaperCategories = {};
  static generatedWallpapers = new Map();

  static init(config) {
    this.wallpaperCategories = config.ui?.wallpaperCategories || {};
    this.generateWallpaperData();
    debugLog('Wallpaper manager initialized', 'wallpaper');
  }

  static generateWallpaperData() {
    Object.entries(this.wallpaperCategories).forEach(([categoryId, category]) => {
      const wallpapers = [];

      if (categoryId === 'dynamicColors') {
        category.colorBases.forEach(colorBase => {
          const wallpaper = this.generateColorWallpaper(colorBase);
          if (wallpaper) wallpapers.push(wallpaper);
        });
      } else if (categoryId === 'staticImages') {
        category.images.forEach(imageName => {
          const wallpaper = this.generateImageWallpaper(imageName, category.path);
          if (wallpaper) wallpapers.push(wallpaper);
        });
      }

      this.generatedWallpapers.set(categoryId, wallpapers);
    });
  }

  static generateColorWallpaper(colorBase) {
    const colorMap = {
      gray: { name: 'Gray', from: 'slate-900', via: 'slate-800', to: 'slate-900', light: 'slate-100', lightVia: 'slate-200' },
      blue: { name: 'Blue', from: 'blue-900', via: 'blue-800', to: 'blue-900', light: 'blue-100', lightVia: 'blue-200' },
      purple: { name: 'Purple', from: 'purple-900', via: 'purple-800', to: 'purple-900', light: 'purple-100', lightVia: 'purple-200' },
      green: { name: 'Green', from: 'green-900', via: 'green-800', to: 'green-900', light: 'green-100', lightVia: 'green-200' },
      red: { name: 'Red', from: 'red-900', via: 'red-800', to: 'red-900', light: 'red-100', lightVia: 'red-200' },
      amber: { name: 'Amber', from: 'amber-900', via: 'amber-800', to: 'amber-900', light: 'amber-100', lightVia: 'amber-200' },
      indigo: { name: 'Indigo', from: 'indigo-900', via: 'indigo-800', to: 'indigo-900', light: 'indigo-100', lightVia: 'indigo-200' },
      solid: { name: 'Solid', from: 'slate-900', via: null, to: null, light: 'slate-50', lightVia: null }
    };

    const color = colorMap[colorBase];
    if (!color) return null;

    if (colorBase === 'solid') {
      return {
        id: colorBase,
        name: color.name,
        darkClass: `bg-${color.from}`,
        lightClass: `bg-${color.light}`,
        previewStyle: `background: #0f172a;`
      };
    }

    return {
      id: colorBase,
      name: color.name,
      darkClass: `bg-gradient-to-br from-${color.from} via-${color.via} to-${color.to}`,
      lightClass: `bg-gradient-to-br from-${color.light} via-${color.lightVia} to-${color.light}`,
      previewStyle: `background: linear-gradient(to bottom right, var(--${color.from}), var(--${color.via}), var(--${color.to}));`
    };
  }

  static generateImageWallpaper(imageName, basePath) {
    const id = imageName.replace(/\.[^/.]+$/, ""); // Remove extension
    const name = id.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');

    return {
      id,
      name,
      path: `${basePath}${imageName}`,
      preview: `${basePath}${imageName}`
    };
  }

  static getWallpapersByCategory(categoryId) {
    return this.generatedWallpapers.get(categoryId) || [];
  }

  static getAllWallpapers() {
    const allWallpapers = {};
    this.generatedWallpapers.forEach((wallpapers, categoryId) => {
      allWallpapers[categoryId] = wallpapers;
    });
    return allWallpapers;
  }

  static parseWallpaperReference(wallpaperRef) {
    if (!wallpaperRef) return null;

    const [category, id] = wallpaperRef.split('.');
    const wallpapers = this.getWallpapersByCategory(category);

    if (!wallpapers) {
      debugLog(`Wallpaper category '${category}' not found`, 'wallpaper');
      return null;
    }

    const wallpaper = wallpapers.find(w => w.id === id);
    if (!wallpaper) {
      debugLog(`Wallpaper '${id}' not found in category '${category}'`, 'wallpaper');
      return null;
    }

    let wallpaperSettings = {};

    if (category === 'staticImages') {
      wallpaperSettings = {
        wallpaperType: 'image',
        wallpaperImage: wallpaper.path
      };
    } else if (category === 'dynamicColors') {
      const isLightTheme = !document.documentElement.classList.contains('dark');
      const wallpaperClass = isLightTheme ? wallpaper.lightClass : wallpaper.darkClass;
      wallpaperSettings = {
        wallpaperType: 'gradient',
        wallpaper: wallpaperClass
      };
    }

    return wallpaperSettings;
  }

  static applySettings(settings) {
    const body = document.body;
    const isLightTheme = !document.documentElement.classList.contains('dark');

    debugLog('Applying wallpaper settings:', 'wallpaper');

    // Clear existing background styles
    body.style.backgroundImage = '';
    body.style.backgroundSize = '';
    body.style.backgroundPosition = '';
    body.style.backgroundAttachment = '';

    if (settings.wallpaperType === 'image' && settings.wallpaperImage) {
      const textColor = isLightTheme ? 'text-slate-900' : 'text-slate-100';
      const textSelectClass = config.debug?.enabled ? 'select-text' : 'select-none';
      body.className = `h-full ${textColor} ${textSelectClass}`;
      body.style.backgroundImage = `url(${settings.wallpaperImage})`;
      body.style.backgroundSize = 'cover';
      body.style.backgroundPosition = 'center';
      body.style.backgroundAttachment = 'fixed';
      debugLog(`Applied static image wallpaper: ${settings.wallpaperImage}`, 'wallpaper');
    } else if (settings.wallpaper) {
      const textColor = isLightTheme ? 'text-slate-900' : 'text-slate-100';
      const textSelectClass = config.debug?.enabled ? 'select-text' : 'select-none';
      body.className = `h-full ${textColor} ${textSelectClass} ${settings.wallpaper}`;
      debugLog(`Applied gradient wallpaper: ${settings.wallpaper}`, 'wallpaper');
    } else {
      this.applyDefaultWallpaper();
    }
  }

  static applyDefaultWallpaper() {
    const defaultRef = config.profiles?.default?.wallpaper || config.ui?.defaultWallpaper;
    if (defaultRef) {
      const defaultSettings = this.parseWallpaperReference(defaultRef);
      if (defaultSettings) {
        this.applySettings(defaultSettings);
        return;
      }
    }

    // Final fallback
    const isLightTheme = !document.documentElement.classList.contains('dark');
    const textColor = isLightTheme ? 'text-slate-900' : 'text-slate-100';
    const textSelectClass = config.debug?.enabled ? 'select-text' : 'select-none';
    const wallpaperClass = 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900';
    
    document.body.className = `h-full ${textColor} ${textSelectClass} ${wallpaperClass}`;
    debugLog(`Applied fallback wallpaper: ${wallpaperClass}`, 'wallpaper');
  }

  static loadSettings() {
    const settings = JSON.parse(localStorage.getItem('arc.settings') || '{}');
    
    if (!settings.wallpaper && !settings.wallpaperImage) {
      debugLog('No user wallpaper settings found, applying default', 'wallpaper');
      this.applyDefaultWallpaper();
    } else {
      debugLog('User wallpaper settings found, applying user settings', 'wallpaper');
      this.applySettings(settings);
    }
  }
}

// Export for global use
window.WallpaperManager = WallpaperManager;
window.applyWallpaperSettings = (settings) => WallpaperManager.applySettings(settings);
