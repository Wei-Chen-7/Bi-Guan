/**
 * 中断判定（PRD 要求 C）。
 *
 * 页面转入 hidden 时记录 hiddenAt，转回 visible 时按离开时长判定。
 * 这里只有纯决策函数，事件监听在 hooks/useVisibility.ts。
 */

import type { ActiveSession } from '../types';

export type VisibilityVerdict =
  /** 什么都不做（暂停中离开，或离开时长为负等异常情形）。 */
  | { kind: 'ignore' }
  /** 离开时长在宽限期内，或处于宽松模式：不惩罚，只累加 distractionCount。 */
  | { kind: 'distraction'; awayMs: number }
  /** 离开超过宽限期：渡劫失败。 */
  | { kind: 'fail'; awayMs: number };

export interface VisibilityRule {
  /** 宽限期秒数，默认 15。 */
  graceSeconds: number;
  /**
   * 宽松模式：开启后切走页面永不判失败，只累加 distractionCount。
   * 这是为了照顾必须切窗口查资料的用户。
   */
  lenientMode: boolean;
}

/** 记录页面转入后台的时刻。 */
export function markHidden(
  session: ActiveSession,
  now: number
): ActiveSession {
  if (session.hiddenAt !== null) return session;
  return { ...session, hiddenAt: now };
}

/**
 * 页面转回前台时的判定。返回裁决，不修改会话。
 * 暂停期间切走页面一律不判失败。
 */
export function judgeReturn(
  session: ActiveSession,
  rule: VisibilityRule,
  now: number
): VisibilityVerdict {
  if (session.hiddenAt === null) return { kind: 'ignore' };

  const awayMs = now - session.hiddenAt;
  if (awayMs < 0) return { kind: 'ignore' };

  // 暂停调息期间离开页面不作数。
  if (session.pauseStartedAt !== null) return { kind: 'ignore' };

  if (rule.lenientMode) return { kind: 'distraction', awayMs };

  const graceMs = Math.max(0, rule.graceSeconds) * 1000;
  return awayMs > graceMs
    ? { kind: 'fail', awayMs }
    : { kind: 'distraction', awayMs };
}

/** 清掉 hiddenAt，并按裁决累加心神游离次数。 */
export function applyVerdict(
  session: ActiveSession,
  verdict: VisibilityVerdict
): ActiveSession {
  const cleared: ActiveSession = { ...session, hiddenAt: null };
  if (verdict.kind === 'distraction') {
    return { ...cleared, distractionCount: cleared.distractionCount + 1 };
  }
  return cleared;
}
