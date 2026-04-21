// Progress photo picker that speaks native camera on Capacitor iOS/Android
// and <input type="file"> on plain browsers. One call site
// (`pickProgressPhoto`) so the progress modal doesn't branch by platform.

function getCapacitor(): { isNativePlatform?: () => boolean } | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as { Capacitor?: unknown };
  const cap = w.Capacitor;
  if (!cap || typeof cap !== 'object') return null;
  return cap as { isNativePlatform?: () => boolean };
}

function isNativeApp(): boolean {
  return Boolean(getCapacitor()?.isNativePlatform?.());
}

function base64ToFile(base64: string, mime: string, name: string): File {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new File([bytes], name, { type: mime });
}

async function pickViaCapacitor(): Promise<File | null> {
  const mod = await import('@capacitor/camera');
  const { Camera, CameraResultType, CameraSource } = mod;

  // Ask the user: Camera or Photo Library. CameraSource.Prompt shows a
  // native action sheet with both options so the client can pick whatever
  // is easiest right now (fresh mirror selfie vs. already-taken shot).
  const photo = await Camera.getPhoto({
    quality: 82,
    allowEditing: false,
    resultType: CameraResultType.Base64,
    source: CameraSource.Prompt,
    saveToGallery: false,
    correctOrientation: true,
  });

  if (!photo.base64String) return null;
  const format = photo.format || 'jpeg';
  const mime = `image/${format === 'jpg' ? 'jpeg' : format}`;
  const stamp = Date.now();
  return base64ToFile(photo.base64String, mime, `progress-${stamp}.${format}`);
}

function pickViaFileInput(): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    // `capture` on mobile Safari/Chrome hints the camera; desktop ignores it.
    input.setAttribute('capture', 'environment');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.onchange = () => {
      const files = Array.from(input.files ?? []);
      input.remove();
      resolve(files);
    };
    input.oncancel = () => {
      input.remove();
      resolve([]);
    };
    document.body.appendChild(input);
    input.click();
  });
}

/**
 * Prompts the user for a progress photo using the most appropriate picker
 * for the runtime. On Capacitor, returns a single photo (camera or library
 * picked via native action sheet). On web, returns 0..N files from the
 * file picker. Always returns an array so callers can treat the two paths
 * uniformly.
 */
export async function pickProgressPhoto(): Promise<File[]> {
  if (isNativeApp()) {
    try {
      const file = await pickViaCapacitor();
      return file ? [file] : [];
    } catch (e) {
      const msg = (e as { message?: string })?.message ?? '';
      // User-cancelled is not an error path. Capacitor throws with a
      // "User cancelled" message on iOS and Android.
      if (/cancel/i.test(msg)) return [];
      console.warn('[camera] native picker failed, falling back:', e);
      return pickViaFileInput();
    }
  }
  return pickViaFileInput();
}
