# EduFDE · 技术架构文档
# Technical Architecture

> 版本：v1.0 | 状态：确认版 | 日期：2026-04-28

---

## 一、系统总体架构

```
┌─────────────────────────────────────────────────────────────┐
│                         用户浏览器                           │
└───────────────────────┬─────────────────────────────────────┘
                        ↓ HTTPS
┌─────────────────────────────────────────────────────────────┐
│                    Nginx 反向代理                            │
│          静态资源服务 / SSL终止 / 路由分发                    │
└───────┬───────────────────────────────┬─────────────────────┘
        ↓ /                             ↓ /api
┌───────────────┐               ┌───────────────────┐
│  Next.js 前端  │               │   FastAPI 后端     │
│  (SSR + CSR)  │               │   (REST API)      │
└───────────────┘               └─────────┬─────────┘
                                          ↓
                    ┌─────────────────────┼─────────────────────┐
                    ↓                     ↓                     ↓
             ┌────────────┐      ┌──────────────┐      ┌──────────────┐
             │ PostgreSQL  │      │    Redis      │      │    MinIO     │
             │  主数据库   │      │  缓存/Session │      │  文件存储    │
             └────────────┘      └──────────────┘      └──────────────┘
                    ↓                                          ↓
             ┌────────────┐                          ┌──────────────┐
             │   Celery   │                          │  AI 网关服务  │
             │  异步任务   │                          │ (Claude API) │
             └────────────┘                          └──────────────┘
```

---

## 二、技术选型

### 2.1 前端

```
核心框架：   Next.js 14（App Router）
样式：       Tailwind CSS + shadcn/ui
状态管理：   Zustand（全局状态）+ React Query（服务端状态）
实时通信：   Socket.io（AI流式输出、通知推送）
可视化：     D3.js（向量空间可视化、雷达图）
工作流画布： ReactFlow（阶段三实验台、阶段四概念展示）
代码编辑器： Monaco Editor（阶段五代码展示、代码路径辅助）
HTTP客户端： Axios
```

### 2.2 后端

```
框架：       FastAPI（Python 3.11）
数据库ORM：  SQLAlchemy 2.0 + Alembic（数据库迁移）
主数据库：   PostgreSQL 16
缓存：       Redis 7（Session、限流、任务队列）
文件存储：   MinIO（自托管S3兼容对象存储）
异步任务：   Celery + Redis（向量化处理、AI评审等耗时任务）
WebSocket：  FastAPI WebSocket + Socket.io
认证：       JWT（python-jose）
密码加密：   bcrypt
数据验证：   Pydantic v2
AI智能体：   LangGraph（平台核心AI功能的智能体框架）
LLM调用：    openai SDK（兼容硅基流动/OpenAI）+ anthropic SDK
```

### 2.3 AI能力层

```
模型提供商（多提供商路由）：

  硅基流动 SiliconFlow（主要，开发阶段默认）
    · API格式兼容OpenAI SDK，base_url切换即可
    · LLM：Qwen2.5-72B、DeepSeek-V3、GLM-4等主流模型
    · Embedding：BAAI/bge-m3、bge-large-zh等
    · 优势：一个Key调用几十个模型，便于开发阶段对比测试
    · 用途：开发测试、成本敏感的高频调用

  Anthropic Claude API（生产级核心能力）
    · claude-sonnet-4-20250514（角色扮演、深度评审）
    · claude-haiku-4-5-20251001（高频低成本调用）
    · 用途：对角色扮演和推理质量要求高的场景

  OpenAI API（备用）
    · text-embedding-3-small（备用Embedding）

AI网关：     自研（统一路由、限流、Token统计）
  · 每个usage_type独立配置提供商和模型
  · 通过配置切换，不需要改代码
  · 开发阶段默认硅基流动，生产阶段按需切换Anthropic
```

### 2.4 平台AI智能体层

