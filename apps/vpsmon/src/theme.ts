import { useColorScheme } from 'react-native';

// iOS の標準色に寄せる。上げ＝赤・下げ＝水色、損益は + 緑・− 橙（PicoCalc と同じ。利用者の指定）
export const palettes = {
  light: {
    bg: '#f2f2f7',
    card: '#ffffff',
    text: '#000000',
    sub: '#6e6e73',
    sep: '#e5e5ea',
    tint: '#007aff',
    up: '#e0323a',
    down: '#1a8cff',
    profit: '#1f9d3a',
    loss: '#e8800b',
    good: '#34c759',
    warn: '#ff9500',
    bad: '#ff3b30',
    yen: '#8e44ec',
    cur: '#b58a00',
    grid: '#d9d9de',
    chartBg: '#ffffff',
    bubbleMe: '#007aff',
    bubbleAi: '#e9e9eb',
  },
  dark: {
    bg: '#000000',
    card: '#1c1c1e',
    text: '#ffffff',
    sub: '#8e8e93',
    sep: '#38383a',
    tint: '#0a84ff',
    up: '#ff453a',
    down: '#50c8ff',
    profit: '#30d158',
    loss: '#ff9f0a',
    good: '#30d158',
    warn: '#ff9f0a',
    bad: '#ff453a',
    yen: '#bf5af2',
    cur: '#ffd60a',
    grid: '#2c2c2e',
    chartBg: '#000000',
    bubbleMe: '#0a84ff',
    bubbleAi: '#26252a',
  },
};

export type Palette = typeof palettes.light;

export function useTheme(): Palette & { dark: boolean } {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return { ...(dark ? palettes.dark : palettes.light), dark };
}
