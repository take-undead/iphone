import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Settings = {
  /** status_server.py の場所（WireGuard の内側） */
  baseUrl: string;
  /** 通信せず見本データで動かす */
  demo: boolean;
  /** status.json を取る間隔（秒） */
  statusSec: number;
  /** 急な値動きのチャイム */
  alertOn: boolean;
  alertPips: number;
  alertMinutes: number;
  soundOn: boolean;
  /** 1〜10（1 段 3dB） */
  volume: number;
};

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'http://10.8.0.1:8080',
  demo: false,
  statusSec: 5,
  alertOn: true,
  alertPips: 15,
  alertMinutes: 5,
  soundOn: true,
  volume: 7,
};

const KEY = 'vpsmon.settings.v1';

type Ctx = {
  settings: Settings;
  loaded: boolean;
  update: (patch: Partial<Settings>) => void;
};

const SettingsContext = createContext<Ctx>({ settings: DEFAULT_SETTINGS, loaded: false, update: () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY)
      .then((s) => {
        if (!alive) return;
        if (s) {
          try {
            setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Partial<Settings>) });
          } catch {
            /* 壊れていれば既定のまま */
          }
        }
      })
      .catch(() => {})
      .finally(() => alive && setLoaded(true));
    return () => {
      alive = false;
    };
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const value = useMemo(() => ({ settings, loaded, update }), [settings, loaded, update]);
  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  return useContext(SettingsContext);
}
