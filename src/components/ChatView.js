import { getContact, getMessages, saveMessage, saveAttachment, getAttachment, updateContactName, clearMessages } from '../utils/storage.js';
import { deriveSharedKey, encryptMessage, decryptMessage, encryptBinary, decryptBinary } from '../utils/crypto.js';
import { getIdentity } from '../utils/storage.js';
import { sendMessage, isPeerConnected } from '../utils/network.js';

export class ChatView {
    constructor(container, params) {
        this.container = container;
        this.contactId = params.id;
        this.contact = null;
        this.messages = [];
        this.sharedKey = null;
        this.myIdentity = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        this.isRecording = false;
        this.render();
        this.initialize();
    }

    async initialize() {
        try {
            this.contact = await getContact(this.contactId);
            this.myIdentity = await getIdentity();

            if (!this.contact) {
                this.showError('Contact not found');
                return;
            }

            this.sharedKey = await deriveSharedKey(this.myIdentity.publicId, this.contactId);
            this.updateHeader();
            await this.loadMessages();

            this.messageHandler = (e) => {
                if (e.detail.senderId === this.contactId) {
                    this.loadMessages();
                }
            };
            window.addEventListener('message-received', this.messageHandler);

        } catch (error) {
            console.error('Failed to initialize chat:', error);
            this.showError('Failed to load chat');
        }
    }

    render() {
        this.container.innerHTML = `
      <div class="h-screen max-h-[100dvh] flex flex-col bg-dark-900 relative overflow-hidden">
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
          
          <div class="relative">
            <button class="p-2 -mr-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors menu-btn">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="1"></circle>
                <circle cx="12" cy="5" r="1"></circle>
                <circle cx="12" cy="19" r="1"></circle>
                </svg>
            </button>
            
            <!-- Dropdown Menu -->
            <div class="absolute right-0 top-full mt-2 w-48 bg-dark-800 border border-white/10 rounded-xl shadow-xl z-50 hidden menu-dropdown animate-scale-in">
                <button class="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors view-contact-btn">
                    View Info
                </button>
                <button class="w-full text-left px-4 py-3 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors edit-name-btn">
                    Edit Name
                </button>
                <button class="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 transition-colors clear-chat-btn">
                    Clear Chat
                </button>
            </div>
          </div>
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
          <!-- Recording Indicator -->
          <div class="flex items-center justify-center text-red-400 text-sm mb-2 hidden recording-indicator animate-pulse">
            <div class="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
            Recording... <span class="recording-timer ml-1 font-mono">0:00</span>
          </div>

          <div class="flex items-end gap-3 max-w-4xl mx-auto">
            <!-- File Attach -->
            <button class="p-3 text-gray-400 hover:text-primary-400 hover:bg-white/5 rounded-xl transition-colors attach-btn" title="Send File or Image">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"/>
              </svg>
            </button>
            <input type="file" id="file-input" class="hidden">
            
            <!-- Audio Record -->
             <button class="p-3 text-gray-400 hover:text-red-400 hover:bg-white/5 rounded-xl transition-colors mic-btn" title="Record Audio">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/>
              </svg>
            </button>

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

        <!-- Contact Info Modal -->
        <div id="contact-modal" class="hidden absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            <div class="glass max-w-sm w-full mx-4 rounded-2xl p-6 relative">
                <button class="absolute top-4 right-4 text-gray-400 hover:text-white close-modal-btn">
                    <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
                
                <div class="text-center mb-6">
                    <div class="w-20 h-20 bg-gradient-to-br from-primary-500 to-primary-700 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-4 shadow-glow">
                        <span class="modal-initials">?</span>
                    </div>
                    <h2 class="text-2xl font-bold text-white modal-name">Name</h2>
                    <div class="flex items-center justify-center gap-2 mt-2">
                        <div class="status-indicator w-2.5 h-2.5 rounded-full bg-gray-500"></div>
                        <span class="status-text text-sm text-gray-400">Offline</span>
                    </div>
                </div>
                
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs text-gray-500 uppercase tracking-wider mb-1">Public ID</label>
                        <div class="flex items-center gap-2 bg-dark-800 p-3 rounded-xl border border-white/5">
                            <code class="text-xs text-primary-300 break-all font-mono flex-1 modal-id">...</code>
                            <button class="text-gray-400 hover:text-white copy-id-btn">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                    </div>
                    
                    <button class="w-full py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl transition-colors font-medium border border-white/10 edit-name-modal-btn">
                        Edit Name
                    </button>
                    
                    <div class="pt-4 border-t border-white/10">
                        <button class="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-colors text-sm remove-contact-btn">
                            Remove Contact
                        </button>
                    </div>
                </div>
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
          <p class="text-gray-400">No messages yet. Say hello!</p>
        </div>
      `;
            return;
        }

