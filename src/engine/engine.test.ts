import { describe, expect, it } from 'vitest';

import { DEFAULT_USER_STATE } from '../constants/defaults';
import { STAGES } from '../constants/realms';
import type { ActiveSession, UserState } from '../types';
import { daysBetween, toLocalDateString } from '../utils/date';
import {
  breakthroughsBetween,
  computeGain,
  durationMultiplier,
  isMajorBreakthrough,
  realmProgress,
  settleSession,
  stageForTotal,
  streakBonus,
} from './cultivation';
import type { DemonState } from './streak';
import {
  advanceStreak,
  computeLongestStreak,
  effectiveStreak,
  registerFailure,
} from './streak';
import {
  createActiveSession,
  effectiveEndAt,
  elapsedMs,
  formatClock,
  isFinished,
  pause,
  remainingMs,
  resume,
} from './timer';
import { applyVerdict, judgeReturn, markHidden } from './visibility';

const NOW = new Date(2026, 2, 14, 10, 0, 0).getTime();

function makeSession(over: Partial<ActiveSession> = {}): ActiveSession {
  return {
    ...createActiveSession({
      id: 'test',
      startedAt: NOW,
      plannedMinutes: 25,
      gongfa: '静心读书',
    }),
    ...over,
  };
}

function makeState(over: Partial<UserState> = {}): UserState {
  return { ...DEFAULT_USER_STATE, sessions: [], ...over };
}

describe('境界表', () => {
  it('共 25 级，门槛严格递增', () => {
    expect(STAGES).toHaveLength(25);
    for (let i = 1; i < STAGES.length; i++) {
      expect(STAGES[i]!.threshold).toBeGreaterThan(STAGES[i - 1]!.threshold);
    }
  });

  it('首尾门槛与称号符合附录 A', () => {
    expect(STAGES[0]).toMatchObject({
      fullName: '炼气一层',
      threshold: 25,
      title: '记名弟子',
    });
    expect(STAGES[8]).toMatchObject({ fullName: '炼气九层', threshold: 1500 });
    expect(STAGES[9]).toMatchObject({
      fullName: '筑基初期',
      threshold: 2100,
      title: '真传弟子',
    });
    expect(STAGES[24]).toMatchObject({
      fullName: '化神圆满',
      threshold: 85000,
      title: '太上长老',
    });
  });

  it('称号按炼气层数分三档', () => {
    expect(STAGES[2]!.title).toBe('记名弟子'); // 三层
    expect(STAGES[3]!.title).toBe('外门弟子'); // 四层
    expect(STAGES[5]!.title).toBe('外门弟子'); // 六层
    expect(STAGES[6]!.title).toBe('内门弟子'); // 七层
    expect(STAGES[13]!.title).toBe('执事'); // 金丹初期
    expect(STAGES[17]!.title).toBe('长老'); // 元婴初期
  });

  it('只有五个大境界入口是隆重突破', () => {
    const major = STAGES.filter(isMajorBreakthrough).map((s) => s.fullName);
    expect(major).toEqual([
      '炼气一层',
      '筑基初期',
      '金丹初期',
      '元婴初期',
      '化神初期',
    ]);
  });

  it('大境界入口配专属文案，其余用通用文案', () => {
    expect(STAGES[9]!.breakthroughText).toBe(
      '灵气化液，根基已成。凡俗之门，就此关上。'
    );
    expect(STAGES[1]!.breakthroughText).toBe('修为精进，境界已至 炼气二层');
  });
});

describe('境界判定', () => {
  it('24 修为是凡人，25 修为入炼气一层', () => {
    expect(stageForTotal(24)).toBeNull();
    expect(stageForTotal(25)?.fullName).toBe('炼气一层');
  });

  it('取门槛不超过 totalE 的最高一级', () => {
    expect(stageForTotal(0)).toBeNull();
    expect(stageForTotal(149)?.fullName).toBe('炼气二层');
    expect(stageForTotal(150)?.fullName).toBe('炼气三层');
    expect(stageForTotal(999999)?.fullName).toBe('化神圆满');
  });

  it('凡人的进度条指向炼气一层', () => {
    const p = realmProgress(10);
    expect(p.current).toBeNull();
    expect(p.next?.fullName).toBe('炼气一层');
    expect(p.remaining).toBe(15);
    expect(p.ratio).toBeCloseTo(0.4);
  });

  it('满级后进度为 1、无下一境界', () => {
    const p = realmProgress(85000);
    expect(p.next).toBeNull();
    expect(p.ratio).toBe(1);
    expect(p.remaining).toBe(0);
  });
});

