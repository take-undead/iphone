// 「止まり方は 3 通りあり、どれも見分けて画面に出す」（picoclac/AGENTS.md）
//   1. stale:true        … 最終ティックから 60 秒超（週末・回線断）
//   2. gen_jst が進まない … サービス停止。前回と同じ gen_jst が FROZEN_SEC 続いたら「停止」
//   3. 取得失敗          … 接続不可・時間切れ・503

import type { Status } from './types';

export const FROZEN_SEC = 20;

export type Health = 'live' | 'stale' | 'disconnected' | 'frozen' | 'failed' | 'none';

export type HealthInfo = { health: Health; label: string; reason: string | null };

export function healthOf(st: Status | null, frozen: boolean, fetchError: string | null): HealthInfo {
  if (!st) return { health: fetchError ? 'failed' : 'none', label: fetchError ? '取得失敗' : '取得中', reason: fetchError };
  if (fetchError) return { health: 'failed', label: '取得失敗', reason: `HTTP 失敗: ${fetchError}` };
  if (frozen) return { health: 'frozen', label: '停止', reason: `停止: gen_jst が ${FROZEN_SEC} 秒以上進まない（出す側のサービスが止まった）` };
  if (!st.connected) return { health: 'disconnected', label: 'MT5切断', reason: 'MT5 がサーバーに接続していない' };
  if (st.stale) return { health: 'stale', label: 'STALE', reason: `STALE: 最終ティック ${st.tick.time_jst} から 60 秒超（週末・回線断）` };
  return { health: 'live', label: 'LIVE', reason: null };
}
