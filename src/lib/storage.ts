import { put } from '@vercel/blob';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import os from 'os';
import path from 'path';

// Force redeployment to inject Vercel Blob token
const provider = process.env.STORAGE_PROVIDER || 'local';

async function uploadToVercelBlob(buffer: Buffer, key: string, contentType?: string) {
  const { url } = await put(key, buffer, {
    access: 'public',
    contentType: contentType || 'application/octet-stream',
  });
  return url;
}

async function uploadLocally(buffer: Buffer, key: string) {
  // Save to public/uploads so Next.js can serve it statically
  const uploadDir = path.join(process.cwd(), 'public', 'uploads');
  await mkdir(uploadDir, { recursive: true });
  const filePath = path.join(uploadDir, key);
  await writeFile(filePath, buffer);
  
  // Return a URL that Next.js automatically serves from the public directory
  return `/uploads/${encodeURIComponent(key)}`;
}

export async function upload(buffer: Buffer, key: string, contentType?: string) {
  if (provider === 'vercel-blob' || process.env.BLOB_READ_WRITE_TOKEN) {
    return uploadToVercelBlob(buffer, key, contentType);
  }

  return uploadLocally(buffer, key);
}

export async function readFromStorage(key: string) {
  if (provider === 'vercel-blob' || process.env.BLOB_READ_WRITE_TOKEN) {
    throw new Error('Vercel Blob read-through is not implemented in this fast path');
  }

  // First, check the reliable public uploads directory
  const publicFilePath = path.join(process.cwd(), 'public', 'uploads', key);
  if (existsSync(publicFilePath)) {
    return readFile(publicFilePath);
  }

  // Fallback to the temporary directory just in case it was saved there previously
  const tmpFilePath = path.join(os.tmpdir(), 'bsclub-uploads', key);
  if (existsSync(tmpFilePath)) {
    return readFile(tmpFilePath);
  }

  throw new Error('File not found');
}

export default { upload, readFromStorage };
