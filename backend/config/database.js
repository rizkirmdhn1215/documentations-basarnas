const { Pool } = require('pg');
require('dotenv').config();

console.log('Loading database config...');
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_SSL:', process.env.DB_SSL);

// Create PostgreSQL connection pool
const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// Handle pool errors
pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
});

module.exports = pool;
