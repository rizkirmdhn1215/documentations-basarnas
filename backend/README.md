# Backend - Node.js + Fastify + AWS RDS + S3

A lightweight and fast backend server built with Node.js, Fastify, AWS RDS (PostgreSQL), and S3 storage.

## 🚀 Features

- **Fastify Framework** - High-performance web framework
- **AWS RDS PostgreSQL** - Managed relational database
- **AWS S3** - Cloud object storage for files
- **CORS Support** - Cross-Origin Resource Sharing enabled
- **File Upload** - Multipart file upload support
- **Environment Variables** - Configuration via `.env` file
- **Hot Reload** - Development mode with nodemon

## 📦 Installation

```bash
npm install
```

## 🔧 Configuration

Update the `.env` file with your AWS credentials and RDS configuration:

```env
PORT=3000
NODE_ENV=development

# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key

# S3 Configuration
S3_BUCKET_NAME=your-bucket-name

# RDS PostgreSQL Configuration
DB_HOST=your-rds-endpoint.rds.amazonaws.com
DB_PORT=5432
DB_NAME=your-database-name
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DB_SSL=true
```

### AWS Setup Requirements

1. **RDS PostgreSQL Database**
   - Create an RDS PostgreSQL instance in AWS
   - Configure security groups to allow connections from your IP
   - Note the endpoint, database name, username, and password

2. **S3 Bucket**
   - Create an S3 bucket in AWS
   - Configure bucket permissions (public or private based on your needs)
   - Note the bucket name and region

3. **IAM User Credentials**
   - Create an IAM user with programmatic access
   - Attach policies: `AmazonS3FullAccess` and `AmazonRDSFullAccess`
   - Save the Access Key ID and Secret Access Key

## 🏃 Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## 📡 API Endpoints

### General
- **GET** `/`
  - Health check - returns server status and timestamp

### Database Endpoints

- **GET** `/api/db/health`
  - Check database connection and get PostgreSQL version
  - Response: `{ status: "ok", database: "connected", version: "..." }`

- **GET** `/api/db/query`
  - Example query endpoint (returns current time and DB version)
  - Response: `{ success: true, data: [...] }`

- **POST** `/api/db/insert`
  - Insert data into a table
  - Request body: `{ table: "table_name", data: { column1: "value1", ... } }`
  - Response: `{ success: true, data: {...} }`

### S3 File Endpoints

- **POST** `/api/s3/upload`
  - Upload a file to S3
  - Content-Type: `multipart/form-data`
  - Form field: `file`
  - Response: `{ success: true, file: { key, url, originalName, mimeType, size } }`

- **GET** `/api/s3/file/:key`
  - Get a signed URL for a file (valid for 1 hour)
  - Response: `{ success: true, url: "...", expiresIn: "1 hour" }`

- **DELETE** `/api/s3/file/:key`
  - Delete a file from S3
  - Response: `{ success: true, message: "File deleted successfully" }`

- **GET** `/api/s3/files`
  - List files in S3 bucket
  - Query params: `prefix` (optional), `maxKeys` (optional, default: 100)
  - Response: `{ success: true, count: N, files: [...] }`

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js     # PostgreSQL connection pool
│   └── s3.js          # S3 client configuration
├── plugins/
│   └── database.js    # Fastify database plugin
├── utils/
│   └── s3Helper.js    # S3 helper functions
├── server.js          # Main server file
├── package.json       # Dependencies and scripts
├── .env              # Environment variables
├── .gitignore        # Git ignore rules
└── README.md         # This file
```

## 🛠️ Dependencies

- **fastify** - Fast and low overhead web framework
- **@fastify/cors** - CORS plugin for Fastify
- **@fastify/multipart** - Multipart form data support
- **fastify-plugin** - Plugin helper for Fastify
- **dotenv** - Environment variable management
- **pg** - PostgreSQL client for Node.js
- **@aws-sdk/client-s3** - AWS SDK v3 S3 client
- **@aws-sdk/lib-storage** - Multipart upload support
- **@aws-sdk/s3-request-presigner** - Generate signed URLs
- **nodemon** (dev) - Auto-restart on file changes

## 🧪 Testing the Setup

### Test Database Connection
```bash
curl http://localhost:3000/api/db/health
```

### Test File Upload
```bash
curl -X POST http://localhost:3000/api/s3/upload \
  -F "file=@/path/to/your/file.jpg"
```

### Test File Download
```bash
curl http://localhost:3000/api/s3/file/YOUR_FILE_KEY
```

## 📝 Next Steps

1. Create your database tables in RDS PostgreSQL
2. Implement authentication/authorization
3. Add request validation and sanitization
4. Implement proper error handling and logging
5. Add rate limiting for API endpoints
6. Set up database migrations
7. Add automated tests

## 🔗 Useful Links

- [Fastify Documentation](https://www.fastify.io/)
- [AWS RDS Documentation](https://docs.aws.amazon.com/rds/)
- [AWS S3 Documentation](https://docs.aws.amazon.com/s3/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

