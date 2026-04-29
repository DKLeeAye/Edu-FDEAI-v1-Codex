# EduFDE Codex 开发指南

> 每个 Codex 开发会话都应优先阅读本文件。本文只保存工程级上下文，详细产品和技术方案以 `docs/*v2.0.md` 为准。

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

当前项目处于 **MVP 开发准备阶段**。仓库已有 v2.0 设计文档和开发治理文档，尚未初始化应用代码。

## 二、权威文档

开发以 v2.0 文档为准。

每次新会话优先阅读：

- `docs/README.md`
- `docs/EduFDE_终局总体方案设计_v2.0.md`
- `docs/EduFDE_终局路线图与MVP切分_v2.0.md`
- `docs/EduFDE_MVP开发计划_v2.0.md`

v1.0 文档仅作为历史参考。

## 三、当前开发目标

在不破坏终局架构地基的前提下，快速完成 MVP。

MVP 必须验证：

- 一个制造业质检 AI 智能体实验包
- 学生端完整五阶段流程
- 阶段一 AI 客户
- 阶段二 AI 评审
- 阶段三知识工程决策工具
- 阶段四 Dify 路径
- 阶段五 Dify 交付文档
- 基础教师进度视图
- 基础学习画像

MVP 必须保留这些结构性地基：

- 实验包版本绑定
- 统一 Artifact 模型
- AI Gateway 边界
- 租户 / 院校 / 课程作用域
- 项目档案袋雏形
- AI 调用日志
- 黄灯债务最小模型
- Rubric 最小模型

## 四、计划技术栈

前端：

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Query
- Zustand

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

- 所有模型调用必须经过 AI Gateway
- 需要时使用 LangGraph 构建平台智能体
- MVP 阶段 AI 流式输出优先使用 SSE

## 五、架构原则

1. 所有 AI 调用必须经过 AI Gateway，阶段服务不得直接调用模型供应商。
2. 课程必须绑定实验包版本，而不是只绑定实验包主 ID。
3. 阶段输出必须保存为 Artifact。
4. AI 评审必须绑定 Rubric 和证据。
5. 教师拥有最终教学判断权。
6. 服务层查询必须强制执行租户 / 院校 / 课程作用域。
7. MVP 可以简化 UI 和流程，但不能删除长期架构边界。

## 六、推荐会话流程

每次新开发会话开始时：

1. 阅读本文件。
2. 阅读 `docs/README.md`。
3. 阅读 `docs/dev/progress.md`。
4. 阅读 `docs/dev/decisions.md`。
5. 阅读本次任务相关的 v2.0 设计文档。
6. 在编辑前确认任务边界。

开发过程中：

1. 每个会话只处理一个边界清晰的模块。
2. 后端和前端尽量按可独立验证的切片推进。
3. 保持改动范围收敛。
4. 对有意义的行为添加或更新测试。
5. 在宣称完成前运行验证命令。
6. 涉及前端体验时，尽量启动开发服务并在浏览器验证。

每次会话结束时：

1. 更新 `docs/dev/progress.md`。
2. 如果产生长期产品或技术决策，更新 `docs/dev/decisions.md`。
3. 在最终回复中按 `docs/dev/session-handoff-template.md` 说明交接信息，或按需创建日期化交接记录。
4. 明确说明已完成的验证和未验证区域。

## 七、MVP 推荐开发顺序

1. 项目脚手架
2. 数据库与基础模型
3. 认证与用户 / session 基础
4. 实验包初始化
5. 课程 / session / stage 状态
6. AI Gateway
7. Artifact 模型
8. 阶段一
9. 阶段二
10. 阶段三
11. 阶段四 Dify 路径
12. 阶段五
13. 教师视图
14. 学习画像
15. 演示部署

## 八、开发治理文件

- `docs/dev/README.md`：开发治理目录说明
- `docs/dev/progress.md`：长期进度记录
- `docs/dev/decisions.md`：长期技术和产品决策
- `docs/dev/session-handoff-template.md`：会话交接模板
- `docs/dev/module-prompt-template.md`：后续模块开发提示词模板

## 九、当前状态

- v2.0 设计文档体系已完成。
- 开发治理结构已完成。
- 尚未初始化应用代码。
- 下一步推荐任务：初始化项目脚手架和本地开发环境。

