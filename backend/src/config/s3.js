const { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const logger = require('./logger');

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    logger.warn('[S3] AWS credentials not configured — S3 upload disabled');
    return null;
  }

  s3Client = new S3Client({
    region: process.env.AWS_REGION || 'eu-west-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  return s3Client;
}

async function uploadToS3(key, body, contentType = 'application/octet-stream', bucket) {
  const client = getS3Client();
  if (!client) {
    logger.warn('[S3] Skipping upload — no client configured');
    return { Key: key, Bucket: bucket, Location: `/local/${key}` };
  }

  const targetBucket = bucket || process.env.S3_BUCKET_REPORTS || 'docuinmo-reports';

  const command = new PutObjectCommand({
    Bucket: targetBucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await client.send(command);

  logger.info(`[S3] Uploaded: ${key} to ${targetBucket}`);

  return {
    Key: key,
    Bucket: targetBucket,
    Location: `https://${targetBucket}.s3.amazonaws.com/${key}`,
  };
}

async function downloadFromS3(key, bucket) {
  const client = getS3Client();
  if (!client) throw new Error('S3 client not configured');

  const targetBucket = bucket || process.env.S3_BUCKET_REPORTS || 'docuinmo-reports';

  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: key,
  });

  const response = await client.send(command);

  const chunks = [];
  for await (const chunk of response.Body) {
    chunks.push(chunk);
  }

  return Buffer.concat(chunks);
}

async function getSignedDownloadUrl(key, bucket, expiresInSeconds = 3600) {
  const client = getS3Client();
  if (!client) return `/local/${key}`;

  const targetBucket = bucket || process.env.S3_BUCKET_REPORTS || 'docuinmo-reports';

  const command = new GetObjectCommand({
    Bucket: targetBucket,
    Key: key,
  });

  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}

async function deleteFromS3(key, bucket) {
  const client = getS3Client();
  if (!client) return;

  const targetBucket = bucket || process.env.S3_BUCKET_REPORTS || 'docuinmo-reports';

  await client.send(new DeleteObjectCommand({ Bucket: targetBucket, Key: key }));

  logger.info(`[S3] Deleted: ${key} from ${targetBucket}`);
}

module.exports = { uploadToS3, downloadFromS3, getSignedDownloadUrl, deleteFromS3, getS3Client };
