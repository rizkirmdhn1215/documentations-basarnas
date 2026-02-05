const bcrypt = require('bcrypt');

async function authRoutes(fastify, options) {
    fastify.post('/api/auth/login', async (request, reply) => {
        const { username, password } = request.body;

        if (!username || !password) {
            reply.code(400);
            return { success: false, error: 'Username and password are required' };
        }

        try {
            const result = await fastify.db.query('SELECT * FROM users WHERE username = $1', [username]);

            if (result.rows.length === 0) {
                reply.code(401);
                return { success: false, error: 'Invalid username or password' };
            }

            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.password_hash);

            if (!match) {
                reply.code(401);
                return { success: false, error: 'Invalid username or password' };
            }

            // Sign token with user info
            const token = fastify.jwt.sign({ id: user.id, username: user.username });

            return { success: true, token };
        } catch (err) {
            fastify.log.error(err);
            reply.code(500);
            return { success: false, error: 'Internal Server Error' };
        }
    });

    // Verify token endpoint
    fastify.get('/api/auth/verify', { onRequest: [fastify.authenticate] }, async (request, reply) => {
        return { success: true, user: request.user };
    });
}

module.exports = authRoutes;