describe('修为计算', () => {
  it('时长系数按计划时长分三档', () => {
    expect(durationMultiplier(25)).toBe(1.0);
    expect(durationMultiplier(30)).toBe(1.0);
    expect(durationMultiplier(45)).toBe(1.15);
    expect(durationMultiplier(60)).toBe(1.15);
    expect(durationMultiplier(90)).toBe(1.3);
  });

  it('道心加成每日 2%，封顶 50%', () => {
    expect(streakBonus(0)).toBe(0);
    expect(streakBonus(10)).toBeCloseTo(0.2);
    expect(streakBonus(25)).toBeCloseTo(0.5);
    expect(streakBonus(100)).toBe(0.5);
  });

  it('复现 PRD 结算样例：50 分钟 / ×1.15 / +20%', () => {
    const g = computeGain({
      actualMinutes: 50,
      plannedMinutes: 50,
      streakDays: 10,
      demonMarkUntil: null,
      now: NOW,
    });
    expect(g.baseE).toBe(50);
    expect(g.durationBonusE).toBe(7);
    expect(g.streakBonusE).toBe(12);
    expect(g.totalE).toBe(69);
  });

  it('明细各行相加恰好等于总数', () => {
    for (const minutes of [7.3, 25, 33.4, 61.7, 90, 179.9]) {
      for (const streak of [0, 3, 17, 40]) {
        for (const demon of [null, NOW + 1000]) {
          const g = computeGain({
            actualMinutes: minutes,
            plannedMinutes: Math.ceil(minutes),
            streakDays: streak,
            demonMarkUntil: demon,
            now: NOW,
          });
          expect(
            g.baseE + g.durationBonusE + g.streakBonusE + g.demonPenaltyE
          ).toBe(g.totalE);
        }
      }
    }
  });

  it('心魔期间收益为正常值的 0.8 倍', () => {
    const base = {
      actualMinutes: 25,
      plannedMinutes: 25,
      streakDays: 0,
      now: NOW,
    };
    const normal = computeGain({ ...base, demonMarkUntil: null });
    const cursed = computeGain({ ...base, demonMarkUntil: NOW + 3600_000 });
    expect(normal.totalE).toBe(25);
    expect(cursed.totalE).toBe(20);
    expect(cursed.demonMultiplier).toBe(0.8);
  });

  it('心魔过期后不再减益', () => {
    const g = computeGain({
      actualMinutes: 25,
      plannedMinutes: 25,
      streakDays: 0,
      demonMarkUntil: NOW - 1,
      now: NOW,
    });
    expect(g.totalE).toBe(25);
  });
});

describe('突破检测', () => {
  it('首次 25 分钟闭关必定突破炼气一层', () => {
    const jumped = breakthroughsBetween(0, 25);
    expect(jumped.map((s) => s.fullName)).toEqual(['炼气一层']);
  });

  it('一次跨多级时按顺序返回每一级', () => {
    const jumped = breakthroughsBetween(1400, 1650);
    expect(jumped.map((s) => s.fullName)).toEqual(['炼气九层']);

    const many = breakthroughsBetween(1400, 2900);
    expect(many.map((s) => s.fullName)).toEqual([
      '炼气九层',
      '筑基初期',
      '筑基中期',
    ]);
  });

  it('修为未跨门槛时无突破', () => {
    expect(breakthroughsBetween(100, 149)).toHaveLength(0);
    expect(breakthroughsBetween(100, 100)).toHaveLength(0);
  });
});

describe('计时（时间戳反算）', () => {
  it('剩余时间按时间戳算，不受渲染频率影响', () => {
    const s = makeSession();
    expect(remainingMs(s, NOW + 60_000)).toBe(24 * 60_000);
    expect(isFinished(s, NOW + 24 * 60_000)).toBe(false);
    expect(isFinished(s, NOW + 25 * 60_000)).toBe(true);
  });

  it('暂停期间不走表，恢复后接着走', () => {
    let s = makeSession();
    s = pause(s, NOW + 60_000); // 走了 1 分钟后暂停
    expect(elapsedMs(s, NOW + 5 * 60_000)).toBe(60_000); // 暂停中不增长
    s = resume(s, NOW + 5 * 60_000); // 暂停了 4 分钟
    expect(s.pausedTotalMs).toBe(4 * 60_000);
    expect(elapsedMs(s, NOW + 6 * 60_000)).toBe(2 * 60_000);
  });

  it('重复暂停或重复恢复不产生副作用', () => {
    let s = makeSession();
    s = pause(s, NOW + 1000);
    const again = pause(s, NOW + 2000);
    expect(again.pauseStartedAt).toBe(NOW + 1000);
    s = resume(s, NOW + 3000);
    expect(resume(s, NOW + 9000)).toEqual(s);
  });

  it('关掉标签页很久后重开，结束时刻定在计划走满的那一刻', () => {
    const s = makeSession(); // 25 分钟
    const reopenedAt = NOW + 3 * 60 * 60_000; // 三小时后才重开
    expect(isFinished(s, reopenedAt)).toBe(true);
    expect(effectiveEndAt(s, reopenedAt)).toBe(NOW + 25 * 60_000);
  });

  it('未走完时有效结束时刻就是当前', () => {
    const s = makeSession();
    expect(effectiveEndAt(s, NOW + 60_000)).toBe(NOW + 60_000);
  });

  it('倒计时格式化', () => {
    expect(formatClock(25 * 60_000)).toBe('25:00');
    expect(formatClock(61_000)).toBe('01:01');
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(90 * 60_000)).toBe('1:30:00');
  });
});

