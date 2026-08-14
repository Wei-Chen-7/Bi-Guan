import { useEffect, useState } from 'react';

import { TICK_INTERVAL_MS } from '../constants/defaults';
import { isFinished } from '../engine/timer';
import { useStore } from '../store/useStore';

/**
 * 计时驱动。
 *
 * setInterval 只负责触发重渲染，一切数值都由时间戳反算（PRD 要求 A）。
 * 返回 now 供组件计算剩余时间，走满时自动结算。
 */
export function useTimer(): number {
  const activeSession = useStore((s) => s.activeSession);
  const phase = useStore((s) => s.phase);
  const complete = useStore((s) => s.complete);
  const [now, setNow] = useState(() => Date.now());

  const running = phase === 'running' && activeSession !== null;

  useEffect(() => {
    if (!running) return;

    // 挂载即对一次时，避免恢复会话后要等一个 tick 才刷新。
    setNow(Date.now());

    const id = window.setInterval(() => {
      setNow(Date.now());
    }, TICK_INTERVAL_MS);

    return () => window.clearInterval(id);
  }, [running]);

  useEffect(() => {
    if (!running || !activeSession) return;
    if (isFinished(activeSession, now)) {
      complete();
    }
  }, [running, activeSession, now, complete]);

  return now;
}
