import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { api } from '../api';
import { colors, typography } from '../theme';
import { ReceiptImageViewer } from './ReceiptImageViewer';

export const ReceiptImage: React.FC<{ url: string }> = ({ url }) => {
  const [uri, setUri] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [viewerOpen, setViewerOpen] = useState(false);
  useEffect(() => {
    let active = true;
    setUri(null); setError(''); setLoading(true); setViewerOpen(false);
    api.getReceiptImage(url, retry > 0)
      .then(value => { if (active) setUri(value); })
      .catch(reason => { if (active) setError(reason instanceof Error ? reason.message : 'تعذر تحميل صورة الإيصال.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [url, retry]);
  return <View style={styles.container}>
    {loading && <ActivityIndicator color={colors.primary} />}
    {uri && !error && <TouchableOpacity style={styles.preview} accessibilityRole="button"
      accessibilityLabel="فتح صورة الإيصال وتكبيرها" onPress={() => setViewerOpen(true)} activeOpacity={0.85}>
      <Image source={{ uri }} style={styles.image} resizeMode="contain"
        onError={() => setError('تعذر عرض صورة الإيصال. أعد تحميلها.')} />
      <Text style={styles.previewHint}>اضغط لاستعراض الإيصال وتكبيره</Text>
    </TouchableOpacity>}
    {viewerOpen && uri && !error && <ReceiptImageViewer uri={uri} onClose={() => setViewerOpen(false)}
      onError={() => { setViewerOpen(false); setError('تعذر عرض صورة الإيصال. أعد تحميلها.'); }} />}
    {!!error && <>
      <Text style={styles.error}>{error}</Text>
      <TouchableOpacity onPress={() => setRetry(value => value + 1)} accessibilityRole="button" style={styles.retry}>
        <Text style={styles.retryText}>إعادة تحميل الإيصال</Text>
      </TouchableOpacity>
    </>}
  </View>;
};

const styles = StyleSheet.create({
  container: { width: '100%', minHeight: 170, backgroundColor: colors.surfaceContainerLow, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: 240 },
  preview: { width: '100%' },
  previewHint: { color: colors.primary, fontFamily: typography.fontFamily.medium, textAlign: 'center', padding: 10 },
  error: { color: colors.error, textAlign: 'center', padding: 12, fontFamily: typography.fontFamily.regular },
  retry: { minHeight: 44, padding: 12 },
  retryText: { color: colors.primary, fontFamily: typography.fontFamily.bold },
});