describe('中断判定', () => {
  const strict = { graceSeconds: 15, lenientMode: false };
  const lenient = { graceSeconds: 15, lenientMode: true };

  it('切走 30 秒判渡劫失败', () => {
    const s = markHidden(makeSession(), NOW);
    expect(judgeReturn(s, strict, NOW + 30_000)).toMatchObject({ kind: 'fail' });
  });

  it('切走 10 秒在宽限期内，只记心神游离', () => {
    const s = markHidden(makeSession(), NOW);
    const verdict = judgeReturn(s, strict, NOW + 10_000);
    expect(verdict.kind).toBe('distraction');
    expect(applyVerdict(s, verdict).distractionCount).toBe(1);
  });

  it('恰好等于宽限期不判失败', () => {
    const s = markHidden(makeSession(), NOW);
    expect(judgeReturn(s, strict, NOW + 15_000).kind).toBe('distraction');
    expect(judgeReturn(s, strict, NOW + 15_001).kind).toBe('fail');
  });

  it('暂停期间切走不判失败', () => {
    const s = markHidden(pause(makeSession(), NOW), NOW);
    expect(judgeReturn(s, strict, NOW + 10 * 60_000).kind).toBe('ignore');
  });

  it('宽松模式下切走 5 分钟也不判失败，只累加心神游离', () => {
    const s = markHidden(makeSession(), NOW);
    const verdict = judgeReturn(s, lenient, NOW + 5 * 60_000);
    expect(verdict.kind).toBe('distraction');
    expect(applyVerdict(s, verdict).distractionCount).toBe(1);
    expect(applyVerdict(s, verdict).hiddenAt).toBeNull();
  });
});

describe('道心与心魔', () => {
  it('昨天完成过则 +1，今天再完成不变，隔天以上重置为 1', () => {
    expect(
      advanceStreak({ streakDays: 3, lastCompletedDate: '2026-03-13' }, '2026-03-14')
    ).toEqual({ streakDays: 4, lastCompletedDate: '2026-03-14' });

    expect(
      advanceStreak({ streakDays: 4, lastCompletedDate: '2026-03-14' }, '2026-03-14')
    ).toEqual({ streakDays: 4, lastCompletedDate: '2026-03-14' });

    expect(
      advanceStreak({ streakDays: 9, lastCompletedDate: '2026-03-01' }, '2026-03-14')
    ).toEqual({ streakDays: 1, lastCompletedDate: '2026-03-14' });

    expect(
      advanceStreak({ streakDays: 0, lastCompletedDate: '' }, '2026-03-14')
    ).toEqual({ streakDays: 1, lastCompletedDate: '2026-03-14' });
  });

  it('跨月跨年都按本地日历算', () => {
    expect(
      advanceStreak({ streakDays: 5, lastCompletedDate: '2025-12-31' }, '2026-01-01')
    ).toEqual({ streakDays: 6, lastCompletedDate: '2026-01-01' });
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1); // 2026 非闰年
  });

  it('隔了两天没闭关，道心归零', () => {
    const state = { streakDays: 7, lastCompletedDate: '2026-03-11' };
    expect(effectiveStreak(state, '2026-03-12')).toBe(7); // 昨天
    expect(effectiveStreak(state, '2026-03-11')).toBe(7); // 今天
    expect(effectiveStreak(state, '2026-03-14')).toBe(0); // 断了
  });

  it('同一天第三次渡劫失败触发心魔', () => {
    let d: DemonState = {
      todayFailCount: 0,
      todayFailDate: '',
      demonMarkUntil: null,
    };
    d = registerFailure(d, NOW);
    expect(d.demonMarkUntil).toBeNull();
    d = registerFailure(d, NOW + 1000);
    expect(d.demonMarkUntil).toBeNull();
    const third = registerFailure(d, NOW + 2000);
    expect(third.demonTriggered).toBe(true);
    expect(third.demonMarkUntil).toBe(NOW + 2000 + 24 * 3600_000);
  });

  it('跨日后失败计数归零，需重新累计三次', () => {
    const yesterday = { todayFailCount: 2, todayFailDate: '2026-03-13', demonMarkUntil: null };
    const first = registerFailure(yesterday, NOW); // 3-14
    expect(first.todayFailCount).toBe(1);
    expect(first.demonMarkUntil).toBeNull();
  });

  it('最长道心按圆满记录重放', () => {
    const day = (d: number, h = 12) => new Date(2026, 2, d, h).getTime();
    const sessions = [
      { status: 'completed', startedAt: day(1) },
      { status: 'completed', startedAt: day(2) },
      { status: 'completed', startedAt: day(3) },
      { status: 'failed', startedAt: day(4) },
      { status: 'completed', startedAt: day(6) },
      { status: 'completed', startedAt: day(7) },
    ] as never;
    expect(computeLongestStreak(sessions)).toBe(3);
  });
});

