import React, { useEffect, useState } from 'react';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system/legacy';
import { WebView } from 'react-native-webview';
import { StyleSheet } from 'react-native';
import { IntroPlayerProps } from './media';
import { introVideoHtml } from './videoHtml';

// Reuses the WebView shipped with the current customer binary; no native dependency change.
export function IntroPlayer({ source, background, onFinished }: IntroPlayerProps) {
  const [page, setPage] = useState<{ uri: string; folder: string }>();
  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const asset = await Asset.fromModule(source).downloadAsync();
        if (!active) return;
        if (!asset.localUri || !FileSystem.cacheDirectory) throw new Error('INTRO_ASSET_UNAVAILABLE');
        const folder = `${FileSystem.cacheDirectory}customer-intro/`;
        await FileSystem.makeDirectoryAsync(folder, { intermediates: true });
        const name = `intro-${asset.hash || source}.mp4`;
        const videoPath = folder + name;
        if (!(await FileSystem.getInfoAsync(videoPath)).exists) await FileSystem.copyAsync({ from: asset.localUri, to: videoPath });
        const uri = `${folder}intro-${asset.hash || source}.html`;
        await FileSystem.writeAsStringAsync(uri, introVideoHtml(name, background));
        if (active) setPage({ uri, folder });
      } catch { if (active) onFinished(); }
    })();
    return () => { active = false; };
  }, [source, background, onFinished]);
  if (!page) return null;
  return <WebView source={{ uri: page.uri }} style={[StyleSheet.absoluteFill, { backgroundColor: background }]}
    containerStyle={{ backgroundColor: background }} originWhitelist={['file://*', 'about:blank']}
    allowingReadAccessToURL={page.folder} allowFileAccess allowFileAccessFromFileURLs={false} allowUniversalAccessFromFileURLs={false}
    onShouldStartLoadWithRequest={request => request.url === page.uri || request.url === 'about:blank'}
    javaScriptEnabled domStorageEnabled={false} sharedCookiesEnabled={false} thirdPartyCookiesEnabled={false}
    javaScriptCanOpenWindowsAutomatically={false} setSupportMultipleWindows={false} mixedContentMode="never"
    allowsInlineMediaPlayback mediaPlaybackRequiresUserAction={false} allowsFullscreenVideo={false}
    allowsPictureInPictureMediaPlayback={false} allowsAirPlayForMediaPlayback={false}
    scrollEnabled={false} bounces={false} overScrollMode="never" automaticallyAdjustContentInsets={false}
    onMessage={event => { if (event.nativeEvent.data === 'finished') onFinished(); }}
    onError={onFinished} onHttpError={onFinished} onRenderProcessGone={onFinished} onContentProcessDidTerminate={onFinished}
    renderError={() => <></>} accessible={false} />;
}
