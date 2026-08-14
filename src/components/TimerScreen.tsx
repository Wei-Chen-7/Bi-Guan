import { useEffect, useState } from 'react';

import { playAmbient, stopAmbient } from '../audio/synth';
import { COPY, UI, fill } from '../constants/copy';
import { realmColor } from '../constants/theme';
import { estimateGain, realmProgress } from '../engine/cultivation';
import { effectiveStreak } from '../engine/streak';
import {
  formatClock,
  isPaused as isPausedFn,
  progressRatio,
  remainingMs,
  toActualMinutes,
  elapsedMs,
} from '../engine/timer';
import { useTimer } from '../hooks/useTimer';
import { useWakeLock } from '../hooks/useWakeLock';
import { useStore } from '../store/useStore';
import { toLocalDateString } from '../utils/date';
import { formatE } from '../utils/format';
import { ProgressRing } from './ProgressRing';

/** 闭关页 · 计时状态。全屏沉浸，隐藏导航。 */
export function TimerScreen() {
  const session = useStore((s) => s.activeSession);
  const user = useStore((s) => s.user);
  const pause = useStore((s) => s.pause);
  const resume = useStore((s) => s.resume);
  const abandon = useStore((s) => s.abandon);

  const now = useTimer();
  const [confirming, setConfirming] = useState(false);

  useWakeLock(user.settings.keepAwake && session !== null);

  // 环境音只在闭关期间响。
  const ambient = user.settings.ambientSound;
  useEffect(() => {
    if (!session) return;
    playAmbient(ambient);
    return () => stopAmbient();
  }, [ambient, session]);

  if (!session) return null;

  const paused = isPausedFn(session);
  const { current } = realmProgress(user.totalE);
  const color = realmColor(current?.realm ?? null);
  const ratio = progressRatio(session, now);
  const streak = effectiveStreak(user, toLocalDateString(now));

  // 底部提示的预计收益按「跑满全程」算，让人看得见目标。
  const projectedE = estimateGain({
    actualMinutes: session.plannedMinutes,
    plannedMinutes: session.plannedMinutes,
    streakDays: streak,
    demonMarkUntil: user.demonMarkUntil,
    now,
  });

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 py-12"
      style={{ ['--realm-color' as string]: color }}
    >
      {/* 背景呼吸辉光：8 秒一个周期 */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[130vmin] w-[130vmin]
                   -translate-x-1/2 -translate-y-1/2 rounded-full animate-breathe"
        style={{
          background: `radial-gradient(circle, ${color}30 0%, ${color}0F 38%, transparent 68%)`,
          animationPlayState: paused ? 'paused' : 'running',
        }}
        aria-hidden="true"
      />

      <ProgressRing ratio={ratio} color={color} size={286}>
        <div className="text-center">
          <p
            className="tnum font-sans text-6xl font-light tracking-tight text-cloud"
            aria-live="off"
          >
            {formatClock(remainingMs(session, now))}
          </p>
          <p className="mt-3 text-[11px] tracking-[0.4em] text-mist">
            {paused ? COPY.paused : COPY.sessionStart}
          </p>
        </div>
      </ProgressRing>

      {/* 底部信息 */}
      <div className="relative z-10 mt-10 text-center">
        <p className="text-sm tracking-[0.2em]" style={{ color }}>
          {session.gongfa}
        </p>
        <p className="tnum mt-2 text-[11px] text-mist">
          {fill(UI.expectedGain, { n: formatE(projectedE) })}
        </p>
        {session.distractionCount > 0 && (
          <p className="tnum mt-1.5 text-[11px] text-cinnabar/70">
            {fill(UI.distractionNote, { n: session.distractionCount })}
          </p>
        )}
      </div>

      {/* 次要按钮 */}
      <div className="relative z-10 mt-12 flex gap-3">
        <button
          type="button"
          onClick={paused ? resume : pause}
          className="btn min-w-[7.5rem]"
        >
          {paused ? UI.resume : UI.pause}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="btn min-w-[7.5rem] hover:border-cinnabar/50 hover:text-cinnabar"
        >
          {UI.abandon}
        </button>
      </div>

      {/* 散功二次确认 */}
      {confirming && (
        <div
          className="fixed inset-0 z-40 grid place-items-center bg-ink-bg/85 px-8 animate-fade-in"
          role="alertdialog"
          aria-modal="true"
          aria-label={UI.abandonConfirmTitle}
        >
          <div className="card w-full max-w-xs text-center">
            <p className="font-serif text-base tracking-wide text-cloud">
              {UI.abandonConfirmTitle}
            </p>
            <p className="mt-2 text-xs leading-6 text-mist">
              {UI.abandonConfirmBody}
            </p>
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="btn flex-1"
              >
                {UI.abandonConfirmNo}
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirming(false);
                  abandon();
                }}
                className="btn flex-1 border-cinnabar/40 text-cinnabar
                           hover:border-cinnabar hover:text-cinnabar"
              >
                {UI.abandonConfirmYes}
              </button>
            </div>
            <p className="tnum mt-4 text-[11px] text-mist/70">
              {toActualMinutes(elapsedMs(session, now))} {UI.minutesUnit}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