平台自身的AI功能使用LangGraph构建，运行在后端服务内部，
通过AI网关调用模型，不直接调用模型API。

```
框架：LangGraph（基于LangChain生态）
运行位置：后端服务层（FastAPI调用LangGraph Graph）
调用链：FastAPI → LangGraph Graph → AI网关 → 模型提供商
```

**四个核心智能体：**

**1. 客户模拟智能体（ClientAgent）**
```python
class ClientState(TypedDict):
    messages: list
    visit_round: int
    revealed_info: list       # 已透露的隐藏信息层
    impression_score: float   # 对学生的印象评分
    session_end_triggered: bool

# Graph节点：
# 判断对话阶段 → 决定信息释放 → 判断是否结束 → 生成回复 → 更新印象分
```
负责：多轮对话状态管理、隐藏信息层控制、记忆摘要生成、结束时机判断

**2. 文档评审智能体（ReviewerAgent）**
```python
class ReviewerState(TypedDict):
    document_content: dict    # 当前文档内容
    review_history: list      # 追问历史
    challenge_count: int      # 同一问题追问次数（决定A/B风格切换）
    red_flags: list
    yellow_flags: list

# Graph节点：
# 分析文档节 → 判断问题类型 → 选择追问风格 → 生成追问 → 更新标志位
```
负责：逐节文档分析、红灯/黄灯判断、A/B风格追问切换、跨文档联动检查

**3. 导师助手智能体（TutorAgent）**
```python
# 轻量化设计，走Haiku模型
# 感知当前阶段和步骤上下文
# 严格限制回答范围（不超出当前阶段知识边界）
# 不给直接答案，只给方向性引导
```
负责：全程学习引导、上下文感知问答、知识边界控制

**4. 画像生成智能体（ProfileAgent）**
```python
# 汇总五阶段全量数据（检查点、评分、对话质量、文档质量）
# 多维度能力评估（五个能力维度）
# 生成结构化画像数据 + 文字评语
```
负责：学习数据汇总分析、能力维度评分、文字评语生成

**与阶段四的关系说明：**
```
平台自身AI智能体（LangGraph）：
  运行在后端，是平台功能的一部分
  学生感知到的是"AI客户"、"AI评审官"等角色

学生在阶段四开发的AI智能体：
  低代码路径：学生在Dify里搭建，运行在Dify环境
  代码路径：学生在本地用LangGraph开发，运行在学生自己环境
  两者是学生的作业产出，不是平台功能
```

### 2.4 基础设施

```
容器化：     Docker + Docker Compose
反向代理：   Nginx
服务器：     Linux（Ubuntu 22.04 LTS）云服务器
进程守护：   Docker restart policy
日志：       Python logging + Docker logs
CI/CD：      GitHub Actions（后续迭代添加）
```

---

## 三、项目目录结构

