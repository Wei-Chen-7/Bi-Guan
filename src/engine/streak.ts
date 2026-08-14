/**
 * 连续天数（道心）与心魔机制。纯函数，日期一律走本地时区。
 */

import {
  DEMON_DURATION_MS,
  DEMON_FAIL_THRESHOLD,
} from '../constants/defaults';
import type { Session, UserState } from '../types';
import { isYesterdayOf, toLocalDateString } from '../utils/date';

export interface StreakState {
  streakDays: number;
  lastCompletedDate: string;
}

/**
 * 闭关圆满后推进连续天数（PRD 4.2）：
 *   lastCompletedDate 是昨天 → +1
 *   是今天             → 不变
 *   更早或为空         → 重置为 1
 * 渡劫失败不断连续，这是刻意的宽容设计。
 */
export function advanceStreak(
  prev: StreakState,
  todayDate: string
): StreakState {
  if (prev.lastCompletedDate === todayDate) {
    // 今天已经圆满过，天数不变，但至少是 1。
    return {
      streakDays: Math.max(1, prev.streakDays),
      lastCompletedDate: todayDate,
    };
  }
  if (isYesterdayOf(prev.lastCompletedDate, todayDate)) {
    return {
      streakDays: prev.streakDays + 1,
      lastCompletedDate: todayDate,
    };
  }
  return { streakDays: 1, lastCompletedDate: todayDate };
}

/**
 * 当前实际生效的连续天数。
 *
 * streakDays 存的是最后一次圆满时的值，若此后隔了两天以上未闭关，道心已断，
 * 展示与加成都应按 0 计。今天或昨天完成过则仍然有效（今天还有机会续上）。
 */
export function effectiveStreak(
  state: Pick<UserState, 'streakDays' | 'lastCompletedDate'>,
  todayDate: string
): number {
  if (!state.lastCompletedDate) return 0;
  if (state.lastCompletedDate === todayDate) return state.streakDays;
  if (isYesterdayOf(state.lastCompletedDate, todayDate)) return state.streakDays;
  return 0;
}

export interface DemonState {
  todayFailCount: number;
  todayFailDate: string;
  demonMarkUntil: number | null;
}

/** 跨日时把今日失败计数归零。 */
export function rolloverFailCount(
  prev: DemonState,
  todayDate: string
): DemonState {
  if (prev.todayFailDate === todayDate) return prev;
  return { ...prev, todayFailCount: 0, todayFailDate: todayDate };
}

/** 心魔到期后清除标记。 */
export function clearExpiredDemon(prev: DemonState, now: number): DemonState {
  if (prev.demonMarkUntil !== null && prev.demonMarkUntil <= now) {
    return { ...prev, demonMarkUntil: null };
  }
  return prev;
}

export interface FailureOutcome extends DemonState {
  /** 本次失败是否让道友新入心魔（用于结算页追加提示）。 */
  demonTriggered: boolean;
}

/**
 * 登记一次渡劫失败（PRD 4.3）：
 * 同一天内累计 3 次 failed → 进入心魔，24 小时内修为收益 ×0.8。
 */
export function registerFailure(
  prev: DemonState,
  now: number
): FailureOutcome {
  const todayDate = toLocalDateString(now);
  const rolled = clearExpiredDemon(rolloverFailCount(prev, todayDate), now);
  const wasActive = rolled.demonMarkUntil !== null;
  const todayFailCount = rolled.todayFailCount + 1;

  if (todayFailCount >= DEMON_FAIL_THRESHOLD) {
    return {
      todayFailCount,
      todayFailDate: todayDate,
      demonMarkUntil: now + DEMON_DURATION_MS,
      demonTriggered: !wasActive,
    };
  }

  return {
    todayFailCount,
    todayFailDate: todayDate,
    demonMarkUntil: rolled.demonMarkUntil,
    demonTriggered: false,
  };
}

/**
 * 历史最长道心：按圆满记录的本地日期重放一遍连续天数。
 */
export function computeLongestStreak(sessions: readonly Session[]): number {
  const days = new Set<string>();
  for (const s of sessions) {
    if (s.status === 'completed') days.add(toLocalDateString(s.startedAt));
  }
  if (days.size === 0) return 0;

  const sorted = [...days].sort();
  let longest = 1;
  let run = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev !== undefined && curr !== undefined && isYesterdayOf(prev, curr)) {
      run += 1;
    } else {
      run = 1;
    }
    if (run > longest) longest = run;
  }
  return longest;
}
