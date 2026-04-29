# EduFDE 平台架构与部署形态设计 v2.0

> 状态：v2.0 草案  
> 上位依据：`EduFDE_终局总体方案设计_v2.0.md`  
> 替代范围：`EduFDE_技术架构文档_v1.0.md` 与 `EduFDE_平台底层能力设计_v1.0.md` 中的平台架构、基础设施、部署相关内容

---

## 一、架构目标

EduFDE 终局支持三种交付形态：

1. 标准 SaaS
2. 专有 SaaS 租户
3. 私有化实例

技术架构必须满足：

- 支撑五阶段 AI 智能体项目实训
- 支撑多租户与权限作用域
- 支撑实验包版本与内容授权
- 支撑 AI 网关、评审、画像和成本治理
- 支撑项目档案袋和学习证据沉淀
- 支撑未来专有租户和私有化部署

---

## 二、总体架构原则

### 2.1 模块化单体起步

早期不拆微服务。

采用模块化单体：

- 降低部署复杂度
- 降低开发成本
- 方便快速迭代
- 通过清晰模块边界为未来拆分预留空间

### 2.2 AI Gateway 边界独立

AI Gateway 早期可作为后端内部模块实现，但必须保持独立边界。

所有 AI 调用必须经过 AI Gateway，业务服务不得直接调用模型供应商。

### 2.3 内容版本与代码版本分离

平台代码升级不应自动改变课程难度。

必须分离：

- 代码版本
- 实验包版本
- Prompt 版本
- 模型路由配置
- Rubric 版本

### 2.4 租户边界服务层强制执行

任何涉及学生数据、课程数据、教学数据、文件数据的查询，必须在服务层强制注入租户/院校/课程作用域。

不得依赖前端传入 `institution_id` 作为安全边界。

---

## 三、核心技术栈

### 3.1 前端

- Next.js 14+ App Router
- TypeScript
- Tailwind CSS
- shadcn/ui
- Zustand
- React Query
- D3.js
- ReactFlow
- Monaco Editor

说明：

- Next.js 承载学生端、教师端、院校后台、平台后台。
- AI 流式输出优先采用 SSE，WebSocket 后续用于实时通知或多人协作。

### 3.2 后端

- FastAPI
- Python 3.11+
- SQLAlchemy 2.x
- Alembic
- Pydantic v2
- Celery
- Redis
- PostgreSQL
- MinIO/S3

### 3.3 AI

- LangGraph：平台智能体编排
- AI Gateway：统一模型调用
- OpenAI SDK 兼容供应商
- Anthropic SDK
- 可扩展本地模型或客户自有模型

### 3.4 基础设施

- Docker Compose 起步
- Nginx 反向代理
- PostgreSQL
- Redis
- MinIO
- Worker
- 后续支持 Kubernetes，但不作为早期目标

---

## 四、核心模块边界

### 4.1 Web App

职责：

- 学生实验室
- 教师端
- 院校后台
- 平台后台
- 内容运营后台

### 4.2 Core API

职责：

- 用户与权限
- 租户与院校
- 课程与班级
- 实验会话
- 阶段状态
- Artifact
- 评分与画像
- 实验包授权

### 4.3 Content/Package Subsystem

职责：

- 实验包主数据
- 实验包版本
- 阶段蓝图
- 原材料资产
- Rubric
- AI Persona
- 标准测试题
- 内容授权

### 4.4 AI Gateway

职责：

- usage_type 路由
- 模型供应商配置
- Prompt 版本
- Token 统计
- 限流
- fallback
- 调用审计
- 安全过滤
- 流式输出封装

### 4.5 Worker

职责：

- AI 评审
- 学习画像生成
- 班级复盘生成
- 文件解析
- 报告导出
- 实验包质量测试
- 数据归档

### 4.6 Observability

职责：

- 应用日志
- AI 调用日志
- Token 成本统计
- 审计日志
- 错误追踪
- 部署健康事件
- Worker 任务状态

---

## 五、部署形态

### 5.1 标准 SaaS 租户

适用：

- 普通院校试点
- 单专业课程
- 中小规模使用

特点：

- 多院校共享应用
- 多院校共享数据库
- 行级租户隔离
- 统一平台升级
- 统一实验包发布
- 统一 AI Gateway

### 5.2 专有 SaaS 租户

适用：

- 重点院校
- 对数据隔离有更高要求的客户
- 大规模专业群项目

特点：

- 共享代码和运维
- 独立 Schema 或独立数据库
- 独立存储前缀或独立存储桶
- 独立域名
- 独立模型配额
- 可配置专属实验包

### 5.3 私有化实例

适用：

- 数据不能出域的客户
- 政校企项目
- 客户内网部署
- 需要本地模型或自有模型的客户

特点：

- 独立部署
- 本地数据库
- 本地对象存储
- 本地 Redis
- 本地 Worker
- 离线 License
- 实验包导入
- 升级包迁移
- 运维授权窗口

---

## 六、部署实例抽象

建议引入 `deployment_instances`。

每个部署实例记录：

- 实例类型：shared_saas、dedicated_saas、private
- 所属租户
- 访问域名
- 数据隔离模式
- 存储配置
- 模型配置
- License 状态
- 当前代码版本
- 最近健康检查
- 运维访问策略

---

## 七、MVP 架构范围

MVP 做：

- 单部署实例
- 单数据库
- 行级租户隔离
- FastAPI 模块化单体
- Next.js 单前端
- Redis
- PostgreSQL
- MinIO
- Celery
- AI Gateway 内置模块
- AI 调用日志
- 基础 Worker

MVP 不做：

- 专有 Schema
- 私有化部署包
- 离线 License
- Kubernetes
- 微服务拆分
- 多区域部署
- 完整监控平台

但 MVP 必须保留：

- `tenant_id` / `institution_id` 作用域
- `deployment_instance` 概念
- AI Gateway 边界
- 实验包版本绑定
- AI 调用日志

---

## 八、后续演进

### v1

- 完整教师端
- 更完善 Worker
- 批量导出
- 基础可观测性

### v2

- 专有租户
- 内容授权
- 完整 License
- 实验包创作平台
- 数据导出 API

### v3

- 私有化部署包
- 离线授权
- 本地模型配置
- 升级和迁移工具
- 运维审计面板

---

## 九、待确认事项

1. MVP 是否引入 `tenant_id` 与 `institution_id` 双层模型，还是先使用 `institution_id` 兼容租户概念。
2. AI Gateway MVP 是后端模块还是独立 FastAPI 服务。
3. 对象存储本地开发是否必须使用 MinIO，还是允许本地文件系统 fallback。
4. SSE 与 WebSocket 的边界是否在 MVP 中明确。
5. 私有化部署是否需要在 v2 提前做技术预研。

