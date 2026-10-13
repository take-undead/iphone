// ローソク足（react-native-svg）。PicoCalc の ui.c の描き方を iPhone 向けに:
//   上げ＝赤・下げ＝水色、黄の点線が今の bid、建値に点線（買い＝赤・売り＝水色）、
//   キリ値は 1 円ごとに紫の実線・50 銭に点線。範囲の外なら上下の端に一番近いキリ値と pips の距離。
//   右に価格の目盛り、下に時刻（M1・M5 は 30 分、M15 は 1 時間ごと）。

import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Rect, Text as SvgText } from 'react-native-svg';
import type { Bar } from '@/lib/bars';
import { fmtHM } from '@/lib/time';
import { useTheme } from '@/theme';

export type EntryLine = { price: number; type: 'buy' | 'sell' };

type Props = {
  bars: Bar[];
  tf: number;
  bid: number | null;
  entries: EntryLine[];
  width: number;
  height: number;
  /** 1 本の幅（px）。指定が無ければ本数から決める */
  candleW?: number;
};

const AXIS_W = 52;
const AXIS_H = 18;
const PAD_T = 8;

export function CandleChart({ bars, tf, bid, entries, width, height, candleW }: Props) {
  const t = useTheme();
  const chartW = width - AXIS_W;
  const chartH = height - AXIS_H;

  const view = useMemo(() => {
    if (chartW <= 0 || bars.length === 0) return null;
    const w = candleW ?? Math.max(2, Math.min(12, Math.floor(chartW / Math.max(1, bars.length))));
    const n = Math.min(bars.length, Math.floor((chartW - 4) / w));
    const vis = bars.slice(-n);
    let lo = Infinity;
    let hi = -Infinity;
    for (const b of vis) {
      lo = Math.min(lo, b.l);
      hi = Math.max(hi, b.h);
    }
    if (bid != null) {
      lo = Math.min(lo, bid);
      hi = Math.max(hi, bid);
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    const pad = Math.max((hi - lo) * 0.06, 0.01);
    lo -= pad;
    hi += pad;
    const y = (p: number) => PAD_T + ((hi - p) / (hi - lo)) * (chartH - PAD_T * 2);
    // 右端を少し空ける（現在値の札と重ならないように）
    const x = (i: number) => chartW - 4 - (n - i) * w + w / 2;
    return { vis, w, n, lo, hi, y, x };
  }, [bars, bid, candleW, chartW, chartH]);

  if (!view) {
    return <View style={{ width, height }} />;
  }
  const { vis, w, n, lo, hi, y, x } = view;

  // キリ値（1 円＝実線、50 銭＝点線）
  const yenLines: { p: number; solid: boolean }[] = [];
  for (let p = Math.ceil(lo * 2) / 2; p <= hi; p += 0.5) yenLines.push({ p: +p.toFixed(3), solid: Math.abs(p - Math.round(p)) < 1e-6 });
  const nearAbove = Math.ceil((hi + 1e-9) * 2) / 2;
  const nearBelow = Math.floor((lo - 1e-9) * 2) / 2;
  const noYen = yenLines.length === 0;

  // 価格の目盛り（5 段）
  const ticks: number[] = [];
  const step = niceStep((hi - lo) / 5);
  for (let p = Math.ceil(lo / step) * step; p <= hi; p += step) ticks.push(+p.toFixed(3));

  // 時刻の目盛り
  const every = tf >= 15 ? 60 : 30;
  const timeLabels: { i: number; s: string }[] = [];
  let lastX = -100;
  vis.forEach((b, i) => {
    if (b.t % every === 0 && x(i) - lastX >= 44) {
      timeLabels.push({ i, s: fmtHM(b.t) });
      lastX = x(i);
    }
  });

  const labelBg = t.dark ? '#000' : '#fff';

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Rect x={0} y={0} width={width} height={height} fill={t.chartBg} />
        {/* 目盛り線 */}
        {ticks.map((p) => (
          <G key={`tick${p}`}>
            <Line x1={0} x2={chartW} y1={y(p)} y2={y(p)} stroke={t.grid} strokeWidth={0.5} />
            <SvgText x={chartW + 6} y={y(p) + 4} fill={t.sub} fontSize={11}>
              {p.toFixed(2)}
            </SvgText>
          </G>
        ))}
        {/* キリ値 */}
        {yenLines.map((l) => (
          <G key={`yen${l.p}`}>
            <Line x1={0} x2={chartW} y1={y(l.p)} y2={y(l.p)} stroke={t.yen} strokeWidth={l.solid ? 1.2 : 0.8} strokeDasharray={l.solid ? undefined : '3,3'} />
            <SvgText x={3} y={y(l.p) - 3} fill={t.yen} fontSize={10}>
              {l.p.toFixed(2)}
            </SvgText>
          </G>
        ))}
        {noYen && bid != null ? (
          <G>
            <SvgText x={3} y={PAD_T + 10} fill={t.yen} fontSize={10}>
              {`↑${nearAbove.toFixed(2)} +${((nearAbove - bid) * 100).toFixed(1)}`}
            </SvgText>
            <SvgText x={3} y={chartH - 3} fill={t.yen} fontSize={10}>
              {`↓${nearBelow.toFixed(2)} -${((bid - nearBelow) * 100).toFixed(1)}`}
            </SvgText>
          </G>
        ) : null}
        {/* 建値 */}
        {entries.map((e, i) => {
          if (e.price < lo || e.price > hi) return null;
          const col = e.type === 'buy' ? t.up : t.down;
          return (
            <G key={`entry${i}`}>
              <Line x1={0} x2={chartW} y1={y(e.price)} y2={y(e.price)} stroke={col} strokeWidth={1} strokeDasharray="4,3" />
              <SvgText x={3} y={y(e.price) + 11} fill={col} fontSize={10}>
                {e.type === 'buy' ? '買' : '売'}
              </SvgText>
            </G>
          );
        })}
        {/* ローソク */}
        {vis.map((b, i) => {
          const up = b.c >= b.o;
          const col = up ? t.up : t.down;
          const cx = x(i);
          const top = y(Math.max(b.o, b.c));
          const bot = y(Math.min(b.o, b.c));
          const bw = Math.max(1, w - 1);
          return (
            <G key={b.t} opacity={b.forming ? 0.75 : 1}>
              <Line x1={cx} x2={cx} y1={y(b.h)} y2={y(b.l)} stroke={col} strokeWidth={1} />
              <Rect x={cx - bw / 2} y={top} width={bw} height={Math.max(1, bot - top)} fill={col} />
            </G>
          );
        })}
        {/* 今の bid */}
        {bid != null ? (
          <G>
            <Line x1={0} x2={chartW} y1={y(bid)} y2={y(bid)} stroke={t.cur} strokeWidth={1} strokeDasharray="2,2" />
            <Rect x={chartW + 1} y={y(bid) - 8} width={AXIS_W - 2} height={16} rx={3} fill={t.cur} />
            <SvgText x={chartW + 5} y={y(bid) + 4} fill={labelBg} fontSize={11} fontWeight="bold">
              {bid.toFixed(3)}
            </SvgText>
          </G>
        ) : null}
        {/* 枠と時刻 */}
        <Line x1={chartW} x2={chartW} y1={0} y2={chartH} stroke={t.sep} strokeWidth={1} />
        <Line x1={0} x2={width} y1={chartH} y2={chartH} stroke={t.sep} strokeWidth={1} />
        {timeLabels.map((l) => (
          <G key={`tl${l.i}`}>
            <Line x1={x(l.i)} x2={x(l.i)} y1={chartH - 4} y2={chartH} stroke={t.sub} strokeWidth={1} />
            <SvgText x={x(l.i)} y={chartH + 13} fill={t.sub} fontSize={10} textAnchor="middle">
              {l.s}
            </SvgText>
          </G>
        ))}
        <SvgText x={chartW - 4} y={PAD_T + 10} fill={t.sub} fontSize={10} textAnchor="end">
          {`${n}本`}
        </SvgText>
      </Svg>
    </View>
  );
}

function niceStep(raw: number): number {
  const steps = [0.005, 0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5];
  for (const s of steps) if (s >= raw) return s;
  return 10;
}
