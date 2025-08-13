// Application Management System
// Handles app configuration, loading, and template processing

class AppManager {
  static apps = [];
  static appTemplates = {};
  static appCategories = {};

  static init(config) {
    this.appTemplates = config.appTemplates || {};
    this.appCategories = config.appCategories || {};
    this.loadApps(config.apps || []);
    debugLog(`Loaded ${this.apps.length} applications`, 'app');
  }

  static loadApps(appConfigs) {
    this.apps = appConfigs.map(app => this.processAppConfig(app));
  }

  static processAppConfig(app) {
    // Handle template inheritance
    if (app.extends && this.appTemplates[app.extends]) {
      const template = this.appTemplates[app.extends];
      const processedApp = { ...template, ...app };
      
      // Process template placeholders
      Object.keys(processedApp).forEach(key => {
        if (typeof processedApp[key] === 'string') {
          processedApp[key] = processedApp[key].replace(/\{id\}/g, app.id);
        }
      });
      
      return processedApp;
    }

    // Convert title to function for i18n support
    return {
      ...app,
      title: () => t(app.title)
    };
  }

  static getAppConfig(appId) {
    return this.apps.find(app => app.id === appId);
  }

  static getAppsByCategory(categoryId) {
    return this.apps.filter(app => app.category === categoryId);
  }

  static getDesktopApps() {
    return this.apps.filter(app => app.showOnDesktop !== false && !app.systemApp);
  }

  static getSystemApps() {
    return this.apps.filter(app => app.systemApp === true);
  }

  static getCategory(categoryId) {
    return this.appCategories[categoryId];
  }

  static getAllCategories() {
    return this.appCategories;
  }

  static updateAppTranslations() {
    this.apps.forEach(app => {
      if (typeof app.title === 'string') {
        app.title = () => t(app.title);
      }
    });
  }
}

// Export for global use
window.AppManager = AppManager;
