import { useState } from 'react';

import { COPY, UI, fill } from '../constants/copy';
import {
  MAX_MINUTES,
  MIN_MINUTES,
} from '../constants/defaults';
import { realmColor } from '../constants/theme';
import { isDemonActive, realmProgress, streakBonus } from '../engine/cultivation';
import { effectiveStreak } from '../engine/streak';
import { useStore } from '../store/useStore';
import { formatPercent, formatRoughDuration } from '../utils/format';
import { toLocalDateString } from '../utils/date';
import { GongfaPicker } from './GongfaPicker';
import { RealmDisplay } from './RealmDisplay';

/** 闭关页 · 待机状态。 */
export function IdleScreen() {
  const user = useStore((s) => s.user);
  const selectedMinutes = useStore((s) => s.selectedMinutes);
  const selectedGongfa = useStore((s) => s.selectedGongfa);
  const setSelectedMinutes = useStore((s) => s.setSelectedMinutes);
  const setSelectedGongfa = useStore((s) => s.setSelectedGongfa);
  const addGongfa = useStore((s) => s.addGongfa);
  const start = useStore((s) => s.start);

  const [customOpen, setCustomOpen] = useState(false);

  const now = Date.now();
  const { current } = realmProgress(user.totalE);
  const color = realmColor(current?.realm ?? null);

  const streak = effectiveStreak(user, toLocalDateString(now));
  const demon = isDemonActive(user.demonMarkUntil, now);
  const presets = user.settings.customPresets;
  const isPreset = presets.includes(selectedMinutes);

  return (
    <div className="flex flex-1 flex-col px-5 pb-28 pt-10">
      <RealmDisplay totalE={user.totalE} />

      {/* 道心 */}
      {streak > 0 && (
        <p className="mt-5 text-center text-[11px] tracking-wide text-mist">
          {fill(COPY.streakBonus, {
            n: streak,
            x: formatPercent(streakBonus(streak)),
          })}
        </p>
      )}

      {/* 心魔提示条 */}
      {demon && user.demonMarkUntil !== null && (
        <div
          className="mt-5 rounded-md border px-4 py-2.5 text-center animate-fade-in"
          style={{
            borderColor: '#B94A3D55',
            backgroundColor: '#B94A3D14',
          }}
          role="status"
        >
          <p className="font-serif text-sm tracking-widest text-cinnabar">
            {UI.demonBannerTitle}
          </p>
          <p className="mt-1 text-[11px] text-cinnabar/70">
            {fill(UI.demonBannerDetail, {
              time: formatRoughDuration(user.demonMarkUntil - now),
            })}
          </p>
        </div>
      )}

      {/* 空状态 */}
      {user.sessions.length === 0 && (
        <p className="mt-10 text-center font-serif text-sm leading-8 text-mist">
          {COPY.emptyState}
        </p>
      )}

      <div className="mt-auto space-y-7 pt-12">
        {/* 时长选择 */}
        <div>
          <p className="label mb-2">{UI.duration}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((minutes) => {
              const active = !customOpen && selectedMinutes === minutes;
              return (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => {
                    setCustomOpen(false);
                    setSelectedMinutes(minutes);
                  }}
                  className={`chip tnum ${active ? '' : 'chip-off'}`}
                  style={
                    active
                      ? {
                          borderColor: color,
                          color: '#E8E4D9',
                          backgroundColor: `${color}1F`,
                        }
                      : undefined
                  }
                  aria-pressed={active}
                >
                  {minutes}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setCustomOpen((v) => !v)}
              className={`chip ${customOpen || !isPreset ? '' : 'chip-off'}`}
              style={
                customOpen || !isPreset
                  ? {
                      borderColor: color,
                      color: '#E8E4D9',
                      backgroundColor: `${color}1F`,
                    }
                  : undefined
              }
              aria-expanded={customOpen}
            >
              {UI.durationCustom}
            </button>
          </div>

          {(customOpen || !isPreset) && (
            <div className="mt-4 animate-rise-in">
              <div className="flex items-baseline justify-between">
                <span className="label">{UI.durationCustom}</span>
                <span className="tnum text-sm text-cloud/80">
                  {selectedMinutes} {UI.minutesUnit}
                </span>
              </div>
              <input
                type="range"
                min={MIN_MINUTES}
                max={MAX_MINUTES}
                step={5}
                value={selectedMinutes}
                onChange={(e) => setSelectedMinutes(Number(e.target.value))}
                className="mt-2 w-full accent-current"
                style={{ accentColor: color }}
                aria-label={UI.durationCustom}
              />
            </div>
          )}
        </div>

        {/* 功法选择 */}
        <GongfaPicker
          list={user.settings.gongfaList}
          selected={selectedGongfa}
          color={color}
          onSelect={setSelectedGongfa}
          onAdd={addGongfa}
        />

        {/* 主按钮 */}
        <button
          type="button"
          onClick={() => start()}
          className="btn-primary w-full"
        >
          {UI.startSession}
        </button>
      </div>
    </div>
  );
}
