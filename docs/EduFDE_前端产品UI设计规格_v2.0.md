# EduFDE 前端产品 UI 设计规格 v2.0

> 状态：v2.0 草案  
> 适用范围：正式学生端 MVP 页面重构与后续教师端 / 管理端扩展  
> 原型来源：`.superpowers/brainstorm/99459-1777953196/content/`
> 新版原型输入：`docs/prototypes/open-design-vnext/`

> 说明：Open Design vNext 静态原型是第二阶段前端驱动型产品化迭代的正式产品体验基准。该目录内 HTML、CSS 和 JavaScript 不作为生产前端源码直接接入；正式实现仍需拆解为当前 Next.js、TypeScript、Tailwind CSS 和 React 组件，并接入真实业务 API 与长期架构边界。升级后的平台应严格对齐新版原型的页面结构、流程分割、视觉层级和交互意图。

---

## 一、设计目标

当前前端已完成 MVP 联调闭环，但页面仍以功能测试为主，不适合作为正式产品 UI。本规格用于把已确认的静态原型沉淀为后续实现依据。

正式学生端 UI 的目标：

- 让学生围绕完整 AI 智能体项目交付链路工作，而不是面对接口测试表单。
- 把五阶段任务设计成可理解、可推进、可复盘的项目工作区。
- 保留 MVP 已验证的后端能力和状态流转，不在 UI 重构中扩大业务范围。
- 将内部技术概念转化为学生和教师可理解的中文业务语言。
- 为后续教师端、项目档案袋、学习画像、评分和真实 AI / Dify 集成保留空间。

---

## 二、总体信息架构

### 2.1 角色入口

登录页保留学生、教师、管理入口选择，但角色选择只用于演示入口和账号填充倾向。

真实权限必须以登录后 `/auth/me` 返回的用户角色为准，前端不得只依赖登录页选择。

确认原型：

- `login-modern-concept-v2.html`

### 2.2 学生端主路径

学生端主路径：

```text
登录
→ 实验课程列表
→ 实验项目主页
→ 五阶段工作区
→ 最终项目档案袋 / 学习画像
```

确认原型：

- `student-course-list-concept-v1.html`
- `student-experiment-home-concept-v2-collapsed-nav.html`

### 2.3 实验页布局

进入五阶段实验页后，EduFDE 全局侧边栏默认收起为窄栏，采用阶段内工作区布局：

- 左侧全局导航：默认收起为窄栏，减少横向占用。
- 顶部轻量操作区：提供返回课程、刷新等必要入口。
- 阶段导航：展示五阶段状态与当前阶段。
- 中央工作区：承载当前阶段的主要任务。
- 右侧上下文栏：展示阶段证据、风险、下一步、学习画像或 AI 建议。

课程列表页和实验课程总览页可以使用完整侧栏；进入阶段一至阶段五工作区后使用收起的全局窄侧栏。

---

## 三、视觉与交互原则

### 3.1 产品气质

EduFDE 是高校实训平台，不是营销官网。视觉风格应当现代、清晰、可信、偏工作台，避免过度装饰。

推荐风格：

- 浅色工作台界面。
- 课程列表和课程总览可以使用深色完整全局侧栏；阶段工作区使用深色全局窄侧栏作为导航锚点。
- 白色面板承载任务内容。
- 青绿色作为主行动与完成状态色。
- 蓝色用于信息提示。
- 黄色用于风险、附条件通过和黄灯债务。
- 红色只用于阻塞、失败和不可继续状态。

### 3.2 布局规则

- 实验工作区应优先保证中央任务区可读性。
- 右侧栏只放与当前任务强相关的信息，避免堆叠全部项目数据。
- 阶段工作区可以多卡片，但不得把正式页面做成联调表单集合。
- 同一页面只保留一个主要行动按钮。
- 复杂任务用结构化编辑器、检查表、对照表、模拟器或实验台表达。

### 3.3 响应式规则

MVP 首要适配桌面和平板宽屏教学场景。

基础要求：

- 桌面端优先支持 1280px 以上宽度。
- 低于 1280px 时右侧栏下移，避免内容挤压。
- 低于 820px 时隐藏全局窄侧栏，阶段导航和右侧上下文下移，工作区单列展示。
- 表格在窄屏下改为纵向卡片，不横向滚动。

---

## 四、中文业务术语规则

正式 UI 不应直接暴露开发、数据库或联调命名。

### 4.1 禁止作为主要 UI 文案的词

- Artifact
- stage_1 / stage_2 / stage_3 / stage_4 / stage_5
- stage_1_problem_summary 等内部产物名
- fake provider
- AI log
- JSON
- session status

### 4.2 推荐替换

