const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

// Temp storage directory
const TEMP_DIR = path.join(__dirname, '../temp_uploads');
const SESSION_TIMEOUT = 60 * 60 * 1000; // 1 hour in milliseconds

/**
 * Initialize temp storage directory
 */
async function initTempStorage() {
    try {
        await fs.mkdir(TEMP_DIR, { recursive: true });
        console.log('Temp storage directory initialized:', TEMP_DIR);
    } catch (error) {
        console.error('Error creating temp directory:', error);
        throw error;
    }
}

/**
 * Generate a unique session ID
 */
function generateSessionId() {
    return `session_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Generate a unique file ID
 */
function generateFileId() {
    return `file_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
}

/**
 * Save file to temp storage
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - MIME type
 * @param {string} sessionId - Session ID
 * @returns {Object} File metadata
 */
async function saveTempFile(fileBuffer, originalFilename, mimeType, sessionId) {
    try {
        // Create session directory if it doesn't exist
        const sessionDir = path.join(TEMP_DIR, sessionId);
        await fs.mkdir(sessionDir, { recursive: true });

        // Generate unique file ID
        const fileId = generateFileId();
        const ext = path.extname(originalFilename);
        const filename = `${fileId}${ext}`;
        const filePath = path.join(sessionDir, filename);

        // Save file
        await fs.writeFile(filePath, fileBuffer);

        // Create metadata
        const metadata = {
            fileId,
            sessionId,
            originalFilename,
            filename,
            filePath,
            mimeType,
            size: fileBuffer.length,
            uploadedAt: new Date().toISOString()
        };

        // Save metadata
        const metadataPath = path.join(sessionDir, `${fileId}.json`);
        await fs.writeFile(metadataPath, JSON.stringify(metadata, null, 2));

        return metadata;
    } catch (error) {
        console.error('Error saving temp file:', error);
        throw error;
    }
}

/**
 * Get temp file
 * @param {string} sessionId - Session ID
 * @param {string} fileId - File ID
 * @returns {Object} File data with buffer and metadata
 */
async function getTempFile(sessionId, fileId) {
    try {
        const sessionDir = path.join(TEMP_DIR, sessionId);
        const metadataPath = path.join(sessionDir, `${fileId}.json`);

        // Read metadata
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        // Read file buffer
        const fileBuffer = await fs.readFile(metadata.filePath);

        return {
            buffer: fileBuffer,
            metadata
        };
    } catch (error) {
        console.error('Error reading temp file:', error);
        throw error;
    }
}

/**
 * Get all files in a session
 * @param {string} sessionId - Session ID
 * @returns {Array} Array of file metadata
 */
async function getSessionFiles(sessionId) {
    try {
        const sessionDir = path.join(TEMP_DIR, sessionId);

        // Check if session exists
        try {
            await fs.access(sessionDir);
        } catch {
            return [];
        }

        const files = await fs.readdir(sessionDir);
        const metadataFiles = files.filter(f => f.endsWith('.json'));

        const filesMetadata = await Promise.all(
            metadataFiles.map(async (file) => {
                const content = await fs.readFile(path.join(sessionDir, file), 'utf-8');
                return JSON.parse(content);
            })
        );

        return filesMetadata;
    } catch (error) {
        console.error('Error getting session files:', error);
        throw error;
    }
}

/**
 * Delete a specific temp file
 * @param {string} sessionId - Session ID
 * @param {string} fileId - File ID
 */
async function deleteTempFile(sessionId, fileId) {
    try {
        const sessionDir = path.join(TEMP_DIR, sessionId);
        const metadataPath = path.join(sessionDir, `${fileId}.json`);

        // Read metadata to get file path
        const metadataContent = await fs.readFile(metadataPath, 'utf-8');
        const metadata = JSON.parse(metadataContent);

        // Delete file and metadata
        await fs.unlink(metadata.filePath);
        await fs.unlink(metadataPath);

        console.log(`Deleted temp file: ${fileId}`);
    } catch (error) {
        console.error('Error deleting temp file:', error);
        throw error;
    }
}

/**
 * Delete entire session and all its files
 * @param {string} sessionId - Session ID
 */
async function deleteSession(sessionId) {
    try {
        const sessionDir = path.join(TEMP_DIR, sessionId);

        // Check if session exists
        try {
            await fs.access(sessionDir);
        } catch {
            console.log(`Session ${sessionId} does not exist`);
            return;
        }

        // Delete entire directory
        await fs.rm(sessionDir, { recursive: true, force: true });
        console.log(`Deleted session: ${sessionId}`);
    } catch (error) {
        console.error('Error deleting session:', error);
        throw error;
    }
}

/**
 * Clean up abandoned sessions (older than SESSION_TIMEOUT)
 */
async function cleanupAbandonedSessions() {
    try {
        const sessions = await fs.readdir(TEMP_DIR);
        const now = Date.now();
        let cleanedCount = 0;

        for (const sessionId of sessions) {
            const sessionDir = path.join(TEMP_DIR, sessionId);
            const stats = await fs.stat(sessionDir);

            // Check if session is older than timeout
            const age = now - stats.mtimeMs;
            if (age > SESSION_TIMEOUT) {
                await deleteSession(sessionId);
                cleanedCount++;
            }
        }

        console.log(`Cleaned up ${cleanedCount} abandoned sessions`);
        return cleanedCount;
    } catch (error) {
        console.error('Error cleaning up sessions:', error);
        throw error;
    }
}

module.exports = {
    initTempStorage,
    generateSessionId,
    generateFileId,
    saveTempFile,
    getTempFile,
    getSessionFiles,
    deleteTempFile,
    deleteSession,
    cleanupAbandonedSessions,
    TEMP_DIR
};
