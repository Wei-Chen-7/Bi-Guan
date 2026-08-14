/**
 * 修为计算、境界判定、突破检测。
 *
 * 本文件只允许出现纯函数：不 import React、不读写 localStorage、不碰 Date.now()
 * 以外的环境状态（且 now 一律由调用方传入）。修为计算和境界判定的正确性是这个
 * 产品的命根子，必须可以脱离 UI 单独测试。
 */

import {
  DEMON_MULTIPLIER,
  STREAK_BONUS_CAP,
  STREAK_BONUS_PER_DAY,
} from '../constants/defaults';
import { MAJOR_REALM_ENTRY_INDEXES, STAGES } from '../constants/realms';
import type {
  ActiveSession,
  GainBreakdown,
  Session,
  SessionStatus,
  SettlementResult,
  Stage,
  UserState,
} from '../types';
import { toLocalDateString } from '../utils/date';
import {
  advanceStreak,
  clearExpiredDemon,
  effectiveStreak,
  registerFailure,
} from './streak';
import { toActualMinutes } from './timer';

/**
 * 先抹掉浮点误差再向下取整。
 *
 * 直接 floor 会吃掉整整一点修为：50 × 1.15 × 1.2 在二进制浮点下等于
 * 68.99999999999999，floor 得 68，而正确答案是 69。修为是玩家看得见的
 * 数字，这一点不能丢，故统一在 1e-9 精度上归整后再取整。
 */
export function floorE(value: number): number {
  return Math.floor(Math.round(value * 1e9) / 1e9);
}

/**
 * 时长系数 m(T)，按**计划时长** T 取（不是实际时长）。
 *   T ≤ 30      → 1.00
 *   30 < T ≤ 60 → 1.15
 *   T > 60      → 1.30
 */
export function durationMultiplier(plannedMinutes: number): number {
  if (plannedMinutes <= 30) return 1.0;
  if (plannedMinutes <= 60) return 1.15;
  return 1.3;
}

/** 道心加成 b(n) = min(0.5, 0.02 × streakDays)，封顶 50%。 */
export function streakBonus(streakDays: number): number {
  if (!Number.isFinite(streakDays) || streakDays <= 0) return 0;
  return Math.min(STREAK_BONUS_CAP, STREAK_BONUS_PER_DAY * streakDays);
}

/** 心魔是否生效。 */
export function isDemonActive(
  demonMarkUntil: number | null,
  now: number
): boolean {
  return demonMarkUntil !== null && demonMarkUntil > now;
}

/** 心魔减益 d：心魔期间 0.8，否则 1.0。 */
export function demonMultiplier(
  demonMarkUntil: number | null,
  now: number
): number {
  return isDemonActive(demonMarkUntil, now) ? DEMON_MULTIPLIER : 1.0;
}

export interface GainInput {
  /** 实际专注分钟数 t。 */
  actualMinutes: number;
  /** 计划时长 T，决定时长系数。 */
  plannedMinutes: number;
  /** 当前连续天数 n。 */
  streakDays: number;
  /** 心魔到期时间戳。 */
  demonMarkUntil: number | null;
  /** 判定时刻。 */
  now: number;
}

/**
 * 一次闭关圆满的收益：ΔE = floor( t × m(T) × (1 + b(n)) × d )。
 *
 * 明细逐项取累计值的 floor 之差，保证结算页上各行相加恰好等于总数。
 */
export function computeGain(input: GainInput): GainBreakdown {
  const { actualMinutes, plannedMinutes, streakDays, demonMarkUntil, now } =
    input;

  const t = Math.max(0, actualMinutes);
  const m = durationMultiplier(plannedMinutes);
  const b = streakBonus(streakDays);
  const d = demonMultiplier(demonMarkUntil, now);

  const afterBase = t;
  const afterDuration = t * m;
  const afterStreak = afterDuration * (1 + b);
  const afterDemon = afterStreak * d;

  const baseE = floorE(afterBase);
  const cumDuration = floorE(afterDuration);
  const cumStreak = floorE(afterStreak);
  const total = floorE(afterDemon);

  return {
    baseE,
    durationMultiplier: m,
    durationBonusE: cumDuration - baseE,
    streakBonus: b,
    streakBonusE: cumStreak - cumDuration,
    demonMultiplier: d,
    demonPenaltyE: total - cumStreak,
    totalE: total,
  };
}

/** 渡劫失败与主动放弃时的空收益（ΔE = 0）。 */
export function zeroGain(
  plannedMinutes: number,
  streakDays: number
): GainBreakdown {
  return {
    baseE: 0,
    durationMultiplier: durationMultiplier(plannedMinutes),
    durationBonusE: 0,
    streakBonus: streakBonus(streakDays),
    streakBonusE: 0,
    demonMultiplier: 1,
    demonPenaltyE: 0,
    totalE: 0,
  };
}

/**
 * 当前境界：门槛不超过 totalE 的最高那一级。
 * totalE < 25 时返回 null，UI 显示为「凡人」。
 */
export function stageForTotal(totalE: number): Stage | null {
  let found: Stage | null = null;
  for (const stage of STAGES) {
    if (stage.threshold <= totalE) {
      found = stage;
    } else {
      break;
    }
  }
  return found;
}

/** 下一境界，已至化神圆满时返回 null。 */
export function nextStageForTotal(totalE: number): Stage | null {
  for (const stage of STAGES) {
    if (stage.threshold > totalE) return stage;
  }
  return null;
}

