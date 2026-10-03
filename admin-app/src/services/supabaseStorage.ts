import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://ckrnqdagmxgxibjyenrk.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_AIbK1TO5XtdbkPO5YFxxhQ_Oot_q0Jv';
export const SUPABASE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_BUCKET || 'Product Images';

export interface PickedImage {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
}

export interface PickAndUploadResult {
  url: string;
  source: 'supabase' | 'local' | 'url';
}

/**
 * Pure JavaScript Base64 to Uint8Array decoder (works in Hermes, Node, Web, iOS, Android)
 */
function decodeBase64ToUint8Array(base64: string): Uint8Array {
  const cleanBase64 = base64.includes(',') ? base64.split(',')[1] : base64;

  if (typeof atob === 'function') {
    const binaryString = atob(cleanBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  }

  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const lookup = new Uint8Array(256);
  for (let i = 0; i < chars.length; i++) lookup[chars.charCodeAt(i)] = i;

  let len = cleanBase64.length * 0.75;
  if (cleanBase64.endsWith('==')) len -= 2;
  else if (cleanBase64.endsWith('=')) len -= 1;

  const bytes = new Uint8Array(len);
  let p = 0;
  for (let i = 0; i < cleanBase64.length; i += 4) {
    const c1 = lookup[cleanBase64.charCodeAt(i)];
    const c2 = lookup[cleanBase64.charCodeAt(i + 1)];
    const c3 = lookup[cleanBase64.charCodeAt(i + 2)];
    const c4 = lookup[cleanBase64.charCodeAt(i + 3)];
    bytes[p++] = (c1 << 2) | (c2 >> 4);
    if (cleanBase64[i + 2] !== '=') bytes[p++] = ((c2 & 15) << 4) | (c3 >> 2);
    if (cleanBase64[i + 3] !== '=') bytes[p++] = ((c3 & 3) << 6) | (c4 & 63);
  }
  return bytes;
}

/**
 * Pick an image from the device's photo gallery
 */
export const pickImageFromGallery = async (): Promise<PickedImage | null> => {
  try {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('صلاحية مطلوبة', 'يرجى السماح للتطبيق بالوصول إلى معرض الصور لاختيار صورة');
        return null;
      }
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.85,
      base64: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    const asset = result.assets[0];
    return {
      uri: asset.uri,
      base64: asset.base64,
      mimeType: asset.mimeType,
    };
  } catch (err: any) {
    console.warn('Error launching image library:', err);
    Alert.alert('خطأ', 'تعذر فتح معرض الصور');
    return null;
  }
};

/**
 * Upload an image (URI or PickedImage object) to Supabase Storage Bucket
 */
export const uploadImageToSupabase = async (
  imageInput: string | PickedImage,
  folder: 'stores' | 'products' | 'offers' = 'products'
): Promise<string> => {
  try {
    const localUri = typeof imageInput === 'string' ? imageInput : imageInput.uri;
    const base64Data = typeof imageInput === 'object' ? imageInput.base64 : null;
    const explicitMime = typeof imageInput === 'object' ? imageInput.mimeType : null;

    // Generate unique file name
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
    const cleanExt = ext.length <= 4 && ext.length >= 2 ? ext : 'jpg';
    const fileName = `${folder}_${timestamp}_${random}.${cleanExt}`;
    const filePath = `${folder}/${fileName}`;

    const mimeMap: Record<string, string> = {
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      webp: 'image/webp',
      gif: 'image/gif',
    };
    const contentType = explicitMime || mimeMap[cleanExt] || 'image/jpeg';

    const bucketEncoded = encodeURIComponent(SUPABASE_BUCKET);
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucketEncoded}/${filePath}`;

    // 1. If base64 data is already available in memory (from ImagePicker), upload directly
    if (base64Data) {
      const uint8 = decodeBase64ToUint8Array(base64Data);
      const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': contentType,
          'x-upsert': 'true',
        },
        body: uint8.buffer as ArrayBuffer,
      });

      if (uploadResponse.ok) {
        const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketEncoded}/${filePath}`;
        return publicUrl;
      }
      throw new Error('تعذر رفع الصورة. تحقق من الاتصال وحاول مجدداً.');
    }

    // 2. On Native (iOS & Android): try high-speed binary streaming upload from filesystem
    if (Platform.OS !== 'web' && localUri.startsWith('file://')) {
      try {
        const uploadResult = await (FileSystem as any).uploadAsync(uploadUrl, localUri, {
          httpMethod: 'POST',
          uploadType: (FileSystem as any).FileSystemUploadType?.BINARY_CONTENT ?? (FileSystem as any).UploadType?.BINARY_CONTENT ?? 1,
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': contentType,
            'x-upsert': 'true',
          },
        });

        if (uploadResult.status >= 200 && uploadResult.status < 300) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketEncoded}/${filePath}`;
          return publicUrl;
        }
      } catch (fsErr) {
        console.warn('FileSystem.uploadAsync error, falling back to base64 buffer:', fsErr);
      }

      // Fallback on native: read as base64 and upload ArrayBuffer
      try {
        const base64Content = await (FileSystem as any).readAsStringAsync(localUri, {
          encoding: (FileSystem as any).EncodingType?.Base64 || 'base64',
        });
        const uint8 = decodeBase64ToUint8Array(base64Content);
        const uploadResponse = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': contentType,
            'x-upsert': 'true',
          },
          body: uint8.buffer as ArrayBuffer,
        });

        if (uploadResponse.ok) {
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketEncoded}/${filePath}`;
          return publicUrl;
        }
      } catch (readErr) {
        console.warn('FileSystem.readAsStringAsync error:', readErr);
      }
    }

    // 3. Web or Blob fallback
    const resp = await fetch(localUri);
    const arrayBuffer = await resp.arrayBuffer();

    // Verify valid byte size (prevent 14-byte 404 text upload)
    if (arrayBuffer.byteLength < 50) {
      throw new Error('حجم ملف الصورة غير صالح أو تعذر قراءته');
    }

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: arrayBuffer,
    });

    if (!uploadResponse.ok) {
      throw new Error('تعذر رفع الصورة. تحقق من الاتصال وحاول مجدداً.');
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketEncoded}/${filePath}`;
    return publicUrl;
  } catch {
    throw new Error('تعذر رفع الصورة. تحقق من الاتصال وحاول مجدداً.');
  }
};
