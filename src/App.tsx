import { CircleDot, ScrollText, Settings2 } from 'lucide-react';
import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes, useLocation } from 'react-router-dom';

import { unlockAudio } from './audio/synth';
import { UI } from './constants/copy';
import { realmColor } from './constants/theme';
import { realmProgress } from './engine/cultivation';
import { Focus } from './pages/Focus';
import { Records } from './pages/Records';
import { Settings } from './pages/Settings';
import { useStore } from './store/useStore';

const NAV = [
  { to: '/', label: UI.navFocus, Icon: CircleDot },
  { to: '/records', label: UI.navRecords, Icon: ScrollText },
  { to: '/settings', label: UI.navSettings, Icon: Settings2 },
] as const;

export default function App() {
  const phase = useStore((s) => s.phase);
  const totalE = useStore((s) => s.user.totalE);
  const { current } = realmProgress(totalE);
  const color = realmColor(current?.realm ?? null);
  const location = useLocation();

  // 闭关计时中全屏沉浸，隐藏所有导航。
  const immersive = phase === 'running' && location.pathname === '/';

  // 首次交互时解锁 AudioContext，之后突破钟声才响得出来。
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);

  return (
    <div
      className="min-h-full"
      style={{ ['--realm-color' as string]: color }}
    >
      {/* 桌面端主内容区最大宽度居中，不拉满全屏 */}
      <main className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
        <Routes>
          <Route path="/" element={<Focus />} />
          <Route path="/records" element={<Records />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!immersive && (
        <nav
          className="fixed inset-x-0 bottom-0 z-30 border-t border-cloud/10
                     bg-ink-bg/92 backdrop-blur-sm
                     pb-[env(safe-area-inset-bottom)]"
        >
          <ul className="mx-auto flex w-full max-w-md">
            {NAV.map(({ to, label, Icon }) => (
              <li key={to} className="flex-1">
                <NavLink
                  to={to}
                  end={to === '/'}
                  className="flex flex-col items-center gap-1 py-2.5 transition-colors duration-200"
                  style={({ isActive }) => ({
                    color: isActive ? color : '#8A9691',
                  })}
                >
                  <Icon size={17} strokeWidth={1.5} />
                  <span className="text-[10px] tracking-widest">{label}</span>
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </div>
  );
}
