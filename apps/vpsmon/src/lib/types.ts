// VPS の status_server.py が返す JSON の形。
// 正は D:\github\vscode-\MT5\claude_ea\tools\vps\{status_server,attack,chat}.py と
// D:\github\picoclac\AGENTS.md「mt5mon」の節。

export type Tick = { bid: number; ask: number; spread_pips: number; time_jst: string };

export type Account = {
  currency: string;
  balance: number;
  equity: number;
  profit: number;
  margin: number;
  margin_level: number;
};

export type Position = {
  ticket: number;
  symbol: string;
  magic: number;
  ea: string;
  type: 'buy' | 'sell';
  lots: number;
  open: number;
  open_jst: string;
  sl: number;
  tp: number;
  profit: number;
};

export type Ea = { name: string; magic: number; alive: boolean };

/** 確定足の列。各足の時刻は t0_jst + dt[i] 分 */
export type BarCols = { n: number; t0_jst: string; dt: number[]; o: number[]; h: number[]; l: number[]; c: number[] };

export type M1 = BarCols & { cur: { t_jst: string; o: number; h: number; l: number; c: number } };

export type Status = {
  v: number;
  symbol: string;
  gen_jst: string;
  offset_h: number;
  connected: boolean;
  stale: boolean;
  tick: Tick;
  account: Account;
  positions: Position[];
  eas: Ea[];
  m1: M1;
};

/** GET /bars.json?tf=&n= */
export type BarsResp = BarCols & { v: number; symbol: string; tf: number };

/** GET /sup.json（status_server.py の build_sup） */
export type Sup = {
  updated_jst: string;
  alive: { t: string | null; status: string | null; note: string | null };
  cmd: {
    seq: number | null;
    t: string | null;
    bias: number | null;
    risk: number | null;
    lot_factor: number | null;
    p_up: number | null;
    outlook: string | null;
    regime: string | null;
    line_buy: number | null;
    line_sell: number | null;
    buy_stop: number | null;
    sell_stop: number | null;
    reason: string;
  };
  ea: {
    ver: string | null;
    t: string | null;
    bid: number | null;
    pos: string | null;
    pos_lots: number | null;
    pos_pips: number | null;
    pos_min: number | null;
    gui: string | null;
    seq: number | null;
    dir: number | null;
    today_decision: boolean | null;
    spread: number | null;
    offset_h: number | null;
    err: string | null;
    balance: number | null;
    equity: number | null;
    last_close: string | null;
    last_pips: number | null;
    chg24h: Record<string, number> | null;
    week_high: number | null;
    week_low: number | null;
  };
  decisions: { t: string; seq: string; bias: string; risk: string; p_up: string; res: string; why: string }[];
  latest: string[];
};

/** GET /f2b.json（attack.py の build_json。配列で詰めてある） */
export type JailRow = [name: string, label: string, ports: string, banned: number, totalBanned: number, totalFailed: number, failing: number];
export type TopRow = [ip: string, fails: number, banCount: number, ports: string, last: string, state: 'P' | 'B' | '', until: string, cc: string, country: string];
export type PermRow = [ip: string, t: string, ports: string, packets: number, cc: string, country: string];
export type RecentRow = [t: string, jail: string, act: string, ip: string, cc: string];
export type F2b = {
  v: number;
  updated_jst: string;
  since_jst: string;
  jails: JailRow[];
  nperm: number;
  perm: PermRow[];
  top: TopRow[];
  recent: RecentRow[];
};

/** GET /stats.json（attack.py の make_stats） */
export type Stats = {
  v: number;
  made_jst: string;
  from: string;
  to: string;
  ips: number;
  fails: number;
  ncountries: number;
  countries: [cc: string, name: string, ips: number, fails: number][];
  nets: [net: string, cc: string, ips: number, fails: number][];
};

/** GET /chat.json?since=N（chat.py の build_json） */
export type ChatMsg = [id: number, who: 'me' | 'ai' | 'err', t: string, text: string];
export type Chat = { busy: boolean; busy_s: number; last: number; msgs: ChatMsg[] };

/** POST の返事（断ったときも 200 で ok:false） */
export type PostResult = { ok: boolean; msg: string };
