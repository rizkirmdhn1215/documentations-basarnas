import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "node:crypto";
import path from "node:path";
import mime from "mime-types";
import { config } from "./env";

export const s3 = new S3Client({
  region: config.AWS_REGION,
  credentials: {
    accessKeyId: config.AWS_ACCESS_KEY_ID,
    secretAccessKey: config.AWS_SECRET_ACCESS_KEY,
  },
});

export function buildOriginalKey(filename: string) {
  const ext = path.extname(filename).replace(".", "").toLowerCase();
  const safeExt = ext || mime.extension(mime.lookup(filename) || "") || "bin";
  return `originals/${randomUUID()}.${safeExt}`;
}

export function buildPreviewKey() {
  return `previews/${randomUUID()}.jpg`;
}

export async function createUploadUrl(params: {
  key: string;
  contentType: string;
  sizeBytes: number;
}) {
  const putCmd = new PutObjectCommand({
    Bucket: config.AWS_S3_BUCKET,
    Key: params.key,
    ContentType: params.contentType,
    ContentLength: params.sizeBytes,
  });

  return getSignedUrl(s3, putCmd, { expiresIn: 60 * 5 });
}

export async function createDownloadUrl(key: string) {
  const getCmd = new GetObjectCommand({
    Bucket: config.AWS_S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, getCmd, { expiresIn: 60 * 10 });
}

export function buildS3PublicUrl(key: string) {
  return `https://${config.AWS_S3_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
}
