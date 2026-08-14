import { useState } from 'react';

import { UI } from '../constants/copy';
import { formatDateLabel } from '../utils/format';

export interface BarDatum {
  date: string; // YYYY-MM-DD
  minutes: number;
}

interface Props {
  data: readonly BarDatum[];
  color: string;
}

const HEIGHT = 96;
const GAP = 2;

/**
 * 近 30 天每日专注分钟的柱状图。纯手写 SVG，不引入图表库。
 * 柱子按值高低用主题色深浅区分，悬停显示日期与分钟数。
 */
export function BarChart({ data, color }: Props) {
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(...data.map((d) => d.minutes), 1);
  const count = Math.max(1, data.length);
  // 用百分比布局，图表随容器宽度自适应，移动端不会横向溢出。
  const slot = 100 / count;
  const barWidth = Math.max(0.5, slot - GAP * (100 / 375));

  const active = hovered !== null ? data[hovered] : undefined;
  const hasData = data.some((d) => d.minutes > 0);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between">
        <p className="label">{UI.chartTitle}</p>
        {active ? (
          <p className="tnum text-[11px] text-cloud/80">
            {formatDateLabel(active.date)} · {Math.round(active.minutes)}{' '}
            {UI.minutesUnit}
          </p>
        ) : (
          !hasData && <p className="text-[11px] text-mist">{UI.chartEmpty}</p>
        )}
      </div>

      <svg
        viewBox={`0 0 100 ${HEIGHT}`}
        preserveAspectRatio="none"
        className="block h-24 w-full"
        role="img"
        aria-label={UI.chartTitle}
        onMouseLeave={() => setHovered(null)}
      >
        {/* 基线 */}
        <line
          x1="0"
          y1={HEIGHT - 0.5}
          x2="100"
          y2={HEIGHT - 0.5}
          stroke="#E8E4D9"
          strokeOpacity="0.12"
          strokeWidth="0.5"
        />

        {data.map((d, i) => {
          const ratio = d.minutes / max;
          // 有记录的日子至少给 2px，免得看不见。
          const h = d.minutes > 0 ? Math.max(2, ratio * (HEIGHT - 6)) : 0;
          const x = i * slot;
          // 深浅按当日值占峰值的比例，越高越亮。
          const opacity = d.minutes > 0 ? 0.35 + ratio * 0.65 : 0;

          return (
            <g key={d.date}>
              {/* 透明热区，方便触摸与悬停 */}
              <rect
                x={x}
                y={0}
                width={slot}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onFocus={() => setHovered(i)}
              >
                <title>{`${formatDateLabel(d.date)} · ${Math.round(
                  d.minutes
                )} ${UI.minutesUnit}`}</title>
              </rect>
              {h > 0 && (
                <rect
                  x={x}
                  y={HEIGHT - h}
                  width={barWidth}
                  height={h}
                  fill={color}
                  opacity={hovered === i ? 1 : opacity}
                  className="transition-opacity duration-200"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
