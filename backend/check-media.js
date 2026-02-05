require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT) || 5432,
    database: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: { rejectUnauthorized: false }
});

async function checkMedia() {
    try {
        const res = await pool.query(`
            SELECT id, original_name, original_file_size, tags, media_date 
            FROM media_items 
            ORDER BY upload_timestamp DESC 
            LIMIT 10
        `);

        console.table(res.rows.map(row => ({
            ID: row.id,
            Name: row.original_name,
            'Size (Bytes)': row.original_file_size || 'NULL (0 MB)',
            'Size (MB)': row.original_file_size ? (row.original_file_size / 1024 / 1024).toFixed(2) + ' MB' : '0.00 MB',
            Tags: row.tags ? row.tags.join(', ') : 'No Tags',
            Date: new Date(row.media_date).toLocaleDateString()
        })));

    } catch (err) {
        console.error(err);
    } finally {
        pool.end();
    }
}

checkMedia();
