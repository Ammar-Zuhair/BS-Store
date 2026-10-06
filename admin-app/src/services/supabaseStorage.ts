import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { Alert, Platform } from 'react-native';
import { api } from '../api/client';

export interface PickedImage {
  uri: string;
  base64?: string | null;
  mimeType?: string | null;
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
      quality: 1,
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
 * Send image bytes to the API for required optimization and Supabase storage.
 */
export const uploadImageToSupabase = async (
  imageInput: string | PickedImage,
  folder: 'stores' | 'products' | 'offers' = 'products'
): Promise<string> => {
  try {
    const localUri = typeof imageInput === 'string' ? imageInput : imageInput.uri;
    const base64Data = typeof imageInput === 'object' ? imageInput.base64 : null;

    // Read the selected image once. The API guarantees resizing/re-encoding
    // for every catalogue category before uploading it to Supabase.
    let bytes: ArrayBuffer;
    if (base64Data) {
      bytes = decodeBase64ToUint8Array(base64Data).buffer as ArrayBuffer;
    } else if (Platform.OS !== 'web' && /^(file|content):\/\//.test(localUri)) {
      const content = await FileSystem.readAsStringAsync(localUri, { encoding: FileSystem.EncodingType.Base64 });
      bytes = decodeBase64ToUint8Array(content).buffer as ArrayBuffer;
    } else {
      const response = await fetch(localUri);
      if (!response.ok) throw new Error('تعذر قراءة ملف الصورة.');
      bytes = await response.arrayBuffer();
    }
    if (bytes.byteLength < 50) throw new Error('ملف الصورة فارغ أو غير صالح.');
    if (bytes.byteLength > 15 * 1024 * 1024) throw new Error('حجم الصورة يتجاوز 15 ميجابايت. اختر صورة أصغر.');
    const result = await api.request<{ url: string }>(`/admin/images?folder=${folder}`, {
      method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes,
    });
    if (!result?.url) throw new Error('لم يرجع الخادم رابط الصورة المحفوظة.');
    return result.url;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('تعذر رفع الصورة. تحقق من الاتصال وحاول مجدداً.');
  }
};
