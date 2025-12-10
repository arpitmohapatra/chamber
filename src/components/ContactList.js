/**
 * Contact List component - Main view showing all conversations
 */

import { getContacts } from '../utils/storage.js';

export class ContactList {
    constructor(container, params) {
        this.container = container;
        this.contacts = [];
        this.render();
        this.loadContacts();
    }

    render() {
        this.container.innerHTML = `
      <div class="h-screen max-h-[100dvh] flex flex-col bg-dark-900 overflow-hidden">
        <!-- Header -->
        <div class="px-6 py-4 flex items-center justify-between border-b border-white/10 glass sticky top-0 z-10">
          <h2 class="text-2xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Messages</h2>
            <button class="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors settings-btn" title="Settings">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
              </svg>
            </button>
        </div>
        
        <!-- List -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-2" id="contacts-list">
          <div class="flex flex-col items-center justify-center h-64 space-y-4">
            <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-400">Loading conversations...</p>
          </div>
        </div>
        
        <!-- FAB -->
        <button class="absolute bottom-6 right-6 w-14 h-14 bg-gradient-primary rounded-full shadow-glow hover:shadow-glow-lg flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95 add-contact-btn z-20">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/>
          </svg>
        </button>
      </div>
    `;

        this.setupEventListeners();
    }

    async loadContacts() {
        try {
            this.contacts = await getContacts();
            this.renderContacts();
        } catch (error) {
            console.error('Failed to load contacts:', error);
            this.renderError();
        }
    }

    renderContacts() {
        const listContainer = this.container.querySelector('#contacts-list');

        if (this.contacts.length === 0) {
            listContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center px-6 animate-fade-in">
          <div class="w-20 h-20 bg-dark-800 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/10">
            <svg class="w-10 h-10 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <h3 class="text-xl font-semibold text-white mb-2">No conversations yet</h3>
          <p class="text-gray-400 max-w-xs mx-auto">Click the + button below to add a contact and start messaging securely.</p>
        </div>
      `;
            return;
        }

        listContainer.innerHTML = this.contacts.map(contact => `
      <div class="group flex items-center gap-4 p-4 rounded-xl hover:bg-white/5 transition-colors cursor-pointer border border-transparent hover:border-white/5 animate-fade-in contact-item" data-id="${contact.publicId}">
        <div class="w-12 h-12 rounded-full avatar-gradient flex items-center justify-center text-white font-semibold text-lg shadow-lg">
          ${this.getAvatarInitials(contact.name)}
        </div>
        
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-1">
            <h4 class="font-semibold text-white truncate group-hover:text-primary-400 transition-colors">${this.escapeHtml(contact.name)}</h4>
            ${contact.lastMessageTime ? `
              <span class="text-xs text-gray-500">${this.formatTime(contact.lastMessageTime)}</span>
            ` : ''}
          </div>
          <p class="text-sm truncate ${!contact.lastMessage ? 'text-gray-500 italic' : 'text-gray-400'}">
            ${contact.lastMessage || 'No messages yet'}
          </p>
        </div>
        
        ${contact.unreadCount > 0 ? `
          <div class="w-5 h-5 bg-primary-500 rounded-full flex items-center justify-center text-[10px] font-bold text-white shadow-glow">
            ${contact.unreadCount}
          </div>
        ` : ''}
      </div>
    `).join('');

        // Add click listeners to contact items
        listContainer.querySelectorAll('.contact-item').forEach(item => {
            item.addEventListener('click', () => {
                const contactId = item.dataset.id;
                window.location.hash = `#chat?id=${contactId}`;
            });
        });
    }

    renderError() {
        const listContainer = this.container.querySelector('#contacts-list');
        listContainer.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center p-6">
        <p class="text-red-400 mb-4">Failed to load contacts</p>
        <button class="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors retry-btn">Retry</button>
      </div>
    `;

        listContainer.querySelector('.retry-btn').addEventListener('click', () => {
            this.loadContacts();
        });
    }

    setupEventListeners() {
        // Add contact button
        const addBtn = this.container.querySelector('.add-contact-btn');
        addBtn.addEventListener('click', () => {
            window.location.hash = '#add-contact';
        });

        // Settings button
        const settingsBtn = this.container.querySelector('.settings-btn');
        settingsBtn.addEventListener('click', () => {
            window.location.hash = '#settings';
        });
    }

    getAvatarInitials(name) {
        const words = name.split(' ');
        if (words.length >= 2) {
            return words[0][0] + words[1][0];
        }
        return name.substring(0, 2).toUpperCase();
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) {
            return 'Just now';
        }

        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}m ago`;
        }

        // Today
        if (date.toDateString() === now.toDateString()) {
            return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }

        // This week
        if (diff < 604800000) {
            return date.toLocaleDateString('en-US', { weekday: 'short' });
        }

        // Older
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    cleanup() {
        // Cleanup if needed
    }
}
