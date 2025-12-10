/**
 * IndexedDB wrapper for local storage
 * Stores user identity, contacts, messages, and encrypted images
 */

import { openDB } from 'idb';

const DB_NAME = 'chamber-db';
const DB_VERSION = 1;

let dbInstance = null;

/**
 * Initialize and get database instance
 */
async function getDB() {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
            // Identity store
            if (!db.objectStoreNames.contains('identity')) {
                db.createObjectStore('identity', { keyPath: 'id' });
            }

            // Contacts store
            if (!db.objectStoreNames.contains('contacts')) {
                const contactStore = db.createObjectStore('contacts', { keyPath: 'publicId' });
                contactStore.createIndex('addedAt', 'addedAt');
                contactStore.createIndex('lastMessageTime', 'lastMessageTime');
            }

            // Messages store
            if (!db.objectStoreNames.contains('messages')) {
                const messageStore = db.createObjectStore('messages', { keyPath: 'id', autoIncrement: true });
                messageStore.createIndex('contactId', 'contactId');
                messageStore.createIndex('timestamp', 'timestamp');
            }

            // Images store
            if (!db.objectStoreNames.contains('images')) {
                const imageStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
                imageStore.createIndex('messageId', 'messageId');
            }

            // Keys store (for encryption keys)
            if (!db.objectStoreNames.contains('keys')) {
                db.createObjectStore('keys', { keyPath: 'contactId' });
            }
        },
    });

    return dbInstance;
}

// ===== IDENTITY MANAGEMENT =====

/**
 * Save user identity
 */
export async function saveIdentity(publicId, privateKey, recoveryCodes = null, displayName = null) {
    const db = await getDB();
    await db.put('identity', {
        id: 'user',
        publicId,
        privateKey,
        recoveryCodes,
        displayName,
        createdAt: Date.now(),
    });
}

/**
 * Update user display name
 */
export async function updateIdentityName(displayName) {
    const db = await getDB();
    const identity = await db.get('identity', 'user');
    if (identity) {
        identity.displayName = displayName;
        await db.put('identity', identity);
    }
}

/**
 * Get user identity
 */
export async function getIdentity() {
    const db = await getDB();
    return await db.get('identity', 'user');
}

/**
 * Get recovery codes for user
 */
export async function getRecoveryCodes() {
    const db = await getDB();
    const identity = await db.get('identity', 'user');
    return identity ? identity.recoveryCodes : null;
}

// ===== CONTACT MANAGEMENT =====

/**
 * Add a new contact
 */
export async function addContact(publicId, name = null) {
    const db = await getDB();

    // Check if contact already exists
    const existing = await db.get('contacts', publicId);
    if (existing) {
        throw new Error('Contact already exists');
    }

    await db.put('contacts', {
        publicId,
        name: name || `User ${publicId.substring(0, 8)}`,
        addedAt: Date.now(),
        lastMessage: null,
        lastMessageTime: 0,
        unreadCount: 0,
    });
}

/**
 * Get all contacts
 */
export async function getContacts() {
    const db = await getDB();
    const contacts = await db.getAllFromIndex('contacts', 'lastMessageTime');
    return contacts.reverse(); // Most recent first
}

/**
 * Get a specific contact
 */
export async function getContact(publicId) {
    const db = await getDB();
    return await db.get('contacts', publicId);
}

/**
 * Update contact's last message
 */
export async function updateContactLastMessage(publicId, message, timestamp) {
    const db = await getDB();
    const contact = await db.get('contacts', publicId);

    if (contact) {
        contact.lastMessage = message;
        contact.lastMessageTime = timestamp;
        await db.put('contacts', contact);
    }
}

/**
 * Update contact name
 */
export async function updateContactName(publicId, name) {
    const db = await getDB();
    const contact = await db.get('contacts', publicId);

    if (contact) {
        contact.name = name;
        await db.put('contacts', contact);
    }
}

/**
 * Delete a contact and all associated messages
 */
export async function deleteContact(publicId) {
    const db = await getDB();

    // Delete contact
    await db.delete('contacts', publicId);

    // Delete all messages with this contact
    const messages = await db.getAllFromIndex('messages', 'contactId', publicId);
    for (const message of messages) {
        await db.delete('messages', message.id);

        // Delete associated images
        if (message.imageId) {
            await db.delete('images', message.imageId);
        }
    }

    // Delete encryption key
    await db.delete('keys', publicId);
}

// ===== MESSAGE MANAGEMENT =====

/**
 * Save a message
 */
export async function saveMessage(contactId, content, type = 'text', sent = true, encrypted = null, iv = null, imageId = null) {
    const db = await getDB();
    const timestamp = Date.now();

    const message = {
        contactId,
        content,
        type, // 'text' or 'image'
        sent, // true if sent by user, false if received
        encrypted,
        iv,
        imageId,
        timestamp,
    };

    const id = await db.add('messages', message);

    // Update contact's last message
    await updateContactLastMessage(contactId, type === 'text' ? content : '📷 Image', timestamp);

    return id;
}

/**
 * Get all messages for a contact
 */
export async function getMessages(contactId) {
    const db = await getDB();
    const messages = await db.getAllFromIndex('messages', 'contactId', contactId);
    return messages.sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Delete a message
 */
export async function deleteMessage(messageId) {
    const db = await getDB();
    const message = await db.get('messages', messageId);

    if (message && message.imageId) {
        await db.delete('images', message.imageId);
    }

    await db.delete('messages', messageId);
}

// ===== IMAGE MANAGEMENT =====

/**
 * Save an encrypted image
 */
export async function saveImage(blob, iv) {
    const db = await getDB();

    return await db.add('images', {
        blob,
        iv: Array.from(iv), // Convert Uint8Array to regular array for storage
        createdAt: Date.now(),
    });
}

/**
 * Get an image
 */
export async function getImage(imageId) {
    const db = await getDB();
    return await db.get('images', imageId);
}

// ===== KEY MANAGEMENT =====

/**
 * Save encryption key for a contact
 */
export async function saveKey(contactId, keyData) {
    const db = await getDB();
    await db.put('keys', {
        contactId,
        keyData,
        createdAt: Date.now(),
    });
}

/**
 * Get encryption key for a contact
 */
export async function getKey(contactId) {
    const db = await getDB();
    const result = await db.get('keys', contactId);
    return result ? result.keyData : null;
}

// ===== UTILITY FUNCTIONS =====

/**
 * Clear all data (for testing or reset)
 */
export async function clearAllData() {
    const db = await getDB();

    await db.clear('identity');
    await db.clear('contacts');
    await db.clear('messages');
    await db.clear('images');
    await db.clear('keys');
}

/**
 * Export all data for backup
 */
export async function exportData() {
    const db = await getDB();

    return {
        identity: await db.getAll('identity'),
        contacts: await db.getAll('contacts'),
        messages: await db.getAll('messages'),
        images: await db.getAll('images'),
        keys: await db.getAll('keys'),
        exportedAt: Date.now(),
    };
}

/**
 * Import data from backup
 */
export async function importData(data) {
    const db = await getDB();

    // Clear existing data
    await clearAllData();

    // Import identity
    for (const item of data.identity || []) {
        await db.put('identity', item);
    }

    // Import contacts
    for (const item of data.contacts || []) {
        await db.put('contacts', item);
    }

    // Import messages
    for (const item of data.messages || []) {
        await db.put('messages', item);
    }

    // Import images
    for (const item of data.images || []) {
        await db.put('images', item);
    }

    // Import keys
    for (const item of data.keys || []) {
        await db.put('keys', item);
    }
}
