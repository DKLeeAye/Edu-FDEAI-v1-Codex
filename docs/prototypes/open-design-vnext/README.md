# Open Design vNext 前端原型接收区

> 本目录用于存放外部 Open Design 设计平台导出的 EduFDE 新版静态前端原型文件。

> 当前状态：原型文件已拷贝完成，并已形成初步审计文档：`docs/dev/open-design-vnext-prototype-audit-2026-05-31.md`。

## 一、目录用途

本目录接收的文件主要包括：

- `index.html`：产品官网首页原型。
- `login.html`：登录页原型。
- `assets/`：统一 CSS、图片和少量通用 JavaScript。
- `screens/`：学生端、五阶段工作区、项目档案袋等页面原型。

当前已接收文件范围包括产品官网、登录页、学生首页、制造业质检实验详情、阶段一至阶段五学生工作区、AI 评审、项目档案袋、教师工作台、课程配置、实验包库、课中监控和管理部署页面。

这些文件是第二阶段“前端驱动型”产品化迭代的正式产品体验基准，用于确定新版 UI/UX、页面结构、中文文案、交互状态和产品流程。

## 二、工程边界

本目录内文件默认视为高保真静态原型和 UI/UX 参考，不是生产前端源码。

后续正式开发时，应将原型拆解并迁移为当前工程的 Next.js App Router、TypeScript、Tailwind CSS 和 React 组件实现，并接入真实后端 API、Artifact、AI Gateway、Rubric 证据和权限作用域。

升级后的正式平台应严格对齐本目录原型的页面结构、流程分割、视觉层级和交互意图。与新版原型冲突的旧产品流程不在正式产品中并列保留；例如阶段一应按新版 `06-interview-guide.html`、`06-interview-lab.html`、`06-interview-submit.html` 连续流程实现，而不是保留旧“教学引导模式 / 项目实战模式”双入口。

不得为了直接复用静态原型而绕开以下长期边界：

- 所有 AI 调用必须经过 AI Gateway。
- 阶段产物必须保存为统一 Artifact。
- AI 评审必须绑定 Rubric 和证据。
- 服务层必须执行租户、院校、课程和实验会话作用域校验。
- 教学引导训练记录不得污染正式项目交付证据链。

## 三、拷贝建议

请将 Open Design 导出的文件按原始相对结构拷贝到本目录，例如：

```text
docs/prototypes/open-design-vnext/
├── index.html
├── login.html
├── assets/
│   ├── app.css
│   └── app.js
└── screens/
    ├── student-home.html
    ├── student-experiment-detail.html
    ├── 06-interview-guide.html
    ├── 06-interview-lab.html
    ├── 07-solution-definition.html
    ├── 08-knowledge-decision.html
    ├── 09-agent-build-test.html
    ├── 10-delivery-document.html
    └── 12-portfolio-report.html
```

拷贝完成后，下一步应先做原型审计，而不是直接改造生产页面。审计重点包括页面清单、流程映射、组件拆分、真实数据需求、API 缺口、Artifact 类型、AI 调用点和第一批垂直切片顺序。

本轮已完成初步审计。后续开发应以审计文档中的“推荐迁移切片顺序”和“迁移原则”为起点。
