/**
 * Settings component - User settings and information
 */

import { getIdentity, exportData, importData, clearAllData, updateIdentityName } from '../utils/storage.js';
import { generateQRCode } from '../utils/qr.js';

export class Settings {
    constructor(container, params) {
        this.container = container;
        this.identity = null;
        this.render();
        this.initialize();
    }

    async initialize() {
        this.identity = await getIdentity();
        this.updateIdentityDisplay();
        this.generateQR();
    }

    render() {
        this.container.innerHTML = `
      <div class="h-screen max-h-[100dvh] flex flex-col bg-dark-900 overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 flex items-center gap-4 border-b border-white/10 glass sticky top-0 z-10">
          <button class="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors back-btn">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
            </svg>
          </button>
          <h2 class="text-xl font-bold text-white">Settings</h2>
        </div>
        
        <!-- Content -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
          
          <!-- Identity Card -->
          <div class="glass rounded-2xl p-6 border border-white/10">
            <h3 class="text-lg font-semibold text-white mb-4">Your Identity</h3>
            
            <div class="mb-6">
              <label class="block text-sm text-gray-400 mb-2">Display Name</label>
              <div class="flex gap-2">
                <input 
                  type="text" 
                  id="display-name-input" 
                  class="flex-1 px-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  placeholder="Set a display name"
                >
                <button class="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white font-medium rounded-xl transition-colors save-name-btn">
                  Save
                </button>
              </div>
              <p class="text-xs text-green-400 mt-2 hidden" id="save-success-msg">
                Name saved successfully!
              </p>
            </div>

            <div class="mb-6">
              <label class="block text-sm text-gray-400 mb-2">Public ID</label>
              <div class="flex items-center gap-2 bg-dark-800/50 p-3 rounded-xl border border-white/5">
                <code class="flex-1 font-mono text-sm text-primary-400 break-all" id="public-id">Loading...</code>
                <button class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors copy-btn" title="Copy to clipboard">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div class="flex justify-center p-6 bg-white/5 rounded-xl mb-4">
              <canvas id="qr-canvas"></canvas>
            </div>
            
            <p class="text-xs text-gray-500 text-center">
              Share this QR code or ID with others to connect
            </p>
          </div>
          
          <!-- Data Management -->
          <div class="glass rounded-2xl p-6 border border-white/10">
            <h3 class="text-lg font-semibold text-white mb-4">Data Management</h3>
            
            <div class="flex gap-3 mb-4">
              <button class="flex-1 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/5 export-btn">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                </svg>
                Export
              </button>
              
              <button class="flex-1 px-4 py-3 bg-dark-800 hover:bg-dark-700 text-white rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/5 import-btn">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                </svg>
                Import
              </button>
              <input type="file" id="import-input" accept=".json" class="hidden">
            </div>
            
            <p class="text-xs text-gray-500">
              Export your data for backup or import from a previous backup.
            </p>
          </div>
          
          <!-- About -->
          <div class="glass rounded-2xl p-6 border border-white/10">
            <h3 class="text-lg font-semibold text-white mb-4">About</h3>
            
            <div class="space-y-3 mb-6">
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Version</span>
                <span class="text-white">1.0.0</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Encryption</span>
                <span class="text-white">AES-256-GCM</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-gray-400">Storage</span>
                <span class="text-white">Local Only (IndexedDB)</span>
              </div>
            </div>
            
            <div class="bg-primary-500/10 border border-primary-500/20 rounded-xl p-4">
              <h4 class="text-primary-400 font-medium mb-2 flex items-center gap-2">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/>
                </svg>
                Privacy Guarantee
              </h4>
              <ul class="text-xs text-gray-300 space-y-1 ml-6 list-disc">
                <li>All messages are encrypted end-to-end</li>
                <li>No data is sent to any server</li>
                <li>Everything stays on your device</li>
                <li>No tracking, no analytics, no accounts</li>
              </ul>
            </div>
          </div>
          
          <!-- Danger Zone -->
          <div class="glass rounded-2xl p-6 border border-red-500/20">
            <h3 class="text-lg font-semibold text-red-400 mb-4">Danger Zone</h3>
            
            <p class="text-sm text-gray-400 mb-6">
              This will permanently delete all your data including messages, contacts, and your identity.
            </p>
            
            <button class="w-full px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-colors font-medium clear-data-btn">
              Clear All Data
            </button>
          </div>
          
          <div class="h-6"></div> <!-- Spacer -->
          
        </div>
      </div>
    `;

        this.setupEventListeners();
    }

