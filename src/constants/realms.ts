import type { RealmId, Stage } from '../types';
import { BREAKTHROUGH_GENERIC, BREAKTHROUGH_SPECIAL, fill } from './copy';

/**
 * 境界门槛表（PRD 附录 A）。
 *
 * 门槛以「每天 4 个番茄 = 100 修为」为基准用户校准，大境界之间的门槛比在
 * 2.6 到 2.9 倍。第一次 25 分钟闭关必然立刻突破到炼气一层，这是刻意设计的
 * 首次奖励，不要改动。
 */

/** [境界全名, 门槛] —— 与附录 A 逐行对应，便于核对。 */
const TABLE: ReadonlyArray<readonly [string, number]> = [
  ['炼气一层', 25],
  ['炼气二层', 75],
  ['炼气三层', 150],
  ['炼气四层', 250],
  ['炼气五层', 400],
  ['炼气六层', 600],
  ['炼气七层', 850],
  ['炼气八层', 1150],
  ['炼气九层', 1500],
  ['筑基初期', 2100],
  ['筑基中期', 2800],
  ['筑基后期', 3600],
  ['筑基圆满', 4500],
  ['金丹初期', 6000],
  ['金丹中期', 7800],
  ['金丹后期', 9900],
  ['金丹圆满', 12500],
  ['元婴初期', 16000],
  ['元婴中期', 20500],
  ['元婴后期', 26000],
  ['元婴圆满', 33000],
  ['化神初期', 42000],
  ['化神中期', 54000],
  ['化神后期', 68000],
  ['化神圆满', 85000],
];

const REALM_BY_NAME: Record<string, RealmId> = {
  炼气: 'lianqi',
  筑基: 'zhuji',
  金丹: 'jindan',
  元婴: 'yuanying',
  化神: 'huashen',
};

/** 称号表（PRD 6.2）。炼气按层数分三档，其余按大境界。 */
function titleFor(realm: RealmId, stageName: string): string {
  if (realm !== 'lianqi') {
    return {
      zhuji: '真传弟子',
      jindan: '执事',
      yuanying: '长老',
      huashen: '太上长老',
    }[realm];
  }
  const layer = '一二三四五六七八九'.indexOf(stageName[0] ?? '') + 1;
  if (layer <= 3) return '记名弟子';
  if (layer <= 6) return '外门弟子';
  return '内门弟子';
}

function buildStages(): Stage[] {
  return TABLE.map(([fullName, threshold], index) => {
    const realmName = fullName.slice(0, 2);
    const stageName = fullName.slice(2);
    const realm = REALM_BY_NAME[realmName];
    if (!realm) {
      throw new Error(`未知境界：${realmName}`);
    }
    return {
      index,
      realm,
      realmName,
      stageName,
      fullName,
      threshold,
      title: titleFor(realm, stageName),
      breakthroughText:
        BREAKTHROUGH_SPECIAL[fullName] ??
        fill(BREAKTHROUGH_GENERIC, { realm: fullName }),
    };
  });
}

export const STAGES: readonly Stage[] = buildStages();

/** 大境界的第一个小境界（跨大境界时动画更隆重）。 */
export const MAJOR_REALM_ENTRY_INDEXES: ReadonlySet<number> = new Set(
  STAGES.filter(
    (stage, i) => i === 0 || STAGES[i - 1]?.realm !== stage.realm
  ).map((stage) => stage.index)
);

/** 修为上限：最高境界门槛。 */
export const MAX_THRESHOLD = STAGES[STAGES.length - 1]?.threshold ?? 0;

/** 炼气一层的门槛，低于此值为凡人。 */
export const FIRST_THRESHOLD = STAGES[0]?.threshold ?? 25;
