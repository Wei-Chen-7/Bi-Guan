/**
 * schemaVersion 迁移。
 *
 * V1 只搭框架：目前唯一的版本就是 1，migrate 仅做字段补齐与清洗。
 * 将来新增字段时，在 MIGRATIONS 里追加 `[from]: (state) => next` 即可，
 * runMigrations 会按版本号依次套用。
 */

import {
  DEFAULT_SETTINGS,
  DEFAULT_USER_STATE,
  SCHEMA_VERSION,
} from '../constants/defaults';
import type { AmbientSound, Session, Settings, UserState } from '../types';

type AnyRecord = Record<string, unknown>;

/** 逐版本迁移函数：把 from 版的数据升到 from+1 版。 */
const MIGRATIONS: Record<number, (state: AnyRecord) => AnyRecord> = {
  // 1 → 2 的迁移在这里追加。
};

function num(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function str(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback;
}

const AMBIENTS: readonly AmbientSound[] = ['none', 'rain', 'wind', 'stream'];

function sanitizeSettings(input: unknown): Settings {
  const raw = (input ?? {}) as AnyRecord;
  const ambient = raw['ambientSound'];
  const presets = Array.isArray(raw['customPresets'])
    ? (raw['customPresets'] as unknown[])
        .filter((n): n is number => typeof n === 'number' && n > 0)
        .map((n) => Math.round(n))
    : DEFAULT_SETTINGS.customPresets;
  const gongfa = Array.isArray(raw['gongfaList'])
    ? (raw['gongfaList'] as unknown[])
        .filter((g): g is string => typeof g === 'string' && g.trim() !== '')
        .map((g) => g.trim())
    : DEFAULT_SETTINGS.gongfaList;

  return {
    defaultMinutes: num(raw['defaultMinutes'], DEFAULT_SETTINGS.defaultMinutes),
    customPresets:
      presets.length > 0 ? presets : [...DEFAULT_SETTINGS.customPresets],
    lenientMode: bool(raw['lenientMode'], DEFAULT_SETTINGS.lenientMode),
    graceSeconds: num(raw['graceSeconds'], DEFAULT_SETTINGS.graceSeconds),
    soundEnabled: bool(raw['soundEnabled'], DEFAULT_SETTINGS.soundEnabled),
    ambientSound: AMBIENTS.includes(ambient as AmbientSound)
      ? (ambient as AmbientSound)
      : DEFAULT_SETTINGS.ambientSound,
    keepAwake: bool(raw['keepAwake'], DEFAULT_SETTINGS.keepAwake),
    gongfaList:
      gongfa.length > 0 ? gongfa : [...DEFAULT_SETTINGS.gongfaList],
  };
}

function sanitizeSession(input: unknown): Session | null {
  const raw = (input ?? {}) as AnyRecord;
  const id = raw['id'];
  const startedAt = raw['startedAt'];
  if (typeof id !== 'string' || typeof startedAt !== 'number') return null;

  const status = raw['status'];
  return {
    id,
    startedAt,
    endedAt: num(raw['endedAt'], startedAt),
    plannedMinutes: num(raw['plannedMinutes'], 0),
    actualMinutes: num(raw['actualMinutes'], 0),
    status:
      status === 'completed' || status === 'failed' || status === 'abandoned'
        ? status
        : 'abandoned',
    gongfa: str(raw['gongfa'], ''),
    gainedE: num(raw['gainedE'], 0),
    durationMultiplier: num(raw['durationMultiplier'], 1),
    streakBonus: num(raw['streakBonus'], 0),
    distractionCount: num(raw['distractionCount'], 0),
  };
}

/** 把任意来源的数据（旧版本、导入的 JSON）清洗成合法的 UserState。 */
export function sanitizeUserState(input: unknown): UserState {
  const raw = (input ?? {}) as AnyRecord;
  const sessions = Array.isArray(raw['sessions'])
    ? (raw['sessions'] as unknown[])
        .map(sanitizeSession)
        .filter((s): s is Session => s !== null)
        // 修行录一律倒序（最新在前）。
        .sort((a, b) => b.startedAt - a.startedAt)
    : [];

  const demonMarkUntil = raw['demonMarkUntil'];

  return {
    schemaVersion: SCHEMA_VERSION,
    // 累计修为只增不减，负数一律视作 0。
    totalE: Math.max(0, num(raw['totalE'], DEFAULT_USER_STATE.totalE)),
    streakDays: Math.max(0, num(raw['streakDays'], 0)),
    lastCompletedDate: str(raw['lastCompletedDate'], ''),
    demonMarkUntil:
      typeof demonMarkUntil === 'number' && Number.isFinite(demonMarkUntil)
        ? demonMarkUntil
        : null,
    todayFailCount: Math.max(0, num(raw['todayFailCount'], 0)),
    todayFailDate: str(raw['todayFailDate'], ''),
    sessions,
    settings: sanitizeSettings(raw['settings']),
  };
}

/**
 * 按版本号依次套用迁移，最后统一清洗。
 * 版本高于当前程序（用户降级了）时不动数据，只做清洗。
 */
export function runMigrations(
  persisted: unknown,
  fromVersion: number
): UserState {
  let state = (persisted ?? {}) as AnyRecord;
  let version = Number.isFinite(fromVersion) ? fromVersion : SCHEMA_VERSION;

  while (version < SCHEMA_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) break;
    state = step(state);
    version += 1;
  }

  return sanitizeUserState(state);
}

/** 导入文件的校验结果。 */
export type ImportCheck =
  | { ok: true; state: UserState }
  | { ok: false; reason: 'parse' | 'version' };

/**
 * 校验并解析导入的 JSON（PRD 5.4：校验 schemaVersion 后覆盖）。
 */
export function parseImport(text: string): ImportCheck {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, reason: 'parse' };
  }

  if (typeof parsed !== 'object' || parsed === null) {
    return { ok: false, reason: 'parse' };
  }

  const raw = parsed as AnyRecord;
  const version = raw['schemaVersion'];
  if (typeof version !== 'number' || !Number.isFinite(version)) {
    return { ok: false, reason: 'version' };
  }
  if (version > SCHEMA_VERSION) {
    // 来自更高版本的数据，本程序不认识，拒绝导入以免丢字段。
    return { ok: false, reason: 'version' };
  }

  return { ok: true, state: runMigrations(raw, version) };
}
