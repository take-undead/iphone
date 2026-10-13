// 会話: vpschat。VPS の Claude（読むだけ）と話す。
// 考え中は 3 秒ごと、普段は 15 秒ごとに /chat.json?since=N を取る。日本語入力は iPhone のキーボードに任せる。

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api, describeError } from '@/lib/api';
import { useSettings } from '@/lib/settings';
import type { Chat, ChatMsg } from '@/lib/types';
import { useTheme } from '@/theme';

export default function ChatScreen() {
  const t = useTheme();
  const { settings } = useSettings();
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [busy, setBusy] = useState<{ on: boolean; s: number }>({ on: false, s: 0 });
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const lastId = useRef(0);
  const scroll = useRef<ScrollView>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const busyRef = useRef(false);
  busyRef.current = busy.on;

  const poll = useCallback(async () => {
    try {
      const c: Chat = await api.chat(settings, lastId.current);
      setError(null);
      if (c.msgs.length) {
        setMsgs((prev) => {
          const ids = new Set(prev.map((m) => m[0]));
          const add = c.msgs.filter((m) => !ids.has(m[0]));
          return [...prev, ...add].slice(-200);
        });
        lastId.current = Math.max(lastId.current, ...c.msgs.map((m) => m[0]));
        if (c.msgs.some((m) => m[1] !== 'me')) setNote(null);
      }
      setBusy({ on: c.busy, s: c.busy_s });
    } catch (e) {
      setError(describeError(e));
    }
  }, [settings]);

  // 初回は全部取り直す（設定が変わったとき含む）
  useEffect(() => {
    lastId.current = 0;
    setMsgs([]);
  }, [settings.baseUrl, settings.demo]);

  useEffect(() => {
    let stopped = false;
    const loop = async () => {
      await poll();
      if (stopped) return;
      timer.current = setTimeout(loop, busyRef.current ? 3000 : 15000);
    };
    loop();
    return () => {
      stopped = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [poll]);

  useEffect(() => {
    const id = setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
    return () => clearTimeout(id);
  }, [msgs.length]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const r = await api.chatPost(settings, body);
      if (r.ok) {
        setText('');
        setNote('送った。返事を待っている…');
        setBusy({ on: true, s: 0 });
        setTimeout(poll, 500);
      } else {
        setNote(`送れなかった: ${r.msg}`);
      }
    } catch (e) {
      setNote(`送れなかった: ${describeError(e)}`);
    } finally {
      setSending(false);
    }
  }, [text, sending, settings, poll]);

  const newSession = useCallback(() => {
    Alert.alert('新しい会話', '前の文脈を引き継がない新しい会話にします（相談メモには残ります）。', [
      { text: 'やめる', style: 'cancel' },
      {
        text: '新しくする',
        style: 'destructive',
        onPress: async () => {
          try {
            const r = await api.chatNew(settings);
            setNote(r.msg);
            setTimeout(poll, 300);
          } catch (e) {
            setNote(describeError(e));
          }
        },
      },
    ]);
  }, [settings, poll]);

  const statusText = error ? `取得失敗: ${error}` : busy.on ? `考え中 ${busy.s} 秒` : '待機';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: t.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
      <View style={[styles.bar, { backgroundColor: t.card, borderBottomColor: t.sep }]}>
        <Text style={{ color: error ? t.bad : busy.on ? t.down : t.sub, fontSize: 13, flex: 1 }}>{statusText}</Text>
        <Pressable onPress={newSession} hitSlop={8}>
          <Text style={{ color: t.tint, fontSize: 15 }}>新しい会話</Text>
        </Pressable>
      </View>
      <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 12, gap: 8 }} keyboardDismissMode="interactive">
        {msgs.length === 0 && !error ? <Text style={{ color: t.sub, textAlign: 'center', marginTop: 24 }}>まだ発言がありません</Text> : null}
        {msgs.map((m) => (
          <Bubble key={m[0]} msg={m} />
        ))}
        {note ? <Text style={{ color: t.sub, fontSize: 12, textAlign: 'center' }}>{note}</Text> : null}
      </ScrollView>
      <View style={[styles.inputRow, { backgroundColor: t.card, borderTopColor: t.sep }]}>
        <TextInput
          style={[styles.input, { color: t.text, backgroundColor: t.bg, borderColor: t.sep }]}
          value={text}
          onChangeText={setText}
          placeholder="VPS の Claude に話しかける（読むだけ）"
          placeholderTextColor={t.sub}
          multiline
          maxLength={600}
        />
        <Pressable onPress={send} disabled={!text.trim() || sending} style={({ pressed }) => [styles.sendBtn, { backgroundColor: t.tint, opacity: !text.trim() || sending ? 0.4 : pressed ? 0.6 : 1 }]}>
          <Ionicons name="arrow-up" size={20} color="#fff" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg }: { msg: ChatMsg }) {
  const t = useTheme();
  const [, who, at, body] = msg;
  if (who === 'err') {
    return (
      <Text style={{ color: t.sub, fontSize: 12, textAlign: 'center', marginVertical: 4 }}>
        {body} ・ {at}
      </Text>
    );
  }
  const me = who === 'me';
  const clean = body.replace(/\*\*/g, '').replace(/`/g, '').replace(/^#+\s*/gm, '');
  return (
    <View style={{ alignItems: me ? 'flex-end' : 'flex-start' }}>
      <View style={[styles.bubble, { backgroundColor: me ? t.bubbleMe : t.bubbleAi, borderBottomRightRadius: me ? 4 : 18, borderBottomLeftRadius: me ? 18 : 4 }]}>
        <Text style={{ color: me ? '#fff' : t.text, fontSize: 16, lineHeight: 22 }} selectable>
          {clean}
        </Text>
      </View>
      <Text style={{ color: t.sub, fontSize: 11, marginTop: 2, marginHorizontal: 6 }}>
        {me ? 'あなた' : 'Claude'} ・ {at}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  bubble: { maxWidth: '85%', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', padding: 8, gap: 8, borderTopWidth: StyleSheet.hairlineWidth },
  input: { flex: 1, fontSize: 16, borderWidth: StyleSheet.hairlineWidth, borderRadius: 18, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 9, maxHeight: 120 },
  sendBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
});
