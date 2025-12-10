/**
 * Add Contact component - Modal for adding new contacts
 * Supports manual ID entry and QR code scanning
 */

import { addContact } from '../utils/storage.js';
import { initQRScanner, stopQRScanner, isCameraAvailable } from '../utils/qr.js';

export class AddContact {
    constructor(container, params) {
        this.container = container;
        this.isScanning = false;
        this.render();
    }

    render() {
        this.container.innerHTML = `
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in modal-overlay">
        <div class="bg-dark-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh] animate-scale-in">
          
          <!-- Header -->
          <div class="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-dark-800/50">
            <h2 class="text-xl font-bold text-white">Add Contact</h2>
            <button class="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors close-btn">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
          
          <div class="p-6 overflow-y-auto">
            <!-- Tabs -->
            <div class="flex p-1 bg-dark-800 rounded-xl mb-6">
              <button class="flex-1 py-2 text-sm font-medium rounded-lg transition-all tab-btn active bg-primary-600 text-white shadow-md" data-tab="manual">
                Manual Entry
              </button>
              <button class="flex-1 py-2 text-sm font-medium rounded-lg text-gray-400 hover:text-white transition-all tab-btn" data-tab="qr">
                Scan QR Code
              </button>
            </div>
            
            <!-- Manual Entry -->
            <div class="space-y-4" id="manual-tab">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1" for="contact-id">Public ID</label>
                <input 
                  type="text" 
                  id="contact-id" 
                  class="w-full px-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all font-mono text-sm" 
                  placeholder="Enter 64-char public ID"
                >
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1" for="contact-name">Name (optional)</label>
                <input 
                  type="text" 
                  id="contact-name" 
                  class="w-full px-4 py-3 bg-dark-800 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all" 
                  placeholder="Enter a display name"
                >
              </div>
              
              <button class="w-full mt-6 py-3 bg-gradient-primary hover:shadow-glow text-white font-semibold rounded-xl transition-all active:scale-95 add-btn">
                Add Contact
              </button>
            </div>
            
            <!-- QR Scanner -->
            <div class="hidden flex flex-col items-center space-y-4" id="qr-tab">
              <div class="w-full overflow-hidden rounded-xl border-2 border-primary-500/30 bg-black relative aspect-square flex items-center justify-center">
                <div id="qr-reader" class="w-full h-full"></div>
                <div class="absolute inset-0 pointer-events-none border-2 border-primary-500 opacity-50 scanner-overlay hidden"></div>
              </div>
              
              <p class="text-gray-400 text-sm text-center">
                Point your camera at a contact's QR code to scan
              </p>
              
              <button class="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors hidden cancel-scan-btn">
                Stop Scanning
              </button>
            </div>
            
            <!-- Error Message -->
            <div class="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-200 text-sm hidden" id="error-message"></div>
          </div>
        </div>
      </div>
    `;

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Close button
        const closeBtn = this.container.querySelector('.close-btn');
        closeBtn.addEventListener('click', () => this.close());

        // Close on overlay click
        const overlay = this.container.querySelector('.modal-overlay');
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.close();
            }
        });

        // Tab switching
        const tabBtns = this.container.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });

        // Add button
        const addBtn = this.container.querySelector('.add-btn');
        addBtn.addEventListener('click', () => this.addContactManually());

        // Enter key in inputs
        const inputs = this.container.querySelectorAll('input');
        inputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addContactManually();
                }
            });
        });
    }

    async switchTab(tab) {
        // Update tab buttons
        const tabBtns = this.container.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            const isActive = btn.dataset.tab === tab;
            if (isActive) {
                btn.classList.add('bg-primary-600', 'text-white', 'shadow-md');
                btn.classList.remove('text-gray-400', 'hover:text-white');
            } else {
                btn.classList.remove('bg-primary-600', 'text-white', 'shadow-md');
                btn.classList.add('text-gray-400', 'hover:text-white');
            }
        });

        // Update tab content
        const manualTab = this.container.querySelector('#manual-tab');
        const qrTab = this.container.querySelector('#qr-tab');

        if (tab === 'manual') {
            manualTab.classList.remove('hidden');
            qrTab.classList.add('hidden');
            await this.stopScanning();
        } else {
            manualTab.classList.add('hidden');
            qrTab.classList.remove('hidden');
            await this.startScanning();
        }
    }

    async startScanning() {
        if (this.isScanning) return;

        try {
            // Check camera availability
            const hasCamera = await isCameraAvailable();
            if (!hasCamera) {
                this.showError('No camera available');
                return;
            }

            this.isScanning = true;

            await initQRScanner(
                'qr-reader',
                (decodedText) => this.handleQRScan(decodedText),
                (error) => console.error('QR scan error:', error)
            );

            const cancelBtn = this.container.querySelector('.cancel-scan-btn');
            cancelBtn.classList.remove('hidden');
            cancelBtn.addEventListener('click', () => this.stopScanning());

            // Show overlay for effect
            const overlay = this.container.querySelector('.scanner-overlay');
            if (overlay) overlay.classList.remove('hidden');

        } catch (error) {
            console.error('Failed to start scanner:', error);
            this.showError('Failed to access camera. Please check permissions.');
            this.isScanning = false;
        }
    }

    async stopScanning() {
        if (!this.isScanning) return;

        try {
            await stopQRScanner();
            this.isScanning = false;

            const cancelBtn = this.container.querySelector('.cancel-scan-btn');
            if (cancelBtn) {
                cancelBtn.classList.add('hidden');
            }

            const overlay = this.container.querySelector('.scanner-overlay');
            if (overlay) overlay.classList.add('hidden');
        } catch (error) {
            console.error('Failed to stop scanner:', error);
        }
    }

    async handleQRScan(publicId) {
        // Stop scanning
        await this.stopScanning();

        // Validate ID (should be 64 character hex string)
        if (!/^[a-f0-9]{64}$/i.test(publicId)) {
            this.showError('Invalid QR code format');
            return;
        }

        // Add contact
        try {
            await addContact(publicId);
            this.close();
            window.location.hash = `#chat?id=${publicId}`;
        } catch (error) {
            console.error('Failed to add contact:', error);
            this.showError(error.message || 'Failed to add contact');
        }
    }

    async addContactManually() {
        const idInput = this.container.querySelector('#contact-id');
        const nameInput = this.container.querySelector('#contact-name');

        const publicId = idInput.value.trim();
        const name = nameInput.value.trim();

        if (!publicId) {
            this.showError('Please enter a public ID');
            return;
        }

        // Validate ID format
        if (!/^[a-f0-9]{64}$/i.test(publicId)) {
            this.showError('Invalid public ID format. Must be 64 hexadecimal characters.');
            return;
        }

        try {
            await addContact(publicId, name || null);
            this.close();
            window.location.hash = `#chat?id=${publicId}`;
        } catch (error) {
            console.error('Failed to add contact:', error);
            this.showError(error.message || 'Failed to add contact');
        }
    }

    showError(message) {
        const errorEl = this.container.querySelector('#error-message');
        errorEl.textContent = message;
        errorEl.classList.remove('hidden');

        setTimeout(() => {
            errorEl.classList.add('hidden');
        }, 5000);
    }

    close() {
        this.stopScanning();
        window.location.hash = '#contacts';
    }

    async cleanup() {
        await this.stopScanning();
    }
}