```
edu-fde/
│
├── frontend/                    # Next.js 前端
│   ├── app/
│   │   ├── (auth)/             # 登录注册页面组
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── dashboard/          # 学生主控台
│   │   ├── lab/
│   │   │   └── [sessionId]/    # 实验室主界面（核心）
│   │   ├── teacher/            # 教师端
│   │   │   ├── courses/
│   │   │   ├── students/
│   │   │   └── grading/
│   │   └── admin/              # 管理员端
│   │       ├── institutions/
│   │       └── templates/
│   │
│   ├── components/
│   │   ├── lab/                # 实验室核心组件
│   │   │   ├── GuidePanel/     # 左侧引导面板
│   │   │   ├── WorkArea/       # 右侧工作区容器
│   │   │   └── stages/         # 五个阶段工作区
│   │   │       ├── Stage1/     # 售前需求挖掘
│   │   │       │   ├── TeachingMode/
│   │   │       │   └── CombatMode/
│   │   │       ├── Stage2/     # 需求拆解与分析
│   │   │       ├── Stage3/     # 知识库搭建
│   │   │       │   ├── ChunkingLab/    # 分块实验台
│   │   │       │   ├── RetrievalLab/   # 召回实验台
│   │   │       │   └── VectorViz/      # 向量空间可视化
│   │   │       ├── Stage4/     # 智能体开发
│   │   │       │   ├── Novice/         # 新手村
│   │   │       │   ├── LowCode/        # Dify路径
│   │   │       │   └── CodePath/       # LangGraph路径
│   │   │       └── Stage5/     # 部署交付验收
│   │   │           ├── LowCode/
│   │   │           └── CodePath/
│   │   └── shared/             # 通用组件
│   │       ├── ConceptCard/    # 知识点卡片
│   │       ├── CheckpointBadge/
│   │       ├── ScoreRadar/     # 雷达图
│   │       └── ProgressTree/   # 进度树
│   │
│   ├── stores/                 # Zustand状态管理
│   │   ├── authStore.ts
│   │   ├── sessionStore.ts     # 实验会话状态
│   │   └── uiStore.ts
│   │
│   ├── hooks/                  # 自定义Hook
│   ├── lib/                    # 工具函数
│   └── types/                  # TypeScript类型定义
│
├── backend/                    # FastAPI 后端
│   ├── app/
│   │   ├── main.py             # 应用入口
│   │   ├── config.py           # 配置管理
│   │   │
│   │   ├── api/                # API路由
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── users.py
│   │   │   │   ├── institutions.py
│   │   │   │   ├── courses.py
│   │   │   │   ├── templates.py
│   │   │   │   ├── sessions.py     # 实验会话
│   │   │   │   ├── stages/         # 各阶段API
│   │   │   │   │   ├── stage1.py
│   │   │   │   │   ├── stage2.py
│   │   │   │   │   ├── stage3.py
│   │   │   │   │   ├── stage4.py
│   │   │   │   │   └── stage5.py
│   │   │   │   ├── ai_gateway.py   # AI能力网关
│   │   │   │   ├── analytics.py    # 数据分析
│   │   │   │   └── notifications.py
│   │   │   └── websocket.py    # WebSocket处理
│   │   │
│   │   ├── models/             # SQLAlchemy数据模型
│   │   │   ├── user.py
│   │   │   ├── institution.py
│   │   │   ├── course.py
│   │   │   ├── experiment.py
│   │   │   ├── stage.py
│   │   │   ├── document.py
│   │   │   └── analytics.py
│   │   │
│   │   ├── schemas/            # Pydantic请求/响应模型
│   │   │
│   │   ├── services/           # 业务逻辑层
│   │   │   ├── auth_service.py
│   │   │   ├── session_service.py
│   │   │   ├── stage1_service.py   # 阶段一业务逻辑
│   │   │   ├── stage2_service.py
│   │   │   ├── stage3_service.py
│   │   │   ├── stage4_service.py
│   │   │   ├── stage5_service.py
│   │   │   ├── ai_gateway.py       # AI调用统一入口
│   │   │   ├── scoring_service.py  # 评分服务
│   │   │   └── profile_service.py  # 学习画像服务
│   │   │
│   │   ├── workers/            # Celery异步任务
│   │   │   ├── celery_app.py
│   │   │   ├── ai_tasks.py     # AI评审异步任务
│   │   │   ├── scoring_tasks.py
│   │   │   └── report_tasks.py
│   │   │
│   │   └── utils/              # 工具函数
│   │       ├── security.py
│   │       ├── storage.py      # MinIO操作
│   │       └── validators.py
│   │
│   ├── migrations/             # Alembic数据库迁移
│   ├── tests/                  # 测试
│   └── requirements.txt
│
├── nginx/                      # Nginx配置
│   └── nginx.conf
│
├── docker-compose.yml          # 开发环境
├── docker-compose.prod.yml     # 生产环境
└── .env.example                # 环境变量模板
```

---

## 四、核心API设计

