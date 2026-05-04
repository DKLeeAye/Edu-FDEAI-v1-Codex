# MVP 收口审查记录

> 日期：2026-05-04  
> 范围：当前 MVP 演示准备审查，不新增业务功能，不做正式产品 UI 重构。

## 一、审查结论

当前 MVP 已具备本地演示所需的最小闭环：

- 学生可登录并基于 `MFG-QA-DEMO` 课程创建 / 进入 session。
- 学生可按阶段一至五顺序提交 Artifact、请求 fake AI 反馈并完成阶段流转。
- 阶段五完成后，experiment session 可进入 `completed` 状态。
- 学生可查看规则生成的基础学习画像。
- 教师可登录并查看自己创建课程下的学生 session 进度、阶段 Artifact 摘要和学习画像。
- 后端路由已注册当前 MVP 所需 API；阶段服务保持 AI Gateway 和 Artifact 边界。

本轮发现并修复两个演示和迭代风险：

- Demo seed 对已有演示用户不恢复默认密码和 active 状态，可能导致重复 seed 后仍无法登录。
- 通用 `/api/v1/experiment-sessions` 教师查询只按 tenant / institution 过滤，未收敛到自己创建的课程。

## 二、当前已完成范围

- 平台地基：FastAPI、Next.js、Docker 依赖服务、PostgreSQL、Redis、MinIO、Alembic。
- 数据地基：tenant、institution、user、course、experiment package/version、stage blueprint、session、stage record、Artifact、Rubric、yellow flag、AI call log。
- 认证：邮箱密码登录、JWT access token、当前用户上下文。
- 实验包：制造业质检 AI 智能体实验包 v1 和默认课程 `MFG-QA-DEMO`。
- 学生路径：阶段一 AI 客户、阶段二 AI 评审、阶段三知识工程决策评审、阶段四 Dify 路径记录与测试反馈、阶段五交付审阅。
- 教师路径：课程 session 进度、阶段 Artifact 摘要、学生学习画像。
- 学习画像：基于 stage record 和 Artifact 的只读即时规则画像。
- 文档：根 README、backend README、frontend README 已更新为当前演示启动说明。

## 三、当前非目标

- 正式学生端产品 UI。
- 正式教师后台 UI。
- 教师批改、Rubric 结构化评分、成绩和证书。
- 真实模型供应商接入。
- 真实 Dify API 接入或自动验收。
- 完整课程成员 / 助教 / 教研负责人权限模型。
- 真实知识库构建、embedding、chunking、向量库。
- 复杂部署、私有化、License 后台。

## 四、已知技术债

- 前端仍是单页联调工作台，`frontend/app/page.tsx` 负责大量流程编排。
- 前端直接使用 lightweight API client 和组件局部状态，尚未引入正式路由、React Query 或 Zustand 流程分层。
- 各阶段后端 service 存在相似的 scope 查询、Artifact 查找、Rubric 快照和状态推进逻辑，后续正式化时应抽出共享阶段运行服务。
- AI Gateway 当前为 deterministic fake provider，AI 反馈只适合演示链路验证，不代表真实教学质量。
- 学习画像当前只做即时规则计算，不持久化、不使用教师评分或 Rubric 分数。
- `yellow_flags` 已有最小模型地基，但当前五阶段联调页未形成可演示的黄灯债务链路。
- `course_members`、`project_portfolio`、`ai_reviews`、`learning_profiles` 等终局模型在文档中有要求，当前 MVP 只保留相关地基或用现有数据即时计算。

## 五、权限边界临时方案

- 学生只能创建和操作自己的 experiment session。
- 学生 Artifact 读写均限制在自己的 session。
- 阶段一至五业务 API 只允许 student 角色写入。
- 教师只读进度、Artifact 摘要和学习画像。
- 教师读取课程内学生数据暂以 `courses.created_by_user_id == current_user.id` 作为 MVP 边界。
- 通用 experiment session 查询也已收敛到教师自己创建的课程。
- 后续引入 `course_members` 后，必须替换所有 `created_by_user_id` 教师边界。

## 六、正式产品 UI 前需要重构

- 拆分学生端正式路由：登录、课程 / session 入口、五阶段工作区、学习画像。
- 拆分教师端正式路由：课程列表、班级进度、学生详情、Artifact / 画像查看。
- 将 `page.tsx` 的流程编排迁移到 feature hooks 或状态服务。
- 为阶段操作引入统一 loading / error / success 反馈模式。
- 将 Artifact 展示从 JSON 摘要升级为按 artifact type 渲染的可读视图。
- 重新设计阶段导航、完成条件提示、风险提示和演示脚本入口。
- 根据正式 UI 决定是否引入 React Query 缓存与 Zustand 跨页面状态。

## 七、后续优先级建议

1. 演示脚本：整理一份学生从 stage_1 到 completed、教师查看结果的固定演示步骤。
2. 正式学生端 UI：基于已验证 API 重做五阶段工作区，不新增真实模型或 Dify。
3. 正式教师后台 UI：基于教师进度 API 做课程 / 学生详情信息架构。
4. 教师批改与 Rubric 评分：作为独立后端 + 前端切片实现。
5. 黄灯债务演示链路：把现有 `yellow_flags` 地基接入阶段二 / 三可视化。
6. 课程成员模型：替换 `created_by_user_id` 临时权限边界。
7. 真实 AI provider 和真实 Dify API：在演示闭环稳定后分别作为独立集成切片推进。
