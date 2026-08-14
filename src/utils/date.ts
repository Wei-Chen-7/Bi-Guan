/**
 * 本地时区日期工具。
 * 全应用的「今天」一律按本地时区取 YYYY-MM-DD，绝不使用 UTC
 * （PRD 4.2：连续天数在跨午夜时必须按本地时区判定）。
 */

/** 取某时刻的本地日期字符串 YYYY-MM-DD。 */
export function toLocalDateString(timestamp: number = Date.now()): string {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** 把 YYYY-MM-DD 解析成当地当天 00:00 的时间戳。非法输入返回 NaN。 */
export function parseLocalDateString(date: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return Number.NaN;
  const [, y, m, d] = match;
  return new Date(Number(y), Number(m) - 1, Number(d)).getTime();
}

/** 两个本地日期字符串相差的天数（b - a）。 */
export function daysBetween(a: string, b: string): number {
  const ta = parseLocalDateString(a);
  const tb = parseLocalDateString(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return Number.NaN;
  // 用本地午夜时间戳相减再四舍五入，可正确跨越夏令时切换日。
  return Math.round((tb - ta) / 86_400_000);
}

/** a 是否是 b 的前一天。 */
export function isYesterdayOf(a: string, b: string): boolean {
  return daysBetween(a, b) === 1;
}

/** 从某天往前推 n 天的本地日期字符串。 */
export function shiftDate(date: string, deltaDays: number): string {
  const base = parseLocalDateString(date);
  if (Number.isNaN(base)) return date;
  const d = new Date(base);
  d.setDate(d.getDate() + deltaDays);
  return toLocalDateString(d.getTime());
}

/** 生成截至 endDate（含）的最近 n 天日期数组，由远及近。 */
export function recentDates(n: number, endDate: string): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(shiftDate(endDate, -i));
  }
  return out;
}
