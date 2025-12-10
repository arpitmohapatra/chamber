/**
 * Main application entry point
 */

import './index.css';
import { router } from './router.js';
import { getIdentity, saveIdentity, getRecoveryCodes } from './utils/storage.js';
import { createIdentity, hashRecoveryCodes } from './utils/crypto.js';

// Import components
import { Onboarding } from './components/Onboarding.js';
import { RecoverySetup } from './components/RecoverySetup.js';
import { AccountRecovery } from './components/AccountRecovery.js';
import { ContactList } from './components/ContactList.js';
import { ChatView } from './components/ChatView.js';
import { AddContact } from './components/AddContact.js';
import { Settings } from './components/Settings.js';

/**
 * Initialize the application
 */
async function initApp() {
  try {
    // Check if user has an identity
    let identity = await getIdentity();

    // Check if we're on the recovery page
    const hash = window.location.hash;
    if (hash === '#account-recovery') {
      // Allow access to recovery page
    } else if (!identity) {
      // No identity - show onboarding
      const { publicId, codes } = await createIdentity();
      const hashedCodes = await hashRecoveryCodes(codes);

      await saveIdentity(publicId, null, hashedCodes);

      // Store plain codes temporarily for RecoverySetup to display
      // This is safe as it stays in memory/session and is cleared after setup
      sessionStorage.setItem('TEMP_RECOVERY_CODES', JSON.stringify(codes));

      identity = await getIdentity();

      // Show onboarding
      window.location.hash = `#onboarding?publicId=${publicId}`;
    } else {
      // Has identity - check if recovery codes are set
      const recoveryCodes = await getRecoveryCodes();

      if (!recoveryCodes && !hash.includes('recovery-setup')) {
        // No recovery codes set - redirect to setup
        window.location.hash = `#recovery-setup?publicId=${identity.publicId}`;
      } else if (!hash || hash === '#onboarding') {
        // Default to contacts
        window.location.hash = '#contacts';
      }
    }

    // Register routes
    router.register('onboarding', Onboarding);
    router.register('recovery-setup', RecoverySetup);
    router.register('account-recovery', AccountRecovery);
    router.register('contacts', ContactList);
    router.register('chat', ChatView);
    router.register('add-contact', AddContact);
    router.register('settings', Settings);

    // Register service worker (disabled in dev to avoid MIME type errors)
    // Uncomment for production build
    /*
    if ('serviceWorker' in navigator) {
      try {
        await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');
      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }
    */
  } catch (error) {
    console.error('Failed to initialize app:', error);
    document.getElementById('app').innerHTML = `
      <div class="min-h-screen flex items-center justify-center p-4">
        <div class="text-center">
          <h2 class="text-2xl font-bold text-white mb-4">Failed to initialize app</h2>
          <p class="text-gray-400 mb-6">${error.message}</p>
          <button onclick="location.reload()" class="px-6 py-3 bg-gradient-primary text-white rounded-xl">Reload</button>
        </div>
      </div>
    `;
  }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
