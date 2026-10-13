// 時刻は VPS が JST の文字列で出す。端末の時差に左右されないよう、
// 「JST の壁時計を UTC とみなした Date」で扱う（getUTC* で JST の値が取れる）。

const JST_MS = 9 * 3600 * 1000;

/** "YYYY-MM-DD HH:MM[:SS]" または "YYYY.MM.DD HH:MM:SS" → 1970-01-01 からの分（JST 壁時計） */
export function parseJstMin(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{4})[-.](\d{2})[-.](\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  if (!m) return null;
  return Math.floor(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) / 60000);
}

/** "YYYY-MM-DD HH:MM:SS" → ミリ秒（JST 壁時計を UTC とみなす） */
export function parseJstMs(s: string | null | undefined): number | null {
  if (!s) return null;
  const m = /^(\d{4})[-.](\d{2})[-.](\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(s);
  if (!m) return null;
  return Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], m[6] ? +m[6] : 0);
}

/** 今の JST 壁時計（UTC とみなした Date） */
export function nowJst(): Date {
  return new Date(Date.now() + JST_MS);
}

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtHM(min: number): string {
  const d = new Date(min * 60000);
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

export function fmtJst(d: Date, withSec = true): string {
  const s = `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
  return withSec ? `${s}:${pad(d.getUTCSeconds())}` : s;
}

export function fmtJstHMS(d: Date): string {
  return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}`;
}

/** "YYYY-MM-DD HH:MM:SS" の日付を落として "HH:MM" に */
export function shortTime(s: string | null | undefined): string {
  if (!s) return '--:--';
  const m = /(\d{2}):(\d{2})/.exec(s);
  return m ? `${m[1]}:${m[2]}` : s;
}

/** "YYYY-MM-DD HH:MM" → "MM/DD HH:MM" */
export function shortDateTime(s: string | null | undefined): string {
  if (!s) return '';
  const m = /^\d{4}[-.](\d{2})[-.](\d{2})[ T](\d{2}):(\d{2})/.exec(s);
  return m ? `${m[1]}/${m[2]} ${m[3]}:${m[4]}` : s;
}

/** JST 時刻文字列から今までの分（負なら 0） */
export function minutesAgo(s: string | null | undefined): number | null {
  const ms = parseJstMs(s);
  if (ms == null) return null;
  return Math.max(0, Math.floor((nowJst().getTime() - ms) / 60000));
}
