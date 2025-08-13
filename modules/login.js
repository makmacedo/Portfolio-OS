// Login System
// Handles user authentication and login screen management

class LoginManager {
  static bootManager = null;
  static elements = {};

  static init(bootManager) {
    this.bootManager = bootManager;
    this.initElements();
    this.setupEventListeners();
    debugLog('Login manager initialized', 'login');
  }

  static initElements() {
    this.elements = {
      userBtn: document.getElementById('login-user'),
      adminBtn: document.getElementById('login-admin'),
      pinSection: document.getElementById('pin-section'),
      pinInput: document.getElementById('pin-input'),
      pinLogin: document.getElementById('pin-login'),
      pinCancel: document.getElementById('pin-cancel'),
      pinError: document.getElementById('pin-error'),
      pinHint: document.getElementById('pin-hint')
    };

    const { userBtn, adminBtn } = this.elements;
    if (!userBtn || !adminBtn) {
      debugLog('Login buttons not found in DOM', 'login');
      return false;
    }

    debugLog('Login elements found, configuring UI', 'login');
    this.configureAdminInput();
    return true;
  }

  static configureAdminInput() {
    const adminProfile = ProfileManager.getAdminProfile();
    if (!adminProfile) return;

    const { pinHint, pinInput } = this.elements;
    const passwordType = adminProfile.passwordType || 'prime';
    
    // Update hint text
    if (pinHint) {
      pinHint.textContent = ProfileManager.getValidationMessage(passwordType);
    }

    // Configure input field
    if (pinInput) {
      const inputConfig = ProfileManager.getInputConfig(passwordType);
      pinInput.type = inputConfig.type;
      pinInput.maxLength = inputConfig.maxLength;
      pinInput.placeholder = inputConfig.placeholder;
    }
  }

  static setupEventListeners() {
    const { userBtn, adminBtn, pinInput, pinLogin, pinCancel } = this.elements;

    if (!userBtn || !adminBtn) return;

    // Regular user login
        userBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      debugLog('Regular user login selected', 'login');
      this.completeLogin('default');
    };

    // Admin login
    adminBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      debugLog('Administrator login selected', 'login');
      debugLog(`PIN section element: ${!!this.elements.pinSection}`, 'login');
      this.showPinInput();
    };

    // PIN input handling
    if (pinInput) {
      const adminProfile = ProfileManager.getAdminProfile();
      const inputConfig = ProfileManager.getInputConfig(adminProfile?.passwordType);

      pinInput.addEventListener('input', (e) => {
        if (inputConfig.allowNumbers) {
          e.target.value = e.target.value.replace(/[^0-9]/g, '');
        }
        this.clearError();
      });

      pinInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          this.attemptAdminLogin();
        }
      });
    }

    if (pinLogin) {
      pinLogin.onclick = () => this.attemptAdminLogin();
    }

    if (pinCancel) {
      pinCancel.onclick = () => this.hidePinInput();
    }

    debugLog('Login event listeners configured', 'login');
  }

  static showPinInput() {
    debugLog('showPinInput called', 'login');
    const { pinSection, pinInput } = this.elements;
    debugLog(`PIN section found: ${!!pinSection}, PIN input found: ${!!pinInput}`, 'login');
    if (pinSection) {
      pinSection.classList.remove('hidden');
      if (pinInput) pinInput.focus();
      debugLog('PIN section shown', 'login');
    } else {
      debugLog('ERROR: PIN section element not found', 'login');
    }
  }

  static hidePinInput() {
    const { pinSection, pinInput, pinError } = this.elements;
    if (pinSection) pinSection.classList.add('hidden');
    if (pinInput) pinInput.value = '';
    if (pinError) pinError.classList.add('hidden');
  }

  static attemptAdminLogin() {
    const { pinInput } = this.elements;
    if (!pinInput) return;

    const adminProfile = ProfileManager.getAdminProfile();
    if (!adminProfile) {
      this.showError('Admin profile not configured');
      return;
    }

    const inputValue = pinInput.value;
    const isValid = ProfileManager.authenticateAdmin(
      adminProfile.passwordType,
      adminProfile.password,
      inputValue
    );

    if (isValid) {
      debugLog(`Administrator login successful`, 'login');
      this.completeLogin('admin');
    } else {
      this.showError(this.getAuthenticationError(adminProfile.passwordType));
      pinInput.value = '';
    }
  }

  static getAuthenticationError(passwordType) {
    switch (passwordType) {
      case 'string':
        return 'Invalid password.';
      case 'pin':
        return 'Invalid PIN.';
      case 'prime':
      default:
        return 'Invalid PIN. Try a 4-digit prime number.';
    }
  }

  static showError(message) {
    const { pinError, pinInput } = this.elements;
    
    if (pinError) {
      pinError.textContent = message;
      pinError.classList.remove('hidden');
    }

    if (pinInput) {
      pinInput.classList.add('border-red-500');
      setTimeout(() => {
        pinInput.classList.remove('border-red-500');
      }, 3000);
    }
  }

  static clearError() {
    const { pinError } = this.elements;
    if (pinError) {
      pinError.classList.add('hidden');
    }
  }

  static completeLogin(profileName) {
    debugLog(`Login completed for profile: ${profileName}`, 'login');
    
    // Switch to the selected profile
    ProfileManager.switchToProfile(profileName);

    // Hide login screen with animation
    const loginContainer = document.getElementById('login-screen-container');
    if (loginContainer) {
      loginContainer.classList.add('opacity-0', 'transition-opacity', 'duration-500');
      
      setTimeout(() => {
        loginContainer.remove();
        if (this.bootManager) {
          this.bootManager.proceedToDesktop();
        }
      }, 500);
    } else {
      if (this.bootManager) {
        this.bootManager.proceedToDesktop();
      }
    }
  }
}

// Export for global use
window.LoginManager = LoginManager;
