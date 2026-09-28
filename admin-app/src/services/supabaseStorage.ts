import * as ImagePicker from 'expo-image-picker';
import { Alert, Platform } from 'react-native';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://iiucmmdhfxgvjkbtdvxv.supabase.co';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY || 'sb_publishable_OO-omxX7abW5LTlbFCrAZQ_s_7HzvMm';
export const SUPABASE_BUCKET = process.env.EXPO_PUBLIC_SUPABASE_BUCKET || 'Product Images';

export interface PickAndUploadResult {
  url: string;
  source: 'supabase' | 'local' | 'url';
}

/**
 * Pick an image from the device's photo gallery
 */
export const pickImageFromGallery = async (): Promise<string | null> => {
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
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }

    return result.assets[0].uri;
  } catch (err: any) {
    console.warn('Error launching image library:', err);
    Alert.alert('خطأ', 'تعذر فتح معرض الصور');
    return null;
  }
};

/**
 * Upload an image URI to Supabase Storage Bucket
 */
export const uploadImageToSupabase = async (
  localUri: string,
  folder: 'stores' | 'products' = 'products'
): Promise<string> => {
  try {
    // Generate unique file name
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const ext = localUri.split('.').pop()?.split('?')[0] || 'jpg';
    const cleanExt = ext.length <= 4 ? ext : 'jpg';
    const fileName = `${folder}_${timestamp}_${random}.${cleanExt}`;
    const filePath = `${folder}/${fileName}`;

    // Read file as Blob
    const response = await fetch(localUri);
    const blob = await response.blob();
    const contentType = blob.type || (cleanExt === 'png' ? 'image/png' : 'image/jpeg');

    const bucketEncoded = encodeURIComponent(SUPABASE_BUCKET);
    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${bucketEncoded}/${filePath}`;

    const uploadResponse = await fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': contentType,
        'x-upsert': 'true',
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      const errJson = await uploadResponse.json().catch(() => null);
      const errMsg = errJson?.message || errJson?.error || `Upload failed with status ${uploadResponse.status}`;
      console.warn('Supabase upload warning:', errMsg);
      
      // If bucket has RLS issue or not found, try fallback to raw URL or inform user
      throw new Error(errMsg);
    }

    // Direct public URL in Supabase
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucketEncoded}/${filePath}`;
    return publicUrl;
  } catch (err: any) {
    console.warn('Supabase upload failed:', err);
    throw err;
  }
};
