// 通信せずに画面を試すための見本データ。実データではなく形だけ合わせた作り物。
// status は呼ぶたびに値を少し動かし、gen_jst を今にする（LIVE に見える）。

import statusFx from '../fixtures/status.json';
import supFx from '../fixtures/sup.json';
import nippoFx from '../fixtures/nippo.json';
import f2bFx from '../fixtures/f2b.json';
import statsFx from '../fixtures/stats.json';
import type { BarsResp, Chat, ChatMsg, F2b, PostResult, Stats, Status, Sup } from './types';
import { fmtJst, nowJst, parseJstMin } from './time';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ---- 相場（ランダムウォークで動かす） ----
let bid = (statusFx as Status).tick.bid;
let curBar = { ...(statusFx as Status).m1.cur };
let curMin = parseJstMin(curBar.t_jst) ?? 0;
const confirmed: { t: number; o: number; h: number; l: number; c: number }[] = (() => {
  const m1 = (statusFx as Status).m1;
  const t0 = parseJstMin(m1.t0_jst) ?? 0;
  return m1.dt.map((d, i) => ({ t: t0 + d, o: m1.o[i], h: m1.h[i], l: m1.l[i], c: m1.c[i] }));
})();

export async function status(): Promise<Status> {
  await sleep(80);
  const now = nowJst();
  const nowMin = Math.floor(now.getTime() / 60000);
  bid = +(bid + (Math.random() - 0.5) * 0.02).toFixed(3);
  if (nowMin !== curMin) {
    confirmed.push({ t: curMin, ...curBar });
    while (confirmed.length > 120) confirmed.shift();
    curMin = nowMin;
    curBar = { t_jst: fmtJst(now, false), o: bid, h: bid, l: bid, c: bid };
  } else {
    curBar = { ...curBar, h: Math.max(curBar.h, bid), l: Math.min(curBar.l, bid), c: bid };
  }
  const t0 = confirmed[0]?.t ?? curMin;
  const t0Date = new Date(t0 * 60000);
  const base = statusFx as Status;
  return {
    ...base,
    gen_jst: fmtJst(now),
    tick: { ...base.tick, bid, ask: +(bid + 0.008).toFixed(3), time_jst: fmtJst(now) },
    m1: {
      n: confirmed.length,
      t0_jst: fmtJst(t0Date, false),
      dt: confirmed.map((b) => b.t - t0),
      o: confirmed.map((b) => b.o),
      h: confirmed.map((b) => b.h),
      l: confirmed.map((b) => b.l),
      c: confirmed.map((b) => b.c),
      cur: curBar,
    },
  };
}

export async function bars(tf: number, n: number): Promise<BarsResp> {
  await sleep(120);
  // 見本の M1 を tf 分にまとめ、さらに過去を作り足して n 本にする
  const st = await status();
  const all = [...confirmed];
  const first = all[0]?.t ?? curMin;
  let p = all[0]?.o ?? bid;
  const past: typeof all = [];
  for (let t = first - 1; past.length < n * tf; t--) {
    const o = p;
    const c = +(o + (Math.random() - 0.5) * 0.03).toFixed(3);
    past.unshift({ t, o, h: Math.max(o, c) + 0.004, l: Math.min(o, c) - 0.004, c });
    p = c;
  }
  const src = [...past, ...all];
  const out: { t: number; o: number; h: number; l: number; c: number }[] = [];
  for (const b of src) {
    const head = b.t - (b.t % tf);
    const last = out[out.length - 1];
    if (last && last.t === head) {
      last.h = Math.max(last.h, b.h);
      last.l = Math.min(last.l, b.l);
      last.c = b.c;
    } else out.push({ ...b, t: head });
  }
  const sel = out.slice(-n);
  const t0 = sel[0].t;
  return {
    v: 1,
    symbol: st.symbol,
    tf,
    n: sel.length,
    t0_jst: fmtJst(new Date(t0 * 60000), false),
    dt: sel.map((b) => b.t - t0),
    o: sel.map((b) => b.o),
    h: sel.map((b) => b.h),
    l: sel.map((b) => b.l),
    c: sel.map((b) => b.c),
  };
}

export async function sup(): Promise<Sup> {
  await sleep(100);
  return { ...(supFx as Sup), updated_jst: fmtJst(nowJst()) };
}

export async function nippo(): Promise<string> {
  await sleep(100);
  return (nippoFx as { md: string }).md;
}

export async function f2b(): Promise<F2b> {
  await sleep(100);
  return { ...(f2bFx as F2b), updated_jst: fmtJst(nowJst()) };
}

export async function stats(): Promise<Stats> {
  await sleep(100);
  return statsFx as Stats;
}

export async function ok(msg: string): Promise<PostResult> {
  await sleep(200);
  return { ok: true, msg };
}

// ---- 会話（メモリ上） ----
let chatMsgs: ChatMsg[] = [
  [1, 'err', '10-13 09:00', '── 新しい会話 ──'],
  [2, 'me', '10-13 09:01', '今日の方針を教えて'],
  [3, 'ai', '10-13 09:01', '・方針は弱い買い（bias +1）、上の確率 52%\n・158.0 の押し目を待つ。158.5 を回復すれば上\n・建玉は無し。ロットは 0.01\n\n根拠: command.json seq5 と journal/latest.md（推測ではなく記録の値）'],
];
let busyUntil = 0;
let pending: string | null = null;

export async function chat(since: number): Promise<Chat> {
  await sleep(80);
  if (pending && Date.now() >= busyUntil) {
    const id = chatMsgs[chatMsgs.length - 1][0] + 1;
    const t = fmtJst(nowJst()).slice(5, 16);
    chatMsgs.push([id, 'ai', t, `「${pending}」について（見本の返事）\n・これは通信せずに作った返事です\n・設定で見本モードを切ると VPS の Claude に届きます`]);
    pending = null;
  }
  const busy = pending != null;
  return {
    busy,
    busy_s: busy ? Math.max(0, Math.floor((Date.now() - (busyUntil - 4000)) / 1000)) : 0,
    last: chatMsgs[chatMsgs.length - 1][0],
    msgs: chatMsgs.filter((m) => m[0] > since),
  };
}

export async function chatPost(text: string): Promise<PostResult> {
  await sleep(150);
  if (pending) return { ok: false, msg: '前の返事を作っている最中' };
  const id = chatMsgs[chatMsgs.length - 1][0] + 1;
  chatMsgs.push([id, 'me', fmtJst(nowJst()).slice(5, 16), text]);
  pending = text;
  busyUntil = Date.now() + 4000;
  return { ok: true, msg: '送った' };
}

export async function chatNew(): Promise<PostResult> {
  await sleep(150);
  if (pending) return { ok: false, msg: '返事を作っている最中' };
  const id = chatMsgs[chatMsgs.length - 1][0] + 1;
  chatMsgs.push([id, 'err', fmtJst(nowJst()).slice(5, 16), '── 新しい会話 ──']);
  return { ok: true, msg: '新しい会話にした' };
}
