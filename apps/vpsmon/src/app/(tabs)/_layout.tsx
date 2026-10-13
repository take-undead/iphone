import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import type { ColorValue } from 'react-native';
import { useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function icon(name: IconName) {
  return ({ color, size }: { color: ColorValue; size: number }) => <Ionicons name={name} size={size} color={color} />;
}

export default function TabLayout() {
  const t = useTheme();
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: t.tint,
        headerStyle: { backgroundColor: t.bg },
        headerShadowVisible: false,
        headerTitleStyle: { color: t.text },
        tabBarStyle: { backgroundColor: t.card },
        sceneStyle: { backgroundColor: t.bg },
      }}>
      <Tabs.Screen name="index" options={{ title: '相場', tabBarIcon: icon('stats-chart') }} />
      <Tabs.Screen name="report" options={{ title: 'AI 日報', tabBarIcon: icon('document-text') }} />
      <Tabs.Screen name="attack" options={{ title: '攻撃', tabBarIcon: icon('shield-half') }} />
      <Tabs.Screen name="chat" options={{ title: '会話', tabBarIcon: icon('chatbubbles') }} />
      <Tabs.Screen name="settings" options={{ title: '設定', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
