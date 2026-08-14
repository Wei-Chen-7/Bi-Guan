import { useMemo } from 'react';

import { BarChart, type BarDatum } from '../components/BarChart';
import { RealmDisplay } from '../components/RealmDisplay';
import { SessionList } from '../components/SessionList';
import { StatCard } from '../components/StatCard';
import { UI } from '../constants/copy';
import { CHART_DAYS } from '../constants/defaults';
import { PALETTE, realmColor } from '../constants/theme';
import { realmProgress } from '../engine/cultivation';
import { computeLongestStreak, effectiveStreak } from '../engine/streak';
import { useStore } from '../store/useStore';
import { recentDates, toLocalDateString } from '../utils/date';
import { formatE, formatMinutes, minutesToHours } from '../utils/format';

/** 修行录页。 */
export function Records() {
  const user = useStore((s) => s.user);
  const sessions = user.sessions;

  const { current } = realmProgress(user.totalE);
  const color = realmColor(current?.realm ?? null);
  const today = toLocalDateString();

  const stats = useMemo(() => {
    let totalMinutes = 0;
    let completedCount = 0;

    for (const s of sessions) {
      // 累计时长只算真正专注的部分，失败的记录也计入实际坐了多久。
      totalMinutes += s.actualMinutes;
      if (s.status === 'completed') completedCount += 1;
    }

    return {
      totalMinutes,
      completedCount,
      completionRate:
        sessions.length === 0
          ? 0
          : Math.round((completedCount / sessions.length) * 100),
      longestStreak: computeLongestStreak(sessions),
    };
  }, [sessions]);

  // 近 30 天每日专注分钟。
  const chartData: BarDatum[] = useMemo(() => {
    const byDate = new Map<string, number>();
    for (const s of sessions) {
      const date = toLocalDateString(s.startedAt);
      byDate.set(date, (byDate.get(date) ?? 0) + s.actualMinutes);
    }
    return recentDates(CHART_DAYS, today).map((date) => ({
      date,
      minutes: byDate.get(date) ?? 0,
    }));
  }, [sessions, today]);

  // 功法分布：各功法累计时长占比。
  const gongfaShare = useMemo(() => {
    const byGongfa = new Map<string, number>();
    let sum = 0;
    for (const s of sessions) {
      if (s.actualMinutes <= 0) continue;
      const name = s.gongfa || '—';
      byGongfa.set(name, (byGongfa.get(name) ?? 0) + s.actualMinutes);
      sum += s.actualMinutes;
    }
    return [...byGongfa.entries()]
      .map(([name, minutes]) => ({
        name,
        minutes,
        ratio: sum > 0 ? minutes / sum : 0,
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [sessions]);

  const streak = effectiveStreak(user, today);

  return (
    <div className="px-5 pb-28 pt-10">
      <RealmDisplay totalE={user.totalE} compact />

      {/* 统计卡片区 */}
      <div className="mt-8 grid grid-cols-2 gap-2">
        <StatCard
          label={UI.statTotalE}
          value={formatE(user.totalE)}
          accent={PALETTE.gilt}
        />
        <StatCard
          label={UI.statTotalHours}
          value={minutesToHours(stats.totalMinutes)}
          unit={UI.hoursUnit}
        />
        <StatCard
          label={UI.statSessionCount}
          value={String(sessions.length)}
          unit={UI.timesUnit}
        />
        <StatCard
          label={UI.statCompletionRate}
          value={`${stats.completionRate}%`}
        />
        <StatCard
          label={UI.statStreak}
          value={String(streak)}
          unit={UI.daysUnit}
          accent={color}
        />
        <StatCard
          label={UI.statLongestStreak}
          value={String(stats.longestStreak)}
          unit={UI.daysUnit}
        />
      </div>

      {/* 图表区 */}
      <div className="mt-9">
        <BarChart data={chartData} color={color} />
      </div>

      {/* 功法分布 */}
      {gongfaShare.length > 0 && (
        <div className="mt-9">
          <p className="label mb-3">{UI.gongfaDistribution}</p>
          <ul className="space-y-2.5">
            {gongfaShare.map((item) => (
              <li key={item.name}>
                <div className="mb-1 flex items-baseline justify-between text-[11px]">
                  <span className="truncate text-cloud/75">{item.name}</span>
                  <span className="tnum shrink-0 pl-2 text-mist">
                    {formatMinutes(Math.round(item.minutes))} {UI.minutesUnit}
                  </span>
                </div>
                <div className="h-px w-full bg-cloud/10">
                  <div
                    className="h-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(1, item.ratio * 100)}%`,
                      backgroundColor: color,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 记录列表 */}
      <div className="mt-10">
        <p className="label mb-3">{UI.recordsTitle}</p>
        <SessionList sessions={sessions} color={color} />
      </div>
    </div>
  );
}
