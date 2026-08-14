import { MORTAL, UI, fill } from '../constants/copy';
import { realmColor } from '../constants/theme';
import { realmProgress } from '../engine/cultivation';
import { formatE } from '../utils/format';

interface Props {
  totalE: number;
  /** 紧凑模式用于修行录页顶部。 */
  compact?: boolean;
}

/**
 * 境界大字 + 称号 + 进度条。
 * 凡人态（totalE < 25）显示「凡人 / 未入道」，进度条指向炼气一层。
 */
export function RealmDisplay({ totalE, compact = false }: Props) {
  const { current, next, ratio, remaining, floorThreshold } =
    realmProgress(totalE);
  const color = realmColor(current?.realm ?? null);

  const name = current?.fullName ?? MORTAL.realmName;
  const title = current?.title ?? MORTAL.title;

  return (
    <div className="text-center">
      <h1
        className={`font-serif tracking-[0.18em] ${
          compact ? 'text-2xl' : 'text-4xl'
        }`}
        style={{ color }}
      >
        {name}
      </h1>
      <p className="mt-1.5 text-xs tracking-[0.3em] text-mist">{title}</p>

      <div className={compact ? 'mt-4' : 'mt-6'}>
        {/* 进度槽 */}
        <div
          className="h-px w-full overflow-hidden bg-cloud/12"
          role="progressbar"
          aria-valuemin={floorThreshold}
          aria-valuemax={next?.threshold ?? totalE}
          aria-valuenow={totalE}
        >
          <div
            className="h-full transition-[width] duration-500 ease-out"
            style={{
              width: `${ratio * 100}%`,
              backgroundColor: color,
              boxShadow: `0 0 6px ${color}`,
            }}
          />
        </div>

        <div className="mt-2 flex items-baseline justify-between text-[11px] text-mist">
          <span className="tnum">
            {fill(UI.progressLabel, {
              current: formatE(totalE),
              threshold: next ? formatE(next.threshold) : '—',
            })}
          </span>
          <span>
            {next
              ? fill(UI.nextRealm, {
                  realm: next.fullName,
                  n: formatE(remaining),
                })
              : UI.realmMaxed}
          </span>
        </div>
      </div>
    </div>
  );
}
