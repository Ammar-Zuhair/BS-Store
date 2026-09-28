import React, { useEffect, useState } from 'react';
import { Image, ImageProps } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';

const pendingDownloads = new Map<string, Promise<string>>();
const hashUrl = (url: string) => {
  let hash = 2166136261;
  for (let i = 0; i < url.length; i += 1) hash = Math.imul(hash ^ url.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16);
};

async function getCachedUri(url: string): Promise<string> {
  const base = FileSystem.documentDirectory;
  if (!base) throw new Error('Local image storage unavailable');
  const directory = `${base}bsstore-image-cache/`;
  const uri = `${directory}${hashUrl(url)}.img`;
  const cached = await FileSystem.getInfoAsync(uri);
  if (cached.exists) return uri;
  let pending = pendingDownloads.get(url);
  if (!pending) {
    pending = (async () => {
      const dir = await FileSystem.getInfoAsync(directory);
      if (!dir.exists) await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      const result = await FileSystem.downloadAsync(url, uri);
      return result.uri;
    })();
    pendingDownloads.set(url, pending);
  }
  try { return await pending; }
  finally { pendingDownloads.delete(url); }
}

export const CachedImage: React.FC<ImageProps> = ({ source, ...props }) => {
  const remoteUri = typeof source === 'object' && source && 'uri' in source ? source.uri : undefined;
  const [uri, setUri] = useState<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    setUri(undefined);
    if (remoteUri) getCachedUri(remoteUri).then((cached) => { if (active) setUri(cached); }).catch(() => { if (active) setUri(remoteUri); });
    return () => { active = false; };
  }, [remoteUri]);
  return <Image {...props} source={uri ? { uri } : undefined} />;
};
