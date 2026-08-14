import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  DEFAULT_USER_STATE,
  MAX_GONGFA,
  MAX_MINUTES,
  MAX_PRESETS,
  MIN_MINUTES,
  SCHEMA_VERSION,
  STORAGE_KEY_ACTIVE,
  STORAGE_KEY_STATE,
} from '../constants/defaults';
import { settleSession } from '../engine/cultivation';
import {
  clearExpiredDemon,
  rolloverFailCount,
} from '../engine/streak';
import {
  createActiveSession,
  effectiveEndAt,
  elapsedMs,
  isFinished,
  pause as pauseSession,
  plannedMs,
  resume as resumeSession,
} from '../engine/timer';
import {
  applyVerdict,
  judgeReturn,
  markHidden,
} from '../engine/visibility';
import type {
  ActiveSession,
  SessionStatus,
  Settings,
  SettlementResult,
  UserState,
} from '../types';
import { toLocalDateString } from '../utils/date';
import { parseImport, runMigrations, sanitizeUserState } from './migrations';
import { readJSON, storage, writeJSON } from './storage';

/** 闭关页的三种形态。 */
export type Phase = 'idle' | 'running' | 'result';

export interface StoreState {
  user: UserState;
  activeSession: ActiveSession | null;
  phase: Phase;
  lastResult: SettlementResult | null;
  /** 待机页上选中的时长与功法（不持久化，每次进入按设置取默认）。 */
  selectedMinutes: number;
  selectedGongfa: string;

  bootstrap: () => void;

  // 闭关流程
  setSelectedMinutes: (minutes: number) => void;
  setSelectedGongfa: (gongfa: string) => void;
  start: (minutes?: number, gongfa?: string) => void;
  pause: () => void;
  resume: () => void;
  abandon: () => void;
  /** 计时走满时由 useTimer 调用。 */
  complete: () => void;
  dismissResult: () => void;

  // 中断判定
  handleHidden: () => void;
  handleVisible: () => void;

  // 设置
  updateSettings: (patch: Partial<Settings>) => void;
  addGongfa: (name: string) => void;
  renameGongfa: (index: number, name: string) => void;
  removeGongfa: (index: number) => void;
  addPreset: (minutes: number) => void;
  removePreset: (minutes: number) => void;

  // 数据
  exportJSON: () => string;
  importJSON: (text: string) => 'ok' | 'parse' | 'version';
  resetAll: () => void;
}

/** 把 StorageAdapter 接到 zustand persist 上，所有读写都经过抽象层。 */
const persistStorage = createJSONStorage(() => ({
  getItem: (key: string) => storage.read(key),
  setItem: (key: string, value: string) => storage.write(key, value),
  removeItem: (key: string) => storage.remove(key),
}));

/** 活跃会话独立存一个 key，便于崩溃恢复（PRD 要求 B）。 */
function persistActive(session: ActiveSession | null): void {
  if (session === null) {
    storage.remove(STORAGE_KEY_ACTIVE);
  } else {
    writeJSON(storage, STORAGE_KEY_ACTIVE, session);
  }
}

function clampMinutes(minutes: number): number {
  if (!Number.isFinite(minutes)) return DEFAULT_USER_STATE.settings.defaultMinutes;
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, Math.round(minutes)));
}

