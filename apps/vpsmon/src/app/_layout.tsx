import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { SettingsProvider } from '@/lib/settings';

export default function RootLayout() {
  return (
    <SettingsProvider>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
    </SettingsProvider>
  );
}
