export const fmtPrice = (v: number | null | undefined, digits = 3) => (v == null || Number.isNaN(v) ? '-' : v.toFixed(digits));

export const fmtYen = (v: number | null | undefined) =>
  v == null || Number.isNaN(v) ? '-' : `${v < 0 ? '-' : ''}${Math.abs(Math.round(v)).toLocaleString('ja-JP')}`;

export const fmtSigned = (v: number | null | undefined, digits = 1) =>
  v == null || Number.isNaN(v) ? '-' : `${v > 0 ? '+' : ''}${v.toFixed(digits)}`;

export const fmtPct = (v: number | null | undefined) => (v == null || Number.isNaN(v) ? '-' : `${v.toFixed(1)}%`);

/** bias の数値（-2〜2）を言葉に。picoclac の表示「強い買い／弱い売り／様子見」に合わせる（bias の段階は推測） */
export function biasLabel(b: number | string | null | undefined): string {
  const n = typeof b === 'string' ? Number(b) : b;
  if (n == null || Number.isNaN(n)) return '-';
  if (n >= 2) return '強い買い';
  if (n >= 1) return '弱い買い';
  if (n <= -2) return '強い売り';
  if (n <= -1) return '弱い売り';
  return '様子見';
}

/** p_up（0〜1）→ 矢印。↑≧65% ↗≧55% →45〜55% ↘≦45% ↓≦35% */
export function arrowOf(p: number | string | null | undefined): { arrow: string; dir: 'up' | 'down' | 'flat' } {
  const n = typeof p === 'string' ? Number(p) : p;
  if (n == null || Number.isNaN(n) || p === '') return { arrow: '?', dir: 'flat' };
  if (n >= 0.65) return { arrow: '↑', dir: 'up' };
  if (n >= 0.55) return { arrow: '↗', dir: 'up' };
  if (n <= 0.35) return { arrow: '↓', dir: 'down' };
  if (n <= 0.45) return { arrow: '↘', dir: 'down' };
  return { arrow: '→', dir: 'flat' };
}

export const pctOf = (p: number | string | null | undefined) => {
  const n = typeof p === 'string' ? Number(p) : p;
  return n == null || Number.isNaN(n) || p === '' ? '-' : `${Math.round(n * 100)}%`;
};