        const messagesHTML = await Promise.all(this.messages.map(async (msg) => {
            const isOwn = msg.sent;

            // Handle different message types
            if (msg.type === 'image' || msg.type === 'audio' || msg.type === 'file') {
                return this.renderAttachmentMessage(msg, isOwn);
            }

            // Text encryption fallback
            let content = msg.content;
            if (msg.encrypted && msg.iv) {
                try {
                    content = await decryptMessage(msg.encrypted, msg.iv, this.sharedKey);
                } catch (error) {
                    content = '🔒 [Encrypted message]';
                }
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

    async renderAttachmentMessage(msg, isOwn) {
        if (!msg.imageId) return this.renderErrorBubble(isOwn, 'Attachment unavailable', msg.timestamp);

        try {
            const attachment = await getAttachment(msg.imageId);
            if (!attachment) return this.renderErrorBubble(isOwn, 'Attachment not found', msg.timestamp);

            const iv = new Uint8Array(attachment.iv);
            const decrypted = await decryptBinary(attachment.blob, iv, this.sharedKey);

            let contentHtml = '';

            if (msg.type === 'image') {
                const blob = new Blob([decrypted], { type: 'image/jpeg' });
                const url = URL.createObjectURL(blob);
                contentHtml = `<img src="${url}" class="rounded-xl max-h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity message-img">`;
            } else if (msg.type === 'audio') {
                const blob = new Blob([decrypted], { type: 'audio/webm' });
                const url = URL.createObjectURL(blob);
                contentHtml = `<audio controls src="${url}" class="w-full min-w-[200px]"></audio>`;
            } else {
                const blob = new Blob([decrypted]);
                const url = URL.createObjectURL(blob);
                contentHtml = `
                    <div class="flex items-center gap-3 p-2">
                        <div class="bg-black/20 p-2 rounded-lg">
                             <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        </div>
                        <a href="${url}" download="file.bin" class="underline hover:text-white">Download File</a>
                    </div>
                 `;
            }

            return `
        <div class="flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in mb-2">
          <div class="${isOwn ? 'message-bubble-sent rounded-br-none' : 'message-bubble-received rounded-bl-none'} p-2 rounded-2xl shadow-sm relative overflow-hidden max-w-[75%] group">
            ${contentHtml}
            <div class="text-[10px] ${isOwn ? 'text-primary-100' : 'text-gray-400'} text-right mt-1 px-1 opacity-70">
              ${this.formatTime(msg.timestamp)}
            </div>
          </div>
        </div>
      `;

        } catch (error) {
            console.error('Failed to decrypt attachment:', error);
            return this.renderErrorBubble(isOwn, 'Decryption failed', msg.timestamp);
        }
    }

    renderErrorBubble(isOwn, text, timestamp) {
        return `
      <div class="flex ${isOwn ? 'justify-end' : 'justify-start'} animate-fade-in">
        <div class="bg-red-500/20 text-red-200 border border-red-500/30 px-4 py-2 rounded-2xl text-sm italic">
          ⚠️ ${text}
        </div>
      </div>
    `;
    }

    setupEventListeners() {
        // ... (existing listeners) ...
        const backBtn = this.container.querySelector('.back-btn');
        backBtn.addEventListener('click', () => window.location.hash = '');

        const sendBtn = this.container.querySelector('.send-btn');
        sendBtn.addEventListener('click', () => this.sendMessage());

        const input = this.container.querySelector('#message-input');
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

        // Menu Toggle
        const menuBtn = this.container.querySelector('.menu-btn');
        const dropdown = this.container.querySelector('.menu-dropdown');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('hidden');
        });

        // Close menu on click outside
        this.documentClickHandler = () => {
            if (!dropdown.classList.contains('hidden')) dropdown.classList.add('hidden');
        };
        document.addEventListener('click', this.documentClickHandler);

        // Menu Actions
        this.container.querySelector('.view-contact-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showContactInfo();
            dropdown.classList.add('hidden');
        });

        this.container.querySelector('.edit-name-btn').addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent immediate closing which might feel weird, though not strictly necessary
            this.editName();
            dropdown.classList.add('hidden');
        });

