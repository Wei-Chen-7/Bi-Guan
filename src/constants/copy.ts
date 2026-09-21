/**
 * 全部文案集中于此，组件内不得硬编码中文字符串（术语见 PRD 1.3）。
 */

/** 简单占位符插值：`{n}` / `{x}` / `{realm}`。 */
export function fill(
  template: string,
  vars: Record<string, string | number>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = vars[key];
    return value === undefined ? match : String(value);
  });
}

/** 状态文案（PRD 6.2）。 */
export const COPY = {
  appName: '闭关',
  appTagline: '把专注化作修行',

  emptyState: '尘世喧嚣，道友何不入洞天一坐',
  sessionStart: '静心凝神，闭关开始',
  sessionCompleted: '闭关圆满',
  sessionFailed: '心神动摇，此次闭关作废',
  sessionAbandoned: '提前出关，此番作罢',
  demonTriggered: '三次心神失守，已生心魔。一日之内，修为难进。',
  paused: '暂作调息',
  streakBonus: '道心稳固 {n} 日，修行加成 +{x}%',
} as const;

/** 通用突破文案。 */
export const BREAKTHROUGH_GENERIC = '修为精进，境界已至 {realm}';

/**
 * 跨大境界时的专属长文案，key 为境界全名。
 * 未列出的小境界使用 BREAKTHROUGH_GENERIC。
 */
export const BREAKTHROUGH_SPECIAL: Record<string, string> = {
  炼气一层: '一缕灵气入体，你自此踏上仙途。',
  筑基初期: '灵气化液，根基已成。凡俗之门，就此关上。',
  金丹初期: '真元凝结成丹，丹光内蕴。你已不是当年的散修了。',
  元婴初期: '金丹破碎，元婴出窍。一念之间，神游天外。',
  化神初期: '元婴化神，与天地气机相合。此境之上，已少有人至。',
};

/** 凡人态（totalE < 25）。 */
export const MORTAL = {
  realmName: '凡人',
  title: '未入道',
} as const;

/** 界面标签。 */
export const UI = {
  // 导航
  navFocus: '闭关',
  navRecords: '修行录',
  navSettings: '设置',

  // 闭关页 · 待机
  startSession: '入定闭关',
  duration: '闭关时长',
  durationCustom: '自定义',
  minutesUnit: '分钟',
  gongfa: '功法',
  gongfaAdd: '新增功法',
  nextRealm: '距 {realm} 还差 {n} 修为',
  realmMaxed: '大道已至尽头，再无门槛可越',
  progressLabel: '{current} / {threshold}',
  daoxinDays: '道心 {n} 日',

  // 心魔
  demonBannerTitle: '心魔缠身',
  demonBannerDetail: '修为获取大减，{time} 后自行消解',

  // 闭关页 · 计时
  pause: '暂停调息',
  resume: '继续闭关',
  abandon: '散功出关',
  abandonConfirmTitle: '当真要散功出关？',
  abandonConfirmBody: '此番闭关作废，不得修为。',
  abandonConfirmYes: '散功',
  abandonConfirmNo: '再坐一会',
  expectedGain: '预计得修为 {n}',
  distractionNote: '心神游离 {n} 次',

  // 结算
  resultBase: '基础修为',
  resultDuration: '时长加成 ×{x}',
  resultStreak: '道心加成 +{x}%',
  resultDemon: '心魔减益 ×{x}',
  resultTotal: '共得修为',
  resultHeldFor: '坚持了 {m} 分 {s} 秒，本可得 {n} 修为',
  continueSession: '继续闭关',
  retrySession: '重新入定',
  backHome: '返回',

  // 突破
  breakthroughLabel: '突破',

  // 修行录
  statTotalE: '累计修为',
  statTotalHours: '累计闭关',
  statSessionCount: '闭关次数',
  statCompletionRate: '圆满率',
  statStreak: '当前道心',
  statLongestStreak: '最长道心',
  hoursUnit: '小时',
  timesUnit: '次',
  daysUnit: '日',
  chartTitle: '近三十日',
  chartEmpty: '尚无闭关记录',
  gongfaDistribution: '功法分布',
  recordsTitle: '修行录',
  recordsEmpty: '修行录空空如也',
  loadMore: '再看一些',
  todayLabel: '今日',
  yesterdayLabel: '昨日',

  // 设置
  settingsTitle: '设置',
  groupSession: '闭关',
  groupJudge: '判定',
  groupSound: '声音',
  groupGongfa: '功法',
  groupData: '数据',
  groupAbout: '关于',

  defaultMinutes: '默认时长',
  presets: '常用时长',
  presetsHint: '点击可删，最多六个',
  presetAdd: '添加',
  lenientMode: '宽松模式',
  lenientModeHint: '开启后切走页面永不判失败，只记心神游离次数',
  graceSeconds: '宽限期',
  graceSecondsHint: '离开页面不超过此时长不判失败',
  secondsUnit: '秒',
  keepAwake: '保持屏幕常亮',
  keepAwakeHint: '闭关期间不息屏，部分浏览器不支持',
  soundEnabled: '提示音',
  soundEnabledHint: '突破与出关时的钟磬声',
  ambientSound: '环境音',
  gongfaHint: '最多十二个，删除不影响既往记录',
  gongfaNamePlaceholder: '功法名',
  gongfaAddConfirm: '确认新增功法',
  presetAddConfirm: '确认添加时长',
  remove: '删除',

  dataExport: '导出修行录',
  dataExportHint: '下载完整 JSON 备份',
  dataImport: '导入修行录',
  dataImportHint: '从 JSON 恢复，将覆盖当前全部数据',
  dataImportConfirm: '导入将覆盖当前全部修行数据，确定继续？',
  dataImportBadFile: '文件无法解析，导入未执行',
  dataImportBadVersion: '数据版本不符，导入未执行',
  dataImportOk: '修行录已还原',
  dataReset: '重开一世',
  dataResetHint: '清空全部数据，不可挽回',
  dataResetPrompt: '输入「重开一世」四字以确认',
  dataResetKeyword: '重开一世',
  confirm: '确认',
  cancel: '取消',

  aboutVersion: '版本',
  aboutBody:
    '闭关是一枚离线的专注计时器。全部数据只存在本机浏览器中，不上传、不联网、无账号。',
  aboutStorage: '数据存储于本机 localStorage',
} as const;

/** 会话状态标签。 */
export const STATUS_LABEL: Record<string, string> = {
  completed: '圆满',
  failed: '渡劫失败',
  abandoned: '散功',
};

/** 环境音名称。 */
export const AMBIENT_LABEL: Record<string, string> = {
  none: '无',
  rain: '雨声',
  wind: '风声',
  stream: '溪流',
};