export interface RealmProgress {
  current: Stage | null;
  next: Stage | null;
  /** 已走过的比例 0..1，满级时为 1。 */
  ratio: number;
  /** 距下一境界还差多少修为，满级时为 0。 */
  remaining: number;
  /** 本级区间的起点门槛（凡人为 0）。 */
  floorThreshold: number;
}

/** 境界进度：用于进度条与「还差多少修为」。 */
export function realmProgress(totalE: number): RealmProgress {
  const current = stageForTotal(totalE);
  const next = nextStageForTotal(totalE);
  const floorThreshold = current ? current.threshold : 0;

  if (!next) {
    return { current, next: null, ratio: 1, remaining: 0, floorThreshold };
  }

  const span = next.threshold - floorThreshold;
  const walked = totalE - floorThreshold;
  const ratio = span > 0 ? Math.min(1, Math.max(0, walked / span)) : 0;

  return {
    current,
    next,
    ratio,
    remaining: Math.max(0, next.threshold - totalE),
    floorThreshold,
  };
}

/**
 * 一次结算中跨过的全部境界，按顺序返回。
 * 一次长时间闭关可能跨越多级，突破动画要依次播放每一级。
 */
export function breakthroughsBetween(prevE: number, nextE: number): Stage[] {
  if (nextE <= prevE) return [];
  return STAGES.filter(
    (stage) => stage.threshold > prevE && stage.threshold <= nextE
  );
}

/** 是否是跨大境界的突破（动画更隆重、时长更长、配专属文案）。 */
export function isMajorBreakthrough(stage: Stage): boolean {
  return MAJOR_REALM_ENTRY_INDEXES.has(stage.index);
}

/** 预估本次闭关圆满可得的修为，用于计时页底部提示。 */
export function estimateGain(input: GainInput): number {
  return computeGain(input).totalE;
}

/* ------------------------------------------------------------------ *
 * 结算：把计时、修为、道心、心魔合成一次完整的闭关结果。
 * 同样是纯函数——输入旧状态，输出新状态，不做任何写入。
 * ------------------------------------------------------------------ */

export interface SettleInput {
  state: UserState;
  session: ActiveSession;
  status: SessionStatus;
  /** 实际专注毫秒数（由 timer.elapsedMs 算出）。 */
  elapsedMs: number;
  /** 结束时刻。 */
  endedAt: number;
}

export interface SettleOutput {
  /** 结算后的完整用户状态。 */
  state: UserState;
  result: SettlementResult;
}

/**
 * 结算一次闭关。
 *
 * 圆满：计入修为、推进道心。
 * 渡劫失败：ΔE = 0，登记失败次数，可能触发心魔，但**不断道心**。
 * 主动散功：ΔE = 0，不登记失败，不影响心魔与道心。
 *
 * 无论何种结果，都绝不扣减 totalE —— 累计修为只增不减，惩罚只体现为
 * 「失去本次收益」（PRD 4.1）。
 */
export function settleSession(input: SettleInput): SettleOutput {
  const { state, session, status, elapsedMs: elapsed, endedAt } = input;

  const todayDate = toLocalDateString(endedAt);
  const actualMinutes = toActualMinutes(elapsed);
  const currentStreak = effectiveStreak(state, todayDate);

  // 先清掉过期心魔，再按结果分支。
  const cleared = clearExpiredDemon(
    {
      todayFailCount: state.todayFailCount,
      todayFailDate: state.todayFailDate,
      demonMarkUntil: state.demonMarkUntil,
    },
    endedAt
  );

  const completed = status === 'completed';
  const breakdown = completed
    ? computeGain({
        actualMinutes,
        plannedMinutes: session.plannedMinutes,
        streakDays: currentStreak,
        demonMarkUntil: cleared.demonMarkUntil,
        now: endedAt,
      })
    : zeroGain(session.plannedMinutes, currentStreak);

  const gainedE = breakdown.totalE;
  const nextTotalE = state.totalE + gainedE;
  const breakthroughs = breakthroughsBetween(state.totalE, nextTotalE);

  // 渡劫失败才登记心魔，主动散功不罚。
  const failure =
    status === 'failed'
      ? registerFailure(cleared, endedAt)
      : { ...cleared, demonTriggered: false };

  // 只有圆满才推进道心。
  const streak = completed
    ? advanceStreak(
        {
          streakDays: currentStreak,
          lastCompletedDate: state.lastCompletedDate,
        },
        todayDate
      )
    : {
        streakDays: state.streakDays,
        lastCompletedDate: state.lastCompletedDate,
      };

  const record: Session = {
    id: session.id,
    startedAt: session.startedAt,
    endedAt,
    plannedMinutes: session.plannedMinutes,
    actualMinutes,
    status,
    gongfa: session.gongfa,
    gainedE,
    durationMultiplier: breakdown.durationMultiplier,
    streakBonus: breakdown.streakBonus,
    distractionCount: session.distractionCount,
  };

  return {
    state: {
      ...state,
      totalE: nextTotalE,
      streakDays: streak.streakDays,
      lastCompletedDate: streak.lastCompletedDate,
      demonMarkUntil: failure.demonMarkUntil,
      todayFailCount: failure.todayFailCount,
      todayFailDate: failure.todayFailDate,
      sessions: [record, ...state.sessions],
    },
    result: {
      session: record,
      breakdown,
      breakthroughs,
      demonTriggered: failure.demonTriggered,
    },
  };
}
