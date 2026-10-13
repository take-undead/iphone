// 設定: 接続先・見本モード・取得間隔・チャイム。AsyncStorage に保存（settings.tsx）。

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { DEFAULT_SETTINGS, useSettings } from '@/lib/settings';
import { chime } from '@/lib/sound';
import { Card, Row } from '@/components/ui';
import { useTheme } from '@/theme';

const PIPS_STEPS = [5, 8, 10, 12, 15, 20, 25, 30, 40, 50, 75, 100];
const MIN_STEPS = [1, 2, 3, 5, 10, 15, 20];
const SEC_STEPS = [3, 5, 10, 15, 30];

export default function SettingsScreen() {
  const t = useTheme();
  const { settings, update } = useSettings();
  const [url, setUrl] = useState(settings.baseUrl);

  return (
    <ScrollView style={{ backgroundColor: t.bg }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <Card title="接続">
        <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
          <Text style={{ color: t.text, fontSize: 17 }}>status_server の URL</Text>
          <TextInput
            value={url}
            onChangeText={setUrl}
            onBlur={() => update({ baseUrl: url.trim() || DEFAULT_SETTINGS.baseUrl })}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            style={[styles.input, { color: t.text, borderColor: t.sep, backgroundColor: t.bg }]}
          />
          <Text style={{ color: t.sub, fontSize: 12, marginTop: 6 }}>WireGuard の内側（既定 {DEFAULT_SETTINGS.baseUrl}）。iPhone の WireGuard アプリでトンネルを ON にしてから使う。</Text>
        </View>
        <Row label="見本データで動かす" sub="通信せず作り物のデータを出す（画面の確認用）" right={<Switch value={settings.demo} onValueChange={(v) => update({ demo: v })} />} />
        <Stepper label="取得間隔" value={settings.statusSec} steps={SEC_STEPS} unit="秒" onChange={(v) => update({ statusSec: v })} last />
      </Card>

      <Card title="急な値動きのチャイム">
        <Row label="鳴らす" right={<Switch value={settings.alertOn} onValueChange={(v) => update({ alertOn: v })} />} />
        <Stepper label="幅" value={settings.alertPips} steps={PIPS_STEPS} unit="pips" onChange={(v) => update({ alertPips: v })} />
        <Stepper label="時間" value={settings.alertMinutes} steps={MIN_STEPS} unit="分" onChange={(v) => update({ alertMinutes: v })} />
        <Row label="音を出す" sub="オフでも帯と振動は出る" right={<Switch value={settings.soundOn} onValueChange={(v) => update({ soundOn: v })} />} />
        <Stepper
          label="音量"
          value={settings.volume}
          steps={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}
          unit=""
          onChange={(v) => {
            update({ volume: v });
            if (settings.soundOn) chime('up', 1, v, { haptic: false }).catch(() => {});
          }}
        />
        <Row label="試しに鳴らす（上がる音）" onPress={() => chime('up', 2, settings.volume).catch(() => {})} valueColor={t.tint} value="♪" />
        <Row label="試しに鳴らす（下がる音）" onPress={() => chime('down', 2, settings.volume).catch(() => {})} valueColor={t.tint} value="♪" last />
      </Card>

      <Card title="このアプリ">
        <View style={{ padding: 16, gap: 8 }}>
          <Text style={{ color: t.text, fontSize: 15, lineHeight: 22 }}>
            PicoCalc の mt5mon（MT5 の状況・AI 日報・攻撃の記録）と vpschat（VPS の Claude との会話）を 1 つにまとめた iPhone 版。読むだけで、売買はしない。例外は攻撃の画面の永久ブロック・解除（VPS の nftables を操作する）。
          </Text>
          <Text style={{ color: t.sub, fontSize: 13, lineHeight: 20 }}>
            VPS の 8080 は WireGuard の内側でしか待ち受けていない。iPhone の WireGuard アプリに PicoCalc と同じ鍵（10.8.0.3）を入れ、PicoCalc とは同時につながない。
          </Text>
        </View>
      </Card>
      <Pressable onPress={() => { update(DEFAULT_SETTINGS); setUrl(DEFAULT_SETTINGS.baseUrl); }} style={{ alignSelf: 'center', marginTop: 20 }}>
        <Text style={{ color: t.bad, fontSize: 15 }}>設定を既定に戻す</Text>
      </Pressable>
    </ScrollView>
  );
}

function Stepper({ label, value, steps, unit, onChange, last }: { label: string; value: number; steps: number[]; unit: string; onChange: (v: number) => void; last?: boolean }) {
  const t = useTheme();
  const i = Math.max(0, steps.findIndex((s) => s >= value));
  const idx = i < 0 ? steps.length - 1 : i;
  return (
    <Row
      label={label}
      last={last}
      right={
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <StepBtn text="−" disabled={idx <= 0} onPress={() => onChange(steps[idx - 1])} />
          <Text style={{ color: t.text, fontSize: 17, minWidth: 64, textAlign: 'center', fontVariant: ['tabular-nums'] }}>
            {steps[idx]}
            {unit ? ` ${unit}` : ''}
          </Text>
          <StepBtn text="＋" disabled={idx >= steps.length - 1} onPress={() => onChange(steps[idx + 1])} />
        </View>
      }
    />
  );
}

function StepBtn({ text, onPress, disabled }: { text: string; onPress: () => void; disabled: boolean }) {
  const t = useTheme();
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={6} style={({ pressed }) => [styles.step, { backgroundColor: t.dark ? '#3a3a3c' : '#e5e5ea', opacity: disabled ? 0.3 : pressed ? 0.6 : 1 }]}>
      <Text style={{ color: t.text, fontSize: 18, fontWeight: '600' }}>{text}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  input: { marginTop: 8, fontSize: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8 },
  step: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
