/**
 * QR Code utilities for sharing and scanning public IDs
 */

import QRCode from 'qrcode';
import { Html5Qrcode } from 'html5-qrcode';

let qrScanner = null;

/**
 * Generate a QR code from a public ID
 * @param {string} publicId - User's public ID
 * @param {HTMLCanvasElement} canvas - Canvas element to render QR code
 * @returns {Promise<void>}
 */
export async function generateQRCode(publicId, canvas) {
    try {
        await QRCode.toCanvas(canvas, publicId, {
            width: 300,
            margin: 2,
            color: {
                dark: '#6366f1',
                light: '#1a1a2e',
            },
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
}

/**
 * Generate a QR code as a data URL
 * @param {string} publicId - User's public ID
 * @returns {Promise<string>} Data URL of the QR code
 */
export async function generateQRCodeDataURL(publicId) {
    try {
        return await QRCode.toDataURL(publicId, {
            width: 300,
            margin: 2,
            color: {
                dark: '#6366f1',
                light: '#1a1a2e',
            },
        });
    } catch (error) {
        console.error('Error generating QR code:', error);
        throw error;
    }
}

/**
 * Initialize QR code scanner
 * @param {string} elementId - ID of the element to render scanner
 * @param {Function} onSuccess - Callback when QR code is scanned
 * @param {Function} onError - Callback for errors
 * @returns {Promise<Html5Qrcode>}
 */
export async function initQRScanner(elementId, onSuccess, onError) {
    try {
        qrScanner = new Html5Qrcode(elementId);

        const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
        };

        await qrScanner.start(
            { facingMode: 'environment' },
            config,
            (decodedText) => {
                onSuccess(decodedText);
            },
            (errorMessage) => {
                // Ignore frequent scanning errors
                if (!errorMessage.includes('NotFoundException')) {
                    console.warn('QR scan error:', errorMessage);
                }
            }
        );

        return qrScanner;
    } catch (error) {
        console.error('Error initializing QR scanner:', error);
        if (onError) onError(error);
        throw error;
    }
}

/**
 * Stop QR code scanner
 * @returns {Promise<void>}
 */
export async function stopQRScanner() {
    if (qrScanner) {
        try {
            await qrScanner.stop();
            qrScanner = null;
        } catch (error) {
            console.error('Error stopping QR scanner:', error);
        }
    }
}

/**
 * Check if camera is available
 * @returns {Promise<boolean>}
 */
export async function isCameraAvailable() {
    try {
        const devices = await Html5Qrcode.getCameras();
        return devices && devices.length > 0;
    } catch (error) {
        console.error('Error checking camera availability:', error);
        return false;
    }
}

/**
 * Request camera permission
 * @returns {Promise<boolean>}
 */
export async function requestCameraPermission() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        // Stop the stream immediately, we just needed permission
        stream.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Camera permission denied:', error);
        return false;
    }
}
