/**
 * Onboarding component - First-run experience with Tailwind styling
 */

import { generateQRCode } from '../utils/qr.js';
import { updateIdentityName } from '../utils/storage.js';

export class Onboarding {
    constructor(container, params) {
        this.container = container;
        this.publicId = params.publicId;
        this.render();
    }

    render() {
        this.container.innerHTML = `
      <div class="min-h-screen bg-gradient-to-br from-dark-950 via-dark-900 to-dark-800 flex items-center justify-center p-6">
        <div class="max-w-2xl w-full animate-fade-in">
          <!-- Header -->
              <div class="text-center mb-8">
                <div class="inline-flex p-4 bg-primary-500/10 rounded-full mb-4">
                  <svg class="w-16 h-16 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                </div>
                <h1 class="text-4xl font-bold text-white mb-2">Welcome to Chamber</h1>
                <p class="text-gray-400 text-lg">Your privacy-focused encrypted messenger</p>
              </div>
              
              <!-- Identity Info Card -->
              <div class="glass rounded-2xl p-6 mb-6 border border-white/10">
                <div class="mb-6">
                  <label class="block text-sm text-gray-400 mb-2">Choose a Display Name</label>
                  <input 
                    type="text" 
                    id="display-name" 
                    class="w-full px-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                    placeholder="Enter your name (optional)"
                  >
                  <p class="text-xs text-gray-500 mt-2">
                    This name is stored locally and shared only when you connect with others.
                  </p>
                </div>

                <h3 class="text-xl font-semibold text-white mb-3">Your Public ID</h3>
                <p class="text-sm text-gray-400 mb-4">
                  This is your unique identifier. Share it with others to start chatting.
                </p>
                
                <div class="flex items-center gap-3 bg-dark-800/50 p-4 rounded-xl border border-gray-700">
                  <code class="flex-1 font-mono text-sm text-primary-400 break-all">${this.publicId}</code>
                  <button class="p-2 hover:bg-dark-700 rounded-lg transition-colors copy-btn" title="Copy to clipboard">
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                  </button>
                </div>
                
                <div class="flex justify-center p-6 bg-dark-800/30 rounded-xl mt-4">
                  <canvas id="qr-canvas"></canvas>
                </div>
                
                <p class="text-xs text-gray-500 text-center mt-3">
                  Scan this QR code to share your ID
                </p>
              </div>
              
              <!-- Continue Button -->
              <div class="space-y-4">
                <button class="w-full px-6 py-4 bg-gradient-primary hover:shadow-glow text-white font-semibold rounded-xl transition-all duration-300 flex items-center justify-center gap-2 continue-btn">
                  Create New Account
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
                  </svg>
                </button>
                
                <button class="w-full px-6 py-4 bg-dark-800 hover:bg-dark-700 text-gray-300 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 recover-btn">
                  I have existing recovery codes
                </button>
              </div>
            </div>
        </div>
      </div>
    `;

        this.setupEventListeners();
        this.generateQR();
    }

    async generateQR() {
        const canvas = this.container.querySelector('#qr-canvas');
        if (canvas) {
            try {
                await generateQRCode(this.publicId, canvas);
            } catch (error) {
                console.error('Failed to generate QR code:', error);
            }
        }
    }

    setupEventListeners() {
        // Copy button
        const copyBtn = this.container.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Continue (Create) button
        const continueBtn = this.container.querySelector('.continue-btn');
        continueBtn.addEventListener('click', async () => {
            const nameInput = this.container.querySelector('#display-name');
            const name = nameInput.value.trim();

            if (name) {
                try {
                    await updateIdentityName(name);
                } catch (error) {
                    console.error('Failed to update name:', error);
                }
            }

            window.location.hash = '#recovery-setup?publicId=' + this.publicId;
        });

        // Recover button
        const recoverBtn = this.container.querySelector('.recover-btn');
        recoverBtn.addEventListener('click', () => {
            window.location.hash = '#account-recovery';
        });

        // Allow enter key to continue
        const nameInput = this.container.querySelector('#display-name');
        nameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                continueBtn.click();
            }
        });
    }

    async copyToClipboard() {
        try {
            await navigator.clipboard.writeText(this.publicId);

            const copyBtn = this.container.querySelector('.copy-btn');
            const originalHTML = copyBtn.innerHTML;

            copyBtn.innerHTML = `
        <svg class="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>
        </svg>
      `;

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    cleanup() {
        // Cleanup if needed
    }
}