| 内部概念 | UI 推荐文案 |
| --- | --- |
| Artifact | 阶段产物 / 项目证据 / 交付材料 |
| stage | 阶段 |
| stage_record | 阶段进度 |
| experiment_session | 实验项目 / 项目实训记录 |
| AI log | AI 调用记录 / AI 评审记录，必要时仅教师或调试视图展示 |
| stage_1_interview_turn | 客户访谈记录 |
| stage_1_problem_summary | 问题发现总结 |
| stage_2_solution_definition | 方案定义 |
| stage_3_knowledge_decision | 知识工程决策 |
| stage_4_test_report | 测试报告 |
| stage_5_delivery_document | 交付说明书 |

内部字段名可以继续用于 API、类型和测试；正式 UI 必须通过映射层转成中文业务文案。

---

## 五、页面清单

### 5.1 登录页

确认原型：

- `login-modern-concept-v2.html`

设计要点：

- 邮箱密码登录区域独立突出。
- 学生入口、教师入口、管理入口放在登录区域下方。
- 登录页承担角色感知，不承担真实权限判定。

### 5.2 实验课程列表

确认原型：

- `student-course-list-concept-v1.html`

设计要点：

- 展示学生可进入的实验课程。
- 课程卡片突出实验主题、阶段进度、当前项目状态。
- 入口文案使用“进入实验”“继续项目”等业务语言。

### 5.3 实验项目主页

确认原型：

- `student-experiment-home-concept-v2-collapsed-nav.html`

设计要点：

- 课程总览层可以保留完整全局侧栏；进入五阶段工作区后全局侧栏收起为窄栏。
- 展示课程 / 项目标题、当前阶段、项目证据数量和关键操作。
- 五阶段导航常驻，帮助学生理解完整交付链路。
- 右侧展示阶段产物、下一步和学习画像摘要。

---

## 六、阶段一：需求访谈与问题发现

阶段一不是一个聊天框，而是“理解客户、整理信息、形成问题定义”的工作区。

确认原型：

- `stage-one-hub-concept-v1.html`
- `stage-one-guided-level-concept-v1.html`
- `stage-one-practice-visit-concept-v1.html`
- `stage-one-visit-summary-concept-v1.html`
- `stage-one-final-summary-concept-v1.html`
- `stage-one-evaluation-concept-v1.html`
- `docs/prototypes/stage-one-desktop-layout-v3-collapsed-global-sidebar.html`

上述原型为第一轮学生端产品化历史依据。Open Design vNext 生效后，阶段一正式升级以 `docs/prototypes/open-design-vnext/` 中新版页面为准。

Open Design vNext 生效后的正式页面结构：

- 阶段一导学方法页：`screens/06-interview-guide.html`。
- AI 客户访谈工作区：`screens/06-interview-lab.html`。
- 访谈记录整理与阶段提交页：`screens/06-interview-submit.html`。

关键设计：

- 阶段一正式产品不再保留旧版“教学引导模式 / 项目实战模式”双入口分割。
- `06-interview-guide.html` 是新版阶段一正式流程的导学方法页，不等同于旧六关卡教学引导模式。
- `06-interview-lab.html` 是新版阶段一核心工作区，围绕 AI 客户访谈、实时反馈、已识别需求、客户痛点、项目关键信息、待追问问题和实训评分展开。
- `06-interview-submit.html` 是新版阶段一正式提交关口，负责把访谈转化为客户原话、已确认事实、待确认问题、需求理解草稿、边界判断和阶段二输入证据链。
- 对话窗口顶部必须展示客户身份和项目场景，例如制造业质检负责人周明、审厂追溯压力、资料来源和验收口径。
- 旧六关卡训练能力如暂时保留，只能作为遗留兼容或独立训练记录，不作为正式学生端主路径，不作为阶段二正式输入。
- 阶段二正式输入来自新版阶段一提交页形成的正式访谈证据、需求理解、待确认问题和边界判断。
- 与 Open Design vNext 冲突的旧页面结构不在正式产品中并列保留。
- 客户访谈区要保留对话感，但不能只有聊天框。
- 右侧应持续展示访谈线索、遗漏问题和下一步建议。

---

## 七、阶段二：方案定义与可行性判断

阶段二不是单个方案表单，而是三个串联文档的滚动推进过程。

确认原型：

- `stage-two-hub-concept-v1.html`
- `stage-two-requirements-editor-concept-v1.html`
- `stage-two-feasibility-report-concept-v1.html`
- `stage-two-technical-solution-concept-v1.html`

阶段二文档链路：

```text
需求文档
→ 可行性报告
→ 总体技术方案
```

每个文档采用：

```text
写一节
→ AI 追问
→ 修改完善
→ 提交小节
→ 文档整体评审
→ 进入下一文档
```

质量门禁：

- 红灯：阻塞继续，必须修改。
- 黄灯：允许继续，但进入风险债务，后续阶段必须回应。

关键设计：

- 中央为结构化文档编辑器。
- 右侧为 AI 追问、风险和验收标准。
- 文档之间必须体现承接关系，不做孤立表单。

---

## 八、阶段三：知识工程决策

阶段三是知识工程决策层，不是实际搭建知识库。

确认原型：