    updateIdentityDisplay() {
        if (this.identity) {
            const publicIdEl = this.container.querySelector('#public-id');
            publicIdEl.textContent = this.identity.publicId;

            const nameInput = this.container.querySelector('#display-name-input');
            if (this.identity.displayName) {
                nameInput.value = this.identity.displayName;
            }
        }
    }

    async generateQR() {
        if (this.identity) {
            const canvas = this.container.querySelector('#qr-canvas');
            try {
                await generateQRCode(this.identity.publicId, canvas);
            } catch (error) {
                console.error('Failed to generate QR code:', error);
            }
        }
    }

    setupEventListeners() {
        // Back button
        const backBtn = this.container.querySelector('.back-btn');
        backBtn.addEventListener('click', () => window.location.hash = '');
        // Save Name button
        const saveNameBtn = this.container.querySelector('.save-name-btn');
        saveNameBtn.addEventListener('click', () => this.saveDisplayName());

        // Copy button
        const copyBtn = this.container.querySelector('.copy-btn');
        copyBtn.addEventListener('click', () => this.copyToClipboard());

        // Export button
        const exportBtn = this.container.querySelector('.export-btn');
        exportBtn.addEventListener('click', () => this.exportDataToFile());

        // Import button
        const importBtn = this.container.querySelector('.import-btn');
        const importInput = this.container.querySelector('#import-input');

        importBtn.addEventListener('click', () => {
            importInput.click();
        });

        importInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.importDataFromFile(e.target.files[0]);
            }
        });

        // Clear data button
        const clearBtn = this.container.querySelector('.clear-data-btn');
        clearBtn.addEventListener('click', () => this.confirmClearData());
    }

    async saveDisplayName() {
        const nameInput = this.container.querySelector('#display-name-input');
        const name = nameInput.value.trim();
        const msgEl = this.container.querySelector('#save-success-msg');

        if (name) {
            try {
                await updateIdentityName(name);
                msgEl.textContent = 'Name saved successfully!';
                msgEl.classList.remove('hidden');
                setTimeout(() => msgEl.classList.add('hidden'), 3000);
            } catch (error) {
                console.error('Failed to save name:', error);
                alert('Failed to save name');
            }
        }
    }

    async copyToClipboard() {
        if (!this.identity) return;

        try {
            await navigator.clipboard.writeText(this.identity.publicId);

            const copyBtn = this.container.querySelector('.copy-btn');
            const originalHTML = copyBtn.innerHTML;

            copyBtn.innerHTML = `
        <svg class="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <polyline points="20 6 9 17 4 12"></polyline>
        </svg>
      `;

            setTimeout(() => {
                copyBtn.innerHTML = originalHTML;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy:', error);
        }
    }

    async exportDataToFile() {
        try {
            const data = await exportData();
            const json = JSON.stringify(data, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `chamber-backup-${Date.now()}.json`;
            a.click();

            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Failed to export data:', error);
            alert('Failed to export data');
        }
    }

    async importDataFromFile(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (confirm('This will replace all existing data. Continue?')) {
                await importData(data);
                alert('Data imported successfully. Reloading...');
                window.location.reload();
            }
        } catch (error) {
            console.error('Failed to import data:', error);
            alert('Failed to import data. Please check the file format.');
        }
    }

    async confirmClearData() {
        const confirmed = confirm(
            'Are you sure you want to delete ALL data? This cannot be undone.\n\n' +
            'This will delete:\n' +
            '- Your identity and public ID\n' +
            '- All contacts\n' +
            '- All messages\n' +
            '- All images\n\n' +
            'Type "DELETE" to confirm.'
        );

        if (confirmed) {
            const input = prompt('Type DELETE to confirm:');
            if (input === 'DELETE') {
                try {
                    await clearAllData();
                    alert('All data cleared. Reloading...');
                    window.location.reload();
                } catch (error) {
                    console.error('Failed to clear data:', error);
                    alert('Failed to clear data');
                }
            }
        }
    }

    cleanup() {
        // Cleanup if needed
    }
}
