import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

const MAX_RECEIPT_SIZE = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
};

function checkSize(size: number): void {
  if (size === 0) throw new Error('ملف الإيصال فارغ. اختر الصورة مجدداً.');
  if (size > MAX_RECEIPT_SIZE) throw new Error('حجم الإيصال يتجاوز الحد المسموح (5 ميجابايت). اختر صورة أصغر.');
}

function decodeBase64(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replace(/\s/g, '');
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('تعذر قراءة محتوى الإيصال. اختر الصورة مجدداً.');
  }
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const size = base64.length * 3 / 4 - padding;
  checkSize(size);
  const bytes = new Uint8Array(size);
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let offset = 0;
  for (let i = 0; i < base64.length; i += 4) {
    const a = alphabet.indexOf(base64[i]);
    const b = alphabet.indexOf(base64[i + 1]);
    const c = alphabet.indexOf(base64[i + 2]);
    const d = alphabet.indexOf(base64[i + 3]);
    bytes[offset++] = (a << 2) | (b >> 4);
    if (offset < size) bytes[offset++] = ((b & 15) << 4) | (c >> 2);
    if (offset < size) bytes[offset++] = ((c & 3) << 6) | d;
  }
  return bytes;
}

async function readReceipt(uri: string): Promise<Uint8Array<ArrayBuffer>> {
  const dataUri = /^data:[^,]*;base64,([\s\S]*)$/i.exec(uri);
  if (dataUri) return decodeBase64(dataUri[1]);

  if (Platform.OS === 'web') {
    let buffer: ArrayBuffer;
    try {
      const response = await fetch(uri);
      if (!response.ok) throw new Error('Unreadable receipt');
      buffer = await response.arrayBuffer();
    } catch {
      throw new Error('تعذر قراءة ملف الإيصال. اختر الصورة مجدداً.');
    }
    checkSize(buffer.byteLength);
    return new Uint8Array(buffer);
  }

  let info: FileSystem.FileInfo;
  try {
    info = await FileSystem.getInfoAsync(uri);
  } catch {
    throw new Error('ملف الإيصال غير متاح على الجهاز. اختر الصورة مجدداً.');
  }
  if (!info.exists || info.isDirectory) throw new Error('ملف الإيصال غير متاح على الجهاز. اختر الصورة مجدداً.');
  checkSize(info.size);
  let base64: string;
  try {
    base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  } catch {
    throw new Error('تعذر قراءة ملف الإيصال. اختر الصورة مجدداً.');
  }
  return decodeBase64(base64);
}

/** Send bytes, as the admin image uploader does, instead of relying on fetch
 * to open a native URI inside FormData. The API still owns private storage. */
export async function prepareReceiptUpload(uri: string, fileName: string, mimeType: string) {
  const extension = extensions[mimeType];
  if (!extension) throw new Error('نوع الإيصال غير مسموح. اختر صورة JPG أو PNG أو ملف PDF.');
  const bytes = await readReceipt(uri);
  const baseName = fileName.replace(/\.[^.]*$/, '').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80) || 'receipt';
  const boundary = `BSStoreReceipt_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  // ASCII-only headers also work in Hermes without a TextEncoder polyfill.
  const ascii = (value: string) => Uint8Array.from(value, char => char.charCodeAt(0));
  const prefix = ascii(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${baseName}.${extension}"\r\nContent-Type: ${mimeType}\r\n\r\n`);
  const suffix = ascii(`\r\n--${boundary}--\r\n`);
  const body = new Uint8Array(prefix.length + bytes.length + suffix.length);
  body.set(prefix);
  body.set(bytes, prefix.length);
  body.set(suffix, prefix.length + bytes.length);
  return { body: body.buffer, contentType: `multipart/form-data; boundary=${boundary}` };
}
