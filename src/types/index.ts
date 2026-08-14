/**
 * 全应用类型定义。
 * 术语对照见 PRD 1.3：闭关 / 修为 / 境界 / 突破 / 功法 / 道心 / 心魔 / 修行录。
 */

export type RealmId = 'lianqi' | 'zhuji' | 'jindan' | 'yuanying' | 'huashen';

export interface Stage {
  index: number; // 全局序号 0..24
  realm: RealmId;
  realmName: string; // '炼气'
  stageName: string; // '三层' | '初期'
  fullName: string; // '炼气三层' | '筑基初期'
  threshold: number; // 达到此小境界所需的累计修为
  title: string; // 宗门称号，如 '外门弟子'
  breakthroughText: string; // 突破时的专属文案
}

export type SessionStatus = 'completed' | 'failed' | 'abandoned';
// completed = 闭关圆满
// failed    = 渡劫失败（切走页面超时）
// abandoned = 主动放弃（点了「散功」按钮）

export interface Session {
  id: string; // crypto.randomUUID()
  startedAt: number; // epoch ms
  endedAt: number; // epoch ms
  plannedMinutes: number;
  actualMinutes: number; // 实际专注分钟，保留 1 位小数
  status: SessionStatus;
  gongfa: string; // 功法（标签）名
  gainedE: number; // 本次实得修为
  durationMultiplier: number;
  streakBonus: number;
  distractionCount: number; // 短暂切走次数
  /** V2 云同步预留字段，V1 不使用。 */
  syncedAt?: number;
}

export type AmbientSound = 'none' | 'rain' | 'wind' | 'stream';

export interface Settings {
  defaultMinutes: number; // 默认 25
  customPresets: number[]; // 默认 [25, 45, 60, 90]
  lenientMode: boolean; // 宽松模式，默认 false
  graceSeconds: number; // 宽限期秒数，默认 15
  soundEnabled: boolean; // 默认 true
  ambientSound: AmbientSound; // 默认 'none'
  keepAwake: boolean; // 默认 true
  gongfaList: string[]; // 默认 ['静心读书','推演符箓','炼制丹药','温养神识']
}

export interface UserState {
  schemaVersion: number; // 当前 1，用于未来数据迁移
  totalE: number; // 累计修为，只增不减
  streakDays: number; // 连续闭关天数
  lastCompletedDate: string; // 'YYYY-MM-DD'，本地时区
  demonMarkUntil: number | null; // 心魔 debuff 到期时间戳
  todayFailCount: number; // 今日渡劫失败次数
  todayFailDate: string; // 上述计数对应的日期
  sessions: Session[]; // 全部记录，倒序（最新在前）
  settings: Settings;
}

/**
 * 进行中的闭关会话。独立存 `biguan.activeSession.v1`，便于崩溃恢复。
 * 计时一律基于时间戳反算，不做 setInterval 累加（PRD 要求 A）。
 */
export interface ActiveSession {
  id: string;
  startedAt: number; // epoch ms
  plannedMinutes: number;
  gongfa: string;
  pausedTotalMs: number; // 累计已结束的暂停时长
  pauseStartedAt: number | null; // 当前正在进行的暂停的起点
  distractionCount: number; // 宽限期内的短暂切走次数
  hiddenAt: number | null; // 页面转入 hidden 的时刻
}

/** 一次闭关的收益明细，用于结算页逐行展示。 */
export interface GainBreakdown {
  baseE: number; // 基础修为 = floor(t)
  durationMultiplier: number; // m(T)
  durationBonusE: number; // 时长加成带来的增量
  streakBonus: number; // b(n)
  streakBonusE: number; // 道心加成带来的增量
  demonMultiplier: number; // d
  demonPenaltyE: number; // 心魔减益带来的减量（负数或 0）
  totalE: number; // 最终 ΔE
}

/** 结算结果：一次闭关结束后产生的全部信息。 */
export interface SettlementResult {
  session: Session;
  breakdown: GainBreakdown;
  /** 本次跨过的境界，可能多级，按顺序播放突破动画。 */
  breakthroughs: Stage[];
  /** 本次是否触发心魔。 */
  demonTriggered: boolean;
}
