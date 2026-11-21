import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Crypto from 'expo-crypto';
import { fetchWithTimeout } from '../utils/requests';

const ROOT = 'bsstore-admin-images-v1/';
const pending = new Map<string, Promise<string>>();
const memory = new Map<string, string>();
let memoryBytes = 0;
const forget = (key: string) => {
  const value = memory.get(key);
  if (value) memoryBytes -= value.length * 2;
  memory.delete(key);
};
let generation = 0;
let mutations: Promise<unknown> = Promise.resolve();
let privateCleanup: Promise<void> = Promise.resolve();
const hash = (value: string) => Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, value);
const serial = <T,>(work: () => Promise<T>): Promise<T> => {
  const result = mutations.then(work, work);
  mutations = result.catch(() => {});
  return result;
};
const remember = (key: string, value: string) => {
  forget(key); memory.set(key, value); memoryBytes += value.length * 2;
  // Keep receipts out of an unbounded JS heap; persistent entries remain on disk.
  while (memory.size > 40 || memoryBytes > 12 * 1024 * 1024) forget(memory.keys().next().value!);
};
let database: Promise<IDBDatabase | null> | undefined;
function webDatabase(): Promise<IDBDatabase | null> {
  if (!database) database = new Promise(resolve => {
    if (Platform.OS !== 'web' || typeof indexedDB === 'undefined') { resolve(null); return; }
    const request = indexedDB.open('bsstore-admin-images-v1', 1);
    request.onupgradeneeded = () => { request.result.createObjectStore('images', { keyPath: 'id' }); };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
    request.onblocked = () => resolve(null);
  });
  return database;
}
async function webRead(id: string): Promise<string | null> {
  const db = await webDatabase(); if (!db) return null;
  return new Promise((resolve, reject) => {
    const request = db.transaction('images').objectStore('images').get(id);
    request.onsuccess = () => resolve(request.result?.data ?? null);
    request.onerror = () => reject(request.error);
  });
}
async function webWrite(id: string, data: string, isPrivate: boolean): Promise<void> {
  const db = await webDatabase(); if (!db) return;
  return new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readwrite');
    tx.objectStore('images').put({ id, data, isPrivate });
    tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
  });
}

/** Keys use the permanent app URL/receipt ID, never an expiring signed R2 URL. */
export async function getCachedImage(scope: string, key: string, load: () => Promise<string>, force = false): Promise<string> {
  const isPrivate = scope.startsWith('private:');
  if (isPrivate) await privateCleanup;
  const epoch = generation;
  const identity = `${scope}\n${key}`;
  const requestKey = `${isPrivate ? epoch : 'public'}:${identity}:${force}`;
  const existing = pending.get(requestKey); if (existing) return existing;
  const checkSession = () => { if (isPrivate && epoch !== generation) throw new Error('انتهت جلسة الصور. سجّل الدخول مجدداً.'); };
  const work = (async () => {
    const [scopeHash, keyHash] = await Promise.all([hash(scope), hash(key)]);
    const id = `${isPrivate ? 'private' : 'public'}:${scopeHash}:${keyHash}`;
    const directory = Platform.OS !== 'web' && FileSystem.documentDirectory
      ? `${FileSystem.documentDirectory}${ROOT}${isPrivate ? 'private' : 'public'}/${scopeHash}/` : null;
    const path = directory ? `${directory}${keyHash}.img` : null;
    if (!force) {
      try {
        if (path) {
          const file = await FileSystem.getInfoAsync(path);
          checkSession();
          if (file.exists && !file.isDirectory && file.size > 0) return path;
        } else {
          const saved = await webRead(id); checkSession();
          if (saved) return saved;
        }
      } catch (error) { checkSession(); /* A storage failure can still use the network. */ }
      const saved = memory.get(identity); if (saved) { checkSession(); return saved; }
    }
    const data = await load(); checkSession();
    const image = /^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i.exec(data);
    if (!image) throw new Error('تعذر حفظ الصورة. صيغة الصورة غير صالحة.');
    try {
      const saved = await serial(async () => {
        checkSession();
        if (path && directory) {
          await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
          const temporary = `${path}.tmp`;
          try {
            await FileSystem.writeAsStringAsync(temporary, image[2], { encoding: FileSystem.EncodingType.Base64 });
            await FileSystem.deleteAsync(path, { idempotent: true });
            await FileSystem.moveAsync({ from: temporary, to: path });
          } finally { await FileSystem.deleteAsync(temporary, { idempotent: true }).catch(() => {}); }
          checkSession(); return path;
        }
        await webWrite(id, data, isPrivate); checkSession(); return data;
      });
      checkSession();
      if (!path) remember(identity, data);
      else forget(identity);
      return saved;
    } catch (error) {
      checkSession(); remember(identity, data); return data;
    }
  })();
  pending.set(requestKey, work);
  try { return await work; }
  finally { if (pending.get(requestKey) === work) pending.delete(requestKey); }
}

export async function clearPrivateImageCache(): Promise<void> {
  generation++;
  for (const key of memory.keys()) if (key.startsWith('private:')) forget(key);
  privateCleanup = serial(async () => {
    if (Platform.OS !== 'web' && FileSystem.documentDirectory) {
      await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${ROOT}private/`, { idempotent: true });
    }
    const db = await webDatabase();
    if (db) await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('images', 'readwrite');
      const cursor = tx.objectStore('images').openCursor();
      cursor.onsuccess = () => { const value = cursor.result; if (value) { if (value.value.isPrivate) value.delete(); value.continue(); } };
      tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error);
    });
  }).then(() => {}, () => {});
  await privateCleanup;
}

export function imageResponseData(response: Response): Promise<string> {
  if (!response.ok || !response.headers.get('content-type')?.toLowerCase().startsWith('image/'))
    return Promise.reject(new Error('تعذر تحميل الصورة أو أن الملف ليس صورة.'));
  return response.blob().then(blob => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('تعذر قراءة الصورة.'));
    reader.onerror = () => reject(new Error('تعذر قراءة الصورة.'));
    reader.readAsDataURL(blob);
  }));
}
export const getPublicImage = (url: string, force = false) => getCachedImage('public', url, async () => {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol) || parsed.username || parsed.password) throw new Error('رابط الصورة غير صالح.');
  // Public catalogue images must never carry an admin session or browser cookies.
  return imageResponseData(await fetchWithTimeout(url, { credentials: 'omit', headers: { Accept: 'image/*' } }));
}, force);
