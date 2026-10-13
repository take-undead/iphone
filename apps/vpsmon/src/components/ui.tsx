import React from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

/** iOS の「inset grouped」風の白いカード */
export function Card({ children, style, title }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; title?: string }) {
  const t = useTheme();
  return (
    <View style={{ marginHorizontal: 16, marginTop: 16 }}>
      {title ? <Text style={[styles.cardTitle, { color: t.sub }]}>{title}</Text> : null}
      <View style={[styles.card, { backgroundColor: t.card }, style]}>{children}</View>
    </View>
  );
}

/** 設定画面などの 1 行（左に見出し、右に値） */
export function Row({
  label,
  value,
  valueColor,
  right,
  last,
  onPress,
  sub,
}: {
  label: string;
  value?: string;
  valueColor?: string;
  right?: React.ReactNode;
  last?: boolean;
  onPress?: () => void;
  sub?: string;
}) {
  const t = useTheme();
  const body = (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.sep }]}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowLabel, { color: t.text }]}>{label}</Text>
        {sub ? <Text style={[styles.rowSub, { color: t.sub }]}>{sub}</Text> : null}
      </View>
      {value != null ? <Text style={[styles.rowValue, { color: valueColor ?? t.sub }]}>{value}</Text> : null}
      {right}
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} style={({ pressed }) => pressed && { opacity: 0.5 }}>
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** iOS のセグメントコントロール風 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  style,
}: {
  options: { key: T; label: string }[];
  value: T;
  onChange: (k: T) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[styles.seg, { backgroundColor: t.dark ? '#2c2c2e' : '#e9e9eb' }, style]}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            onPress={() => onChange(o.key)}
            style={[styles.segItem, on && { backgroundColor: t.dark ? '#636366' : '#ffffff', shadowOpacity: 0.15, shadowRadius: 2, shadowOffset: { width: 0, height: 1 } }]}>
            <Text style={[styles.segText, { color: t.text, fontWeight: on ? '600' : '400' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Badge({ text, color, textColor }: { text: string; color: string; textColor?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, { color: textColor ?? '#fff' }]}>{text}</Text>
    </View>
  );
}

/** 画面の上に出す赤い（または色付きの）帯 */
export function Banner({ text, color, textStyle }: { text: string; color: string; textStyle?: StyleProp<TextStyle> }) {
  return (
    <View style={[styles.banner, { backgroundColor: color }]}>
      <Text style={[styles.bannerText, textStyle]}>{text}</Text>
    </View>
  );
}

export function Button({ title, onPress, color, disabled, small }: { title: string; onPress: () => void; color?: string; disabled?: boolean; small?: boolean }) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, small && styles.btnSmall, { backgroundColor: color ?? t.tint, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 }]}>
      <Text style={[styles.btnText, small && { fontSize: 13 }]}>{title}</Text>
    </Pressable>
  );
}

/** 文字列の最初の数文字などに使う等幅の小さな文字 */
export function Mono({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[{ fontVariant: ['tabular-nums'] }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, overflow: 'hidden' },
  cardTitle: { fontSize: 13, textTransform: 'uppercase', marginLeft: 16, marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, minHeight: 44 },
  rowLabel: { fontSize: 17 },
  rowSub: { fontSize: 13, marginTop: 2 },
  rowValue: { fontSize: 17, marginLeft: 8, fontVariant: ['tabular-nums'] },
  seg: { flexDirection: 'row', borderRadius: 9, padding: 2 },
  segItem: { flex: 1, paddingVertical: 6, borderRadius: 7, alignItems: 'center' },
  segText: { fontSize: 13 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 12, fontWeight: '700' },
  banner: { paddingHorizontal: 12, paddingVertical: 6 },
  bannerText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  btn: { borderRadius: 10, paddingHorizontal: 16, paddingVertical: 11, alignItems: 'center' },
  btnSmall: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