- `stage-three-hub-concept-v1.html`
- `stage-three-data-prep-concept-v1.html`
- `stage-three-chunking-lab-concept-v1.html`
- `stage-three-embedding-space-concept-v1.html`
- `stage-three-retrieval-lab-concept-v1.html`
- `stage-three-evaluation-lab-concept-v1.html`
- `stage-three-decision-doc-concept-v1.html`

五层知识系统：

1. 数据准备
2. 分块策略
3. 向量化与存储
4. 召回策略
5. 效果评估

关键设计：

- 每一层都要让学生做决策，而不是只填说明。
- 页面应呈现实验感：对比、预览、评估、选择。
- 最终输出知识工程决策文档，指导阶段四 Dify 构建。

---

## 九、阶段四：智能体实现与测试

MVP 阶段四采用 Dify 路径，训练构建、测试和说明能力。

确认原型：

- `stage-four-hub-concept-v1.html`
- `stage-four-dify-onboarding-concept-v1.html`
- `stage-four-dify-build-concept-v1.html`
- `stage-four-app-submission-concept-v1.html`
- `stage-four-test-review-concept-v1.html`

页面结构：

- 阶段四主页：共同基础概念和 Dify 构建路径入口。
- Dify 新手村：帮助学生掌握 Dify 基础操作。
- 正式构建任务：根据阶段三决策搭建智能体。
- 应用链接与设计说明：提交可访问应用和配置说明。
- 测试验收与 AI 反馈：验证标准问题、范围外问题和多轮问题。

关键设计：

- Dify 作为外部工具路径，平台负责指导、记录、评审和沉淀证据。
- 不在 MVP 中伪装成真实 Dify 深度集成。
- 阶段四必须把已知问题带入阶段五限制说明。

---

## 十、阶段五：交付验收与运维说明

阶段五训练学生把可运行智能体转化为客户可接收、可使用、可维护的交付成果。

确认原型：

- `stage-five-hub-concept-v1.html`
- `stage-five-delivery-document-concept-v1.html`
- `stage-five-acceptance-record-concept-v1.html`
- `stage-five-operation-note-concept-v1.html`
- `stage-five-final-portfolio-concept-v1.html`

页面结构：

- 阶段五主页：交付包收口工作台。
- 交付说明书：应用入口、核心功能、使用步骤、能力边界。
- 验收记录：对齐阶段二验收标准和阶段四测试证据。
- 限制与维护说明：披露边界、知识库更新流程、Dify 云端依赖。
- 客户演示与最终档案袋：演示脚本、最终提交检查、学习画像和项目档案袋。

关键设计：

- 强调交付意识，不只是文档上传。
- 已知限制必须诚实披露。
- 最后一页是整个学生项目闭环的完成确认页。

---

## 十一、组件与实现边界

### 11.1 推荐组件边界

后续实现时建议拆分：

- `AppShell`：全局窄侧栏、顶部栏、用户入口。
- `ExperimentLayout`：阶段导航、中央工作区、右侧上下文栏。
- `StageProgressRail`：五阶段状态导航。
- `ContextPanel`：项目证据、风险、下一步、学习画像摘要。
- `EvidenceList`：阶段产物 / 项目证据列表。
- `StructuredEditor`：阶段二和阶段五文档类编辑。
- `AiReviewPanel`：AI 追问、评审、反馈和建议。
- `GateStatus`：红灯 / 黄灯 / 通过 / 附条件通过。

### 11.2 MVP 实现边界

正式 UI 重构不应在同一轮引入：

- 真实模型供应商。
- 真实 Dify API 深度集成。
- 教师批改和正式评分。
- course_members 权限模型。
- 完整管理端。
- 证书、成绩和复杂导出。

UI 实现应优先复用现有已验证 API，把联调页能力迁移到正式学生端体验。

### 11.3 状态映射

内部状态应转换为中文：

| 内部状态 | UI 文案 |
| --- | --- |
| locked | 未解锁 |
| not_started | 待开始 |
| in_practice | 进行中 |
| completed | 已完成 |

---

## 十二、后续实现建议

建议按以下切片实现正式学生端 UI：

1. 设计系统与应用壳：登录页、课程列表、实验项目框架。
2. 阶段一正式页面。
3. 阶段二正式页面。
4. 阶段三正式页面。
5. 阶段四正式页面。
6. 阶段五正式页面与最终项目档案袋。
7. 清理或下线旧联调页。

每个切片应保持：

- 后端 API 不扩大范围。
- 前端完成后运行 `npm run lint` 和 `npm run typecheck`。
- 涉及交互体验时启动前端并做浏览器验证。
- 完成后更新 `docs/dev/progress.md`，产生长期决策时更新 `docs/dev/decisions.md`。

---

## 十三、原型索引

所有已确认原型均保存在：

```text
.superpowers/brainstorm/99459-1777953196/content/
```

这些原型是 UI 结构和视觉方向依据，不是生产代码。后续实现应在 Next.js / TypeScript / Tailwind / shadcn/ui 体系内重建，不直接复制 HTML 内联样式。
