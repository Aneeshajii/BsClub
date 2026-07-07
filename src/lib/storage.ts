import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const provider = process.env.STORAGE_PROVIDER || 's3';

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
    ContentType: contentType || 'application/octet-stream',
    ACL: 'public-read'
  });

  await client.send(cmd);

  // Public URL
  const url = `https://${bucket}.s3.${region}.amazonaws.com/${encodeURIComponent(key)}`;
  return url;
}

export async function upload(buffer: Buffer, key: string, contentType?: string) {
  if (provider === 's3') {
    return uploadToS3(buffer, key, contentType);
  }
  throw new Error(`Unsupported storage provider: ${provider}`);
}

export default { upload };
