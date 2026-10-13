// AI 日報: mt5mon の N の画面。要約（/sup.json、60 秒ごと）と全文（/nippo.md、5 分ごと）。

import React, { useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, describeError } from '@/lib/api';
import { arrowOf, biasLabel, fmtPrice, fmtSigned, fmtYen, pctOf } from '@/lib/format';
import { useSettings } from '@/lib/settings';
import { minutesAgo, shortDateTime, shortTime } from '@/lib/time';
import type { Sup } from '@/lib/types';
import { usePolling } from '@/lib/usePolling';
import { Banner, Card, Row, Segmented } from '@/components/ui';
import { useTheme } from '@/theme';

export default function ReportScreen() {
  const t = useTheme();
  const { settings } = useSettings();
  const [mode, setMode] = useState<'sum' | 'full'>('sum');
  const sup = usePolling<Sup>(() => api.sup(settings), 60000, describeError);
  const nippo = usePolling<string>(() => api.nippo(settings), 300000, describeError, mode === 'full');
  const s = sup.data;

  const alive = aliveOf(s, t);
  const arrow = arrowOf(s?.cmd.p_up);
  const arrowColor = arrow.dir === 'up' ? t.up : arrow.dir === 'down' ? t.down : t.sub;

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => (mode === 'sum' ? sup.refresh() : nippo.refresh())} tintColor={t.sub} />}>
      <View style={{ marginHorizontal: 16, marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Segmented<'sum' | 'full'>
          options={[
            { key: 'sum', label: '要約' },
            { key: 'full', label: '全文' },
          ]}
          value={mode}
          onChange={setMode}
          style={{ width: 160 }}
        />
        <View style={{ flex: 1, alignItems: 'flex-end' }}>
          <Text style={{ color: alive.color, fontSize: 13, fontWeight: '600' }}>{alive.text}</Text>
          {sup.error ? <Text style={{ color: t.bad, fontSize: 12 }}>{sup.error}</Text> : null}
        </View>
      </View>

      {mode === 'sum' ? (
        <>
          <Card>
            <View style={styles.top}>
              <Text style={[styles.arrow, { color: arrowColor }]}>{arrow.arrow}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.big, { color: t.text }]}>
                  {biasLabel(s?.cmd.bias)} <Text style={{ color: arrowColor }}>上 {pctOf(s?.cmd.p_up)}</Text>
                </Text>
                <Text style={{ color: t.sub, fontSize: 13 }}>
                  {s?.cmd.risk ? `警戒あり（${s.cmd.risk}）` : '警戒なし'} ・ 判断 #{s?.cmd.seq ?? '-'} {shortDateTime(s?.cmd.t)}
                </Text>
              </View>
            </View>
            {s?.cmd.outlook ? <Banner text={`見立て: ${s.cmd.outlook}`} color={t.dark ? '#2c2c2e' : '#f2f2f7'} textStyle={{ color: t.text, fontWeight: '400' }} /> : null}
            {s?.cmd.regime ? <Row label="局面" value={s.cmd.regime} /> : null}
            <Row label="買いライン / 売りライン" value={`${fmtPrice(s?.cmd.line_buy)} / ${fmtPrice(s?.cmd.line_sell)}`} />
            <Row label="停止（買い≧ / 売り≦）" value={`${fmtPrice(s?.cmd.buy_stop)} / ${fmtPrice(s?.cmd.sell_stop)}`} />
            <Row label="ロット係数" value={s?.cmd.lot_factor != null ? String(s.cmd.lot_factor) : '-'} last />
          </Card>

          <Card title="EA_One">
            <Row label="現在値 / スプレッド" value={`${fmtPrice(s?.ea.bid)} / ${s?.ea.spread ?? '-'}`} />
            <Row
              label="建玉"
              value={s?.ea.pos && s.ea.pos !== 'none' ? `${s.ea.pos === 'buy' ? '買' : '売'} ${s.ea.pos_lots} ・ ${fmtSigned(s.ea.pos_pips)} pips ・ ${s.ea.pos_min}分` : 'なし'}
              valueColor={s?.ea.pos_pips != null && s.ea.pos !== 'none' ? (s.ea.pos_pips >= 0 ? t.profit : t.loss) : undefined}
            />
            <Row label="人の指示 / 適用 seq" value={`${s?.ea.gui ?? '-'} / ${s?.ea.seq ?? '-'}`} />
            <Row label="残高 / 有効証拠金" value={`${fmtYen(s?.ea.balance)} / ${fmtYen(s?.ea.equity)}`} />
            <Row label="直近の決済" value={s?.ea.last_close ? `${shortDateTime(s.ea.last_close)} ${fmtSigned(s.ea.last_pips)} pips` : '-'} />
            <Row label="前週 高 / 安" value={`${fmtPrice(s?.ea.week_high)} / ${fmtPrice(s?.ea.week_low)}`} />
            <Row
              label="24h 変化"
              value={s?.ea.chg24h ? Object.entries(s.ea.chg24h).map(([k, v]) => `${k} ${fmtSigned(v, 1)}`).join('  ') : '-'}
              last={!s?.ea.err}
            />
            {s?.ea.err ? <Row label="EA エラー" value={s.ea.err} valueColor={t.bad} last /> : null}
          </Card>

          <Card title="根拠">
            <Text style={[styles.body, { color: t.text }]}>{s?.cmd.reason || '-'}</Text>
          </Card>

          <Card title="判断の記録（直近 5 件）">
            {(s?.decisions ?? []).map((d, i, arr) => {
              const a = arrowOf(d.p_up);
              return (
                <Row
                  key={`${d.seq}${d.t}`}
                  label={`${shortDateTime(d.t)}  #${d.seq}  ${biasLabel(d.bias)}  risk ${d.risk}`}
                  sub={d.why}
                  value={`${a.arrow} ${pctOf(d.p_up)}${d.res !== '' ? ` → ${fmtSigned(Number(d.res))}p` : ''}`}
                  valueColor={a.dir === 'up' ? t.up : a.dir === 'down' ? t.down : t.sub}
                  last={i === arr.length - 1}
                />
              );
            })}
            {!s?.decisions?.length ? <Row label="記録なし" last /> : null}
          </Card>

          <Card title="申し送り（latest.md）">
            <View style={{ padding: 14 }}>{(s?.latest ?? ['-']).map((l, i) => renderMdLine(l, i, t))}</View>
          </Card>
          <Text style={{ color: t.sub, fontSize: 12, textAlign: 'center', marginTop: 12 }}>更新 {shortTime(s?.updated_jst)}</Text>
        </>
      ) : (
        <Card>
          <View style={{ padding: 14 }}>
            {nippo.error ? <Text style={{ color: t.bad }}>{nippo.error}</Text> : null}
            {nippo.data ? nippo.data.split('\n').map((l, i) => renderMdLine(l, i, t)) : !nippo.error ? <Text style={{ color: t.sub }}>取得中…</Text> : null}
          </View>
        </Card>
      )}
    </ScrollView>
  );
}

