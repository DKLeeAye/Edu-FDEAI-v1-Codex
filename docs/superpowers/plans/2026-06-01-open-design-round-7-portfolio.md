# Open Design 第二轮第 7 轮：项目档案袋与能力报告

## 目标

以 Open Design `12-portfolio-report.html` 为视觉基准，将学生端项目档案袋切换到 Open Design `portfolio-page` 外壳，汇总五阶段 Artifact、交付材料、学习画像和最终项目状态。

## 本轮已覆盖

- `12-portfolio-report.html`：已迁移项目档案袋 Open Design 顶栏、Hero、最终状态卡、主工作区和侧栏承载。
- 已将项目档案袋从旧 `AppShell` 包裹释放为 immersive 页面，避免旧侧栏和旧顶部栏继续覆盖 Open Design 视觉。
- 继续保留现有项目档案袋真实数据：五阶段 Artifact 汇总、交付材料摘要、学习画像摘要、阶段跳转和刷新同步。

## 验证

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `git diff --check`
- 截图对照：
  - `/private/tmp/edufde-v2-round7-ref-portfolio-report.png`
  - `/private/tmp/edufde-v2-round7-prod-portfolio-report.png`

## 已知差异

- 生产页使用真实 demo 项目数据，显示项目已完成、14 项证据和真实交付材料摘要；静态原型为本地脚本未同步状态。
- 生产页主体仍使用现有 Artifact 阶段卡和学习画像组件承载，未完全复刻静态原型中的能力画像六宫格、导出归档包和弹窗报告交互。
- 第 7 轮暂未细化 `11-ai-review-rubric.html`、教师侧和管理侧旧状态页面，这些进入第 8 轮临时实现与最终验收。
