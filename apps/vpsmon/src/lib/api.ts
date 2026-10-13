// status_server.py への HTTP。素の fetch に時間切れを付けたもの。
// demo のときは通信せず src/fixtures の見本を返す（demo.ts）。

import type { BarsResp, Chat, F2b, PostResult, Stats, Status, Sup } from './types';
import type { Settings } from './settings';
import * as demo from './demo';

export const TIMEOUT_MS = 8000;

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}
export class TimeoutError extends Error {}

/** 画面に出す短い理由（PicoCalc の「HTTP 失敗: 接続できない / 時間切れ / 503」に合わせる） */
export function describeError(e: unknown): string {
  if (e instanceof TimeoutError) return '時間切れ';
  if (e instanceof HttpError) return e.status === 503 ? '503（VPS にデータが無い）' : `HTTP ${e.status}`;
  if (e instanceof Error) {
    if (/Network request failed|Failed to fetch|network/i.test(e.message)) return '接続できない（VPN は上がっているか）';
    return e.message;
  }
  return String(e);
}

async function request(base: string, method: 'GET' | 'POST', path: string, body?: string): Promise<string> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(base.replace(/\/+$/, '') + path, {
      method,
      body,
      headers: body != null ? { 'Content-Type': 'text/plain; charset=utf-8' } : undefined,
      signal: ctl.signal,
      cache: 'no-store',
    });
    const text = await res.text();
    if (!res.ok) throw new HttpError(res.status, text.slice(0, 200));
    return text;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') throw new TimeoutError('timeout');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson<T>(s: Settings, path: string): Promise<T> {
  return JSON.parse(await request(s.baseUrl, 'GET', path)) as T;
}

async function post(s: Settings, path: string, body?: string): Promise<PostResult> {
  return JSON.parse(await request(s.baseUrl, 'POST', path, body)) as PostResult;
}

export const api = {
  status: (s: Settings): Promise<Status> => (s.demo ? demo.status() : getJson<Status>(s, '/status.json')),
  bars: (s: Settings, tf: number, n: number): Promise<BarsResp> =>
    s.demo ? demo.bars(tf, n) : getJson<BarsResp>(s, `/bars.json?tf=${tf}&n=${n}`),
  sup: (s: Settings): Promise<Sup> => (s.demo ? demo.sup() : getJson<Sup>(s, '/sup.json')),
  nippo: (s: Settings): Promise<string> => (s.demo ? demo.nippo() : request(s.baseUrl, 'GET', '/nippo.md')),
  f2b: (s: Settings): Promise<F2b> => (s.demo ? demo.f2b() : getJson<F2b>(s, '/f2b.json')),
  stats: (s: Settings): Promise<Stats> => (s.demo ? demo.stats() : getJson<Stats>(s, '/stats.json')),
  statsRefresh: (s: Settings): Promise<PostResult> => (s.demo ? demo.ok('集計を始めた（見本）') : post(s, '/stats_refresh')),
  ban: (s: Settings, ip: string): Promise<PostResult> =>
    s.demo ? demo.ok(`${ip} を永久ブロックした（見本）`) : post(s, `/ban?ip=${encodeURIComponent(ip)}`),
  unban: (s: Settings, ip: string): Promise<PostResult> =>
    s.demo ? demo.ok(`${ip} の永久ブロックを外した（見本）`) : post(s, `/unban?ip=${encodeURIComponent(ip)}`),
  chat: (s: Settings, since: number): Promise<Chat> => (s.demo ? demo.chat(since) : getJson<Chat>(s, `/chat.json?since=${since}`)),
  chatPost: (s: Settings, text: string): Promise<PostResult> => (s.demo ? demo.chatPost(text) : post(s, '/chat', text)),
  chatNew: (s: Settings): Promise<PostResult> => (s.demo ? demo.chatNew() : post(s, '/chat_new')),
};
