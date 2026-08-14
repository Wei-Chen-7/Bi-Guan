import { useEffect } from 'react';

import { useStore } from '../store/useStore';

/**
 * 中断检测（PRD 要求 C）。
 *
 * 只在闭关进行中挂监听。转入 hidden 记录时刻，转回 visible 交给 store 判定。
 *
 * 另外监听 pagehide / pageshow，但**只认 persisted 为真的那一对**：
 * iOS Safari 切走应用时未必触发 visibilitychange，却会把页面存进 bfcache。
 * 而普通的刷新与跳转同样会触发 pagehide/pageshow，那不是「切走页面」，
 * 若一并当作离开处理，刷新一次就会平白记上一笔心神游离。
 */
export function useVisibility(): void {
  const phase = useStore((s) => s.phase);
  const handleHidden = useStore((s) => s.handleHidden);
  const handleVisible = useStore((s) => s.handleVisible);

  useEffect(() => {
    if (phase !== 'running') return;

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        handleHidden();
      } else {
        handleVisible();
      }
    };

    const onPageHide = (event: PageTransitionEvent) => {
      if (event.persisted) handleHidden();
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) handleVisible();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);

    // 挂载时若已经处于后台（例如恢复会话的瞬间），先记下时刻。
    if (document.visibilityState === 'hidden') handleHidden();

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [phase, handleHidden, handleVisible]);
}
