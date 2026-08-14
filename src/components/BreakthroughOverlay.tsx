import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { playBell } from '../audio/synth';
import { UI } from '../constants/copy';
import { REALM_COLOR } from '../constants/theme';
import { isMajorBreakthrough } from '../engine/cultivation';
import type { Stage } from '../types';

interface Props {
  /** 本次跨过的全部境界，依次播放，不能只播最后一级。 */
  stages: readonly Stage[];
  soundEnabled: boolean;
  onDone: () => void;
}

/** 普通突破 2.8 秒，跨大境界 4 秒。 */
const NORMAL_MS = 2800;
const GRAND_MS = 4000;

/**
 * 突破动画：全屏覆盖层。
 *   1. 屏幕暗下，中心一点光晕由小放大   0.6s
 *   2. 光晕炸开，境界名从模糊到清晰浮现 0.8s
 *   3. 显示「突破 → 境界名」和新称号     1.0s
 *   4. 淡出                             0.4s
 * 跨大境界时光效更强、时长延长到 4 秒、附一段专属文案。
 */
export function BreakthroughOverlay({ stages, soundEnabled, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const stage = stages[index];

  // 每一级各占一个计时窗口，播完自动进入下一级。
  useEffect(() => {
    if (!stage) return;

    if (soundEnabled) playBell(isMajorBreakthrough(stage));

    const duration = isMajorBreakthrough(stage) ? GRAND_MS : NORMAL_MS;
    const id = window.setTimeout(() => {
      if (index + 1 < stages.length) {
        setIndex(index + 1);
      } else {
        onDone();
      }
    }, duration);

    return () => window.clearTimeout(id);
  }, [index, stage, stages.length, soundEnabled, onDone]);

  if (!stage) return null;

  const grand = isMajorBreakthrough(stage);
  const color = REALM_COLOR[stage.realm];
  const total = grand ? GRAND_MS : NORMAL_MS;
  const sec = (ms: number) => ms / 1000;

  return (
    <motion.div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-ink-bg px-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      role="alertdialog"
      aria-live="assertive"
      aria-label={`${UI.breakthroughLabel} ${stage.fullName}`}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.index}
          className="relative grid place-items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { duration: 0.25 } }}
        >
          {/* 1 + 2：光晕由小放大，随后炸开 */}
          <motion.div
            className="pointer-events-none absolute rounded-full"
            style={{
              width: grand ? 460 : 320,
              height: grand ? 460 : 320,
              background: `radial-gradient(circle, ${color}${
                grand ? 'CC' : '99'
              } 0%, ${color}22 42%, transparent 70%)`,
            }}
            initial={{ scale: 0.04, opacity: 0 }}
            animate={{
              scale: [0.04, 0.5, grand ? 2.6 : 1.9, grand ? 3.0 : 2.2],
              opacity: [0, 0.95, 0.55, 0],
            }}
            transition={{
              duration: sec(total) - 0.4,
              times: [0, 0.24, 0.55, 1],
              ease: 'easeOut',
            }}
          />

          {/* 跨大境界额外来一道扩散的光环 */}
          {grand && (
            <motion.div
              className="pointer-events-none absolute rounded-full border"
              style={{ width: 200, height: 200, borderColor: color }}
              initial={{ scale: 0.1, opacity: 0 }}
              animate={{ scale: [0.1, 3.4], opacity: [0, 0.7, 0] }}
              transition={{ duration: 1.6, delay: 0.55, ease: 'easeOut' }}
            />
          )}

          <div className="relative z-10 text-center">
            {/* 3：「突破 →」 */}
            <motion.p
              className="text-xs tracking-[0.55em] text-mist"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {UI.breakthroughLabel}
            </motion.p>

            {/* 境界名：从模糊到清晰 */}
            <motion.h2
              className="mt-3 font-serif tracking-[0.2em]"
              style={{
                // 光晕压在字后面而不是糊在字上，境界名必须一眼看清。
                color: '#E8E4D9',
                fontSize: grand ? '2.75rem' : '2.25rem',
                textShadow: `0 0 ${grand ? 26 : 16}px ${color}AA`,
              }}
              initial={{ opacity: 0, filter: 'blur(18px)', scale: 1.15 }}
              animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
              transition={{ delay: 0.62, duration: 0.8, ease: 'easeOut' }}
            >
              {stage.fullName}
            </motion.h2>

            {/* 新称号 */}
            <motion.p
              className="mt-3 text-sm tracking-[0.35em] text-cloud/70"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.4, duration: 0.6 }}
            >
              {stage.title}
            </motion.p>

            {/* 专属长文案 */}
            <motion.p
              className="mx-auto mt-7 max-w-xs font-serif text-[13px] leading-7 text-cloud/55"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: grand ? 1.75 : 1.5, duration: 0.7 }}
            >
              {stage.breakthroughText}
            </motion.p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* 多级连突时的进度点 */}
      {stages.length > 1 && (
        <div className="absolute bottom-12 flex gap-2">
          {stages.map((s, i) => (
            <span
              key={s.index}
              className="h-1 w-1 rounded-full transition-colors duration-300"
              style={{
                backgroundColor: i <= index ? color : '#8A969140',
              }}
            />
          ))}
        </div>
      )}
    </motion.div>
  );
}
