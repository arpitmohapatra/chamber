/**
 * Cryptographic utilities for end-to-end encryption
 * Uses Web Crypto API with AES-GCM for message encryption
 */

// ===== IDENTITY & RECOVERY =====

/**
 * Generate a new identity (deterministic Public ID from random codes)
 * @returns {Promise<{publicId: string, codes: string[]}>}
 */
export async function createIdentity() {
    const codes = [];
    // Generate 12 random codes (each 8 hex chars = 4 bytes)
    for (let i = 0; i < 12; i++) {
        const bytes = crypto.getRandomValues(new Uint8Array(4));
        const code = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
        codes.push(code);
    }

    const publicId = await deriveIdentityFromCodes(codes);
    return { publicId, codes };
}

/**
 * Derive Public ID from recovery codes (Deterministic)
 * @param {string[]} codes 
 * @returns {Promise<string>}
 */
export async function deriveIdentityFromCodes(codes) {
    // Sort codes to ensure order matches if user mixes them up
    // But ideally we want strict order. Let's use sorted for robustness.
    const sortedCodes = [...codes].sort();
    const combined = sortedCodes.join('');

    const encoder = new TextEncoder();
    const data = encoder.encode(combined);

    // Hash to get Public ID
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const publicId = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return publicId;
}

/**
 * Hash recovery codes for secure storage
 * @param {string[]} codes 
 * @returns {Promise<string[]>}
 */
export async function hashRecoveryCodes(codes) {
    const hashed = [];
    for (const code of codes) {
        const encoder = new TextEncoder();
        const data = encoder.encode(code);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        hashed.push(hashArray.map(b => b.toString(16).padStart(2, '0')).join(''));
    }
    return hashed;
}

/**
 * Verify recovery codes against stored hashes
 */
export async function verifyRecoveryCodes(inputCodes, storedHashes) {
    if (inputCodes.length !== storedHashes.length) return false;

    const inputHashes = await hashRecoveryCodes(inputCodes);

    // Check if hashes match (using sorted comparison to be safe against order storage diffs)
    const sortedInput = [...inputHashes].sort();
    const sortedStored = [...storedHashes].sort();

    return sortedInput.every((hash, i) => hash === sortedStored[i]);
}

/**
 * Recover identity from codes (Alias for derive)
 */
export async function recoverIdentityFromCodes(codes) {
    return deriveIdentityFromCodes(codes);
}

// ===== ENCRYPTION KEYS =====

export async function generateKeyPair() {
    return await crypto.subtle.generateKey(
        {
            name: 'RSA-OAEP',
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: 'SHA-256',
        },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function generateSymmetricKey() {
    return await crypto.subtle.generateKey(
        {
            name: 'AES-GCM',
            length: 256,
        },
        true,
        ['encrypt', 'decrypt']
    );
}

export async function exportKey(key) {
    return await crypto.subtle.exportKey('jwk', key);
}

export async function importKey(keyData, type = 'symmetric') {
    if (type === 'symmetric') {
        return await crypto.subtle.importKey(
            'jwk', keyData, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']
        );
    } else if (type === 'private') {
        return await crypto.subtle.importKey(
            'jwk', keyData, { name: 'RSA-OAEP', hash: 'SHA-256' }, true, ['decrypt']
        );
    }
}

export async function deriveSharedKey(myId, peerId) {
    const combined = [myId, peerId].sort().join('');
    const encoder = new TextEncoder();
    const data = encoder.encode(combined);
    const keyMaterial = await crypto.subtle.digest('SHA-256', data);
    return await crypto.subtle.importKey(
        'raw', keyMaterial, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']
    );
}

// ===== MESSAGE ENCRYPTION =====

export async function encryptMessage(message, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        data
    );
    const encryptedArray = Array.from(new Uint8Array(encrypted));
    const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
    const ivArray = Array.from(iv);
    const ivBase64 = btoa(String.fromCharCode(...ivArray));
    return { encrypted: encryptedBase64, iv: ivBase64 };
}

export async function decryptMessage(encryptedBase64, ivBase64, key) {
    const encryptedString = atob(encryptedBase64);
    const encryptedData = new Uint8Array(encryptedString.length);
    for (let i = 0; i < encryptedString.length; i++) {
        encryptedData[i] = encryptedString.charCodeAt(i);
    }
    const ivString = atob(ivBase64);
    const iv = new Uint8Array(ivString.length);
    for (let i = 0; i < ivString.length; i++) {
        iv[i] = ivString.charCodeAt(i);
    }
    const decrypted = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv },
        key,
        encryptedData
    );
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
}

export async function encryptBinary(buffer, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encrypted = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv: iv }, key, buffer
    );
    return { encrypted, iv };
}

export async function decryptBinary(buffer, iv, key) {
    return await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: iv }, key, buffer
    );
}

// ===== DEPRECATED COMPATIBILITY =====
// These might be called by code I haven't updated yet.
// Redirecting them to new logic where possible.

export async function generateIdentity() {
    // Deprecated: used to return just ID string.
    // Now we need codes too. If called, it creates ID but throws bounded codes away (bad).
    // Should be avoided.
    const { publicId } = await createIdentity();
    return publicId;
}

export async function generateRecoveryCodes(publicId) {
    // Deprecated: Was used to gen codes from ID.
    // Now codes gen ID.
    // If called, we must fail or return mock?
    // Failing is safer to catch bugs.
    throw new Error("generateRecoveryCodes is deprecated. Use createIdentity to generate codes and ID together.");
}
