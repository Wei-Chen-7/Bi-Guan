/** 展示层格式化工具。 */

/** 千分位整数。 */
export function formatE(value: number): string {
  return Math.round(value).toLocaleString('zh-CN');
}

/** 百分比整数，如 0.2 → '20'。 */
export function formatPercent(ratio: number): string {
  return String(Math.round(ratio * 100));
}

/** 倍率，如 1.15 → '1.15'、1 → '1'。 */
export function formatMultiplier(value: number): string {
  return String(Number(value.toFixed(2)));
}

/** 分钟数换算成小时，保留 1 位小数。 */
export function minutesToHours(minutes: number): string {
  return (minutes / 60).toFixed(1);
}

/** 带符号的修为增量，如 8 → '+8'。 */
export function signed(value: number): string {
  return value >= 0 ? `+${value}` : String(value);
}

/** 时间戳 → HH:MM（本地时区）。 */
export function formatTime(timestamp: number): string {
  const d = new Date(timestamp);
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
}

/** 剩余毫秒 → 「X 小时」或「X 分钟」，用于心魔倒计时。 */
export function formatRoughDuration(ms: number): string {
  const minutes = Math.max(0, Math.ceil(ms / 60_000));
  if (minutes < 60) return `${minutes} 分钟`;
  return `${Math.ceil(minutes / 60)} 小时`;
}

/** 分钟数的紧凑展示，整数不带小数点。 */
export function formatMinutes(minutes: number): string {
  return Number.isInteger(minutes) ? String(minutes) : minutes.toFixed(1);
}

/** 'YYYY-MM-DD' → 'M 月 D 日'。 */
export function formatDateLabel(date: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return date;
  return `${Number(match[2])} 月 ${Number(match[3])} 日`;
}
