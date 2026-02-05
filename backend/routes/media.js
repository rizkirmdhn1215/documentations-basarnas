const { uploadMediaWithPreview } = require('../utils/mediaHelper');
const { getFileUrl, deleteFile } = require('../utils/s3Helper');

async function mediaRoutes(fastify, options) {

    // Get all years that have media
    fastify.get('/api/media/years', async (request, reply) => {
        try {
            const result = await fastify.db.query(`
        SELECT DISTINCT year 
        FROM media_items 
        ORDER BY year DESC
      `);

            return {
                success: true,
                years: result.rows.map(row => row.year)
            };
        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Get all months for a specific year
    fastify.get('/api/media/:year/months', async (request, reply) => {
        try {
            const { year } = request.params;

            const result = await fastify.db.query(`
        SELECT DISTINCT month, COUNT(*) as count
        FROM media_items 
        WHERE year = $1
        GROUP BY month
        ORDER BY month DESC
      `, [year]);

            return {
                success: true,
                year: parseInt(year),
                months: result.rows.map(row => ({
                    month: row.month,
                    count: parseInt(row.count)
                }))
            };
        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Get all distinct tags
    fastify.get('/api/tags', async (request, reply) => {
        try {
            const result = await fastify.db.query(`
                SELECT DISTINCT unnest(tags) as tag 
                FROM media_items 
                ORDER BY tag ASC
            `);

            return {
                success: true,
                tags: result.rows.map(row => row.tag)
            };
        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Get all media items for a specific year/month with signed URLs
    fastify.get('/api/media/:year/:month', async (request, reply) => {
        try {
            const { year, month } = request.params;

            const result = await fastify.db.query(`
        SELECT 
          id, 
          original_name, 
          file_type, 
          preview_s3_key,
          original_s3_key,
          original_file_size, 
          media_date,
          description,
          tags
        FROM media_items 
        WHERE year = $1 AND month = $2
        ORDER BY media_date DESC, upload_timestamp DESC
      `, [year, month]);

            // Generate signed URLs for each media item
            const mediaWithUrls = await Promise.all(
                result.rows.map(async (item) => {
                    const previewUrl = await getFileUrl(item.preview_s3_key, 3600);
                    const originalUrl = await getFileUrl(item.original_s3_key, 3600);
                    const downloadUrl = await getFileUrl(item.original_s3_key, 3600, 'attachment');

                    return {
                        id: item.id,
                        original_name: item.original_name,
                        file_type: item.file_type,
                        preview_s3_url: previewUrl,
                        original_s3_url: originalUrl,
                        download_s3_url: downloadUrl,
                        original_file_size: item.original_file_size,
                        media_date: item.media_date,
                        description: item.description,
                        tags: item.tags
                    };
                })
            );

            return {
                success: true,
                year: parseInt(year),
                month: parseInt(month),
                count: mediaWithUrls.length,
                media: mediaWithUrls
            };
        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Upload new media with metadata
    fastify.post('/api/media/upload', async (request, reply) => {
        try {
            const parts = request.parts();

            let fileBuffer;
            let filename;
            let mimeType;
            let fields = {};

            for await (const part of parts) {
                if (part.file) {
                    // It's a file
                    filename = part.filename;
                    mimeType = part.mimetype;
                    fileBuffer = await part.toBuffer();
                } else {
                    // It's a field
                    fields[part.fieldname] = part.value;
                }
            }

            if (!fileBuffer) {
                reply.code(400);
                return { success: false, error: 'No file uploaded' };
            }

            console.log("Received fields:", fields); // Debug log
            console.log("Raw Tags:", fields.tags);

            const mediaDate = fields.date || new Date().toISOString().split('T')[0];
            const tags = fields.tags ? JSON.parse(fields.tags) : [];
            console.log("Parsed Tags:", tags);
            const description = fields.description || null;

            // Validate file type
            if (!mimeType.startsWith('image/') && !mimeType.startsWith('video/')) {
                reply.code(400);
                return {
                    success: false,
                    error: 'Only images and videos are allowed'
                };
            }

            // Upload both preview and original
            const uploadResult = await uploadMediaWithPreview(
                fileBuffer,
                filename,
                mimeType
            );

            // Extract year and month from date
            const date = new Date(mediaDate);
            const year = date.getFullYear();
            const month = date.getMonth() + 1;

            // Determine file type
            const fileType = mimeType.startsWith('image/') ? 'image' : 'video';

            // Insert into database
            const result = await fastify.db.query(`
        INSERT INTO media_items (
          filename,
          original_name,
          file_type,
          mime_type,
          preview_s3_key,
          preview_s3_url,
          preview_file_size,
          original_s3_key,
          original_s3_url,
          original_file_size,
          media_date,
          year,
          month,
          description,
          tags
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *
      `, [
                uploadResult.original.key,
                filename,
                fileType,
                mimeType,
                uploadResult.preview.key,
                '', // Empty URL
                uploadResult.preview.size || fileBuffer.length,
                uploadResult.original.key,
                '', // Empty URL
                fileBuffer.length,
                mediaDate,
                year,
                month,
                description,
                tags
            ]);

            return {
                success: true,
                message: 'Media uploaded successfully',
                media: result.rows[0]
            };

        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Get media by tags with signed URLs
    fastify.get('/api/media/search/tags', async (request, reply) => {
        try {
            const { tags } = request.query;

            if (!tags) {
                reply.code(400);
                return { success: false, error: 'Tags parameter required' };
            }

            const tagArray = Array.isArray(tags) ? tags : [tags];

            const result = await fastify.db.query(`
        SELECT 
          id, 
          original_name, 
          file_type, 
          preview_s3_key,
          original_s3_key,
          media_date,
          description,
          tags,
          year,
          month
        FROM media_items 
        WHERE tags && $1
        ORDER BY media_date DESC
      `, [tagArray]);

            // Generate signed URLs
            const mediaWithUrls = await Promise.all(
                result.rows.map(async (item) => {
                    const previewUrl = await getFileUrl(item.preview_s3_key, 3600);
                    const originalUrl = await getFileUrl(item.original_s3_key, 3600);

                    return {
                        ...item,
                        preview_s3_url: previewUrl,
                        original_s3_url: originalUrl
                    };
                })
            );

            return {
                success: true,
                count: mediaWithUrls.length,
                media: mediaWithUrls
            };
        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return {
                success: false,
                error: error.message
            };
        }
    });

    // Update media tags
    fastify.put('/api/media/:id/tags', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { id } = request.params;
            const { tags } = request.body;

            if (!Array.isArray(tags)) {
                reply.code(400);
                return { success: false, error: 'Tags must be an array' };
            }

            const result = await fastify.db.query(
                'UPDATE media_items SET tags = $1 WHERE id = $2 RETURNING *',
                [tags, id]
            );

            if (result.rows.length === 0) {
                reply.code(404);
                return { success: false, error: 'Media not found' };
            }

            return { success: true, media: result.rows[0] };
        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return { success: false, error: error.message };
        }
    });

    // Delete media
    fastify.delete('/api/media/:id', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        try {
            const { id } = request.params;

            // Get S3 keys first
            const result = await fastify.db.query('SELECT * FROM media_items WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                reply.code(404);
                return { success: false, error: 'Media not found' };
            }

            const item = result.rows[0];

            // Delete from S3
            if (item.original_s3_key) await deleteFile(item.original_s3_key);
            if (item.preview_s3_key) await deleteFile(item.preview_s3_key);

            // Delete from DB
            await fastify.db.query('DELETE FROM media_items WHERE id = $1', [id]);

            return { success: true, message: 'Media deleted successfully' };
        } catch (error) {
            fastify.log.error(error);
            reply.code(500);
            return { success: false, error: error.message };
        }
    });

}
module.exports = mediaRoutes;
