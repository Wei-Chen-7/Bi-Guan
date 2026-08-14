import { AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

import { BreakthroughOverlay } from '../components/BreakthroughOverlay';
import { IdleScreen } from '../components/IdleScreen';
import { ResultScreen } from '../components/ResultScreen';
import { TimerScreen } from '../components/TimerScreen';
import { realmColor } from '../constants/theme';
import { realmProgress } from '../engine/cultivation';
import { useVisibility } from '../hooks/useVisibility';
import { useStore } from '../store/useStore';
import type { Stage } from '../types';

/**
 * 闭关页（首页）。
 * 待机 / 计时 / 结算三态，突破动画先于结算页播放。
 */
export function Focus() {
  const phase = useStore((s) => s.phase);
  const lastResult = useStore((s) => s.lastResult);
  const totalE = useStore((s) => s.user.totalE);
  const soundEnabled = useStore((s) => s.user.settings.soundEnabled);

  const [pending, setPending] = useState<readonly Stage[]>([]);
  const [playedFor, setPlayedFor] = useState<string | null>(null);

  useVisibility();

  // 有突破就先播动画，播完再露出结算页。每次结算只播一次。
  useEffect(() => {
    if (phase !== 'result' || !lastResult) return;
    if (playedFor === lastResult.session.id) return;

    setPlayedFor(lastResult.session.id);
    setPending(
      lastResult.breakthroughs.length > 0 ? lastResult.breakthroughs : []
    );
  }, [phase, lastResult, playedFor]);

  const { current } = realmProgress(totalE);
  const color = realmColor(current?.realm ?? null);
  const showingBreakthrough = pending.length > 0;

  return (
    <div
      className="flex flex-1 flex-col"
      style={{ ['--realm-color' as string]: color }}
    >
      {phase === 'running' && <TimerScreen />}

      {phase === 'idle' && <IdleScreen />}

      {phase === 'result' && lastResult && !showingBreakthrough && (
        <ResultScreen result={lastResult} />
      )}

      <AnimatePresence>
        {showingBreakthrough && (
          <BreakthroughOverlay
            stages={pending}
            soundEnabled={soundEnabled}
            onDone={() => setPending([])}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
