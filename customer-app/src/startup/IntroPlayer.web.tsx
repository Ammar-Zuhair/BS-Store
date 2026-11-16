import React from 'react';
import { Asset } from 'expo-asset';
import { IntroPlayerProps } from './media';

export function IntroPlayer({ source, background, onFinished }: IntroPlayerProps) {
  return React.createElement('video', {
    src: Asset.fromModule(source).uri, autoPlay: true, muted: true, playsInline: true, preload: 'auto', controls: false,
    'aria-hidden': true, tabIndex: -1,
    style: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'contain', background, pointerEvents: 'none' },
    onEnded: onFinished, onError: onFinished,
    onLoadedData: event => { void (event.currentTarget as HTMLVideoElement).play().catch(onFinished); },
  });
}
