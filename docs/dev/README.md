# EduFDE 开发治理说明

本目录用于保存长期开发上下文，目标是让每个 Codex 会话都能短、准、可恢复。

第一阶段的详细工程治理文档已经归档到：

- `docs/dev/archive/phase-1-productization-archive/`

当前目录保留第二阶段开发所需的轻量入口和持续更新文件。除非需要追溯历史，不应在每次会话中读取归档目录的完整内容。

## 一、当前活跃文件

- `current-context.md`
  当前阶段高密度上下文。每个新开发会话优先阅读，用于替代上一阶段冗长进度流水。

- `progress.md`
  第二阶段轻量进度记录。只记录当前阶段状态、最近完成事项、验证结果、已知问题和下一步任务。

- `decisions.md`
  长期有效的产品和工程决策。历史过程性判断已归档，不再作为默认上下文。

- `phase-2-governance.md`
  第二阶段工程治理规则，包括会话边界、文档更新、归档策略和当前优先级。

- `session-handoff-template.md`
  开发会话结束时的交接模板。

- `module-prompt-template.md`
  启动具体模块开发会话的提示词模板。

## 二、归档文件

- `archive/phase-1-productization-archive/`
  保存第一阶段原始工程治理文档快照，包括旧版 `AGENTS.md`、`README.md`、`progress.md`、`decisions.md`、MVP 收口审查、阶段性复盘、阶段一 UI 精修基线和演示走查材料。

归档文件只用于追溯，不应重新成为当前默认上下文。

## 三、新会话阅读顺序

每个开发会话开始时，应阅读：

1. `AGENTS.md`
2. `docs/README.md`
3. `docs/dev/current-context.md`
4. `docs/dev/progress.md`
5. `docs/dev/decisions.md`
6. 本次任务相关的 v2.0 设计文档

需要查证第一阶段历史时，再阅读：

- `docs/dev/archive/phase-1-productization-archive/`

## 四、会话纪律

每个开发会话只处理一个边界清晰的目标。

合适的会话范围：

- 精修阶段一项目实战模式中的一个垂直切片。
- 为某一阶段补强 Artifact 结构、AI Prompt、service 校验或错误处理。
- 抽取一个后端共享阶段运行能力。
- 修复一个明确的前端交互或布局问题。
- 为某个模块补测试和验证脚本。

不合适的会话范围：

- 一次性重构全部五个阶段。
- 同一轮同时做教师后台、Dify API、权限模型和学习画像。
- 在添加功能时顺手大规模改动无关模块。
- 把历史归档文档重新展开为默认上下文。

## 五、会话结束要求

每个实现会话结束时，应明确：

- 修改了哪些文件。
- 做了哪些验证。
- 有哪些未验证区域。
- 是否更新了 `docs/dev/progress.md`。
- 是否需要更新 `docs/dev/decisions.md`。
- 下一步推荐任务是什么。
