import 'server-only';

export type DetectedImage = 'jpeg' | 'png' | 'gif' | 'webp';

/**
 * Sniffs the actual magic bytes of an uploaded file instead of trusting the
 * client-supplied MIME type. Returns the real image kind or null if the file
 * doesn't look like an image we'd accept.
 *
 * Security: the client can lie about Content-Type in a multipart upload, so
 * gating on file.type alone lets an attacker save arbitrary bytes (e.g. an
 * SVG with <script>) into public/uploads where they'd be served as static
 * files. Checking the first 12 bytes defuses that — it's O(1), no new dep.
 *
 * Refuses SVG deliberately: SVG is XML and can carry embedded JavaScript
 * that executes when the file is opened directly in a browser.
 */
export function sniffImage(bytes: Uint8Array | ArrayBuffer): DetectedImage | null {
  const buf =
    bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (buf.length < 12) return null;

  // JPEG — FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpeg';

  // PNG — 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return 'png';
  }

  // GIF — 47 49 46 38 (GIF87a / GIF89a both start with GIF8)
  if (
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38
  ) {
    return 'gif';
  }

  // WebP — RIFF....WEBP
  if (
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return 'webp';
  }

  return null;
}

/**
 * Maps detected image kind to its canonical extension + MIME. Never trust the
 * client-supplied values for these — always re-derive from the sniffed kind.
 */
export const IMAGE_EXT: Record<DetectedImage, { ext: string; mime: string }> = {
  jpeg: { ext: 'jpg', mime: 'image/jpeg' },
  png: { ext: 'png', mime: 'image/png' },
  gif: { ext: 'gif', mime: 'image/gif' },
  webp: { ext: 'webp', mime: 'image/webp' },
};
