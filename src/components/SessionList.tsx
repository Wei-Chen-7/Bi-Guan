import { Check, Circle } from 'lucide-react';
import { useMemo, useState } from 'react';

import { STATUS_LABEL, UI } from '../constants/copy';
import { SESSION_PAGE_SIZE } from '../constants/defaults';
import type { Session } from '../types';
import { toLocalDateString } from '../utils/date';
import { formatDateLabel, formatMinutes, formatTime } from '../utils/format';

interface Props {
  sessions: readonly Session[];
  color: string;
}

/** 手绘裂纹图标，用于渡劫失败的记录。 */
function CrackIcon({ size = 13 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6.6 0.8 4.4 4.9l3 1.1-2.6 5.2" />
      <path d="M7.4 6 9.6 4.4" />
      <path d="M4.4 4.9 1.9 3.9" />
    </svg>
  );
}

interface DateGroup {
  date: string;
  items: Session[];
}

/** 按本地日期倒序分组，一次最多渲染 SESSION_PAGE_SIZE 条。 */
function groupByDate(sessions: readonly Session[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let currentGroup: DateGroup | null = null;

  for (const session of sessions) {
    const date = toLocalDateString(session.startedAt);
    if (!currentGroup || currentGroup.date !== date) {
      currentGroup = { date, items: [] };
      groups.push(currentGroup);
    }
    currentGroup.items.push(session);
  }
  return groups;
}

export function SessionList({ sessions, color }: Props) {
  const [limit, setLimit] = useState(SESSION_PAGE_SIZE);

  const visible = useMemo(
    () => sessions.slice(0, limit),
    [sessions, limit]
  );
  const groups = useMemo(() => groupByDate(visible), [visible]);

  const today = toLocalDateString();
  const yesterday = toLocalDateString(Date.now() - 86_400_000);

  const dateLabel = (date: string) => {
    if (date === today) return UI.todayLabel;
    if (date === yesterday) return UI.yesterdayLabel;
    return formatDateLabel(date);
  };

  if (sessions.length === 0) {
    return (
      <p className="py-10 text-center font-serif text-sm text-mist">
        {UI.recordsEmpty}
      </p>
    );
  }

  return (
    <div>
      {groups.map((group) => (
        <section key={group.date} className="mb-6">
          <h3 className="mb-2 text-[11px] tracking-[0.2em] text-mist">
            {dateLabel(group.date)}
          </h3>

          <ul className="space-y-px">
            {group.items.map((session) => {
              const failed = session.status === 'failed';
              const completed = session.status === 'completed';

              return (
                <li
                  key={session.id}
                  className={`flex items-center gap-3 border-b border-cloud/6 py-2.5 last:border-0 ${
                    failed ? 'opacity-45' : ''
                  }`}
                >
                  <span
                    className="shrink-0"
                    style={{ color: completed ? color : '#B94A3D' }}
                    title={STATUS_LABEL[session.status]}
                  >
                    {completed ? (
                      <Check size={13} />
                    ) : failed ? (
                      <CrackIcon />
                    ) : (
                      <Circle size={11} />
                    )}
                  </span>

                  <span className="tnum w-11 shrink-0 text-[11px] text-mist">
                    {formatTime(session.startedAt)}
                  </span>

                  <span className="min-w-0 flex-1 truncate text-[13px] text-cloud/80">
                    {session.gongfa}
                  </span>

                  <span className="tnum w-16 shrink-0 text-right text-[11px] text-mist">
                    {formatMinutes(session.actualMinutes)} {UI.minutesUnit}
                  </span>

                  <span
                    className="tnum w-11 shrink-0 text-right text-[13px]"
                    style={{
                      color: session.gainedE > 0 ? '#C9A227' : '#8A9691',
                    }}
                  >
                    {session.gainedE > 0 ? `+${session.gainedE}` : '—'}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}

      {limit < sessions.length && (
        <button
          type="button"
          onClick={() => setLimit((n) => n + SESSION_PAGE_SIZE)}
          className="btn mx-auto mt-2 block"
        >
          {UI.loadMore}
        </button>
      )}
    </div>
  );
}
