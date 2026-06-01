# Open Design 第二轮第 5 轮：阶段四智能体实现与测试链路

## 目标

以 Open Design `09-*` 阶段四页面为视觉基准，将智能体实现导学、Dify 入门、正式搭建工作台和测试评分页迁移到 Next.js 学生端，同时保留现有阶段四实现记录、测试报告、AI Gateway 评审和阶段完成门禁。

## 本轮已覆盖

- `09-agent-guide.html`：已迁移阶段四 Open Design 顶栏、4 步流程导航、导学 Hero、模块关系图、学习门禁与阶段三输入卡片。
- `09-dify-onboarding.html`：已迁移 Dify 入门顶栏、流程导航、Hero、概念卡片、8 步操作记录和平台完整性门禁。
- `09-agent-build-test.html`：已迁移正式搭建工作台顶栏、流程导航、Hero、目标构建路径、知识库/Chatflow 构建步骤和保存门禁。
- `09-agent-test-score.html`：已迁移测试评分顶栏、流程导航、Hero、测试对象、测试集、结果区、评分侧栏、AI 测试反馈和阶段完成门禁。
- 继续保留现有阶段四后端能力：Dify 实现 Artifact、测试报告 Artifact、AI Gateway 测试反馈、Rubric/门禁、阶段四完成并解锁阶段五。

## 验证

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- `cd frontend && npm run test:stage-four`
- `git diff --check`
- 截图对照：
  - `/private/tmp/edufde-v2-round5-ref-agent-guide.png`
  - `/private/tmp/edufde-v2-round5-prod-agent-guide.png`
  - `/private/tmp/edufde-v2-round5-ref-dify-onboarding.png`
  - `/private/tmp/edufde-v2-round5-prod-dify-onboarding.png`
  - `/private/tmp/edufde-v2-round5-ref-agent-build-test.png`
  - `/private/tmp/edufde-v2-round5-prod-agent-build-test.png`
  - `/private/tmp/edufde-v2-round5-ref-agent-test-score.png`
  - `/private/tmp/edufde-v2-round5-prod-agent-test-score.png`

## 已知差异

- 当前 demo 数据已完成阶段四，因此生产前端顶部显示 `已完成`，测试页会预填历史构建记录；静态原型为可操作空白态。
- 生产前端内部表单、保存按钮、Artifact 摘要和 AI 反馈仍保留真实业务控件，未完全照搬静态原型的本地脚本态 DOM。
- 本轮先消除了旧实验详情页/旧工作台外壳，后续如继续提高像素级一致性，应逐页细化 `StepEditor`、`BuildStep`、`ScoreCard`、`QualityGateCard` 等内部组件的 Open Design class。
