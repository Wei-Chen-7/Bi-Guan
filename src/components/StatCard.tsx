interface Props {
  label: string;
  value: string;
  unit?: string;
  accent?: string;
}

/** 统计卡片：无阴影，1px 低对比度边框。 */
export function StatCard({ label, value, unit, accent }: Props) {
  return (
    <div className="card px-3 py-3.5">
      <p className="text-[11px] tracking-wide text-mist">{label}</p>
      <p className="mt-1.5 flex items-baseline gap-1">
        <span
          className="tnum font-serif text-xl"
          style={{ color: accent ?? '#E8E4D9' }}
        >
          {value}
        </span>
        {unit && <span className="text-[11px] text-mist">{unit}</span>}
      </p>
    </div>
  );
}