        this.container.querySelector('.clear-chat-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.clearChat();
            dropdown.classList.add('hidden');
        });

        // Contact Info Modal Actions
        const modal = this.container.querySelector('#contact-modal');
        modal.querySelector('.close-modal-btn').addEventListener('click', () => modal.classList.add('hidden'));
        modal.querySelector('.edit-name-modal-btn').addEventListener('click', () => {
            this.editName();
            // Keep modal open or close? Let's keep open and update
        });
        modal.querySelector('.copy-id-btn').addEventListener('click', () => {
            if (this.contact) navigator.clipboard.writeText(this.contactId);
        });

        // Status updates
        this.statusHandler = (e) => {
            if (e.detail.peerId === this.contactId) this.updateStatus();
        };
        window.addEventListener('peer-connected', this.statusHandler);
        window.addEventListener('peer-disconnected', this.statusHandler);

        // Check status periodically as well? Events should suffice for now but initial check needed
        this.updateStatus();

        // File Attachment
        const attachBtn = this.container.querySelector('.attach-btn');
        const fileInput = this.container.querySelector('#file-input');
        attachBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this.sendAttachment(e.target.files[0]);
        });

        // Microphone
        const micBtn = this.container.querySelector('.mic-btn');
        micBtn.addEventListener('mousedown', () => this.startRecording());
        micBtn.addEventListener('mouseup', () => this.stopRecording());
        micBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.startRecording(); });
        micBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.stopRecording(); });
    }

    showContactInfo() {
        if (!this.contact) return;
        const modal = this.container.querySelector('#contact-modal');

        modal.querySelector('.modal-initials').textContent = this.contact.name.substring(0, 2).toUpperCase();
        modal.querySelector('.modal-name').textContent = this.contact.name;
        modal.querySelector('.modal-id').textContent = this.contactId;

        this.updateStatus();
        modal.classList.remove('hidden');
    }

    updateStatus() {
        const isOnline = isPeerConnected(this.contactId);
        const modal = this.container.querySelector('#contact-modal');
        const indicator = modal.querySelector('.status-indicator');
        const text = modal.querySelector('.status-text');

        if (isOnline) {
            indicator.classList.remove('bg-gray-500');
            indicator.classList.add('bg-green-500', 'shadow-glow');
            text.textContent = 'Online';
            text.classList.remove('text-gray-400');
            text.classList.add('text-green-400');
        } else {
            indicator.classList.remove('bg-green-500', 'shadow-glow');
            indicator.classList.add('bg-gray-500');
            text.textContent = 'Offline';
            text.classList.remove('text-green-400');
            text.classList.add('text-gray-400');
        }
    }

    async editName() {
        if (!this.contact) return;

        const newName = prompt('Enter new contact name:', this.contact.name);
        if (newName && newName.trim()) {
            await updateContactName(this.contactId, newName.trim());
            this.contact = await getContact(this.contactId);
            this.updateHeader();
        }
    }

    async clearChat() {
        if (confirm('Are you sure you want to clear this chat? This cannot be undone.')) {
            await clearMessages(this.contactId);
            await this.loadMessages();
        }
    }

    async startRecording() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];

            this.mediaRecorder.ondataavailable = (e) => this.audioChunks.push(e.data);

            this.mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                await this.sendAttachment(audioBlob, 'audio');
                stream.getTracks().forEach(track => track.stop());
            };

            this.mediaRecorder.start();
            this.isRecording = true;
            this.container.querySelector('.recording-indicator').classList.remove('hidden');
        } catch (error) {
            console.error('Mic error:', error);
            alert('Could not access microphone');
        }
    }

    stopRecording() {
        if (this.isRecording && this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
            this.isRecording = false;
            this.container.querySelector('.recording-indicator').classList.add('hidden');
        }
    }

    async sendAttachment(fileBlob, type = null) {
        if (!this.sharedKey) return;

        try {
            // Determine type if not provided
            if (!type) {
                if (fileBlob.type.startsWith('image/')) type = 'image';
                else if (fileBlob.type.startsWith('audio/')) type = 'audio';
                else type = 'file';
            }

            const arrayBuffer = await fileBlob.arrayBuffer();
            const { encrypted, iv } = await encryptBinary(arrayBuffer, this.sharedKey);

            const attachmentId = await saveAttachment(encrypted, iv, type);

            // Local display msg
            await saveMessage(this.contactId, type === 'image' ? '📷 Image' : (type === 'audio' ? '🎤 Audio' : '📎 File'), type, true, null, null, attachmentId);

            // Network send
            sendMessage(this.contactId, {
                type,
                blob: encrypted,
                iv,
                timestamp: Date.now()
            });

            await this.loadMessages();
        } catch (error) {
            console.error('Send attachment failed:', error);
            alert('Failed to send file');
        }
    }

    async sendMessage() {
        const input = this.container.querySelector('#message-input');
        const message = input.value.trim();

        if (!message || !this.sharedKey) return;

        try {
            const { encrypted, iv } = await encryptMessage(message, this.sharedKey);

            await saveMessage(this.contactId, message, 'text', true, encrypted, iv);

            sendMessage(this.contactId, {
                type: 'text',
                content: message,
                timestamp: Date.now(),
                encrypted,
                iv
            });

            input.value = '';
            input.style.height = '48px';
            await this.loadMessages();
        } catch (error) {
            console.error('Failed to send message:', error);
            alert('Failed to send message');
        }
    }

    scrollToBottom() {
        const container = this.container.querySelector('#messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
        }
    }

    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showError(message) {
        const container = this.container.querySelector('#messages-container');
        if (container) {
            container.innerHTML = `<p class="text-red-400 text-center p-4">${message}</p>`;
        }
    }

    cleanup() {
        if (this.messageHandler) window.removeEventListener('message-received', this.messageHandler);
        if (this.documentClickHandler) document.removeEventListener('click', this.documentClickHandler);
        if (this.statusHandler) {
            window.removeEventListener('peer-connected', this.statusHandler);
            window.removeEventListener('peer-disconnected', this.statusHandler);
        }

        // Revoke URLs
        this.container.querySelectorAll('audio, img').forEach(el => {
            if (el.src && el.src.startsWith('blob:')) URL.revokeObjectURL(el.src);
        });
    }
}
