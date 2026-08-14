/**
 * 时间戳计时逻辑（PRD 要求 A）。
 *
 * 浏览器在后台会节流定时器，用 setInterval 累加计数必然走偏。
 * 这里的一切都由时间戳反算，setInterval 只负责触发重渲染。
 * 纯函数，不依赖 React。
 */

import type { ActiveSession } from '../types';

/** 已经过的专注毫秒数（扣除全部暂停时长，含当前正在进行的暂停）。 */
export function elapsedMs(session: ActiveSession, now: number): number {
  const gross = now - session.startedAt;
  const pausing =
    session.pauseStartedAt !== null ? now - session.pauseStartedAt : 0;
  return Math.max(0, gross - session.pausedTotalMs - pausing);
}

/** 计划时长的毫秒数。 */
export function plannedMs(session: ActiveSession): number {
  return session.plannedMinutes * 60_000;
}

/** 剩余毫秒数，最小为 0。 */
export function remainingMs(session: ActiveSession, now: number): number {
  return Math.max(0, plannedMs(session) - elapsedMs(session, now));
}

/** 是否已按时间戳算走完了计划时长。 */
export function isFinished(session: ActiveSession, now: number): boolean {
  return elapsedMs(session, now) >= plannedMs(session);
}

/** 进度比例 0..1。 */
export function progressRatio(session: ActiveSession, now: number): number {
  const total = plannedMs(session);
  if (total <= 0) return 1;
  return Math.min(1, Math.max(0, elapsedMs(session, now) / total));
}

/** 是否处于暂停中。 */
export function isPaused(session: ActiveSession): boolean {
  return session.pauseStartedAt !== null;
}

/** 实际专注分钟数，保留 1 位小数（写入 Session.actualMinutes）。 */
export function toActualMinutes(ms: number): number {
  return Math.round((ms / 60_000) * 10) / 10;
}

/** 进入暂停。已在暂停中则原样返回。 */
export function pause(session: ActiveSession, now: number): ActiveSession {
  if (session.pauseStartedAt !== null) return session;
  return { ...session, pauseStartedAt: now };
}

/** 结束暂停，把这段暂停时长累加进 pausedTotalMs。 */
export function resume(session: ActiveSession, now: number): ActiveSession {
  if (session.pauseStartedAt === null) return session;
  return {
    ...session,
    pausedTotalMs: session.pausedTotalMs + Math.max(0, now - session.pauseStartedAt),
    pauseStartedAt: null,
  };
}

/**
 * 结算时刻的「有效结束时间」。
 *
 * 用于崩溃恢复：标签页关了很久再打开时，闭关应当在计划时长走满的那一刻结束，
 * 而不是记到重新打开的时刻，否则实际时长会被算多。
 */
export function effectiveEndAt(session: ActiveSession, now: number): number {
  if (!isFinished(session, now)) return now;
  const overshoot = elapsedMs(session, now) - plannedMs(session);
  return now - overshoot;
}

/** 把毫秒格式化成 MM:SS（超过 1 小时则 HH:MM:SS）。 */
export function formatClock(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** 拆出分和秒，用于「坚持了 X 分 Y 秒」。 */
export function splitMinutesSeconds(ms: number): {
  minutes: number;
  seconds: number;
} {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

/** 新建一个活跃会话。id 由调用方传入以保持纯函数。 */
export function createActiveSession(params: {
  id: string;
  startedAt: number;
  plannedMinutes: number;
  gongfa: string;
}): ActiveSession {
  return {
    id: params.id,
    startedAt: params.startedAt,
    plannedMinutes: params.plannedMinutes,
    gongfa: params.gongfa,
    pausedTotalMs: 0,
    pauseStartedAt: null,
    distractionCount: 0,
    hiddenAt: null,
  };
}