/** 跨日与心魔过期的清理，读档和结算前都要走一遍。 */
function refreshDaily(user: UserState, now: number): UserState {
  const today = toLocalDateString(now);
  const demon = clearExpiredDemon(
    rolloverFailCount(
      {
        todayFailCount: user.todayFailCount,
        todayFailDate: user.todayFailDate,
        demonMarkUntil: user.demonMarkUntil,
      },
      today
    ),
    now
  );
  if (
    demon.todayFailCount === user.todayFailCount &&
    demon.todayFailDate === user.todayFailDate &&
    demon.demonMarkUntil === user.demonMarkUntil
  ) {
    return user;
  }
  return { ...user, ...demon };
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => {
      /** 结束当前闭关并结算。endedAtOverride 用于把结束时刻定在离开页面的那一刻。 */
      function endSession(
        status: SessionStatus,
        endedAtOverride?: number
      ): void {
        const { activeSession, user } = get();
        if (!activeSession) return;

        const now = Date.now();
        const completed = status === 'completed';
        const endedAt = completed
          ? effectiveEndAt(activeSession, now)
          : (endedAtOverride ?? now);

        // 实际专注时长不可能超过计划时长。
        const elapsed = Math.min(
          elapsedMs(activeSession, endedAt),
          plannedMs(activeSession)
        );

        const { state, result } = settleSession({
          state: refreshDaily(user, endedAt),
          session: activeSession,
          status,
          elapsedMs: elapsed,
          endedAt,
        });

        persistActive(null);
        set({
          user: state,
          activeSession: null,
          phase: 'result',
          lastResult: result,
        });
      }

      function updateActive(next: ActiveSession): void {
        persistActive(next);
        set({ activeSession: next });
      }

      return {
        user: DEFAULT_USER_STATE,
        activeSession: null,
        phase: 'idle',
        lastResult: null,
        selectedMinutes: DEFAULT_USER_STATE.settings.defaultMinutes,
        selectedGongfa: DEFAULT_USER_STATE.settings.gongfaList[0] ?? '',

        /**
         * 启动时的恢复逻辑（PRD 要求 B）：
         *   有活跃会话且未超时 → 直接回到计时界面
         *   已超过计划时长     → 判定为完成，结算并展示结算页
         *   无活跃会话         → 正常首页
         */
        bootstrap: () => {
          const now = Date.now();
          const user = refreshDaily(get().user, now);
          const settings = user.settings;

          set({
            user,
            selectedMinutes: clampMinutes(settings.defaultMinutes),
            selectedGongfa: settings.gongfaList[0] ?? '',
          });

          const saved = readJSON<ActiveSession>(storage, STORAGE_KEY_ACTIVE);
          if (
            !saved ||
            typeof saved.startedAt !== 'number' ||
            typeof saved.plannedMinutes !== 'number'
          ) {
            persistActive(null);
            set({ phase: 'idle', activeSession: null });
            return;
          }

          // 补齐可能缺失的字段，防止旧数据或手改数据把计时算崩。
          const restored: ActiveSession = {
            id: typeof saved.id === 'string' ? saved.id : crypto.randomUUID(),
            startedAt: saved.startedAt,
            plannedMinutes: saved.plannedMinutes,
            gongfa: typeof saved.gongfa === 'string' ? saved.gongfa : '',
            pausedTotalMs: Number.isFinite(saved.pausedTotalMs)
              ? saved.pausedTotalMs
              : 0,
            pauseStartedAt:
              typeof saved.pauseStartedAt === 'number'
                ? saved.pauseStartedAt
                : null,
            distractionCount: Number.isFinite(saved.distractionCount)
              ? saved.distractionCount
              : 0,
            // 上次是在后台被关掉的，重开时已经回到前台，不留悬空的 hiddenAt。
            hiddenAt: null,
          };

          set({
            activeSession: restored,
            selectedMinutes: clampMinutes(restored.plannedMinutes),
            selectedGongfa: restored.gongfa || (settings.gongfaList[0] ?? ''),
          });

          if (isFinished(restored, now)) {
            endSession('completed');
          } else {
            persistActive(restored);
            set({ phase: 'running' });
          }
        },

        setSelectedMinutes: (minutes) =>
          set({ selectedMinutes: clampMinutes(minutes) }),

        setSelectedGongfa: (gongfa) => set({ selectedGongfa: gongfa }),

        start: (minutes, gongfa) => {
          const state = get();
          const planned = clampMinutes(minutes ?? state.selectedMinutes);
          const chosen =
            gongfa ??
            state.selectedGongfa ??
            state.user.settings.gongfaList[0] ??
            '';

          const session = createActiveSession({
            id: crypto.randomUUID(),
            startedAt: Date.now(),
            plannedMinutes: planned,
            gongfa: chosen,
          });

          persistActive(session);
          set({
            activeSession: session,
            phase: 'running',
            lastResult: null,
            selectedMinutes: planned,
            selectedGongfa: chosen,
          });
        },

        pause: () => {
          const { activeSession } = get();
          if (!activeSession || activeSession.pauseStartedAt !== null) return;
          updateActive(pauseSession(activeSession, Date.now()));
        },

        resume: () => {
          const { activeSession } = get();
          if (!activeSession || activeSession.pauseStartedAt === null) return;
          updateActive(resumeSession(activeSession, Date.now()));
        },

        abandon: () => endSession('abandoned'),

        complete: () => {
          const { activeSession, phase } = get();
          if (!activeSession || phase !== 'running') return;
          if (!isFinished(activeSession, Date.now())) return;
          endSession('completed');
        },

        dismissResult: () => set({ phase: 'idle', lastResult: null }),

        handleHidden: () => {
          const { activeSession, phase } = get();
          if (!activeSession || phase !== 'running') return;
          updateActive(markHidden(activeSession, Date.now()));
        },

        handleVisible: () => {
          const { activeSession, phase, user } = get();
          if (!activeSession || phase !== 'running') return;

          const verdict = judgeReturn(
            activeSession,
            {
              graceSeconds: user.settings.graceSeconds,
              lenientMode: user.settings.lenientMode,
            },
            Date.now()
          );

          if (verdict.kind === 'fail') {
            // 结束时刻定在离开页面的那一刻：离开之后的时间不算专注。
            const leftAt = activeSession.hiddenAt ?? Date.now();
            set({ activeSession: { ...activeSession, hiddenAt: null } });
            endSession('failed', leftAt);
            return;
          }

          updateActive(applyVerdict(activeSession, verdict));
        },

        updateSettings: (patch) =>
          set((s) => ({
            user: { ...s.user, settings: { ...s.user.settings, ...patch } },
          })),

        addGongfa: (name) =>
          set((s) => {
            const trimmed = name.trim();
            const list = s.user.settings.gongfaList;
            if (
              trimmed === '' ||
              list.length >= MAX_GONGFA ||
              list.includes(trimmed)
            ) {
              return s;
            }
            return {
              user: {
                ...s.user,
                settings: { ...s.user.settings, gongfaList: [...list, trimmed] },
              },
            };
          }),

        renameGongfa: (index, name) =>
          set((s) => {
            const trimmed = name.trim();
            const list = s.user.settings.gongfaList;
            if (trimmed === '' || index < 0 || index >= list.length) return s;
            if (list.some((g, i) => i !== index && g === trimmed)) return s;

            const previous = list[index];
            const next = list.map((g, i) => (i === index ? trimmed : g));
            return {
              user: {
                ...s.user,
                settings: { ...s.user.settings, gongfaList: next },
              },
              selectedGongfa:
                s.selectedGongfa === previous ? trimmed : s.selectedGongfa,
            };
          }),

        // 删除功法只动设置，历史记录里的功法名保留不动（不做级联删除）。
        removeGongfa: (index) =>
          set((s) => {
            const list = s.user.settings.gongfaList;
            if (index < 0 || index >= list.length || list.length <= 1) return s;
            const next = list.filter((_, i) => i !== index);
            return {
              user: {
                ...s.user,
                settings: { ...s.user.settings, gongfaList: next },
              },
              selectedGongfa:
                s.selectedGongfa === list[index]
                  ? (next[0] ?? '')
                  : s.selectedGongfa,
            };
          }),

        addPreset: (minutes) =>
          set((s) => {
            const value = clampMinutes(minutes);
            const presets = s.user.settings.customPresets;
            if (presets.includes(value) || presets.length >= MAX_PRESETS) {
              return s;
            }
            return {
              user: {
                ...s.user,
                settings: {
                  ...s.user.settings,
                  customPresets: [...presets, value].sort((a, b) => a - b),
                },
              },
            };
          }),

        removePreset: (minutes) =>
          set((s) => {
            const presets = s.user.settings.customPresets;
            if (presets.length <= 1) return s;
            return {
              user: {
                ...s.user,
                settings: {
                  ...s.user.settings,
                  customPresets: presets.filter((m) => m !== minutes),
                },
              },
            };
          }),

        exportJSON: () => JSON.stringify(get().user, null, 2),

        importJSON: (text) => {
          const check = parseImport(text);
          if (!check.ok) return check.reason;

          persistActive(null);
          set({
            user: check.state,
            activeSession: null,
            phase: 'idle',
            lastResult: null,
            selectedMinutes: clampMinutes(check.state.settings.defaultMinutes),
            selectedGongfa: check.state.settings.gongfaList[0] ?? '',
          });
          return 'ok';
        },

        resetAll: () => {
          persistActive(null);
          storage.remove(STORAGE_KEY_STATE);
          const fresh = sanitizeUserState(null);
          set({
            user: fresh,
            activeSession: null,
            phase: 'idle',
            lastResult: null,
            selectedMinutes: fresh.settings.defaultMinutes,
            selectedGongfa: fresh.settings.gongfaList[0] ?? '',
          });
        },
      };
    },
    {
      name: STORAGE_KEY_STATE,
      storage: persistStorage,
      version: SCHEMA_VERSION,
      // 只持久化 user；活跃会话走自己的 key，其余是瞬时 UI 状态。
      partialize: (state) => ({ user: state.user }),
      migrate: (persisted, version) => ({
        user: runMigrations(
          (persisted as { user?: unknown } | null)?.user ?? null,
          version
        ),
      }),
      merge: (persisted, current) => ({
        ...current,
        user: sanitizeUserState(
          (persisted as { user?: unknown } | null)?.user ?? null
        ),
      }),
    }
  )
);

// localStorage 是同步的，persist 在 create 返回时已完成 rehydrate，
// 此处立刻恢复活跃会话，保证首帧就是正确的界面，不会闪一下首页。
useStore.getState().bootstrap();
