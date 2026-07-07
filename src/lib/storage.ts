import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';

const provider = process.env.STORAGE_PROVIDER || 'local';

async function uploadToS3(buffer: Buffer, key: string, contentType?: string) {
  const region = process.env.AWS_REGION;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

  if (!region || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error('S3 environment variables are not configured');
  }

  const client = new S3Client({
    region,
    credentials: { accessKeyId, secretAccessKey }
  });

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType || 'application/octet-stream'
  });

  await client.send(cmd);

  return `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
}

async function uploadLocally(buffer: Buffer, key: string) {
  const uploadDir = path.join(os.tmpdir(), 'bsclub-uploads');
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, key);
  await writeFile(filePath, buffer);
  return `/api/uploads/${encodeURIComponent(key)}`;
}

export async function upload(buffer: Buffer, key: string, contentType?: string) {
  if (provider === 's3') {
    return uploadToS3(buffer, key, contentType);
  }

  return uploadLocally(buffer, key);
}

export async function readFromStorage(key: string) {
  if (provider === 's3') {
    throw new Error('S3 read-through is not implemented in this fast path');
  }

  const filePath = path.join(os.tmpdir(), 'bsclub-uploads', key);
  if (!existsSync(filePath)) {
    throw new Error('File not found');
  }

  return readFile(filePath);
}

export default { upload, readFromStorage };
