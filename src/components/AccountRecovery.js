/**
 * Account Recovery component - Recover account using public ID or recovery codes
 */

import { verifyRecoveryCodes, recoverIdentityFromCodes } from '../utils/crypto.js';
import { getIdentity, saveIdentity } from '../utils/storage.js';

export class AccountRecovery {
    constructor(container, params) {
        this.container = container;
        this.render();
    }

    render() {
        this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center p-4">
        <div class="max-w-md w-full animate-fade-in">
          <!-- Header -->
          <div class="text-center mb-8">
            <div class="inline-flex p-4 bg-primary-500/10 rounded-full mb-4">
              <svg class="w-12 h-12 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
            </div>
            <h1 class="text-3xl font-bold text-white mb-2">Recover Account</h1>
            <p class="text-gray-400">Enter your recovery codes to restore access</p>
          </div>
          
          <!-- Recovery Form -->
          <div class="glass rounded-2xl p-6 mb-6">
            <div class="mb-6">
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Enter Recovery Codes
              </label>
              <p class="text-xs text-gray-500 mb-4">
                Enter all 12 recovery codes separated by spaces or commas
              </p>
              <textarea
                id="recovery-codes-input"
                rows="6"
                class="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all resize-none font-mono text-sm"
                placeholder="Enter your 12 recovery codes..."
              ></textarea>
            </div>
            
            <div id="error-message" class="hidden mb-4 p-4 bg-red-500/10 border border-red-500/50 rounded-xl text-red-400 text-sm"></div>
            
            <button class="w-full px-6 py-4 bg-gradient-primary hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300 recover-btn">
              Recover Account
              <svg class="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            </button>
          </div>
          
          <!-- Alternative Options -->
          <div class="text-center">
            <button class="text-gray-400 hover:text-white transition-colors text-sm new-account-btn">
              Create New Account Instead
            </button>
          </div>
        </div>
      </div>
    `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Recover button
        const recoverBtn = this.container.querySelector('.recover-btn');
        recoverBtn.addEventListener('click', () => this.attemptRecovery());

        // New account button
        const newAccountBtn = this.container.querySelector('.new-account-btn');
        newAccountBtn.addEventListener('click', () => {
            window.location.hash = '#onboarding';
            window.location.reload();
        });

        // Enter key in textarea
        const textarea = this.container.querySelector('#recovery-codes-input');
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                this.attemptRecovery();
            }
        });
    }

    async attemptRecovery() {
        const textarea = this.container.querySelector('#recovery-codes-input');
        const errorDiv = this.container.querySelector('#error-message');
        const recoverBtn = this.container.querySelector('.recover-btn');

        // Parse input codes
        const input = textarea.value.trim();
        if (!input) {
            this.showError('Please enter your recovery codes');
            return;
        }

        // Split by spaces, commas, or newlines
        const codes = input.split(/[\s,\n]+/).filter(c => c.length > 0);

        if (codes.length !== 12) {
            this.showError(`Please enter all 12 recovery codes (you entered ${codes.length})`);
            return;
        }

        // Validate code format (should be 16 hex characters)
        const invalidCodes = codes.filter(code => !/^[a-f0-9]{16}$/i.test(code));
        if (invalidCodes.length > 0) {
            this.showError('Invalid code format. Each code should be 16 hexadecimal characters');
            return;
        }

        // Show loading state
        recoverBtn.disabled = true;
        recoverBtn.innerHTML = `
      <svg class="inline-block w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
      </svg>
      Recovering...
    `;

        try {
            // Recover public ID from codes
            const recoveredPublicId = await recoverIdentityFromCodes(codes);

            // Save the recovered identity
            const { generateRecoveryCodes, hashRecoveryCodes } = await import('../utils/crypto.js');
            const newRecoveryCodes = await generateRecoveryCodes(recoveredPublicId);
            const hashedCodes = await hashRecoveryCodes(newRecoveryCodes);

            await saveIdentity(recoveredPublicId, null, hashedCodes);

            // Success! Redirect to app
            errorDiv.classList.add('hidden');
            recoverBtn.innerHTML = `
        <svg class="inline-block w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
        Account Recovered!
      `;
            recoverBtn.classList.remove('bg-gradient-primary');
            recoverBtn.classList.add('bg-green-600');

            setTimeout(() => {
                window.location.hash = '#contacts';
                window.location.reload();
            }, 1500);

        } catch (error) {
            console.error('Recovery failed:', error);
            this.showError('Recovery failed. Please check your codes and try again.');

            recoverBtn.disabled = false;
            recoverBtn.innerHTML = `
        Recover Account
        <svg class="inline-block w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
      `;
        }
    }

    showError(message) {
        const errorDiv = this.container.querySelector('#error-message');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');

        setTimeout(() => {
            errorDiv.classList.add('hidden');
        }, 5000);
    }

    cleanup() {
        // Cleanup if needed
    }
}
