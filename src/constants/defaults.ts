import type { Settings, UserState } from '../types';

/** 当前数据结构版本，导入与迁移都以此为准。 */
export const SCHEMA_VERSION = 1;

/** 存储 key。 */
export const STORAGE_KEY_STATE = 'biguan.state.v1';
export const STORAGE_KEY_ACTIVE = 'biguan.activeSession.v1';

/** 默认功法（PRD 5.5）。 */
export const DEFAULT_GONGFA: readonly string[] = [
  '静心读书',
  '推演符箓',
  '炼制丹药',
  '温养神识',
];

export const MAX_GONGFA = 12;
export const MAX_PRESETS = 6;

/** 自定义时长范围（PRD 5.1）。 */
export const MIN_MINUTES = 5;
export const MAX_MINUTES = 180;

/** 宽限期范围（PRD 5.4）。 */
export const MIN_GRACE_SECONDS = 5;
export const MAX_GRACE_SECONDS = 60;

/** 同一天内触发心魔所需的渡劫失败次数，以及心魔持续时长。 */
export const DEMON_FAIL_THRESHOLD = 3;
export const DEMON_DURATION_MS = 24 * 60 * 60 * 1000;

/** 心魔期间的修为系数，以及道心加成上限。 */
export const DEMON_MULTIPLIER = 0.8;
export const STREAK_BONUS_PER_DAY = 0.02;
export const STREAK_BONUS_CAP = 0.5;

/** 计时器重渲染间隔：只负责触发渲染，不负责计数（PRD 要求 A）。 */
export const TICK_INTERVAL_MS = 200;

/** 修行录列表单页条数（PRD 5.3）。 */
export const SESSION_PAGE_SIZE = 50;

/** 图表天数。 */
export const CHART_DAYS = 30;

export const DEFAULT_SETTINGS: Settings = {
  defaultMinutes: 25,
  customPresets: [25, 45, 60, 90],
  lenientMode: false,
  graceSeconds: 15,
  soundEnabled: true,
  ambientSound: 'none',
  keepAwake: true,
  gongfaList: [...DEFAULT_GONGFA],
};

export const DEFAULT_USER_STATE: UserState = {
  schemaVersion: SCHEMA_VERSION,
  totalE: 0,
  streakDays: 0,
  lastCompletedDate: '',
  demonMarkUntil: null,
  todayFailCount: 0,
  todayFailDate: '',
  sessions: [],
  settings: DEFAULT_SETTINGS,
};

export const APP_VERSION = '1.0.0';
