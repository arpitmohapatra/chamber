/**
 * Chat View component - Messaging interface for a specific contact
 */

import { getContact, getMessages, saveMessage, saveImage, getImage } from '../utils/storage.js';
import { deriveSharedKey, encryptMessage, decryptMessage, encryptBinary, decryptBinary } from '../utils/crypto.js';
import { getIdentity } from '../utils/storage.js';

export class ChatView {
    constructor(container, params) {
        this.container = container;
        this.contactId = params.id;
        this.contact = null;
        this.messages = [];
        this.sharedKey = null;
        this.myIdentity = null;
        this.render();
        this.initialize();
    }

    async initialize() {
        try {
            // Load contact and messages
            this.contact = await getContact(this.contactId);
            this.myIdentity = await getIdentity();

            if (!this.contact) {
                this.showError('Contact not found');
                return;
            }

            // Derive shared encryption key
            this.sharedKey = await deriveSharedKey(this.myIdentity.publicId, this.contactId);

            // Update header
            this.updateHeader();

            // Load messages
            await this.loadMessages();
        } catch (error) {
            console.error('Failed to initialize chat:', error);
            this.showError('Failed to load chat');
        }
    }

    render() {
        this.container.innerHTML = `
      <div class="h-full flex flex-col bg-dark-900">
        <!-- Header -->
        <div class="px-4 py-3 flex items-center justify-between border-b border-white/10 glass sticky top-0 z-10">
          <div class="flex items-center gap-3">
            <button class="p-2 -ml-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors back-btn">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
              </svg>
            </button>
            <div>
              <h3 class="font-bold text-white contact-name">Loading...</h3>
              <p class="text-xs text-gray-400 contact-id font-mono truncate max-w-[150px]"></p>
            </div>
          </div>
          <button class="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors menu-btn">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="1"></circle>
              <circle cx="12" cy="5" r="1"></circle>
              <circle cx="12" cy="19" r="1"></circle>
            </svg>
          </button>
        </div>
        
        <!-- Messages -->
        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4" id="messages-container">
          <div class="flex flex-col items-center justify-center h-full">
            <div class="w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p class="text-gray-500 text-sm">Decrypting messages...</p>
          </div>
        </div>
        
        <!-- Input Area -->
        <div class="p-4 border-t border-white/10 bg-dark-800/50 backdrop-blur-md">
          <div class="flex items-end gap-3 max-w-4xl mx-auto">
            <button class="p-3 text-gray-400 hover:text-primary-400 hover:bg-white/5 rounded-xl transition-colors attach-btn" title="Attach image">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
              </svg>
            </button>
            <input type="file" id="image-input" accept="image/*" class="hidden">
            
            <div class="flex-1 bg-dark-900 border border-white/10 rounded-2xl overflow-hidden focus-within:ring-2 focus-within:ring-primary-500/50 focus-within:border-primary-500 transition-all">
              <textarea 
                class="w-full px-4 py-3 bg-transparent text-white placeholder-gray-500 focus:outline-none resize-none max-h-32 custom-scrollbar"
                placeholder="Type a message..."
                id="message-input"
                rows="1"
                style="min-height: 48px;"
              ></textarea>
            </div>
            
            <button class="p-3 bg-gradient-primary hover:shadow-glow text-white rounded-xl transition-all active:scale-95 send-btn">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;

        this.setupEventListeners();
    }

    updateHeader() {
        if (this.contact) {
            this.container.querySelector('.contact-name').textContent = this.contact.name;
            this.container.querySelector('.contact-id').textContent =
                `ID: ${this.contactId.substring(0, 8)}...`;
        }
    }

    async loadMessages() {
        try {
            this.messages = await getMessages(this.contactId);
            await this.renderMessages();
            this.scrollToBottom();
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    }

    async renderMessages() {
        const container = this.container.querySelector('#messages-container');

        if (this.messages.length === 0) {
            container.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full text-center space-y-4 opacity-50">
          <div class="w-16 h-16 bg-white/10 rounded-full flex items-center justify-center">
            <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
            </svg>
          </div>
          <p class="text-gray-400">No messages yet. Start encryption!</p>
        </div>
      `;
            return;
        }

        const messagesHTML = await Promise.all(this.messages.map(async (msg) => {
            const isOwn = msg.sent;
            let content = msg.content;

            // Decrypt message if encrypted
            if (msg.encrypted && msg.iv) {
                try {
                    content = await decryptMessage(msg.encrypted, msg.iv, this.sharedKey);
                } catch (error) {
                    console.error('Failed to decrypt message:', error);
                    content = '🔒 [Encrypted message]';
                }
            }

            if (msg.type === 'image') {
                return this.renderImageMessage(msg, isOwn);
            }

            return `
        <div class="flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in group">
          <div class="max-w-[75%] ${isOwn ? 'order-1' : 'order-2'}">
            <div class="${isOwn ? 'message-bubble-sent rounded-br-none' : 'message-bubble-received rounded-bl-none'} px-4 py-2 rounded-2xl shadow-sm relative text-sm md:text-base break-words">
             ${this.escapeHtml(content)}
             <div class="${isOwn ? 'text-primary-100' : 'text-gray-400'} text-[10px] text-right mt-1 opacity-70">
               ${this.formatTime(msg.timestamp)}
             </div>
            </div>
          </div>
        </div>
      `;
        }));

