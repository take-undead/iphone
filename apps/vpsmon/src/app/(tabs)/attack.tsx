// 攻撃の記録: mt5mon の B の画面。/f2b.json（30 秒ごと）、/stats.json（国別のタブで 30 秒ごと）。
// 行を押すと永久ブロック／解除。確かめてから送る。

import React, { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, describeError } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import { shortTime } from '@/lib/time';
import type { F2b, Stats } from '@/lib/types';
import { usePolling } from '@/lib/usePolling';
import { Banner, Button, Card, Segmented } from '@/components/ui';
import { useTheme } from '@/theme';

type Tab = 'top' | 'perm' | 'recent' | 'country';

export default function AttackScreen() {
  const t = useTheme();
  const { settings } = useSettings();
  const [tab, setTab] = useState<Tab>('top');
  const [sortIps, setSortIps] = useState(true);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sending, setSending] = useState(false);

  const f2b = usePolling<F2b>(() => api.f2b(settings), 30000, describeError);
  const stats = usePolling<Stats>(() => api.stats(settings), 30000, describeError, tab === 'country');
  const d = f2b.data;

  const send = useCallback(
    async (kind: 'ban' | 'unban', ip: string) => {
      setSending(true);
      try {
        const r = await (kind === 'ban' ? api.ban(settings, ip) : api.unban(settings, ip));
        setResult(r);
        f2b.refresh();
      } catch (e) {
        setResult({ ok: false, msg: describeError(e) });
      } finally {
        setSending(false);
      }
    },
    [settings, f2b],
  );

  const askAction = useCallback(
    (ip: string, country: string, state: string) => {
      const buttons: { text: string; style?: 'destructive' | 'cancel' | 'default'; onPress?: () => void }[] = [];
      if (state !== 'P') {
        buttons.push({
          text: '永久ブロック',
          style: 'destructive',
          onPress: () => Alert.alert('永久ブロック', `${ip}（${country}）からの全ポートを VPS の nftables で遮断します。送りますか？`, [{ text: 'やめる', style: 'cancel' }, { text: '送る', style: 'destructive', onPress: () => send('ban', ip) }]),
        });
      }
      buttons.push({
        text: state === 'P' ? '永久ブロックを解除' : '遮断を解除（fail2ban も）',
        onPress: () => Alert.alert('解除', `${ip} の永久ブロックと fail2ban の一時遮断を外します。送りますか？`, [{ text: 'やめる', style: 'cancel' }, { text: '送る', onPress: () => send('unban', ip) }]),
      });
      buttons.push({ text: 'やめる', style: 'cancel' });
      Alert.alert(ip, `${country || '国不明'}${state === 'P' ? ' ・ 永久ブロック中' : state === 'B' ? ' ・ 遮断中' : ''}`, buttons);
    },
    [send],
  );

  const refreshStats = useCallback(async () => {
    try {
      const r = await api.statsRefresh(settings);
      setResult(r);
      setTimeout(() => stats.refresh(), 8000);
    } catch (e) {
      setResult({ ok: false, msg: describeError(e) });
    }
  }, [settings, stats]);

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={{ paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => (tab === 'country' ? stats.refresh() : f2b.refresh())} tintColor={t.sub} />}>
      {/* 見張りごとの数 */}
      <Card>
        <View style={styles.jails}>
          {(d?.jails ?? []).map((j) => (
            <View key={j[0]} style={styles.jail}>
              <Text style={{ color: t.sub, fontSize: 12 }}>
                {j[1]} <Text style={{ fontSize: 10 }}>({j[2]})</Text>
              </Text>
              <Text style={{ color: t.text, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>
                {j[3]} <Text style={{ color: t.sub, fontSize: 12, fontWeight: '400' }}>遮断中</Text>
              </Text>
              <Text style={{ color: t.sub, fontSize: 11, fontVariant: ['tabular-nums'] }}>
                累計 {j[4]} ・ 失敗 {j[5]}
              </Text>
            </View>
          ))}
          {!d ? <Text style={{ color: f2b.error ? t.bad : t.sub, padding: 12 }}>{f2b.error ?? '取得中…'}</Text> : null}
        </View>
        {d ? (
          <Text style={{ color: t.sub, fontSize: 12, paddingHorizontal: 14, paddingBottom: 10 }}>
            記録 {d.since_jst} から ・ 永久 {d.nperm} 件 ・ 更新 {shortTime(d.updated_jst)}
            {f2b.error ? ` ・ ${f2b.error}` : ''}
          </Text>
        ) : null}
      </Card>

      {result ? (
        <View style={{ marginHorizontal: 16, marginTop: 12 }}>
          <Banner text={result.msg} color={result.ok ? t.good : t.bad} />
        </View>
      ) : null}

      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <Segmented<Tab>
          options={[
            { key: 'top', label: '上位' },
            { key: 'perm', label: '永久' },
            { key: 'recent', label: '記録' },
            { key: 'country', label: '国別' },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      {tab === 'top' ? (
        <Card title="失敗の多い IP（押すとブロック／解除）">
          {(d?.top ?? []).map((r, i, arr) => {
            const [ip, fails, banCount, ports, last, state, until, cc, country] = r;
            const slipping = state === '' && fails >= 50; // 遮断されずに失敗し続けている（fail2ban をすり抜けている）
            const stateText = state === 'P' ? '永久' : state === 'B' ? (until ? `~${until} 遮断中` : '遮断中') : '-';
            return (
              <Pressable key={ip} onPress={() => askAction(ip, country, state)} disabled={sending} style={({ pressed }) => [styles.item, pressed && { opacity: 0.5 }, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: slipping ? t.warn : t.text, fontSize: 16, fontVariant: ['tabular-nums'] }}>
                    {ip} <Text style={{ color: t.sub, fontSize: 13 }}>{cc}</Text>
                  </Text>
                  <Text style={{ color: t.sub, fontSize: 12 }}>
                    {country || '-'} ・ ポート {ports} ・ 最後 {last} ・ 遮断 {banCount} 回
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: slipping ? t.warn : t.text, fontSize: 17, fontWeight: '600', fontVariant: ['tabular-nums'] }}>{fails}</Text>
                  <Text style={{ color: state === 'P' ? t.bad : state === 'B' ? t.warn : t.sub, fontSize: 12 }}>{stateText}</Text>
                </View>
              </Pressable>
            );
          })}
          {d && d.top.length === 0 ? <Text style={{ color: t.sub, padding: 14 }}>なし</Text> : null}
        </Card>
      ) : null}

      {tab === 'perm' ? (
        <Card title="永久ブロック（押すと解除）">
          {(d?.perm ?? []).map((r, i, arr) => {
            const [ip, at, ports, packets, cc, country] = r;
            return (
              <Pressable key={ip} onPress={() => askAction(ip, country, 'P')} disabled={sending} style={({ pressed }) => [styles.item, pressed && { opacity: 0.5 }, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontSize: 16, fontVariant: ['tabular-nums'] }}>
                    {ip} <Text style={{ color: t.sub, fontSize: 13 }}>{cc}</Text>
                  </Text>
                  <Text style={{ color: t.sub, fontSize: 12 }}>
                    {country || '-'} ・ 登録 {at} ・ ポート {ports}
                  </Text>
                </View>
                <Text style={{ color: t.sub, fontSize: 12, fontVariant: ['tabular-nums'] }}>遮断後 {packets} pkt</Text>
              </Pressable>
            );
          })}
          {d && d.perm.length === 0 ? <Text style={{ color: t.sub, padding: 14 }}>なし</Text> : null}
        </Card>
      ) : null}

      {tab === 'recent' ? (
        <Card title="最近の遮断・解除">
          {(d?.recent ?? []).map((r, i, arr) => {
            const [at, jail, act, ip, cc] = r;
            const actText = { ban: '遮断', unban: '解除', inc: '延長', restore: '復元' }[act] ?? act;
            const actColor = act === 'ban' ? t.bad : act === 'unban' ? t.good : t.warn;
            return (
              <View key={`${at}${ip}${i}`} style={[styles.item, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }]}>
                <Text style={{ color: t.sub, fontSize: 13, width: 92, fontVariant: ['tabular-nums'] }}>{at}</Text>
                <Text style={{ color: t.sub, fontSize: 13, width: 40 }}>{jail}</Text>
                <Text style={{ color: actColor, fontSize: 13, width: 36, fontWeight: '600' }}>{actText}</Text>
                <Text style={{ color: t.text, fontSize: 14, flex: 1, fontVariant: ['tabular-nums'] }}>
                  {ip} <Text style={{ color: t.sub, fontSize: 12 }}>{cc}</Text>
                </Text>
              </View>
            );
          })}
          {d && d.recent.length === 0 ? <Text style={{ color: t.sub, padding: 14 }}>なし</Text> : null}
        </Card>
      ) : null}

      {tab === 'country' ? (
        <>
          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontSize: 15, fontWeight: '600' }}>
                  SSH の失敗 {stats.data ? `${stats.data.from}〜${stats.data.to}` : ''}
                </Text>
                <Text style={{ color: stats.error ? t.bad : t.sub, fontSize: 12 }}>
                  {stats.error ?? (stats.data ? `IP ${stats.data.ips} ・ 失敗 ${stats.data.fails.toLocaleString()} ・ ${stats.data.ncountries} か国 ・ 集計 ${stats.data.made_jst.slice(5, 16)}` : '取得中…')}
                </Text>
              </View>
              <Button title={sortIps ? 'IP数順' : '失敗順'} small color={t.dark ? '#48484a' : '#8e8e93'} onPress={() => setSortIps((v) => !v)} />
              <Button title="作り直す" small onPress={refreshStats} />
            </View>
          </Card>
          <Card title="国別（登録国。攻撃者の居場所とは限らない）">
            {[...(stats.data?.countries ?? [])]
              .sort((a, b) => (sortIps ? b[2] - a[2] : b[3] - a[3]))
              .map((c, i, arr) => {
                const total = stats.data?.fails ?? 1;
                return (
                  <View key={c[0]} style={[styles.item, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }]}>
                    <Text style={{ color: t.sub, fontSize: 13, width: 32 }}>{c[0]}</Text>
                    <Text style={{ color: t.text, fontSize: 15, flex: 1 }}>{c[1]}</Text>
                    <Text style={{ color: t.sub, fontSize: 13, width: 64, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{c[2]} IP</Text>
                    <Text style={{ color: t.text, fontSize: 14, width: 96, textAlign: 'right', fontVariant: ['tabular-nums'] }}>
                      {c[3].toLocaleString()} <Text style={{ color: t.sub, fontSize: 11 }}>{((c[3] / total) * 100).toFixed(1)}%</Text>
                    </Text>
                  </View>
                );
              })}
          </Card>
          <Card title="失敗の多いネットワーク（/16）">
            {(stats.data?.nets ?? []).map((n, i, arr) => (
              <View key={n[0]} style={[styles.item, i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }]}>
                <Text style={{ color: t.text, fontSize: 15, flex: 1, fontVariant: ['tabular-nums'] }}>
                  {n[0]} <Text style={{ color: t.sub, fontSize: 12 }}>{n[1]}</Text>
                </Text>
                <Text style={{ color: t.sub, fontSize: 13, width: 64, textAlign: 'right' }}>{n[2]} IP</Text>
                <Text style={{ color: t.text, fontSize: 14, width: 96, textAlign: 'right', fontVariant: ['tabular-nums'] }}>{n[3].toLocaleString()}</Text>
              </View>
            ))}
          </Card>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  jails: { flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  jail: { width: '33.33%', padding: 8 },
  item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, gap: 6 },
});
