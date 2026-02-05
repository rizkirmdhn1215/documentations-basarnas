const sharp = require('sharp');
const { uploadFile } = require('./s3Helper');

/**
 * Generate a preview/thumbnail for an image
 * @param {Buffer} buffer - Original image buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{buffer: Buffer, filename: string}>}
 */
async function generateImagePreview(buffer, filename) {
    const previewBuffer = await sharp(buffer)
        .resize(800, 800, {
            fit: 'inside',
            withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toBuffer();

    const previewFilename = `preview_${filename.replace(/\.[^.]+$/, '.jpg')}`;

    return {
        buffer: previewBuffer,
        filename: previewFilename
    };
}

/**
 * Generate a thumbnail for a video (first frame)
 * For now, we'll use a placeholder approach
 * In production, you'd use ffmpeg or similar
 * @param {Buffer} buffer - Original video buffer
 * @param {string} filename - Original filename
 * @returns {Promise<{buffer: Buffer, filename: string}>}
 */
async function generateVideoPreview(buffer, filename) {
    // TODO: Implement video thumbnail generation with ffmpeg
    // For now, return a small placeholder
    const placeholderBuffer = await sharp({
        create: {
            width: 400,
            height: 300,
            channels: 3,
            background: { r: 154, g: 205, b: 50 } // BASARNAS yellow-green
        }
    })
        .png()
        .toBuffer();

    const previewFilename = `preview_${filename.replace(/\.[^.]+$/, '.png')}`;

    return {
        buffer: placeholderBuffer,
        filename: previewFilename
    };
}

/**
 * Upload both preview and original versions of a media file
 * @param {Buffer} originalBuffer - Original file buffer
 * @param {string} originalFilename - Original filename
 * @param {string} mimeType - File MIME type
 * @returns {Promise<{preview: Object, original: Object}>}
 */
async function uploadMediaWithPreview(originalBuffer, originalFilename, mimeType) {
    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    let previewData;

    if (isImage) {
        previewData = await generateImagePreview(originalBuffer, originalFilename);
    } else if (isVideo) {
        previewData = await generateVideoPreview(originalBuffer, originalFilename);
    } else {
        throw new Error('Unsupported file type. Only images and videos are allowed.');
    }

    // Upload preview
    const previewResult = await uploadFile(
        previewData.buffer,
        previewData.filename,
        isImage ? 'image/jpeg' : 'image/png'
    );

    // Upload original
    const originalResult = await uploadFile(
        originalBuffer,
        originalFilename,
        mimeType
    );

    return {
        preview: previewResult,
        original: originalResult
    };
}

module.exports = {
    generateImagePreview,
    generateVideoPreview,
    uploadMediaWithPreview
};
