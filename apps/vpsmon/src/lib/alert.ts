// 急な値動きの検知（PicoCalc の alert.c と同じ規則）:
//   新しい現在値（gen_jst が変わり stale でないとき）を覚え、直近 minutes 分の最安値から pips 以上上がれば急騰、
//   最高値から下がれば急落。鳴らしたら判定をやり直す（同じ動きで鳴り続けない）。
//   大きく動いたほど長く鳴らす: 幅の何倍動いたかの回数（1〜5）。

export type Spike = { dir: 'up' | 'down'; pips: number; minutes: number; times: number; at: number };

const PIP = 0.01; // USDJPY

export class SpikeDetector {
  private hist: { t: number; bid: number }[] = [];
  private lastGen = '';

  reset() {
    this.hist = [];
  }

  /** 新しい値を入れ、鳴らすべきなら Spike を返す */
  push(genJst: string, bid: number, stale: boolean, pips: number, minutes: number, now = Date.now()): Spike | null {
    if (stale || genJst === this.lastGen) return null;
    this.lastGen = genJst;
    const limit = now - minutes * 60000;
    this.hist = this.hist.filter((h) => h.t >= limit);
    this.hist.push({ t: now, bid });
    if (this.hist.length < 2) return null;
    let lo = Infinity;
    let hi = -Infinity;
    for (const h of this.hist) {
      lo = Math.min(lo, h.bid);
      hi = Math.max(hi, h.bid);
    }
    const up = (bid - lo) / PIP;
    const down = (hi - bid) / PIP;
    if (up >= pips && up >= down) {
      this.hist = [];
      return { dir: 'up', pips: +up.toFixed(1), minutes, times: Math.min(5, Math.max(1, Math.floor(up / pips))), at: now };
    }
    if (down >= pips) {
      this.hist = [];
      return { dir: 'down', pips: +down.toFixed(1), minutes, times: Math.min(5, Math.max(1, Math.floor(down / pips))), at: now };
    }
    return null;
  }
}
