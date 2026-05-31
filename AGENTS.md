# EduFDE Codex 开发指南

> 每个 Codex 开发会话都应优先阅读本文件。本文只保存工程级入口和长期约束；详细产品和技术方案以 `docs/*v2.0.md` 为准，当前开发状态以 `docs/dev/current-context.md` 为准。

## 一、项目定位

EduFDE 是面向高校的 **AI 智能体项目交付实训平台**。

平台训练学生完成完整 AI 智能体项目交付链路：

```text
需求访谈与问题发现
→ 方案定义与可行性判断
→ 知识工程决策
→ 智能体实现与测试
→ 交付验收与运维说明
```

## 二、当前阶段

项目已完成第一阶段工程闭环：MVP 本地演示、正式学生端第一轮产品化、五阶段学生路径、基础教师进度视图、基础学习画像、AI Gateway fake provider 与硅基流动真实 provider 接入。

第一阶段详细工程治理文档已归档到：

- `docs/dev/archive/phase-1-productization-archive/`

当前进入 **第二阶段：产品化精修与真实能力迭代**。后续不再以“横向铺满页面和接口”为主，而是围绕真实教学体验、AI 行为、证据链、后端规范和长期架构边界逐步打磨。

当前优先主线：

1. 阶段一项目实战模式：正式客户拜访、拜访间整理、问题发现总结、综合评估和阶段二输入证据链。
2. 阶段二至阶段五 AI 评审结构化：红灯 / 黄灯判断、Rubric 证据绑定和错误处理。
3. 黄灯债务闭环、项目档案袋、学习画像和教师后台逐步产品化。
4. 后端阶段运行服务、课程成员权限和真实 Dify API 等长期能力分切片推进。

## 三、权威文档

开发以 v2.0 文档为准：

- `docs/README.md`
- `docs/EduFDE_终局总体方案设计_v2.0.md`
- `docs/EduFDE_终局路线图与MVP切分_v2.0.md`
- `docs/EduFDE_MVP开发计划_v2.0.md`
- `docs/EduFDE_前端产品UI设计规格_v2.0.md`
- 本次任务相关的阶段或平台设计文档

当前工程治理以以下文件为准：

- `docs/dev/current-context.md`
- `docs/dev/progress.md`
- `docs/dev/decisions.md`
- `docs/dev/phase-2-governance.md`

第一阶段历史材料只在需要追溯时阅读，不作为每次会话默认上下文。

## 四、技术栈

前端：

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui 方向
- React Query / Zustand 方向

后端：

- FastAPI
- Python 3.11+
- SQLAlchemy 2.x
- Alembic
- Pydantic v2
- PostgreSQL
- Redis
- MinIO/S3 兼容对象存储
- Celery

AI：

- 所有模型调用必须经过 AI Gateway。
- 需要时使用 LangGraph 构建平台智能体。
- MVP 和产品化精修阶段 AI 流式输出优先使用 SSE。

## 五、长期架构原则

1. 所有 AI 调用必须经过 AI Gateway，阶段服务不得直接调用模型供应商。
2. 课程必须绑定实验包版本，而不是只绑定实验包主 ID。
3. 阶段输出必须保存为统一 Artifact。
4. AI 评审必须绑定 Rubric 和证据，AI 不能成为最终教学裁判。
5. 教师拥有最终教学判断权。
6. 服务层查询必须强制执行租户 / 院校 / 课程作用域。
7. MVP 和产品化精修可以简化 UI 和流程，但不能删除长期架构边界。
8. 教学引导训练记录不得污染正式项目交付证据链。

## 六、推荐会话流程

每次新开发会话开始时：

1. 阅读本文件。
2. 阅读 `docs/README.md`。
3. 阅读 `docs/dev/current-context.md`。
4. 阅读 `docs/dev/progress.md`。
5. 阅读 `docs/dev/decisions.md`。
6. 阅读本次任务相关的 v2.0 设计文档。
7. 如需追溯第一阶段历史，再阅读 `docs/dev/archive/phase-1-productization-archive/`。

开发过程中：

1. 每个会话只处理一个边界清晰的模块。
2. 后端和前端尽量按可独立验证的切片推进。
3. 保持改动范围收敛，不顺手重构无关模块。
4. 对有意义的行为添加或更新测试。
5. 在宣称完成前运行验证命令。
6. 涉及前端体验时，尽量启动开发服务并在浏览器验证。

每次会话结束时：

1. 更新 `docs/dev/progress.md`。
2. 如果产生长期产品或技术决策，更新 `docs/dev/decisions.md`。
3. 按 `docs/dev/session-handoff-template.md` 说明交接信息，或按需创建日期化交接记录。
4. 明确说明已完成验证和未验证区域。

## 七、开发治理文件

- `docs/dev/README.md`：开发治理目录说明。
- `docs/dev/current-context.md`：当前阶段高密度上下文，每次会话优先读取。
- `docs/dev/progress.md`：第二阶段轻量进度记录。
- `docs/dev/decisions.md`：长期有效产品和工程决策。
- `docs/dev/phase-2-governance.md`：第二阶段开发治理规则。
- `docs/dev/session-handoff-template.md`：会话交接模板。
- `docs/dev/module-prompt-template.md`：模块开发提示词模板。
- `docs/dev/archive/phase-1-productization-archive/`：第一阶段原始工程治理文档归档。

## 八、当前状态摘要

- 正式学生端已具备登录、课程列表、五阶段工作区、最终项目档案袋和学习画像展示。
- `/dev-workbench` 仍作为旧联调工作台保留。
- 教师端正式产品 UI 未完成，教师进度视图仍以联调能力为主。
- 教师权限仍暂以 `courses.created_by_user_id` 作为课程读取边界，后续需替换为课程成员模型。
- 学习画像当前为规则即时计算，尚未持久化为正式画像表。
- 黄灯债务已有最小模型和阶段二部分生成逻辑，完整确认、回应、清除闭环仍待实现。
- 真实 Dify API、文件解析、向量库、正式评分、教师批改和生产部署仍为后续切片。