        container.innerHTML = messagesHTML.join('');
    }

    async renderImageMessage(msg, isOwn) {
        if (!msg.imageId) {
            return this.renderErrorBubble(isOwn, 'Image not available', msg.timestamp);
        }

        try {
            const imageData = await getImage(msg.imageId);
            if (!imageData) {
                return this.renderErrorBubble(isOwn, 'Image not found', msg.timestamp);
            }

            // Decrypt image
            const iv = new Uint8Array(imageData.iv);
            const decrypted = await decryptBinary(imageData.blob, iv, this.sharedKey);
            const blob = new Blob([decrypted], { type: 'image/jpeg' });
            const url = URL.createObjectURL(blob);

            return `
        <div class="flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in mb-2">
          <div class="${isOwn ? 'message-bubble-sent rounded-br-none' : 'message-bubble-received rounded-bl-none'} p-1 rounded-2xl shadow-sm relative overflow-hidden max-w-[75%] group">
            <img src="${url}" alt="Shared image" class="rounded-xl max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity message-img">
            <div class="absolute bottom-2 right-3 px-2 py-1 bg-black/40 backdrop-blur-sm rounded-full text-[10px] text-white">
              ${this.formatTime(msg.timestamp)}
            </div>
          </div>
        </div>
      `;
        } catch (error) {
            console.error('Failed to decrypt image:', error);
            return this.renderErrorBubble(isOwn, 'Failed to decrypt image', msg.timestamp);
        }
    }

    renderErrorBubble(isOwn, text, timestamp) {
        return `
      <div class="flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in">
        <div class="${isOwn ? 'bg-red-500/20 text-red-200 border border-red-500/30' : 'bg-dark-800 text-gray-400 border border-white/5'} px-4 py-2 rounded-2xl text-sm italic">
          ⚠️ ${text}
        </div>
      </div>
    `;
    }

    setupEventListeners() {
        // Back button
        const backBtn = this.container.querySelector('.back-btn');
        backBtn.addEventListener('click', () => {
            window.location.hash = '#contacts';
        });

        // Send button
        const sendBtn = this.container.querySelector('.send-btn');
        sendBtn.addEventListener('click', () => this.sendMessage());

        // Message input - send on Enter
        const input = this.container.querySelector('#message-input');

        // Auto resize textarea
        input.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            if (this.value === '') this.style.height = '48px';
        });

        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Attach button
        const attachBtn = this.container.querySelector('.attach-btn');
        const imageInput = this.container.querySelector('#image-input');

        attachBtn.addEventListener('click', () => {
            imageInput.click();
        });

        imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.sendImage(e.target.files[0]);
            }
        });
    }

    async sendMessage() {
        const input = this.container.querySelector('#message-input');
        const message = input.value.trim();

        if (!message || !this.sharedKey) return;

        try {
            // Encrypt message
            const { encrypted, iv } = await encryptMessage(message, this.sharedKey);

            // Save to database
            await saveMessage(this.contactId, message, 'text', true, encrypted, iv);

            // Clear input
            input.value = '';
            input.style.height = '48px';

            // Reload messages
            await this.loadMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        }
    }

    async sendImage(file) {
        if (!this.sharedKey) return;

        try {
            // Read file as ArrayBuffer
            const arrayBuffer = await file.arrayBuffer();

            // Encrypt image
            const { encrypted, iv } = await encryptBinary(arrayBuffer, this.sharedKey);

            // Save encrypted image
            const imageId = await saveImage(encrypted, iv);

            // Save message reference
            await saveMessage(this.contactId, '📷 Image', 'image', true, null, null, imageId);

            // Clear input
            const imageInput = this.container.querySelector('#image-input');
            imageInput.value = '';

            // Reload messages
            await this.loadMessages();
        } catch (error) {
            console.error('Failed to send image:', error);
            alert('Failed to send image');
        }
    }

    scrollToBottom() {
        const container = this.container.querySelector('#messages-container');
        container.scrollTop = container.scrollHeight;
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const container = this.container.querySelector('#messages-container');
        container.innerHTML = `
      <div class="flex flex-col items-center justify-center h-full text-center p-6">
        <p class="text-red-400 mb-4">${message}</p>
        <button class="px-4 py-2 bg-dark-800 hover:bg-dark-700 text-white rounded-lg transition-colors border border-white/10" onclick="window.location.hash='#contacts'">
          Back to Contacts
        </button>
      </div>
    `;
    }

    cleanup() {
        // Revoke any object URLs to prevent memory leaks
        const images = this.container.querySelectorAll('.message-img');
        images.forEach(img => {
            if (img.src.startsWith('blob:')) {
                URL.revokeObjectURL(img.src);
            }
        });
    }
}
