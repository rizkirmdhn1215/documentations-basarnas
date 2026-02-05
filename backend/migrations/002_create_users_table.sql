-- BASARNAS Media Archive Database Migration 002
-- Creates the users table for authentication

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default admin user (password: admin123)
-- Hash generated via bcrypt
INSERT INTO users (username, password_hash) 
VALUES ('admin', '$2b$10$TVXUKHvlbdt6Tl04SBC0kebvDyIJKR4luqlCcCpA7i/wErhssZZ3y')
ON CONFLICT (username) DO NOTHING;
