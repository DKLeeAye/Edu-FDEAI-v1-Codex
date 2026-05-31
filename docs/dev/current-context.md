# EduFDE 当前开发上下文

> 本文件是第二阶段高密度上下文入口。每次新开发会话优先阅读本文件，而不是读取第一阶段完整历史流水。

## 一、当前项目状态

EduFDE 是面向高校的 AI 智能体项目交付实训平台，训练学生完成五阶段项目交付链路：

```text
需求访谈与问题发现
→ 方案定义与可行性判断
→ 知识工程决策
→ 智能体实现与测试
→ 交付验收与运维说明
```

第一阶段已经完成 MVP 闭环和正式学生端第一轮产品化。项目当前进入第二阶段：**产品化精修与真实能力迭代**。

第一阶段详细资料已归档：

- `docs/dev/archive/phase-1-productization-archive/`

第一阶段完整复盘可追溯：

- `docs/dev/archive/phase-1-productization-archive/project-stage-review-2026-05-28.phase-1.md`

## 二、当前已具备能力

前端：

- 正式学生端入口：登录、课程列表、实验项目工作区。
- 五阶段正式工作区：阶段一至阶段五均已接入现有后端能力。
- 学习画像展示和最终项目档案袋展示。
- 旧联调工作台 `/dev-workbench` 保留。

后端：

- 认证与当前用户上下文。
- 课程、实验会话和阶段状态。
- 统一 Artifact 服务。
- 阶段一至阶段五后端业务服务。
- AI Gateway，支持 fake provider 和硅基流动 provider。
- AI 调用日志。
- 基础教师进度视图。
- 基础学习画像。

数据地基：

- 租户、院校、用户。
- 实验包、实验包版本、阶段蓝图。
- 课程、实验会话、阶段记录。
- Artifact、Rubric、黄灯债务、AI 调用日志。
- 阶段一教学引导训练记录。

## 三、当前主线

第二阶段优先推进：

1. 阶段一项目实战模式精修。
2. 阶段二至阶段五 AI 评审结构化和证据绑定。
3. 黄灯债务确认、回应和清除闭环。
4. 后端阶段运行通用能力抽取。
5. 课程成员权限模型替换教师临时边界。
6. 正式教师后台、教师批改、正式评分、真实 Dify API 和学习画像智能化。

当前最推荐的下一步任务：

```text
阶段一项目实战模式精修第一切片：
正式客户拜访、多轮访谈上下文、访谈线索、待追问问题、拜访间整理和阶段二输入证据链。
```

## 四、关键架构原则

- 所有 AI 调用必须经过 AI Gateway。
- 课程必须绑定实验包版本。
- 阶段输出必须保存为 Artifact。
- AI 评审必须绑定 Rubric 和证据。
- 教师拥有最终教学判断权。
- 服务层查询必须强制执行租户 / 院校 / 课程作用域。
- 教学引导记录不得污染正式项目交付证据链。

## 五、当前临时边界

- 教师权限：仍暂以 `courses.created_by_user_id` 判断课程读取范围。
- 学习画像：规则即时计算，不持久化。
- 项目档案袋：前端聚合 Artifact 展示，后端未建独立档案袋表。
- 黄灯债务：有数据表和部分生成逻辑，闭环体验未完成。
- Dify：当前保存构建和测试证据，未真实调用 Dify API。
- 文件与知识库：MinIO、Redis、Celery 等依赖已准备，文件解析和向量库未进入主线。

## 六、重要代码位置

前端：

- `frontend/app/page.tsx`：正式学生端主编排。
- `frontend/app/dev-workbench/page.tsx`：旧联调工作台。
- `frontend/src/components/student-product/`：正式学生端组件。
- `frontend/src/components/student-workspace/`：旧联调工作台组件。
- `frontend/src/lib/api.ts`：当前前端请求入口。

后端：

- `backend/app/main.py`：应用入口。
- `backend/app/api/`：接口层。
- `backend/app/services/`：业务服务层。
- `backend/app/models/`：数据库模型。
- `backend/app/schemas/`：请求和响应结构。
- `backend/app/ai_gateway/`：AI 网关。
- `backend/app/ai_runtime/`：阶段 AI 编排。
- `backend/alembic/versions/`：数据库迁移。
- `backend/tests/`：后端测试。

## 七、常用验证

后端：

```bash
python3 -m pytest backend/tests -q
```

前端：

```bash
cd frontend
npm run lint
npm run typecheck
npm run test:stage-one
npm run test:stage-two
npm run test:stage-three
npm run test:stage-four
```

涉及 UI 时，应启动本地服务并用浏览器验证核心流程。

## 八、历史追溯规则

默认不要读取第一阶段完整历史流水。

只有在以下情况读取归档：

- 需要追溯某个阶段能力为什么这样设计。
- 需要核对旧验证记录。
- 需要恢复第一阶段某个原始文档内容。
- 需要查阅 student2 完整走查材料或截图。

归档路径：

- `docs/dev/archive/phase-1-productization-archive/`
