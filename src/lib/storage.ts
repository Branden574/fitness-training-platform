import 'server-only';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

// Thin wrapper around Cloudflare R2 so every upload route speaks the same
// putImage / deleteImage / publicUrl vocabulary. Railway's container disk is
// ephemeral (wipes on every deploy), so nothing that needs to survive a
// redeploy can live under public/uploads. R2 = persistent object storage
// with a Cloudflare-CDN custom domain in front of it.
//
// All reads are public (photos render from <img src> in rosters, trainer
// profiles, etc). Writes require the R2 API token scoped to this bucket
// only — kept in env vars, never shipped to the client.

const REQUIRED_ENV = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'R2_PUBLIC_URL',
] as const;

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  publicUrl: string;
}

let cachedClient: S3Client | null = null;
let cachedConfig: R2Config | null = null;

function loadConfig(): R2Config {
  if (cachedConfig) return cachedConfig;
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(
      `[storage] Missing env vars: ${missing.join(', ')}. Set them in Railway and .env.`,
    );
  }
  cachedConfig = {
    accountId: process.env.R2_ACCOUNT_ID!,
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    bucket: process.env.R2_BUCKET!,
    // Strip trailing slash so publicUrl(key) never produces double-slashes
    publicUrl: process.env.R2_PUBLIC_URL!.replace(/\/+$/, ''),
  };
  return cachedConfig;
}

function getClient(): { client: S3Client; config: R2Config } {
  const config = loadConfig();
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }
  return { client: cachedClient, config };
}

export interface PutImageInput {
  /** Object key inside the bucket. e.g. "progress/<userId>/<file>.jpg" */
  key: string;
  /** Raw bytes — pass an ArrayBuffer straight from file.arrayBuffer() */
  body: ArrayBuffer | Uint8Array | Buffer;
  /** Image MIME type. Use IMAGE_EXT[kind].mime from imageSniff.ts */
  contentType: string;
}

/**
 * Uploads a single image to R2 and returns its public URL. The key is passed
 * through as-is — caller decides the prefix convention (progress/, trainers/,
 * transformations/, exercises/). Objects are cached aggressively by the CDN
 * (filename is content-addressable via timestamp+nonce, so a new upload
 * always gets a fresh URL).
 */
export async function putImage({
  key,
  body,
  contentType,
}: PutImageInput): Promise<string> {
  const { client, config } = getClient();
  const bytes =
    body instanceof ArrayBuffer ? new Uint8Array(body) : body;
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: bytes,
      ContentType: contentType,
      // 1 year cache — key is unique per upload so stale cache is impossible
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );
  return publicUrl(key);
}

export interface PutBlobInput {
  /** Object key inside the bucket. e.g. "messages/<userId>/<yyyymmdd>/<cuid>.<ext>" */
  key: string;
  /** Raw bytes — pass an ArrayBuffer straight from file.arrayBuffer() */
  body: ArrayBuffer | Uint8Array | Buffer;
  /** Any MIME type — image, video, audio, application/pdf, etc. */
  contentType: string;
}

/**
 * Generic R2 put. Use this for non-image uploads (video, audio, PDF, etc.) so
 * call sites read clearly. `putImage` is retained for the existing image-only
 * callers that want a self-documenting name.
 */
export async function putBlob({
  key,
  body,
  contentType,
}: PutBlobInput): Promise<string> {
  return putImage({ key, body, contentType });
}

/**
 * Removes an object by key. Silently ignores "not found" errors — deleting
 * an already-missing object is the intended final state either way.
 */
export async function deleteImage(key: string): Promise<void> {
  const { client, config } = getClient();
  try {
    await client.send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  } catch (err) {
    const name = (err as { name?: string })?.name;
    if (name === 'NoSuchKey' || name === 'NotFound') return;
    throw err;
  }
}

/**
 * Builds the public URL for a given key. Safe to call at any time — doesn't
 * hit the network. Used when you already know the key and just want to
 * render it.
 */
export function publicUrl(key: string): string {
  const { config } = getClient();
  return `${config.publicUrl}/${key.replace(/^\/+/, '')}`;
}

/**
 * Derives the object key back out of a full public URL. Returns null if the
 * URL doesn't belong to our bucket (e.g. an older /uploads/... path from
 * before the R2 migration). Useful for deleting the old object when a user
 * replaces their profile photo.
 */
export function keyFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const { config } = getClient();
  if (!url.startsWith(config.publicUrl + '/')) return null;
  return url.slice(config.publicUrl.length + 1);
}