### 4.1 认证相关

```
POST   /api/v1/auth/login           # 登录
POST   /api/v1/auth/logout          # 登出
POST   /api/v1/auth/refresh         # 刷新Token
POST   /api/v1/auth/change-password # 修改密码
```

### 4.2 实验会话

```
GET    /api/v1/sessions                      # 获取我的实验列表
POST   /api/v1/sessions                      # 创建新实验会话
GET    /api/v1/sessions/{id}                 # 获取会话详情和进度
PATCH  /api/v1/sessions/{id}/stage          # 推进到下一阶段
```

### 4.3 阶段一 API

```
GET    /api/v1/sessions/{id}/stage1/config          # 获取阶段配置
POST   /api/v1/sessions/{id}/stage1/message         # 发送对话消息（流式）
GET    /api/v1/sessions/{id}/stage1/messages        # 获取对话历史
POST   /api/v1/sessions/{id}/stage1/end-visit       # 结束本次拜访
POST   /api/v1/sessions/{id}/stage1/submit-summary  # 提交拜访间整理
GET    /api/v1/sessions/{id}/stage1/evaluation      # 获取AI评估结果
```

### 4.4 阶段二 API

```
GET    /api/v1/sessions/{id}/stage2/documents            # 获取文档列表和状态
PUT    /api/v1/sessions/{id}/stage2/documents/{type}     # 保存文档内容（草稿）
POST   /api/v1/sessions/{id}/stage2/documents/{type}/submit  # 提交文档节触发AI追问
GET    /api/v1/sessions/{id}/stage2/review-history       # 获取AI追问历史
POST   /api/v1/sessions/{id}/stage2/documents/{type}/review  # 请求文档整体评审
```

### 4.5 阶段三 API

```
GET    /api/v1/stage3/demo-kb/chunk         # 演示知识库分块可视化
POST   /api/v1/stage3/demo-kb/retrieval     # 演示知识库召回测试
POST   /api/v1/stage3/demo-kb/hit-rate      # 演示知识库Hit Rate评估
GET    /api/v1/stage3/vector-viz            # 向量空间可视化数据
POST   /api/v1/sessions/{id}/stage3/decision # 提交知识库配置决策文档
```

### 4.6 阶段四 API

```
GET    /api/v1/sessions/{id}/stage4/config          # 获取阶段配置和验收标准
POST   /api/v1/sessions/{id}/stage4/submit-link     # 提交Dify应用链接
POST   /api/v1/sessions/{id}/stage4/run-acceptance  # 触发自动化验收测试
GET    /api/v1/sessions/{id}/stage4/acceptance-result # 获取验收测试结果
POST   /api/v1/sessions/{id}/stage4/submit-design   # 提交设计说明
```

### 4.7 阶段五 API

```
POST   /api/v1/sessions/{id}/stage5/submit-server   # 提交服务器地址
POST   /api/v1/sessions/{id}/stage5/run-acceptance  # 触发验收测试
GET    /api/v1/sessions/{id}/stage5/acceptance-result
POST   /api/v1/sessions/{id}/stage5/submit-delivery # 提交交付文档
```

### 4.8 教师端 API

```
GET    /api/v1/teacher/courses              # 课程列表
POST   /api/v1/teacher/courses              # 创建课程
GET    /api/v1/teacher/courses/{id}/students # 课程学生列表和进度
GET    /api/v1/teacher/grading/pending      # 待评分列表
POST   /api/v1/teacher/grading/{id}         # 提交教师评分
```

---

## 五、AI网关设计

### 5.1 统一调用接口

所有AI调用必须经过AI网关，不允许在业务服务中直接调用Claude API：

```python
# 使用方式（业务服务层调用）
from app.services.ai_gateway import ai_gateway

response = await ai_gateway.chat(
    usage_type="ai_client",          # 用途标识，用于路由和统计
    messages=conversation_history,
    system_prompt=client_persona,
    session_id=session_id,
    user_id=user_id,
    institution_id=institution_id,
    stream=True                      # 支持流式输出
)
```

