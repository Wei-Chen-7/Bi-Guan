interface Props {
  /** 进度 0..1。 */
  ratio: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  children?: React.ReactNode;
}

/**
 * 倒计时外围的圆环进度，用 SVG stroke-dasharray 实现。
 * 从十二点方向顺时针推进。
 */
export function ProgressRing({
  ratio,
  color,
  size = 280,
  strokeWidth = 1.5,
  children,
}: Props) {
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(1, Math.max(0, ratio));
  const dash = circumference * clamped;

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden="true"
      >
        {/* 底环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-cloud/10"
        />
        {/* 进度环 */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference - dash}`}
          style={{
            transition: 'stroke-dasharray 300ms linear',
            filter: `drop-shadow(0 0 4px ${color})`,
          }}
        />
      </svg>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
