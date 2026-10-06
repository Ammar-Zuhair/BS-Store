import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

export interface TransferReceiptImage {
  uri: string;
  fileName: string;
  mimeType: 'image/jpeg' | 'image/png';
}

export async function chooseTransferReceipt(): Promise<TransferReceiptImage | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    throw new Error('اسمح للتطبيق بالوصول إلى الصور لاختيار إيصال التحويل.');
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: false,
    quality: 1,
  });
  if (result.canceled || !result.assets[0]) return null;

  const asset = result.assets[0];
  // Preserve crisp PNG scans/screenshots without introducing JPEG artifacts.
  const isPng = asset.mimeType === 'image/png' || /\.png(?:[?#]|$)/i.test(asset.fileName ?? asset.uri);
  const context = ImageManipulator.manipulate(asset.uri);
  const longestSide = Math.max(asset.width, asset.height);
  if (longestSide > 2200) {
    if (asset.width >= asset.height) context.resize({ width: 2200 });
    else context.resize({ height: 2200 });
  }

  try {
    const image = await context.renderAsync();
    try {
      const compressed = await image.saveAsync(isPng ? { format: SaveFormat.PNG } : { format: SaveFormat.JPEG, compress: 0.85 });
      return { uri: compressed.uri, fileName: isPng ? 'transfer-receipt.png' : 'transfer-receipt.jpg', mimeType: isPng ? 'image/png' : 'image/jpeg' };
    } finally {
      image.release();
    }
  } finally {
    context.release();
  }
}