### 5.2 模型路由表

每个usage_type独立配置提供商和模型，通过配置切换，不改代码：

```python
MODEL_ROUTING = {
    # 开发阶段默认配置（硅基流动）
    "ai_client": {
        "provider": "siliconflow",
        "model": "Qwen/Qwen2.5-72B-Instruct",
        # 生产切换：{"provider": "anthropic", "model": "claude-sonnet-4-20250514"}
    },
    "ai_tutor": {
        "provider": "siliconflow",
        "model": "Qwen/Qwen2.5-7B-Instruct",
        # 生产切换：{"provider": "anthropic", "model": "claude-haiku-4-5-20251001"}
    },
    "doc_review": {
        "provider": "siliconflow",
        "model": "deepseek-ai/DeepSeek-V3",
        # 生产切换：{"provider": "anthropic", "model": "claude-sonnet-4-20250514"}
    },
    "design_review": {
        "provider": "siliconflow",
        "model": "deepseek-ai/DeepSeek-V3",
    },
    "memory_summary": {
        "provider": "siliconflow",
        "model": "Qwen/Qwen2.5-7B-Instruct",
    },
    "profile_gen": {
        "provider": "siliconflow",
        "model": "deepseek-ai/DeepSeek-V3",
    },
    "report_gen": {
        "provider": "siliconflow",
        "model": "Qwen/Qwen2.5-7B-Instruct",
    },
    "embedding": {
        "provider": "siliconflow",
        "model": "BAAI/bge-m3",
    },
}

# 提供商端点配置
PROVIDER_CONFIG = {
    "siliconflow": {
        "base_url": "https://api.siliconflow.cn/v1",
        "api_key_env": "SILICONFLOW_API_KEY",
        "sdk": "openai",  # 兼容OpenAI SDK
    },
    "anthropic": {
        "base_url": None,  # 使用默认
        "api_key_env": "ANTHROPIC_API_KEY",
        "sdk": "anthropic",
    },
    "openai": {
        "base_url": None,
        "api_key_env": "OPENAI_API_KEY",
        "sdk": "openai",
    },
}
```

### 5.3 限流配置

```python
RATE_LIMITS = {
    # 学生级别
    "student_chat_per_minute":    10,   # 对话消息每分钟
    "student_review_per_hour":    20,   # AI评审每小时

    # 机构级别（按Token配额）
    "institution_token_warning":  0.8,  # Token消耗超过80%预警
    "institution_token_limit":    1.0,  # Token消耗超过100%限流
}
```

---

## 六、数据库设计总览

### 6.1 完整表清单

```
认证与用户：
  users                   用户表
  refresh_tokens          Refresh Token表

院校与授权：
  institutions            院校表

课程管理：
  courses                 课程表
  course_students         课程学生关联表

实验包：
  experiment_templates    实验包模板表
  stage_configs           阶段配置表（每模板5条）

学习过程：
  experiment_sessions     实验会话表
  stage_records           阶段记录表
  checkpoint_records      检查点记录表
  interview_messages      阶段一对话记录表
  document_submissions    阶段二文档提交记录表

评分与画像：
  learning_profiles       学习画像表
  teacher_grades          教师评分表

系统：
  token_usage_logs        Token消耗记录表
  notifications           通知表
  file_records            文件记录表
```

### 6.2 索引策略

```sql
-- 高频查询索引
CREATE INDEX idx_users_institution ON users(institution_id);
CREATE INDEX idx_sessions_student ON experiment_sessions(student_id, institution_id);
CREATE INDEX idx_sessions_course ON experiment_sessions(course_id);
CREATE INDEX idx_stage_records_session ON stage_records(session_id);
CREATE INDEX idx_messages_session ON interview_messages(session_id, visit_round);
CREATE INDEX idx_token_logs_institution ON token_usage_logs(institution_id, created_at);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
```

