// Profile Management System
// Handles user profiles, admin settings, and profile switching

class ProfileManager {
  static currentProfile = null;
  static profiles = {};

  static init(config) {
    this.profiles = config.profiles || {};
    this.currentProfile = this.profiles.default;
    debugLog('Profile manager initialized', 'profile');
  }

  static getCurrentProfile() {
    return this.currentProfile || this.profiles.default;
  }

  static getAdminProfile() {
    return this.profiles.admin;
  }

  static switchToProfile(profileName) {
    if (this.profiles[profileName]) {
      this.currentProfile = this.profiles[profileName];
      this.applyProfileSettings(this.currentProfile);
      debugLog(`Switched to profile: ${profileName}`, 'profile');
      return true;
    }
    return false;
  }

  static applyProfileSettings(profile) {
    debugLog('Applying profile settings', 'profile');
    
    // Ensure config.debug exists
    if (!config.debug) {
      config.debug = { enabled: false };
    }
    
    // Apply debug setting - always apply profile debug setting
    if (profile.debug !== undefined) {
      config.debug.enabled = profile.debug;
      debugLog(`Debug mode set to: ${profile.debug} (from profile)`, 'profile');
      // Re-initialize debug system with new setting
      if (typeof initDebugSystem === 'function') {
        initDebugSystem();
      }
      if (typeof applyDebugUIChanges === 'function') {
        applyDebugUIChanges();
      }
    }
    
    // Apply theme - respect user's current choice over profile default
    const currentStoredTheme = localStorage.getItem('arc.theme');
    const themeToApply = currentStoredTheme || profile.theme || 'system';
    
    if (themeToApply) {
      debugLog(`Applying theme: ${themeToApply} (stored: ${currentStoredTheme}, profile default: ${profile.theme})`, 'profile');
      applyTheme(themeToApply);
      localStorage.setItem('arc.theme', themeToApply);
    }
    
    // Apply language
    const currentLanguage = localStorage.getItem('arc.language') || config.profiles?.default?.language || 'en';
    if (profile.language && profile.language !== currentLanguage) {
      debugLog(`Applying profile language: ${profile.language}`, 'profile');
      changeLanguage(profile.language);
    } else if (profile.language) {
      localStorage.setItem('arc.language', profile.language);
    }
    
    // Apply wallpaper
    if (profile.wallpaper) {
      debugLog(`Applying profile wallpaper: ${profile.wallpaper}`, 'profile');
      const wallpaperSettings = WallpaperManager.parseWallpaperReference(profile.wallpaper);
      if (wallpaperSettings) {
        localStorage.setItem('arc.settings', JSON.stringify(wallpaperSettings));
        WallpaperManager.applySettings(wallpaperSettings);
      }
    }
    
    // Update start menu profile info
    if (typeof updateStartMenuProfile === 'function') {
      updateStartMenuProfile();
    }
    
    // Auto-open app if specified
    if (profile.autoOpenApp && typeof openApp === 'function') {
      debugLog(`Auto-opening app: ${profile.autoOpenApp}`, 'profile');
      setTimeout(() => openApp(profile.autoOpenApp), 1000);
    }
    
    debugLog('Profile settings applied successfully', 'profile');
  }

  static authenticateAdmin(passwordType, password, inputValue) {
    debugLog(`Admin authentication attempt - Type: ${passwordType}`, 'profile');
    
    switch (passwordType) {
      case 'string':
        return password && inputValue === password;
        
      case 'pin':
        return inputValue.length === 4 && password && inputValue === password;
        
      case 'prime':
      default:
        if (inputValue.length !== 4) return false;
        const pinNum = parseInt(inputValue);
        return this.isPrime(pinNum);
    }
  }

  static isPrime(num) {
    if (num < 2) return false;
    if (num === 2) return true;
    if (num % 2 === 0) return false;
    for (let i = 3; i <= Math.sqrt(num); i += 2) {
      if (num % i === 0) return false;
    }
    return true;
  }

  static getValidationMessage(passwordType) {
    switch (passwordType) {
      case 'string':
        return 'Enter the administrator password';
      case 'pin':
        return 'Enter the 4-digit administrator PIN';
      case 'prime':
      default:
        return 'Hint: Any 4-digit prime number will work';
    }
  }

  static getInputConfig(passwordType) {
    switch (passwordType) {
      case 'string':
        return {
          type: 'password',
          maxLength: 50,
          placeholder: '••••••••',
          allowNumbers: false
        };
      case 'pin':
        return {
          type: 'password', 
          maxLength: 4,
          placeholder: '••••',
          allowNumbers: true
        };
      case 'prime':
      default:
        return {
          type: 'password',
          maxLength: 4, 
          placeholder: '••••',
          allowNumbers: true
        };
    }
  }
}

// Export for global use
window.ProfileManager = ProfileManager;
