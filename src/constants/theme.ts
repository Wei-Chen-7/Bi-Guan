import type { RealmId } from '../types';

/** 配色常量（PRD 6.1）。与 tailwind.config.js 中的自定义色保持一致。 */
export const PALETTE = {
  inkBg: '#14211F', // 墨底 — 主背景
  inkDeep: '#0C1614', // 墨深 — 卡片、次级背景
  cloud: '#E8E4D9', // 云白 — 主文字
  mist: '#8A9691', // 雾灰 — 次级文字
  cinnabar: '#B94A3D', // 朱砂 — 强调、警示、渡劫失败
  gilt: '#C9A227', // 鎏金 — 突破、修为数值、成就
} as const;

/** 各大境界的主题辅色，用于进度条、辉光、圆环。 */
export const REALM_COLOR: Record<RealmId, string> = {
  lianqi: '#6B8E7A', // 青苔绿
  zhuji: '#4A7C8C', // 远山青
  jindan: '#C9A227', // 鎏金
  yuanying: '#7B5EA7', // 紫气
  huashen: '#B94A3D', // 丹霞赤
};

/** 凡人态（尚未入道）用雾灰。 */
export const MORTAL_COLOR = PALETTE.mist;

/** 取某境界的主题色，凡人（null）回落到雾灰。 */
export function realmColor(realm: RealmId | null): string {
  return realm ? REALM_COLOR[realm] : MORTAL_COLOR;
}
