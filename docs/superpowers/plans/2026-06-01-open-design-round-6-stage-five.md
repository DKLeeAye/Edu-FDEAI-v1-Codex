# Open Design 第二轮第 6 轮：阶段五交付验收链路

## 目标

以 Open Design `10-*` 页面为视觉基准，将阶段五交付说明文档和交付验收确认迁移到 Next.js 学生端，同时保留交付文档、运维说明、验收包、AI Gateway 交付审阅和项目完成能力。

## 本轮已覆盖

- `10-delivery-document.html`：已迁移 `solution-workbench-page delivery-doc-page` 外壳、顶部导航、交付文档 Hero、文档完成度、阶段三/阶段四输入证据和章节工作区承载。
- `10-delivery-acceptance.html`：已迁移 `agent-guide-page delivery-page` 外壳、顶部导航、验收 Hero、交付对象、交付包、文档确认、模拟验收、最终结论和准备度侧栏。
- 继续保留现有阶段五后端能力：交付说明 Artifact、运维说明 Artifact、验收包 Artifact、AI Gateway 交付审阅、项目完成和最终档案袋证据。

## 验证

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run test:stage-five`
- `git diff --check`
- 截图对照：
  - `/private/tmp/edufde-v2-round6-ref-delivery-document.png`
  - `/private/tmp/edufde-v2-round6-prod-delivery-document.png`
  - `/private/tmp/edufde-v2-round6-ref-delivery-acceptance.png`
  - `/private/tmp/edufde-v2-round6-prod-delivery-acceptance.png`

## 已知差异

- 当前 demo 项目已完成阶段五，因此交付文档页显示 `6/6`，验收页显示项目已完成、交付包已勾选和历史测试对象；静态原型为未保存/待验收训练态。
- 交付文档页左侧浮动章节目录仍使用生产前端章节卡承载，未完全复刻静态原型 `doc-nav-rail` 的收起/固定交互。
- 生产前端内部输入框、Artifact 摘要、AI 审阅和最终完成按钮保留真实业务控件，后续像素级精修可继续细化内部组件。