---

## 七、环境配置

### 7.1 环境变量（.env）

```bash
# 应用
APP_ENV=production
SECRET_KEY=your-secret-key-here
ALLOWED_ORIGINS=https://yourdomain.com

# 数据库
DATABASE_URL=postgresql://user:password@localhost:5432/edufde
REDIS_URL=redis://localhost:6379/0

# AI服务
ANTHROPIC_API_KEY=your-anthropic-api-key
SILICONFLOW_API_KEY=your-siliconflow-api-key
OPENAI_API_KEY=your-openai-api-key       # 备用

# AI网关默认提供商（开发阶段用siliconflow，生产阶段可切换anthropic）
AI_DEFAULT_PROVIDER=siliconflow

# 文件存储
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=your-access-key
MINIO_SECRET_KEY=your-secret-key
MINIO_BUCKET=edufde
MINIO_SECURE=false

# Celery
CELERY_BROKER_URL=redis://localhost:6379/1
CELERY_RESULT_BACKEND=redis://localhost:6379/2
```

### 7.2 Docker Compose（生产）

```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend

  frontend:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=https://yourdomain.com/api
    restart: unless-stopped

  backend:
    build: ./backend
    env_file: .env
    depends_on:
      - postgres
      - redis
    restart: unless-stopped

  celery:
    build: ./backend
    command: celery -A app.workers.celery_app worker --loglevel=info
    env_file: .env
    depends_on:
      - redis
    restart: unless-stopped

  postgres:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      POSTGRES_DB: edufde
      POSTGRES_USER: edufde
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    restart: unless-stopped

  minio:
    image: minio/minio
    command: server /data --console-address ":9001"
    volumes:
      - minio_data:/data
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

---

## 八、安全设计

```
认证安全：
  · JWT Access Token 2小时过期
  · Refresh Token 30天过期，存储在HttpOnly Cookie
  · 所有API需要Authorization Header验证

数据安全：
  · institution_id在服务层强制注入，不依赖客户端传参
  · 敏感配置（API Key等）只存在服务端环境变量
  · 文件访问通过预签名URL，不直接暴露存储地址
  · 密码使用bcrypt加密存储

传输安全：
  · 生产环境强制HTTPS
  · Nginx配置HSTS头
  · CORS只允许配置的域名

输入验证：
  · 所有API输入通过Pydantic Schema验证
  · 文件上传限制类型和大小
  · AI对话内容长度限制
```

---

## 九、性能考量

```
前端：
  · Next.js SSR减少首屏加载时间
  · React Query缓存减少重复请求
  · 静态资源CDN（后续迭代）

后端：
  · FastAPI异步处理，支持高并发
  · Redis缓存热点数据（实验包配置、用户信息）
  · Celery异步处理耗时任务（AI评审、向量化）
  · 数据库连接池（SQLAlchemy）

AI调用：
  · 流式输出（Stream）减少首字节时延
  · Celery异步处理非实时AI任务
  · Redis缓存相同Prompt的重复调用结果（谨慎使用）
```

---

## 十、后续技术迭代计划

```
v1.1：
  · GitHub Actions CI/CD流水线
  · 自动化测试覆盖率提升
  · 错误监控（Sentry集成）

v1.2：
  · WebSocket实时通知替换轮询
  · 前端性能优化（Bundle分析、懒加载）

v2.0：
  · 多租户升级：行级隔离 → Schema隔离
  · 数据库读写分离
  · CDN静态资源加速

v3.0：
  · Docker Compose → Kubernetes
  · 微服务拆分（AI网关独立服务）
  · 全链路监控（Prometheus + Grafana）
```

---

*文档版本：v1.1 | 变更说明：新增硅基流动多提供商路由支持、新增LangGraph平台AI智能体层设计 | 下一步：MVP开发计划制定*
