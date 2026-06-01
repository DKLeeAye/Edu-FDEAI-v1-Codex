# Open Design 第二轮第 8 轮：AI Rubric、教师端与管理端旧状态临时实现

## 目标

以 Open Design `11-ai-review-rubric.html`、`01-teacher-dashboard.html`、`02-course-setup.html`、`03-experiment-library.html`、`04-class-monitor.html` 和 `13-admin-deployment.html` 为第 8 轮基准，为教师/管理员登录后的正式入口提供 Open Design 旧状态承载页，并保留 AI Gateway、Rubric、Artifact、教师最终确认权和权限边界。

## 本轮已覆盖

- 新增 `frontend/src/components/vnext-ops/operations-dashboard.tsx`，复用 Open Design 通用 `shell / sidebar / topbar / metric / panel / layout / rubric / evidence / workflow` 视觉体系承载教师端和管理端旧状态页面。
- 教师登录后不再进入“正式页面待开放”占位页，正式入口改为：
  - 教师工作台
  - 课程配置
  - 实验包库
  - 课中监控
  - AI 评审与 Rubric
- 管理员登录后不再进入“正式页面待开放”占位页，正式入口改为：
  - 实验包库
  - 租户、License 与部署管理
- 教师工作台、课中监控和 AI Rubric 页面接入现有真实教师进度 API：
  - `GET /api/v1/teacher/progress/courses`
  - `GET /api/v1/teacher/progress/sessions/{session_id}/stages/{stage_key}/artifacts`
- AI Rubric 页面以阶段 Artifact 中的 review 类产物、Rubric 快照、风险建议和证据条目作为生产数据来源；接受 AI 建议、覆盖评分目前只进入前端入口提示，不伪造后端写入。
- 修改 `frontend/app/page.tsx`，非学生角色登录后直接进入第 8 轮 Open Design 运营入口，不再跳转旧 `/dev-workbench` 占位说明。

## 验证

- `cd frontend && npm run typecheck`
- `cd frontend && npm run lint`
- 浏览器截图对照：
  - `/private/tmp/edufde-v2-round8-ref-ai-review-rubric.png`
  - `/private/tmp/edufde-v2-round8-prod-ai-review-rubric.png`
  - `/private/tmp/edufde-v2-round8-ref-teacher-dashboard.png`
  - `/private/tmp/edufde-v2-round8-prod-teacher-dashboard.png`
  - `/private/tmp/edufde-v2-round8-ref-admin-deployment.png`
  - `/private/tmp/edufde-v2-round8-prod-admin-deployment.png`

## 已知差异

- 第 8 轮原型中的教师端和管理端本身仍属于旧状态页面，本轮目标是临时实现与正式入口承载，不代表教师批改、正式评分、课程成员模型、License 生成、运维授权等后端闭环已完成。
- 教师 AI 确认和覆盖评分按钮当前只提供产品入口提示；正式写入 AI 评分草稿、教师覆盖原因和审计日志仍需后续后端切片。
- 课程配置、实验包库和管理部署页仍以静态治理数据为主，只在可用位置接入当前课程/Session 真实数据；正式内容资产、实验包版本管理和 License 模型后续独立推进。
- 内置 Browser 插件可打开页面并等待文本，但当前会话截图接口超时；第 8 轮截图验收改用本地 Chrome CDP 脚本完成。
