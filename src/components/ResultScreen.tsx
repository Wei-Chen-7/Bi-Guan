import { useEffect } from 'react';

import { playChime, playThud } from '../audio/synth';
import { COPY, UI, fill } from '../constants/copy';
import { realmColor } from '../constants/theme';
import { estimateGain, realmProgress } from '../engine/cultivation';
import { effectiveStreak } from '../engine/streak';
import { splitMinutesSeconds } from '../engine/timer';
import { useStore } from '../store/useStore';
import type { SettlementResult } from '../types';
import { toLocalDateString } from '../utils/date';
import {
  formatE,
  formatMultiplier,
  formatPercent,
  signed,
} from '../utils/format';

interface Props {
  result: SettlementResult;
}

/** 闭关页 · 结算状态。 */
export function ResultScreen({ result }: Props) {
  const user = useStore((s) => s.user);
  const dismiss = useStore((s) => s.dismissResult);
  const start = useStore((s) => s.start);
  const soundEnabled = user.settings.soundEnabled;

  const { session, breakdown, demonTriggered } = result;
  const completed = session.status === 'completed';

  const { current } = realmProgress(user.totalE);
  const color = realmColor(current?.realm ?? null);

  useEffect(() => {
    if (!soundEnabled) return;
    if (completed) playChime();
    else playThud();
  }, [completed, soundEnabled]);

  const headline = completed
    ? COPY.sessionCompleted
    : session.status === 'failed'
      ? COPY.sessionFailed
      : COPY.sessionAbandoned;

  const restart = () => start(session.plannedMinutes, session.gongfa);

  return (
    <div className="flex flex-1 flex-col justify-center px-5 pb-28 pt-14 animate-fade-in">
      <div className="text-center">
        <h2
          className="font-serif text-2xl leading-relaxed tracking-[0.15em]"
          style={{ color: completed ? color : '#B94A3D' }}
        >
          {headline}
        </h2>
        <p className="mt-2 text-[11px] tracking-[0.3em] text-mist">
          {session.gongfa}
        </p>
      </div>

      {completed ? (
        <CompletedDetail breakdown={breakdown} color={color} />
      ) : (
        <FailedDetail result={result} />
      )}

      {/* 触发心魔的追加提示 */}
      {demonTriggered && (
        <p
          className="mx-auto mt-8 max-w-xs text-center font-serif text-[13px] leading-7 text-cinnabar/85"
          role="status"
        >
          {COPY.demonTriggered}
        </p>
      )}

      <div className="mt-12 flex gap-3">
        <button type="button" onClick={dismiss} className="btn flex-1">
          {UI.backHome}
        </button>
        <button type="button" onClick={restart} className="btn-primary flex-1">
          {completed ? UI.continueSession : UI.retrySession}
        </button>
      </div>
    </div>
  );
}

/** 圆满：逐行列出修为收益明细。 */
function CompletedDetail({
  breakdown,
  color,
}: {
  breakdown: SettlementResult['breakdown'];
  color: string;
}) {
  const rows: Array<{ label: string; value: string }> = [
    { label: UI.resultBase, value: formatE(breakdown.baseE) },
  ];

  if (breakdown.durationBonusE !== 0) {
    rows.push({
      label: fill(UI.resultDuration, {
        x: formatMultiplier(breakdown.durationMultiplier),
      }),
      value: signed(breakdown.durationBonusE),
    });
  }

  if (breakdown.streakBonusE !== 0) {
    rows.push({
      label: fill(UI.resultStreak, {
        x: formatPercent(breakdown.streakBonus),
      }),
      value: signed(breakdown.streakBonusE),
    });
  }

  if (breakdown.demonPenaltyE !== 0) {
    rows.push({
      label: fill(UI.resultDemon, {
        x: formatMultiplier(breakdown.demonMultiplier),
      }),
      value: signed(breakdown.demonPenaltyE),
    });
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-[17rem]">
      <dl className="space-y-3 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between">
            <dt className="text-mist">{row.label}</dt>
            <dd className="tnum text-cloud/85">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="hairline my-4" />

      <div className="flex items-baseline justify-between">
        <span className="text-sm text-mist">{UI.resultTotal}</span>
        <span
          className="tnum font-serif text-3xl"
          style={{ color, textShadow: `0 0 18px ${color}55` }}
        >
          {formatE(breakdown.totalE)}
        </span>
      </div>
    </div>
  );
}

/** 渡劫失败 / 主动散功：显示坚持了多久、本可得多少。 */
function FailedDetail({ result }: { result: SettlementResult }) {
  const user = useStore((s) => s.user);
  const { session } = result;
  const { minutes, seconds } = splitMinutesSeconds(
    session.actualMinutes * 60_000
  );

  // 本可得：按当时的道心与心魔状态跑满全程的收益。
  const forfeited = estimateGain({
    actualMinutes: session.plannedMinutes,
    plannedMinutes: session.plannedMinutes,
    streakDays: effectiveStreak(user, toLocalDateString(session.endedAt)),
    demonMarkUntil: user.demonMarkUntil,
    now: session.endedAt,
  });

  return (
    <p className="tnum mt-10 text-center text-sm leading-8 text-mist">
      {fill(UI.resultHeldFor, {
        m: minutes,
        s: seconds,
        n: formatE(forfeited),
      })}
    </p>
  );
}
