const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const { Upload } = require('@aws-sdk/lib-storage');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const crypto = require('crypto');
const path = require('path');

const BUCKET_NAME = process.env.S3_BUCKET_NAME;

/**
 * Upload a file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - File MIME type
 * @param {string} folder - Optional folder prefix
 * @returns {Promise<{key: string, url: string}>}
 */
async function uploadFile(fileBuffer, originalFilename, mimeType, folder = '') {
    try {
        // Generate unique filename
        const fileExtension = path.extname(originalFilename);
        const uniqueId = crypto.randomBytes(16).toString('hex');
        const key = folder
            ? `${folder}/${uniqueId}${fileExtension}`
            : `${uniqueId}${fileExtension}`;

        // Use Upload for multipart upload (better for large files)
        const upload = new Upload({
            client: s3Client,
            params: {
                Bucket: BUCKET_NAME,
                Key: key,
                Body: fileBuffer,
                ContentType: mimeType,
            },
        });

        await upload.done();

        // Generate public URL (if bucket is public) or signed URL
        const url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        return { key, url };
    } catch (error) {
        console.error('Error uploading file to S3:', error);
        throw error;
    }
}

/**
 * Get a signed URL for a file (valid for 1 hour)
 * @param {string} key - S3 object key
 * @param {number} expiresIn - URL expiration in seconds (default: 3600)
 * @param {string} responseContentDisposition - Optional Content-Disposition header
 * @returns {Promise<string>}
 */
async function getFileUrl(key, expiresIn = 3600, responseContentDisposition = null) {
    try {
        const params = {
            Bucket: BUCKET_NAME,
            Key: key,
        };

        if (responseContentDisposition) {
            params.ResponseContentDisposition = responseContentDisposition;
        }

        const command = new GetObjectCommand(params);

        const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
        return signedUrl;
    } catch (error) {
        console.error('Error getting signed URL:', error);
        throw error;
    }
}

/**
 * Delete a file from S3
 * @param {string} key - S3 object key
 * @returns {Promise<void>}
 */
async function deleteFile(key) {
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });

        await s3Client.send(command);
    } catch (error) {
        console.error('Error deleting file from S3:', error);
        throw error;
    }
}

/**
 * List files in S3 bucket
 * @param {string} prefix - Optional prefix to filter files
 * @param {number} maxKeys - Maximum number of keys to return
 * @returns {Promise<Array>}
 */
async function listFiles(prefix = '', maxKeys = 100) {
    try {
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            Prefix: prefix,
            MaxKeys: maxKeys,
        });

        const response = await s3Client.send(command);
        return response.Contents || [];
    } catch (error) {
        console.error('Error listing files from S3:', error);
        throw error;
    }
}

module.exports = {
    uploadFile,
    getFileUrl,
    deleteFile,
    listFiles,
};
