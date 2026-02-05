import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_SSL: z.string().default("true"),
  AWS_REGION: z.string(),
  AWS_S3_BUCKET: z.string(),
  AWS_ACCESS_KEY_ID: z.string(),
  AWS_SECRET_ACCESS_KEY: z.string(),
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  console.error(parsed.error.flatten().fieldErrors);
  throw new Error("Invalid environment variables");
}

const env = parsed.data;

function buildDatabaseUrlFromParts() {
  if (!(env.DB_HOST && env.DB_NAME && env.DB_USER && env.DB_PASSWORD)) {
    return undefined;
  }

  const sslMode = env.DB_SSL === "true" ? "require" : "disable";
  return `postgresql://${encodeURIComponent(env.DB_USER)}:${encodeURIComponent(
    env.DB_PASSWORD
  )}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}?sslmode=${sslMode}`;
}

const databaseUrl = env.DATABASE_URL || buildDatabaseUrlFromParts();

if (!databaseUrl) {
  throw new Error("DATABASE_URL is missing. Set DATABASE_URL or DB_HOST/DB_NAME/DB_USER/DB_PASSWORD.");
}

process.env.DATABASE_URL = databaseUrl;

export const config = {
  ...env,
  databaseUrl,
};
