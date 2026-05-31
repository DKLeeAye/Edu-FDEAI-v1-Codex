# EduFDE 第二阶段开发进度

> 本文件从第二阶段开始重新轻量记录。第一阶段原始进度流水已归档到 `docs/dev/archive/phase-1-productization-archive/progress.phase-1-original.md`。

## 一、当前阶段

当前阶段：**第二阶段，产品化精修与真实能力迭代**。

第一阶段已经完成：

- MVP 本地演示闭环。
- 正式学生端第一轮产品化。
- 登录页、课程列表、五阶段工作区、项目档案袋和学习画像展示。
- 阶段一教学引导模式第一轮功能体验。
- 阶段二三份文档串行工作台。
- 阶段三案例教学、五层知识实验室、项目决策和风险文档。
- 阶段四 Dify 构建与测试记录。
- 阶段五交付、验收和运维材料。
- AI Gateway fake provider 与硅基流动真实 provider 接入。
- 基础教师进度视图和规则学习画像。

当前优先主线：

1. 阶段一项目实战模式精修。
2. 阶段二至阶段五 AI 评审结构化与证据绑定。
3. 黄灯债务确认、回应和清除闭环。
4. 后端阶段运行通用能力抽取。
5. 课程成员权限、正式教师后台和真实 Dify API 后续分切片推进。

## 二、当前实现基线

已具备：

- 学生端：登录、课程列表、实验项目、五阶段工作区、最终项目档案袋、学习画像。
- 旧联调入口：`/dev-workbench` 保留学生五阶段、教师进度和学习画像低层验证能力。
- 后端：认证、课程、实验会话、统一 Artifact、阶段一至五服务、教师进度、学习画像、AI Gateway。
- 数据地基：租户、院校、用户、实验包版本、课程、实验会话、阶段记录、Artifact、Rubric、黄灯债务、AI 调用日志。
- AI：fake provider 和硅基流动 provider 均通过 AI Gateway 接入。

临时边界：

- 教师读取课程数据仍暂以 `courses.created_by_user_id` 判断。
- 学习画像仍是规则即时计算，不持久化。
- 项目档案袋当前由前端聚合阶段产物展示。
- 真实 Dify API、文件解析、向量库、正式评分和教师批改尚未实现。

## 三、最近完成

### 2026-05-31 第一阶段工程治理文档归档与第二阶段上下文压缩

- 建立第一阶段归档目录：`docs/dev/archive/phase-1-productization-archive/`。
- 归档上一阶段原始工程治理文件，包括旧版 `AGENTS.md`、`docs/dev/README.md`、`progress.md`、`decisions.md`、MVP 收口审查、阶段性复盘、阶段一 UI 精修基线和 student2 走查材料。
- 重写根目录 `AGENTS.md` 为第二阶段轻量开发指南。
- 重写 `docs/dev/README.md`、`progress.md`、`decisions.md`，压缩默认上下文。
- 新增 `docs/dev/current-context.md` 和 `docs/dev/phase-2-governance.md`。

验证：

- 已检查当前活跃文档对已移出旧路径的引用：无结果。
- 已检查当前活跃文档临时标记：无结果。
- 已统计当前默认治理上下文：`AGENTS.md` 与 `docs/dev` 活跃治理文件合计 920 行。
- 已检查归档目录：student2 走查 README 和 9 张截图已归档。
- `git diff --check`：通过。

## 四、下一步推荐任务

推荐下一任务：阶段一项目实战模式精修第一切片。

建议边界：

- 只处理阶段一项目实战模式。
- 聚焦正式客户拜访、多轮访谈上下文、访谈线索、待追问问题和拜访间整理。
- 不改教学引导模式的核心记录边界。
- 不同时推进阶段二 UI、教师后台、Dify API 或课程成员权限。

## 五、验证基线

常用验证命令：

```bash
python3 -m pytest backend/tests -q
cd frontend
npm run lint
npm run typecheck
npm run test:stage-one
npm run test:stage-two
npm run test:stage-three
npm run test:stage-four
```

涉及前端体验时，应尽量启动本地服务并做浏览器验证。

## 六、进度记录规则

后续更新本文件时只记录：

- 当前阶段状态变化。
- 最近完成的具体切片。
- 验证命令和结果。
- 未验证区域。
- 下一步推荐任务。

不要把第一阶段历史流水重新复制回本文件。
