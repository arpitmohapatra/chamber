/**
 * Network manager for P2P messaging using PeerJS
 */

import Peer from 'peerjs';
import { getIdentity, saveMessage, saveImage, queueMessage, getQueuedMessages, removeQueuedMessage } from './storage.js';

let peer = null;
let connections = new Map(); // Map<publicId, DataConnection>
let incomingHandler = null;

/**
 * Initialize the network manager
 * @param {Function} onMessageReceived - Callback when a message is received
 */
export async function initNetwork(onMessageReceived) {
    if (peer) return peer;

    try {
        const identity = await getIdentity();
        if (!identity) {
            console.log('No identity found, skipping network init');
            return null;
        }

        incomingHandler = onMessageReceived;

        // Initialize PeerJS with the public ID as the peer ID
        peer = new Peer(identity.publicId, {
            debug: 2,
            config: {
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        peer.on('open', (id) => {
            console.log('My peer ID is: ' + id);
        });

        peer.on('connection', (conn) => {
            handleConnection(conn);
        });

        peer.on('error', (err) => {
            console.error('PeerJS error:', err);
        });

        return peer;
    } catch (error) {
        console.error('Failed to initialize network:', error);
        return null;
    }
}

/**
 * Handle incoming connection
 */
function handleConnection(conn) {
    const peerId = conn.peer;

    // Store connection
    connections.set(peerId, conn);

    const onOpen = () => {
        console.log('Connection opened/active with:', peerId);
        // Replay any queued messages for this peer
        replayQueuedMessages(peerId);

        // Notify UI
        window.dispatchEvent(new CustomEvent('peer-connected', { detail: { peerId } }));
    };

    if (conn.open) {
        onOpen();
    } else {
        conn.on('open', onOpen);
    }

    conn.on('data', async (data) => {
        console.log('Received data:', data);

        try {
            await handleIncomingData(peerId, data);
        } catch (error) {
            console.error('Error handling incoming data:', error);
        }
    });

    conn.on('close', () => {
        console.log('Connection closed:', peerId);
        connections.delete(peerId);
        window.dispatchEvent(new CustomEvent('peer-disconnected', { detail: { peerId } }));
    });

    conn.on('error', (err) => {
        console.error('Connection error:', err);
        connections.delete(peerId); // clean up
        window.dispatchEvent(new CustomEvent('peer-disconnected', { detail: { peerId } }));
    });
}

/**
 * Replay queued messages for a contact
 */
async function replayQueuedMessages(contactId) {
    try {
        const queuedMessages = await getQueuedMessages(contactId);
        if (queuedMessages.length === 0) return;

        console.log(`Replaying ${queuedMessages.length} messages to ${contactId}`);

        for (const msg of queuedMessages) {
            const success = await sendMessage(contactId, msg.messageData, false); // false = don't queue again
            if (success) {
                await removeQueuedMessage(msg.id);
            }
        }
    } catch (error) {
        console.error('Error replaying messages:', error);
    }
}

/**
 * Handle incoming data payload
 */
async function handleIncomingData(senderId, data) {
    // Expected format: { type, content, timestamp, encrypted, iv, imageId }

    // Save to local storage
    if (data.type === 'text') {
        await saveMessage(
            senderId,
            data.content,
            'text',
            false, // sent = false (received)
            data.encrypted,
            data.iv
        );
    } else if (data.type === 'image' || data.type === 'audio' || data.type === 'file') {
        if (data.blob) {
            const attachmentId = await saveImage(data.blob, data.iv, data.type);
            await saveMessage(
                senderId,
                data.type === 'image' ? '📷 Image' : (data.type === 'audio' ? '🎤 Audio' : '📎 File'),
                data.type,
                false,
                null,
                null,
                attachmentId
            );
        }
    }

    // Notify UI if handler is registered
    if (incomingHandler) {
        incomingHandler(senderId, data);
    }
}

/**
 * Connect to a peer
 */
export async function connectToPeer(peerId) {
    if (!peer) {
        console.warn('Network not initialized');
        return null;
    }

    if (connections.has(peerId)) {
        const conn = connections.get(peerId);
        if (conn.open) return conn;
        connections.delete(peerId); // Remove if closed
    }

    const conn = peer.connect(peerId, { reliable: true });

    return new Promise((resolve, reject) => {
        conn.on('open', () => {
            console.log('Connected to:', peerId);
            connections.set(peerId, conn);
            handleConnection(conn); // Set up listeners (includes replay)
            resolve(conn);
        });

        conn.on('error', (err) => {
            console.error('Connection failed:', err);
            reject(err);
        });

        // Timeout
        setTimeout(() => {
            if (!conn.open) {
                reject(new Error('Connection timeout'));
            }
        }, 5000);
    });
}

/**
 * Send a message to a peer
 * @param {string} peerId 
 * @param {object} messageData 
 * @param {boolean} shouldQueue - Whether to queue if offline (default true)
 */
export async function sendMessage(peerId, messageData, shouldQueue = true) {
    try {
        let conn = connections.get(peerId);

        // Try to connect if not connected
        if (!conn || !conn.open) {
            try {
                conn = await connectToPeer(peerId);
            } catch (err) {
                console.warn(`Could not connect to ${peerId} to send message`);
            }
        }

        if (conn && conn.open) {
            conn.send(messageData);
            return true;
        } else {
            throw new Error('Connection failed');
        }
    } catch (error) {
        console.error('Failed to send message:', error);

        if (shouldQueue) {
            console.log('Queueing message for offline delivery');
            await queueMessage(peerId, messageData);
        }
        return false;
    }
}

/**
 * Check if a peer is connected
 */
export function isPeerConnected(peerId) {
    const conn = connections.get(peerId);
    return !!(conn && conn.open);
}

/**
 * Get network status
 */
export function getNetworkStatus() {
    return {
        online: !!peer && !peer.disconnected,
        connections: connections.size,
        peerId: peer ? peer.id : null
    };
}
