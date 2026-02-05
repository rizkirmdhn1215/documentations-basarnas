require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing database connection...');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
});

async function test() {
    try {
        console.log('Attempting to connect...');
        const client = await pool.connect();
        console.log('✅ Connected!');

        const result = await client.query('SELECT NOW()');
        console.log('✅ Query result:', result.rows[0]);

        client.release();
        await pool.end();
        console.log('✅ Connection closed successfully');
    } catch (err) {
        console.error('❌ Error:', err.message);
        console.error('Full error:', err);
        process.exit(1);
    }
}

test();
