const fp = require('fastify-plugin');
const pool = require('../config/database');

/**
 * Fastify plugin for PostgreSQL database connection
 * Decorates the fastify instance with a 'db' property
 */
async function databasePlugin(fastify, options) {
    // Debug: Check environment variables
    fastify.log.info('DB Config:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        passwordType: typeof process.env.DB_PASSWORD,
        passwordLength: process.env.DB_PASSWORD?.length,
        sslEnabled: process.env.DB_SSL
    });

    // Test database connection
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        fastify.log.info(`✅ Database connected successfully at ${result.rows[0].now}`);
        client.release();
    } catch (err) {
        fastify.log.error('❌ Database connection failed:', err.message);
        fastify.log.warn('Server will start without database connection. Please check your RDS settings.');
        // Don't throw - allow server to start for debugging
    }

    // Decorate fastify instance with database pool
    fastify.decorate('db', pool);

    // Graceful shutdown
    fastify.addHook('onClose', async (instance) => {
        await pool.end();
        instance.log.info('Database connection pool closed');
    });
}

module.exports = fp(databasePlugin);
