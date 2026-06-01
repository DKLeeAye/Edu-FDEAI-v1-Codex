# Open Design 第二轮第 3 轮：阶段二方案定义链路

## 目标

以 `docs/prototypes/open-design-vnext/screens/07-solution-guide.html` 和 `07-solution-definition.html` 为视觉基准，将阶段二导学与方案工作台复刻到 Next.js 学生端，并保留真实阶段二后端能力。

## 范围

- 阶段二导学页使用 Open Design `solution-guide-page` 结构。
- 阶段二工作台使用 Open Design `solution-workbench-page`、章节导航、报告章节、证据区和撰写区结构。
- 六个 Open Design 报告章节继续映射到现有九个后端小节。
- 保留草稿保存、小节 AI 检查、章节确认、正式文档汇总、文档级评审和阶段完成门禁。

## 验证

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run test:stage-two`
- `git diff --check`
- 截图对照：
  - `/private/tmp/edufde-v2-round3-ref-solution-guide.png`
  - `/private/tmp/edufde-v2-round3-prod-solution-guide.png`
  - `/private/tmp/edufde-v2-round3-ref-solution-definition.png`
  - `/private/tmp/edufde-v2-round3-prod-solution-definition.png`

## 已知差异

生产端使用真实 demo 数据。当前本地 demo 阶段二已完成，因此生产工作台顶部按钮显示 `阶段二已完成`，而静态原型为空白训练态。
