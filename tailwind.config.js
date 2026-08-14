/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // 主色板
        ink: {
          bg: '#14211F', // 墨底 — 主背景
          deep: '#0C1614', // 墨深 — 卡片、次级背景
        },
        cloud: '#E8E4D9', // 云白 — 主文字
        mist: '#8A9691', // 雾灰 — 次级文字
        cinnabar: '#B94A3D', // 朱砂 — 强调、警示、渡劫失败
        gilt: '#C9A227', // 鎏金 — 突破、修为数值、成就
        // 各大境界主题辅色
        realm: {
          lianqi: '#6B8E7A', // 青苔绿
          zhuji: '#4A7C8C', // 远山青
          jindan: '#C9A227', // 鎏金
          yuanying: '#7B5EA7', // 紫气
          huashen: '#B94A3D', // 丹霞赤
        },
      },
      fontFamily: {
        serif: ['"Noto Serif SC"', 'Songti SC', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', '-apple-system', 'system-ui', 'sans-serif'],
      },
      // 水墨风需要大量极低对比度的边框与文字，补齐默认没有的透明度档位。
      opacity: {
        6: '0.06',
        8: '0.08',
        12: '0.12',
        15: '0.15',
        35: '0.35',
        45: '0.45',
        55: '0.55',
        65: '0.65',
        85: '0.85',
        92: '0.92',
      },
      borderRadius: {
        DEFAULT: '0.125rem',
      },
      transitionDuration: {
        DEFAULT: '250ms',
      },
      keyframes: {
        breathe: {
          '0%, 100%': { opacity: '0.25', transform: 'scale(1)' },
          '50%': { opacity: '0.6', transform: 'scale(1.08)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(6px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        // 8 秒一个周期的呼吸辉光
        breathe: 'breathe 8s ease-in-out infinite',
        'fade-in': 'fade-in 300ms ease-out both',
        'rise-in': 'rise-in 300ms ease-out both',
      },
    },
  },
  plugins: [],
};
