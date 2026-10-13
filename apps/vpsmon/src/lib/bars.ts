// ローソク足の組み立て。時刻は 1970-01-01 からの通しの分（JST 壁時計）。
// PicoCalc の main.c と同じ考え方: M1 は status の確定足＋形成中の足、
// M5・M15 は VPS の /bars.json を土台に、直近は status の M1 からまとめた足で上書きする。

import type { BarCols, M1 } from './types';
import { parseJstMin } from './time';

export type Bar = { t: number; o: number; h: number; l: number; c: number; forming?: boolean };

export function fromCols(cols: BarCols): Bar[] {
  const t0 = parseJstMin(cols.t0_jst);
  if (t0 == null) return [];
  const n = Math.min(cols.dt.length, cols.o.length, cols.h.length, cols.l.length, cols.c.length);
  const out: Bar[] = [];
  for (let i = 0; i < n; i++) out.push({ t: t0 + cols.dt[i], o: cols.o[i], h: cols.h[i], l: cols.l[i], c: cols.c[i] });
  return out;
}

/** status の m1（確定足＋形成中） */
export function m1Bars(m1: M1): Bar[] {
  const out = fromCols(m1);
  const ct = parseJstMin(m1.cur?.t_jst);
  if (ct != null && m1.cur.o > 0) out.push({ t: ct, o: m1.cur.o, h: m1.cur.h, l: m1.cur.l, c: m1.cur.c, forming: true });
  return out;
}

/** M1 を tf 分足にまとめる。途中の分から始まる最初の足は始値が違うので捨てる（status_server.py と同じ） */
export function aggregate(bars: Bar[], tf: number): Bar[] {
  if (tf <= 1) return bars;
  const out: Bar[] = [];
  let firstPartial = false;
  for (const b of bars) {
    const head = b.t - (b.t % tf);
    const last = out[out.length - 1];
    if (last && last.t === head) {
      last.h = Math.max(last.h, b.h);
      last.l = Math.min(last.l, b.l);
      last.c = b.c;
      if (b.forming) last.forming = true;
    } else {
      if (out.length === 0) firstPartial = head !== b.t;
      out.push({ t: head, o: b.o, h: b.h, l: b.l, c: b.c, forming: b.forming });
    }
  }
  if (firstPartial && out.length > 1) out.shift();
  return out;
}

/** 土台（VPS の過去足）に直近（status から作った足）を重ねる。同じ時刻は直近が勝つ */
export function merge(base: Bar[], recent: Bar[]): Bar[] {
  const map = new Map<number, Bar>();
  for (const b of base) map.set(b.t, b);
  for (const b of recent) map.set(b.t, b);
  return [...map.values()].sort((a, b) => a.t - b.t);
}