/** 監督の生存（supervisor.json の alive_jst と status）。●生存 n分前 緑／●休場 灰／●判断中 水色／●遅れ 橙／●失敗・停止・未受信 赤 */
function aliveOf(s: Sup | null, t: ReturnType<typeof useTheme>): { text: string; color: string } {
  if (!s) return { text: '● 未受信', color: t.bad };
  const st = (s.alive.status ?? '').toLowerCase();
  const ago = minutesAgo(s.alive.t);
  const agoText = ago == null ? '' : ` ${ago}分前`;
  if (/ok|alive|正常/.test(st)) return { text: `● 生存${agoText}`, color: t.good };
  if (/closed|holiday|休場|market/.test(st)) return { text: `● 休場${agoText}`, color: t.sub };
  if (/think|busy|判断中|running/.test(st)) return { text: `● 判断中${agoText}`, color: t.down };
  if (/late|遅れ|delay/.test(st)) return { text: `● 遅れ${agoText}`, color: t.warn };
  return { text: `● ${s.alive.status ?? '停止'}${agoText}`, color: t.bad };
}

/** Markdown の簡単な表示: # は見出し、## は区切り線付き、|---| は捨て、表の | は空白 */
function renderMdLine(line: string, key: number, t: ReturnType<typeof useTheme>) {
  if (/^\|\s*-+/.test(line)) return null;
  if (line.startsWith('# ')) {
    return (
      <Text key={key} style={[styles.h1, { color: t.tint }]}>
        {line.slice(2)}
      </Text>
    );
  }
  if (line.startsWith('## ')) {
    return (
      <View key={key} style={{ marginTop: 12, marginBottom: 4, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.sep, paddingTop: 8 }}>
        <Text style={[styles.h2, { color: t.text }]}>{line.slice(3)}</Text>
      </View>
    );
  }
  const text = line.replace(/\*\*/g, '').replace(/`/g, '').replace(/\|/g, '  ').replace(/^- /, '・');
  return (
    <Text key={key} style={[styles.body, { color: t.text }]}>
      {text}
    </Text>
  );
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12 },
  arrow: { fontSize: 40, fontWeight: '700' },
  big: { fontSize: 20, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, paddingHorizontal: 14, paddingVertical: 4 },
  h1: { fontSize: 20, fontWeight: '700', paddingHorizontal: 14, paddingVertical: 4 },
  h2: { fontSize: 17, fontWeight: '600', paddingHorizontal: 14 },
});
