export const introMedia = {
  light: { video: require('../../assets/intro/light.mp4'), poster: require('../../assets/intro/light-poster.jpg'), background: '#F3F3F3' },
  dark: { video: require('../../assets/intro/dark.mp4'), poster: require('../../assets/intro/dark-poster.jpg'), background: '#0F0E0A' },
};
export type IntroPlayerProps = { source: number; background: string; onFinished: () => void };
