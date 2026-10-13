// 相場: mt5mon のメイン画面。見出し（bid/ask・状態）→ 問題の帯 → チャート → 口座 → 建玉／EA の一覧。

import { useKeepAwake } from 'expo-keep-awake';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SpikeDetector, type Spike } from '@/lib/alert';
import { api, describeError } from '@/lib/api';
import { aggregate, fromCols, m1Bars, merge, type Bar } from '@/lib/bars';
import { fmtPct, fmtPrice, fmtYen } from '@/lib/format';
import { FROZEN_SEC, healthOf } from '@/lib/health';
import { useSettings } from '@/lib/settings';
import { chime } from '@/lib/sound';
import { fmtJstHMS, nowJst, parseJstMin, shortDateTime, shortTime } from '@/lib/time';
import type { BarsResp, Status } from '@/lib/types';
import { usePolling } from '@/lib/usePolling';
import { CandleChart } from '@/components/CandleChart';
import { Badge, Banner, Card, Row, Segmented } from '@/components/ui';
import { useTheme } from '@/theme';

type Tf = '1' | '5' | '15';
const RECENT_MIN = 120; // 直近 2 時間は status の M1 からまとめた足で上書き

export default function MarketScreen() {
  useKeepAwake();
  const t = useTheme();
  const { settings } = useSettings();
  const { width } = useWindowDimensions();

  const status = usePolling<Status>(() => api.status(settings), settings.statusSec * 1000, describeError, true, `${settings.baseUrl}:${settings.demo}`);
  const st = status.data;

  // gen_jst が進まない → 停止
  const genRef = useRef<{ gen: string; at: number }>({ gen: '', at: Date.now() });
  const [frozen, setFrozen] = useState(false);
  useEffect(() => {
    if (!st) return;
    if (st.gen_jst !== genRef.current.gen) genRef.current = { gen: st.gen_jst, at: Date.now() };
    setFrozen(Date.now() - genRef.current.at > FROZEN_SEC * 1000);
  }, [st]);

  // 時計（毎秒）
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const health = healthOf(st, frozen, status.error);
  const healthColor = { live: t.good, stale: t.warn, disconnected: t.warn, frozen: t.bad, failed: t.bad, none: t.sub }[health.health];

  // 時間足
  const [tf, setTf] = useState<Tf>('1');
  const tfNum = Number(tf);
  const hist = usePolling<BarsResp>(() => api.bars(settings, tfNum, 140), 30000, describeError, tfNum > 1, `${tfNum}:${settings.baseUrl}:${settings.demo}`);

  const bars: Bar[] = useMemo(() => {
    if (!st) return [];
    const m1 = m1Bars(st.m1);
    if (tfNum === 1) return m1;
    const lastT = m1[m1.length - 1]?.t ?? 0;
    const recent = aggregate(
      m1.filter((b) => b.t >= lastT - RECENT_MIN),
      tfNum,
    );
    const base = hist.data && hist.data.tf === tfNum ? fromCols(hist.data) : [];
    return merge(base, recent);
  }, [st, tfNum, hist.data]);

  // 急な値動き
  const detector = useRef(new SpikeDetector()).current;
  const [spike, setSpike] = useState<Spike | null>(null);
  useEffect(() => {
    if (!st || !settings.alertOn) return;
    const s = detector.push(st.gen_jst, st.tick.bid, st.stale, settings.alertPips, settings.alertMinutes);
    if (s) {
      setSpike(s);
      chime(s.dir, s.times, settings.volume, { sound: settings.soundOn }).catch(() => {});
    }
  }, [st, settings.alertOn, settings.alertPips, settings.alertMinutes, settings.volume, settings.soundOn, detector]);
  const spikeVisible = spike && now - spike.at < 30000 ? spike : null;

  const [listMode, setListMode] = useState<'pos' | 'ea'>('pos');
  const onRefresh = useCallback(() => {
    status.refresh();
    if (tfNum > 1) hist.refresh();
  }, [status, hist, tfNum]);

  const entries = useMemo(
    () => (st?.positions ?? []).filter((p) => p.symbol === st?.symbol).map((p) => ({ price: p.open, type: p.type })),
    [st],
  );
  const secAgo = status.okAt ? Math.floor((now - status.okAt) / 1000) : null;
  const chartW = width - 32;

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={t.sub} />}>
      {/* 見出し */}
      <Card>
        <View style={styles.headRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.symbol, { color: t.sub }]}>{st?.symbol ?? 'USDJPY'}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
              <Text style={[styles.bid, { color: t.text }]}>{fmtPrice(st?.tick.bid)}</Text>
              <Text style={[styles.ask, { color: t.sub }]}>  ask {fmtPrice(st?.tick.ask)}</Text>
            </View>
            <Text style={[styles.small, { color: t.sub }]}>
              スプレッド {st ? st.tick.spread_pips.toFixed(1) : '-'} pips ・ ティック {shortTime(st?.tick.time_jst)}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 6 }}>
            <Badge text={health.label} color={healthColor} textColor={health.health === 'stale' || health.health === 'disconnected' ? '#000' : '#fff'} />
            <Text style={[styles.small, { color: t.sub }]}>{fmtJstHMS(nowJst())} JST</Text>
            <Text style={[styles.small, { color: status.error ? t.bad : t.sub }]}>
              {status.error ? 'HTTP ✕' : `HTTP ○ ${secAgo ?? '-'}s 前`} ・ gen {shortTime(st?.gen_jst)}
            </Text>
          </View>
        </View>
        {health.reason ? <Banner text={health.reason} color={health.health === 'stale' || health.health === 'disconnected' ? t.warn : t.bad} /> : null}
        {spikeVisible ? (
          <Banner
            text={`${spikeVisible.dir === 'up' ? '急騰' : '急落'} ${spikeVisible.dir === 'up' ? '+' : '-'}${spikeVisible.pips}pips/${spikeVisible.minutes}分 ♪x${spikeVisible.times}`}
            color={spikeVisible.dir === 'up' ? t.up : t.down}
          />
        ) : null}
      </Card>

      {/* チャート */}
      <Card>
        <View style={[styles.chartHead, { borderBottomColor: t.sep }]}>
          <Segmented<Tf>
            options={[
              { key: '1', label: 'M1' },
              { key: '5', label: 'M5' },
              { key: '15', label: 'M15' },
            ]}
            value={tf}
            onChange={setTf}
            style={{ width: 180 }}
          />
          <Text style={[styles.small, { color: t.sub, flex: 1, textAlign: 'right' }]}>
            {settings.alertOn ? `♪${settings.alertPips}p/${settings.alertMinutes}分` : '♪オフ'}
          </Text>
        </View>
        {tfNum > 1 && hist.error ? <Banner text={`過去の足: ${hist.error}`} color={t.warn} textStyle={{ color: '#000' }} /> : null}
        {st ? (
          <CandleChart bars={bars} tf={tfNum} bid={st.tick.bid} entries={entries} width={chartW} height={300} />
        ) : (
          <View style={{ height: 300, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <Text style={{ color: t.bad, fontSize: 18, fontWeight: '600', textAlign: 'center' }}>{health.reason ?? '取得中…'}</Text>
            {!settings.demo ? (
              <Text style={{ color: t.sub, marginTop: 12, textAlign: 'center' }}>
                iPhone の WireGuard がつながっているか確かめる{'\n'}接続先: {settings.baseUrl}
              </Text>
            ) : null}
          </View>
        )}
      </Card>

      {/* 口座 */}
      <Card title="口座">
        <View style={styles.grid}>
          <Stat label="残高" value={fmtYen(st?.account.balance)} />
          <Stat label="有効証拠金" value={fmtYen(st?.account.equity)} />
          <Stat
            label="損益"
            value={st ? `${st.account.profit >= 0 ? '+' : ''}${fmtYen(st.account.profit)}` : '-'}
            color={st ? (st.account.profit >= 0 ? t.profit : t.loss) : undefined}
          />
          <Stat label="証拠金率" value={st && st.account.margin > 0 ? fmtPct(st.account.margin_level) : '-'} />
          <Stat label="EA 稼働" value={st ? `${st.eas.filter((e) => e.alive).length}/${st.eas.length}` : '-'} />
          <Stat label="建玉" value={st ? String(st.positions.length) : '-'} />
        </View>
      </Card>

      {/* 一覧 */}
      <Card>
        <View style={[styles.chartHead, { borderBottomColor: t.sep }]}>
          <Segmented<'pos' | 'ea'>
            options={[
              { key: 'pos', label: `建玉 ${st?.positions.length ?? 0}` },
              { key: 'ea', label: `EA ${st?.eas.length ?? 0}` },
            ]}
            value={listMode}
            onChange={setListMode}
            style={{ width: 200 }}
          />
        </View>
        {listMode === 'pos' ? (
          st && st.positions.length > 0 ? (
            st.positions.map((p, i) => {
              const other = p.symbol !== st.symbol;
              return (
                <Row
                  key={p.ticket}
                  label={`${other ? p.symbol : p.ea}  ${p.type === 'buy' ? '買' : '売'} ${p.lots.toFixed(2)}`}
                  sub={`建値 ${fmtPrice(p.open)} ・ ${shortDateTime(p.open_jst)}${p.sl ? ` ・ SL ${fmtPrice(p.sl)}` : ''}${p.tp ? ` ・ TP ${fmtPrice(p.tp)}` : ''}`}
                  value={`${p.profit >= 0 ? '+' : ''}${fmtYen(p.profit)}`}
                  valueColor={p.profit >= 0 ? t.profit : t.loss}
                  last={i === st.positions.length - 1}
                />
              );
            })
          ) : (
            <Row label="建玉なし" last />
          )
        ) : st && st.eas.length > 0 ? (
          st.eas.map((e, i) => (
            <Row
              key={`${e.name}${e.magic}`}
              label={e.name}
              sub={e.magic > 0 ? `magic ${e.magic} ・ 建玉 ${st.positions.filter((p) => p.magic === e.magic).length}` : undefined}
              value={e.alive ? '稼働' : '停止'}
              valueColor={e.alive ? t.good : t.bad}
              last={i === st.eas.length - 1}
            />
          ))
        ) : (
          <Row label="EA なし" last />
        )}
      </Card>
      {st ? (
        <Text style={[styles.small, { color: t.sub, textAlign: 'center', marginTop: 12 }]}>
          M1 {st.m1.n} 本（{shortDateTime(st.m1.t0_jst)}〜）・ 最新足 {shortTime(st.m1.cur.t_jst)} ・ 時差 {st.offset_h}h
          {parseJstMin(st.gen_jst) == null ? ' ・ gen_jst 不正' : ''}
        </Text>
      ) : null}
    </ScrollView>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  const t = useTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.small, { color: t.sub }]}>{label}</Text>
      <Text style={[styles.statValue, { color: color ?? t.text }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', padding: 14, alignItems: 'flex-start' },
  symbol: { fontSize: 13, fontWeight: '600' },
  bid: { fontSize: 34, fontWeight: '700', fontVariant: ['tabular-nums'] },
  ask: { fontSize: 15, fontVariant: ['tabular-nums'] },
  small: { fontSize: 12, fontVariant: ['tabular-nums'] },
  chartHead: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: StyleSheet.hairlineWidth, gap: 8 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 8 },
  stat: { width: '33.33%', padding: 8 },
  statValue: { fontSize: 17, fontWeight: '600', marginTop: 2, fontVariant: ['tabular-nums'] },
});
