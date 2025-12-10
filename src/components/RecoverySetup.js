/**
 * Recovery Setup component - Display and save recovery codes
 * Shown after initial onboarding
 */

export class RecoverySetup {
  constructor(container, params) {
    this.container = container;
    this.publicId = params.publicId;
    this.recoveryCodes = [];
    this.render();
    this.initialize();
  }

  async initialize() {
    // Retrieve codes from session storage (passed from creation step)
    const storedCodes = sessionStorage.getItem('TEMP_RECOVERY_CODES');

    if (storedCodes) {
      try {
        this.recoveryCodes = JSON.parse(storedCodes);
        this.displayCodes();
      } catch (e) {
        console.error('Failed to parse recovery codes', e);
        this.handleMissingCodes();
      }
    } else {
      this.handleMissingCodes();
    }
  }

  async handleMissingCodes() {
    // If codes are missing, we can't show them, so the user can't save them.
    // We must force a restart of the identity creation to ensure security.
    alert('Recovery codes not found. For your security, we must restart the setup process.');

    // Clear broken identity
    const { clearAllData } = await import('../utils/storage.js');
    await clearAllData();

    window.location.hash = '#onboarding';
    window.location.reload();
  }

  render() {
    this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center p-4">
        <div class="max-w-2xl w-full animate-fade-in">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="inline-flex p-4 bg-primary-500/10 rounded-full mb-4">
              <svg class="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-white mb-2">Save Your Recovery Codes</h1>
            <p class="text-gray-400">These codes are the only way to recover your account if you lose access</p>
          </div>
          
          <!-- Warning Card -->
          <div class="glass-strong rounded-2xl p-6 mb-6 border-l-4 border-yellow-500">
            <div class="flex items-start gap-3">
              <svg class="w-6 h-6 text-yellow-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>
              <div>
                <h3 class="text-yellow-500 font-semibold mb-1">Important</h3>
                <ul class="text-sm text-gray-300 space-y-1">
                  <li>• Store these codes in a safe place</li>
                  <li>• You'll need them to recover your account</li>
                  <li>• We cannot recover your account without these codes</li>
                </ul>
              </div>
            </div>
          </div>
          
          <!-- Recovery Codes Grid -->
          <div class="glass rounded-2xl p-6 mb-6">
            <h3 class="text-lg font-semibold text-white mb-4">Your Recovery Codes</h3>
            <div id="codes-grid" class="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
              <!-- Codes will be inserted here -->
            </div>
            
            <!-- Actions -->
            <div class="flex flex-wrap gap-3">
              <button class="flex-1 min-w-[200px] px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 copy-codes-btn">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                </svg>
                Copy All
              </button>
              
              <button class="flex-1 min-w-[200px] px-4 py-3 bg-dark-700 hover:bg-dark-600 text-white rounded-xl transition-all duration-200 flex items-center justify-center gap-2 download-codes-btn">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Download
              </button>
            </div>
          </div>
          
          <!-- Confirmation -->
          <div class="glass rounded-2xl p-6 mb-6">
            <label class="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" id="confirm-saved" class="mt-1 w-5 h-5 rounded border-gray-600 bg-dark-700 text-primary-500 focus:ring-primary-500 focus:ring-offset-0">
              <span class="text-gray-300">I have saved my recovery codes in a safe place and understand that I cannot recover my account without them</span>
            </label>
          </div>
          
          <!-- Continue Button -->
          <button class="w-full px-6 py-4 bg-gradient-primary hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed continue-btn" disabled>
            Continue to App
            <svg class="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    this.setupEventListeners();
  }

  displayCodes() {
    const grid = this.container.querySelector('#codes-grid');
    grid.innerHTML = this.recoveryCodes.map((code, index) => `
      <div class="bg-dark-800/50 backdrop-blur-sm border border-gray-700 rounded-lg p-3 hover:border-primary-500/50 transition-colors">
        <div class="text-xs text-gray-500 mb-1">${index + 1}</div>
        <code class="text-sm font-mono text-primary-400">${code}</code>
      </div>
    `).join('');
  }

  setupEventListeners() {
    // Confirmation checkbox
    const checkbox = this.container.querySelector('#confirm-saved');
    const continueBtn = this.container.querySelector('.continue-btn');

    checkbox.addEventListener('change', () => {
      continueBtn.disabled = !checkbox.checked;
    });

    // Continue button
    continueBtn.addEventListener('click', () => {
      // Clear temp codes for security
      sessionStorage.removeItem('TEMP_RECOVERY_CODES');
      window.location.hash = '#contacts';
    });

    // Copy codes
    const copyBtn = this.container.querySelector('.copy-codes-btn');
    copyBtn.addEventListener('click', () => this.copyCodes());

    // Download codes
    const downloadBtn = this.container.querySelector('.download-codes-btn');
    downloadBtn.addEventListener('click', () => this.downloadCodes());
  }

  async copyCodes() {
    const text = this.recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n');

    try {
      await navigator.clipboard.writeText(text);

      const btn = this.container.querySelector('.copy-codes-btn');
      const originalHTML = btn.innerHTML;

      btn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        Copied!
      `;
      btn.classList.add('bg-green-600');

      setTimeout(() => {
        btn.innerHTML = originalHTML;
        btn.classList.remove('bg-green-600');
      }, 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  downloadCodes() {
    const text = `Chamber Recovery Codes\n\nPublic ID: ${this.publicId}\n\nRecovery Codes:\n${this.recoveryCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}\n\nIMPORTANT: Keep these codes safe. You'll need them to recover your account.`;

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `chamber-recovery-codes-${Date.now()}.txt`;
    a.click();

    URL.revokeObjectURL(url);
  }

  cleanup() {
    // Cleanup if needed
  }
}
