import { useEffect } from 'react';

/**
 * 闭关期间保持屏幕常亮（Screen Wake Lock API）。
 * 不支持的浏览器静默降级，不提示、不报错。
 */

interface WakeLockSentinelLike {
  release: () => Promise<void>;
  addEventListener: (type: 'release', listener: () => void) => void;
}

interface WakeLockLike {
  request: (type: 'screen') => Promise<WakeLockSentinelLike>;
}

function getWakeLock(): WakeLockLike | null {
  if (typeof navigator === 'undefined') return null;
  const nav = navigator as Navigator & { wakeLock?: WakeLockLike };
  return nav.wakeLock ?? null;
}

export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;

    const wakeLock = getWakeLock();
    if (!wakeLock) return;

    let sentinel: WakeLockSentinelLike | null = null;
    let cancelled = false;

    const acquire = async () => {
      try {
        const next = await wakeLock.request('screen');
        if (cancelled) {
          void next.release().catch(() => undefined);
          return;
        }
        sentinel = next;
      } catch {
        // 电量低、无权限、标签页不可见等都会拒绝，静默降级。
      }
    };

    // 从后台切回来时锁会自动释放，需要重新申请。
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !cancelled) {
        void acquire();
      }
    };

    void acquire();
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (sentinel) void sentinel.release().catch(() => undefined);
    };
  }, [enabled]);
}
