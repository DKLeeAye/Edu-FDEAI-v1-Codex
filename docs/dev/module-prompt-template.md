# Codex 模块开发提示词模板

以下模板用于启动边界清晰的开发会话。

## 一、通用模块提示词

```text
请先阅读：
- AGENTS.md
- docs/README.md
- docs/dev/progress.md
- docs/dev/decisions.md
- [相关 v2.0 设计文档]

我们正在开发 EduFDE，一个面向高校的 AI 智能体项目交付实训平台。

本次会话任务：
[描述一个边界清晰的模块]

范围：
- 只处理 [模块/文件范围]。
- 不实现无关的未来功能。
- 保留这些 MVP 地基：实验包版本、Artifact、AI Gateway、租户/院校/课程作用域、AI 调用日志、黄灯债务、Rubric。

预期产出：
- [具体交付物]

验证：
- 运行 [命令]。
- 如果影响 UI，启动开发服务并在浏览器验证流程。
- 更新 docs/dev/progress.md。
- 如产生长期决策，更新 docs/dev/decisions.md。
```

## 二、项目脚手架提示词

```text
请先阅读 AGENTS.md、docs/README.md、docs/dev/progress.md、docs/dev/decisions.md、docs/EduFDE_MVP开发计划_v2.0.md。

本次任务：初始化 EduFDE 项目脚手架和本地开发环境。

范围：
- 只创建前端和后端骨架。
- 添加 Docker Compose 支撑本地依赖服务。
- 添加 .env.example 和启动说明。
- 添加基础健康检查。
- 不实现业务模块。

验证：
- 后端 health endpoint 可响应。
- 前端开发服务能渲染占位页面。
- Docker 服务可启动。
- 更新 docs/dev/progress.md，写明准确命令。
```

## 三、后端模块提示词

```text
请先阅读 AGENTS.md、docs/README.md、docs/dev/progress.md、docs/dev/decisions.md、docs/EduFDE_平台架构与部署形态设计_v2.0.md、docs/EduFDE_数据模型与权限治理设计_v2.0.md。

本次任务：实现 [后端模块]。

范围：
- 只处理后端，除非需要最小前端检查。
- 保持服务层租户/院校/课程作用域过滤。
- 为有意义的行为添加测试。

验证：
- 运行该模块相关后端测试。
- 如涉及数据库，运行迁移。
- 启动后端并验证相关 endpoint。
- 更新 docs/dev/progress.md。
```

## 四、前端模块提示词

```text
请先阅读 AGENTS.md、docs/README.md、docs/dev/progress.md、docs/dev/decisions.md、docs/EduFDE_产品与教学闭环设计_v2.0.md，以及 [相关阶段设计文档]。

本次任务：实现 [前端模块]。

范围：
- 只处理前端，除非 API 形状需要小幅后端调整。
- 遵循 v2.0 文档中的实验室布局和教学流程。
- 不创建营销落地页。

验证：
- 运行前端 lint/test 命令。
- 启动开发服务。
- 在浏览器中验证用户流程。
- 更新 docs/dev/progress.md。
```

## 五、AI 模块提示词

```text
请先阅读 AGENTS.md、docs/README.md、docs/dev/progress.md、docs/dev/decisions.md、docs/EduFDE_AI能力与治理设计_v2.0.md，以及 [相关阶段设计文档]。

本次任务：实现 [AI 模块]。

范围：
- 所有模型调用必须经过 AI Gateway。
- 记录 usage_type、模型、Token 用量（如可得）、用户/session/stage 上下文。
- 影响评审或评分的 AI 输出必须结构化。
- 不让 AI 成为最终评分裁判。

验证：
- 运行自动化测试。
- 至少运行一个真实样例 prompt。
- 在 docs/dev/progress.md 中总结样例结果。
```

## 六、阶段功能提示词

```text
请先阅读 AGENTS.md、docs/README.md、docs/dev/progress.md、docs/dev/decisions.md，以及对应阶段设计文档：
- 阶段一：docs/EduFDE_阶段一_需求访谈与问题发现_v2.0.md
- 阶段二：docs/EduFDE_阶段二_方案定义与可行性判断_v2.0.md
- 阶段三：docs/EduFDE_阶段三_知识工程决策_v2.0.md
- 阶段四：docs/EduFDE_阶段四_智能体实现与测试_v2.0.md
- 阶段五：docs/EduFDE_阶段五_交付验收与运维说明_v2.0.md

本次任务：实现 [具体阶段切片]。

范围：
- 只实现一个垂直切片：[后端 API / 前端 UI / AI 行为 / 持久化]。
- 阶段输出必须保存为 Artifact。
- 保持阶段状态流转。
- 不实现后续阶段。

验证：
- 运行相关测试。
- 如影响 UI，启动应用。
- 手动验证该阶段切片。
- 更新 docs/dev/progress.md。
```

