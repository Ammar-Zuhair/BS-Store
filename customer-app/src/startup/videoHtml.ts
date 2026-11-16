const escapeAttribute = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

// A local-only page. No remote frames, requests, cookies, controls or navigation.
export function introVideoHtml(fileName: string, background: string) {
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; media-src 'self' file:; style-src 'unsafe-inline'; script-src 'unsafe-inline'">
<style>html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${escapeAttribute(background)}}video{width:100%;height:100%;object-fit:contain;pointer-events:none}</style></head>
<body><video id="intro" src="${escapeAttribute(fileName)}" autoplay muted playsinline webkit-playsinline preload="auto" disablepictureinpicture></video>
<script>(function(){var video=document.getElementById('intro');var done=false;
function finish(){if(!done){done=true;window.ReactNativeWebView.postMessage('finished')}}
video.muted=true;video.defaultMuted=true;video.addEventListener('ended',finish);video.addEventListener('error',finish);
video.play().catch(finish);})();</script></body></html>`;
}