describe('结算', () => {
  it('圆满：加修为、推进道心、产生突破', () => {
    const { state, result } = settleSession({
      state: makeState({ totalE: 0 }),
      session: makeSession(),
      status: 'completed',
      elapsedMs: 25 * 60_000,
      endedAt: NOW + 25 * 60_000,
    });
    expect(result.breakdown.totalE).toBe(25);
    expect(state.totalE).toBe(25);
    expect(state.streakDays).toBe(1);
    expect(state.lastCompletedDate).toBe(toLocalDateString(NOW));
    expect(result.breakthroughs.map((s) => s.fullName)).toEqual(['炼气一层']);
    expect(state.sessions[0]?.status).toBe('completed');
  });

  it('从 1400 修为完成一次 200+ 收益的闭关会连跨多级', () => {
    const { state, result } = settleSession({
      state: makeState({ totalE: 1400, streakDays: 0 }),
      session: makeSession({ plannedMinutes: 180 }),
      status: 'completed',
      elapsedMs: 180 * 60_000,
      endedAt: NOW + 180 * 60_000,
    });
    expect(result.breakdown.totalE).toBe(234); // floor(180 × 1.3)
    expect(state.totalE).toBe(1634);
    expect(result.breakthroughs.map((s) => s.fullName)).toEqual(['炼气九层']);
  });

  it('渡劫失败：修为为零、totalE 不减、道心不断', () => {
    const before = makeState({
      totalE: 500,
      streakDays: 6,
      lastCompletedDate: toLocalDateString(NOW),
    });
    const { state, result } = settleSession({
      state: before,
      session: makeSession(),
      status: 'failed',
      elapsedMs: 8 * 60_000,
      endedAt: NOW + 8 * 60_000,
    });
    expect(result.breakdown.totalE).toBe(0);
    expect(state.totalE).toBe(500); // 只增不减
    expect(state.streakDays).toBe(6); // 不断连续
    expect(state.todayFailCount).toBe(1);
  });

  it('主动散功不登记失败次数', () => {
    const { state } = settleSession({
      state: makeState({ totalE: 300 }),
      session: makeSession(),
      status: 'abandoned',
      elapsedMs: 5 * 60_000,
      endedAt: NOW + 5 * 60_000,
    });
    expect(state.totalE).toBe(300);
    expect(state.todayFailCount).toBe(0);
    expect(state.demonMarkUntil).toBeNull();
  });

  it('三次失败后第四次闭关的收益是正常值的 0.8 倍', () => {
    let state = makeState({ totalE: 1000 });
    for (let i = 0; i < 3; i++) {
      state = settleSession({
        state,
        session: makeSession({ id: `f${i}` }),
        status: 'failed',
        elapsedMs: 60_000,
        endedAt: NOW + i * 1000,
      }).state;
    }
    expect(state.demonMarkUntil).not.toBeNull();

    const { result } = settleSession({
      state,
      session: makeSession({ id: 'fourth' }),
      status: 'completed',
      elapsedMs: 25 * 60_000,
      endedAt: NOW + 30 * 60_000,
    });
    expect(result.breakdown.totalE).toBe(20); // 正常 25 → 心魔 20
    expect(result.breakdown.demonPenaltyE).toBe(-5);
  });

  it('记录写入的实际分钟保留一位小数', () => {
    const { result } = settleSession({
      state: makeState(),
      session: makeSession(),
      status: 'failed',
      elapsedMs: 8 * 60_000 + 27_000, // 8 分 27 秒
      endedAt: NOW,
    });
    expect(result.session.actualMinutes).toBe(8.5);
  });
});
