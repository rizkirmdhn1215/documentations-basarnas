const fastify = require('fastify')({ logger: true });
const cors = require('@fastify/cors');
const multipart = require('@fastify/multipart');
const databasePlugin = require('./plugins/database');
const { uploadFile, getFileUrl, deleteFile, listFiles } = require('./utils/s3Helper');
const tempStorage = require('./utils/tempStorage');
require('dotenv').config();

const PORT = process.env.PORT || 3000;

// Register CORS
fastify.register(cors, {
    origin: true, // Allow all origins in development
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// Register multipart for file uploads
fastify.register(multipart, {
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB max file size for videos
    },
});

// Register database plugin
fastify.register(databasePlugin);

// Register media routes
const mediaRoutes = require('./routes/media');
fastify.register(mediaRoutes);

// Register Auth Routes
const authRoutes = require('./routes/auth');
fastify.register(authRoutes);

// Register JWT
fastify.register(require('@fastify/jwt'), {
    secret: process.env.JWT_SECRET || 'supersecret'
});

// Auth Decorator
fastify.decorate("authenticate", async function (request, reply) {
    try {
        await request.jwtVerify();
    } catch (err) {
        reply.send(err);
    }
});

// Health check route
fastify.get('/', async (request, reply) => {
    return {
        status: 'ok',
        message: 'Fastify server with AWS RDS and S3 is running!',
        timestamp: new Date().toISOString()
    };
});

// ==================== DATABASE ROUTES ====================

// Database health check
fastify.get('/api/db/health', async (request, reply) => {
    try {
        const result = await fastify.db.query('SELECT version()');
        return {
            status: 'ok',
            database: 'connected',
            version: result.rows[0].version
        };
    } catch (error) {
        reply.code(500);
        return {
            status: 'error',
            database: 'disconnected',
            error: error.message
        };
    }
});

// Example: Get all records from a table
fastify.get('/api/db/query', async (request, reply) => {
    try {
        // Example query - replace with your actual table
        const result = await fastify.db.query('SELECT NOW() as current_time, version() as db_version');
        return {
            success: true,
            data: result.rows
        };
    } catch (error) {
        reply.code(500);
        return {
            success: false,
            error: error.message
        };
    }
});

// Example: Insert data into database
fastify.post('/api/db/insert', async (request, reply) => {
    try {
        const { table, data } = request.body;

        // This is a simplified example - in production, use parameterized queries
        // and validate input thoroughly
        const keys = Object.keys(data);
        const values = Object.values(data);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');

        const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const result = await fastify.db.query(query, values);

        return {
            success: true,
            data: result.rows[0]
        };
    } catch (error) {
        reply.code(500);
        return {
            success: false,
            error: error.message
        };
    }
});

// ==================== S3 ROUTES ====================

// Upload file to S3
fastify.post('/api/s3/upload', async (request, reply) => {
    try {
        const data = await request.file();

        if (!data) {
            reply.code(400);
            return { success: false, error: 'No file uploaded' };
        }

        const buffer = await data.toBuffer();
        const result = await uploadFile(buffer, data.filename, data.mimetype);

        return {
            success: true,
            message: 'File uploaded successfully',
            file: {
                key: result.key,
                url: result.url,
                originalName: data.filename,
                mimeType: data.mimetype,
                size: buffer.length
            }
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

// Get signed URL for a file
fastify.get('/api/s3/file/:key', async (request, reply) => {
    try {
        const { key } = request.params;
        const signedUrl = await getFileUrl(key);

        return {
            success: true,
            url: signedUrl,
            expiresIn: '1 hour'
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

// Delete file from S3
fastify.delete('/api/s3/file/:key', async (request, reply) => {
    try {
        const { key } = request.params;
        await deleteFile(key);

        return {
            success: true,
            message: 'File deleted successfully'
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

// List files in S3
fastify.get('/api/s3/files', async (request, reply) => {
    try {
        const { prefix, maxKeys } = request.query;
        const files = await listFiles(prefix, maxKeys ? parseInt(maxKeys) : 100);

        return {
            success: true,
            count: files.length,
            files: files.map(file => ({
                key: file.Key,
                size: file.Size,
                lastModified: file.LastModified
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

// Start the server
const start = async () => {
    try {
        // Initialize temp storage directory
        await tempStorage.initTempStorage();

        // Start periodic cleanup of abandoned sessions (every hour)
        setInterval(async () => {
            try {
                await tempStorage.cleanupAbandonedSessions();
            } catch (error) {
                console.error('Error during periodic cleanup:', error);
            }
        }, 60 * 60 * 1000); // 1 hour

        await fastify.listen({ port: PORT, host: '0.0.0.0' });
        console.log(`Server is running on http://localhost:${PORT}`);
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
};

start();
