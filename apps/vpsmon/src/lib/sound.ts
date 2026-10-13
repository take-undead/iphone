// チャイム（A5→E6 の上がる 2 音 / 下がる 2 音）。assets/sounds は python で作った 11025Hz の WAV。
// 音量は 1〜10（1 段 3dB。10 で最大）。

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';

let up: AudioPlayer | null = null;
let down: AudioPlayer | null = null;
let modeSet = false;

async function ensure() {
  if (!modeSet) {
    modeSet = true;
    try {
      await setAudioModeAsync({ playsInSilentMode: true });
    } catch {
      /* 音の設定に失敗しても続ける */
    }
  }
  if (!up) up = createAudioPlayer(require('../../assets/sounds/up.wav'));
  if (!down) down = createAudioPlayer(require('../../assets/sounds/down.wav'));
}

export function volumeOf(level: number): number {
  const v = Math.max(1, Math.min(10, level));
  return Math.pow(10, ((v - 10) * 3) / 20);
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** times 回、0.55 秒おきに鳴らす。sound=false なら振動だけ */
export async function chime(dir: 'up' | 'down', times: number, level: number, opts: { sound?: boolean; haptic?: boolean } = {}) {
  const sound = opts.sound ?? true;
  const haptic = opts.haptic ?? true;
  if (sound) await ensure();
  const p = dir === 'up' ? up : down;
  if (p) p.volume = volumeOf(level);
  for (let i = 0; i < Math.max(1, times); i++) {
    if (haptic) Haptics.notificationAsync(dir === 'up' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (sound && p) {
      try {
        await p.seekTo(0);
        p.play();
      } catch {
        /* Expo Go で音が出ない環境でも落とさない */
      }
    }
    await sleep(550);
  }
}
