# 闭关

把番茄工作法包装成修仙：每一次专注就是一次「闭关」，累计专注时长决定你的修为境界。

纯前端、无后端、可离线运行。全部数据只存在浏览器本地，不上传、不联网、无账号。

## 运行

```bash
npm install
npm run dev      # 开发
npm run build    # 构建（先跑 tsc 严格模式检查）
npm run preview  # 预览产物
npm run test     # 引擎层单元测试
```

## 名词对照

| 通用概念 | 本应用叫法 |
|---|---|
| 一次专注 | 闭关 |
| 中途放弃 | 渡劫失败 |
| 经验值 | 修为 |
| 等级 / 等级提升 | 境界 / 突破 |
| 任务标签 | 功法 |
| 连续天数 | 道心 |
| 中断惩罚 | 走火入魔 |
| 历史记录 | 修行录 |

## 技术栈

Vite · React 18 · TypeScript（`strict`）· Tailwind CSS · Zustand（`persist`）·
Framer Motion · localStorage · vite-plugin-pwa · lucide-react

无 UI 组件库、无图表库、无音频与图片素材：图表是手写 SVG，钟磬声与环境音由
Web Audio 实时合成，宣纸噪点与图标由内联 SVG 生成。

## 三条硬性技术约束

**计时基于时间戳，不累加 `setInterval`。** 浏览器在后台会节流定时器，累加计数
必然走偏。`setInterval` 只以 200ms 触发重渲染，剩余时间一律由
`Date.now() - startedAt - pausedTotalMs` 反算（`src/engine/timer.ts`）。

**进行中的会话独立持久化，刷新与崩溃可恢复。** 活跃会话存在
`biguan.activeSession.v1`，与主状态分开。启动时按时间戳判断：未超时则回到计时
界面，已超过计划时长则判定为完成并结算，结束时刻定在计划走满的那一刻而非重开
的时刻。

**中断判定走 Page Visibility API，带宽限期。** 离开超过宽限期（默认 15 秒）判
渡劫失败，宽限期内只累加 `distractionCount`。暂停调息期间切走不判失败。开启
宽松模式后永不判失败。`pagehide` / `pageshow` 只在 `persisted` 为真时才当作切
走，否则一次普通刷新就会被误记成心神游离。

## 修为公式

```
ΔE = floor( t × m(T) × (1 + b(n)) × d )
```

- `t` 实际专注分钟数
- `m(T)` 时长系数，按计划时长取：≤30 → 1.00；30–60 → 1.15；>60 → 1.30
- `b(n)` 道心加成 = `min(0.5, 0.02 × 连续天数)`
- `d` 心魔减益：心魔期间 0.8，否则 1.0

渡劫失败与主动散功 ΔE = 0。**累计修为只增不减，不做跌境**，惩罚只体现为失去
本次收益。

取整前先在 1e-9 精度上归整：直接 `floor` 会因二进制浮点吃掉一点修为
（`50 × 1.15 × 1.2` 在浮点下等于 `68.999…`，正确答案是 69）。

## 目录结构

```
src/
  constants/   境界表、文案、配色、默认值
  types/       全部类型定义
  store/       Zustand + StorageAdapter 抽象 + schemaVersion 迁移
  engine/      修为计算、计时、中断判定、道心与心魔
  components/  界面组件
  pages/       闭关 / 修行录 / 设置
  hooks/       useTimer / useVisibility / useWakeLock
  audio/       Web Audio 合成
  utils/       本地时区日期、格式化
```

`engine/` 下全部是纯函数：不 import React、不读写 localStorage、不自取
`Date.now()`（时刻一律由调用方传入），可脱离 UI 单独测试。修为计算与境界判定
的正确性是这个产品的命根子，`src/engine/engine.test.ts` 覆盖了 41 个用例。

## 数据

- `biguan.state.v1` — 主状态（Zustand persist）
- `biguan.activeSession.v1` — 进行中的会话

store 的读写全部经过 `StorageAdapter`（`src/store/storage.ts`），V1 的实现是
localStorage，将来接云同步只需替换实现。设置页可导出 / 导入完整 JSON，导入前
校验 `schemaVersion`。

## 题材说明

只使用修仙题材的通用公共设定——炼气、筑基、金丹、元婴、化神，初期到圆满，
修为、闭关、突破、渡劫、心魔、道心、宗门职衔等，这些词汇在整个类型文学中广泛
共用。不含任何具体作品的名称、角色名或独创专有名词，美术资源一律由 CSS/SVG
自制。
