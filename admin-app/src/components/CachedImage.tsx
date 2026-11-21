import React, { useEffect, useState } from 'react';
import { Image, ImageProps } from 'react-native';
import { getPublicImage } from '../services/imageCache';

/** Reuse public images on disk; local picker previews keep their original URI. */
export const CachedImage: React.FC<ImageProps> = ({ source, onError, ...props }) => {
  const remote = source && !Array.isArray(source) && typeof source === 'object' && 'uri' in source && /^https?:\/\//i.test(source.uri || '') ? source.uri : undefined;
  const [saved, setSaved] = useState<{ url: string; uri: string } | null>(null);
  const [retryFor, setRetryFor] = useState<string | null>(null);
  const retry = !!remote && retryFor === remote;
  useEffect(() => {
    if (!remote) return;
    let active = true;
    getPublicImage(remote, retry).then(uri => { if (active) setSaved({ url: remote, uri }); })
      .catch(() => { if (active) setSaved({ url: remote, uri: remote }); });
    return () => { active = false; };
  }, [remote, retry]);
  return <Image {...props} source={remote ? saved?.url === remote ? { uri: saved.uri } : undefined : source} onError={event => {
    if (remote && !retry) { setSaved(null); setRetryFor(remote!); } else onError?.(event);
  }} />;
};
