# Records App Monorepo

Minimal production-leaning monorepo for monthly records with categories, entries, and S3 image assets.

## Stack

- `apps/web`: Next.js App Router + TypeScript + Tailwind
- `apps/api`: Fastify + TypeScript + Prisma + Zod
- `packages/shared`: shared types
- PostgreSQL: local via Docker or AWS RDS
- S3: original images only, upload/download via presigned URLs

## Folder Structure

- `apps/web`
- `apps/api`
- `packages/shared`
- `docker-compose.yml`

## 1) Environment Setup

### API env
Copy `apps/api/.env.example` to `apps/api/.env` and fill values.

For AWS RDS SSL use:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME?sslmode=require
```

You can also keep these split vars for readability:

```env
DB_HOST=...
DB_PORT=5432
DB_NAME=...
DB_USER=...
DB_PASSWORD=...
DB_SSL=true
```

Notes:
- `DB_SSL=true` makes runtime URL builder use `sslmode=require` when `DATABASE_URL` is not set.
- RDS security group must allow inbound `5432` from your API server network (or your IP in local testing).

### Web env
Copy `apps/web/.env.example` to `apps/web/.env.local`.

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

## 2) PostgreSQL Local (Optional)

```bash
docker compose up -d
```

Default local DB:
- host: `localhost`
- port: `5432`
- user: `postgres`
- password: `postgres`
- db: `records_app`

## 3) Prisma

Run in `apps/api`:

```bash
npm run prisma:generate
npm run db:migrate -- --name init
npm run db:seed
```

## 4) Run API + Web

API:

```bash
npm run dev -w apps/api
```

Web:

```bash
npm run dev -w apps/web
```

## API Endpoints

All prefixed with `/v1`.

- `GET /v1/months`
- `GET /v1/months/:monthKey/categories`
- `POST /v1/months/:monthKey/categories`
- `PATCH /v1/categories/:categoryId`
- `DELETE /v1/categories/:categoryId`
- `GET /v1/categories/:categoryId/entries`
- `POST /v1/categories/:categoryId/entries`
- `POST /v1/assets/upload-url`
- `GET /v1/assets/:id/download-url`

## Upload Flow

1. Web calls `POST /v1/assets/upload-url` for each image file.
2. Web uploads original to S3 using returned `putUrl`.
3. Web generates client-side preview JPEG and uploads to returned `previewPutUrl`.
3. Web creates entry with uploaded `assetIds`.
4. Download button requests `GET /v1/assets/:id/download-url` and downloads original full-resolution object.

## Data Fields

- Entry: `contentType`, `contentLink`, `title`, `description`, `entryDate` (default today in UI), `tags` (free text, non-empty values)
- Asset: `s3KeyOriginal`, `s3KeyPreview`, `originalUrl`, `previewUrl`, `filename`, `contentType`, `sizeBytes`

## Notes

- AWS credentials stay server-side only (`apps/api/.env`).
- DB stores metadata only; no image bytes in PostgreSQL.
- S3 key pattern: `originals/{uuid}.{ext}`.
