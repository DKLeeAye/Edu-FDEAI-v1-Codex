# EduFDE · 平台底层能力设计文档
# Platform Infrastructure Design

> 版本：v1.0 | 状态：已达成共识 | 日期：2026-04-28

---

## 一、总体架构原则

### 多租户隔离方案：行级隔离（方案A）

MVP阶段采用单库单表、行级隔离方式，所有院校数据共享同一数据库，每条记录携带`institution_id`字段，所有查询强制过滤。

```
当前方案（MVP）：
  单一数据库 + institution_id行级过滤
  · 实现简单，开发快
  · 代码层做强制过滤保障安全
  · 适合初期院校数量少的阶段

后续迭代升级路径：
  v2.0：迁移至Schema隔离（每院校独立Schema）
  v3.0：支持超大客户独立数据库实例部署
  迁移触发条件：单个院校学生数超过500人，
              或有客户提出严格数据隔离要求
```

### 核心设计约定

**institution_id强制过滤规则：**
所有涉及学生数据、实验数据、评分数据的查询，后端服务层必须强制注入`institution_id`过滤条件，禁止在API层直接透传用户输入的institution_id。

---

## 二、模块一：用户与权限体系

### 2.1 四个角色定义

```
角色层级（权限递减）：

超级管理员（platform_admin）
  归属：平台运营方（你们团队）
  权限：
    · 管理所有院校和License
    · 查看全平台数据统计和使用情况
    · 创建和维护实验包内容
    · 管理平台配置和AI网关

院校管理员（institution_admin）
  归属：各院校IT部门或教务处
  权限：
    · 管理本校所有账号（创建/停用教师和学生）
    · 查看本校资源使用情况（账号数、存储、Token消耗）
    · 不能查看学生具体学习内容和成绩

教师（teacher）
  归属：各院校授课教师
  权限：
    · 创建和管理课程（关联实验包，分配学生）
    · 查看所管理课程内所有学生的进度和评分
    · 对学生提交的设计说明进行主观评分
    · 不能跨课程查看数据
    · 不能查看不属于自己课程的学生数据

学生（student）
  归属：在校学生
  权限：
    · 参与被分配到的课程实验
    · 查看自己的学习进度、评分和学习画像
    · 不能查看其他学生的任何数据
```

### 2.2 数据模型

```sql
-- 用户表
users (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,        -- 所属院校
  role            ENUM('platform_admin', 'institution_admin',
                       'teacher', 'student'),
  name            VARCHAR(100) NOT NULL,
  email           VARCHAR(200) UNIQUE NOT NULL,
  password_hash   VARCHAR(200) NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW(),
  last_login_at   TIMESTAMP
)
```

### 2.3 认证方案

```
认证方式：JWT Token
  · Access Token：有效期2小时
  · Refresh Token：有效期30天
  · Token中携带：user_id、role、institution_id
  · 每次请求服务端验证Token并提取institution_id

密码策略（MVP简化版）：
  · 最少8位，包含字母和数字
  · 首次登录强制修改默认密码
  · 不设复杂的密码过期策略（后续迭代添加）
```

---

## 三、模块二：院校与授权管理

### 3.1 License模型

```sql
-- 院校表
institutions (
  id              UUID PRIMARY KEY,
  name            VARCHAR(200) NOT NULL,
  contact_name    VARCHAR(100),
  contact_email   VARCHAR(200),
  license_type    ENUM('trial', 'standard', 'premium'),
  max_students    INT NOT NULL,          -- 最大学生账号数
  storage_quota   BIGINT NOT NULL,       -- 存储配额（字节）
  token_quota     BIGINT,                -- 月Token消耗上限（NULL=不限）
  expires_at      TIMESTAMP NOT NULL,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
)
```

### 3.2 License规格（初步定义）

```
试用版（trial）：
  · 学生账号：20个
  · 存储：5GB
  · Token：每月100万
  · 有效期：30天
  · 适用：院校评估试用

标准版（standard）：
  · 学生账号：200个
  · 存储：50GB
  · Token：每月500万
  · 有效期：1年
  · 适用：单个专业或小规模使用

高级版（premium）：
  · 学生账号：1000个
  · 存储：200GB
  · Token：每月2000万
  · 有效期：1年
  · 适用：全校大规模使用
```

### 3.3 配额超出处理

```
学生账号超出：
  · 院校管理员无法创建新学生账号
  · 显示明确提示："账号数已达上限，请联系升级License"

存储超出：
  · 学生无法上传新文件
  · 已有数据不受影响

Token超出：
  · AI功能降级：AI客户对话、AI评审暂停
  · 学生可以继续完成不依赖AI的操作
  · 显示提示并通知院校管理员

License到期：
  · 只读模式：学生可以查看历史数据，不能开始新实验
  · 教师可以查看和下载学生数据
  · 30天后数据进入归档状态
```

### 3.4 院校注册流程

```
Step 1：超级管理员后台
  创建院校记录 → 配置License → 生成邀请码（有效期7天）

Step 2：院校管理员
  使用邀请码注册院校管理员账号 → 激活License

Step 3：院校管理员操作
  方式一：手动创建教师账号（逐个添加）
  方式二：批量导入（上传Excel模板）
  → 系统发送邮件通知教师设置密码

Step 4：教师操作
  创建课程 → 关联实验包 →
  方式一：手动添加学生到课程
  方式二：生成课程邀请链接（学生自助注册）
```

---

## 四、模块三：实验包管理系统

### 4.1 创建与维护权限

**MVP阶段：仅超级管理员（平台运营团队）可创建和维护实验包。**

不对教师开放创建入口，保证实验包质量的统一性。

```
后续迭代升级计划：
  v2.0：开放教师创建实验包（基础模板填写）
  v2.5：实验包市场（教师可发布、分享、下载其他教师的实验包）
  触发条件：平台稳定运行，有教师提出强烈需求
```

### 4.2 实验包数据结构

```sql
-- 实验包模板表
experiment_templates (
  id              UUID PRIMARY KEY,
  title           VARCHAR(200) NOT NULL,
  industry        VARCHAR(100),           -- 行业（制造、医疗、零售等）
  difficulty      ENUM('beginner', 'standard', 'advanced'),
  visit_rounds    INT DEFAULT 1,          -- 实战模式拜访轮次
  estimated_hours FLOAT,                  -- 预计完成时长（小时）
  description     TEXT,
  is_published    BOOLEAN DEFAULT false,  -- 是否对院校可见
  created_by      UUID REFERENCES users(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
)

-- 阶段配置表（每个实验包有五条记录，对应五个阶段）
stage_configs (
  id              UUID PRIMARY KEY,
  template_id     UUID REFERENCES experiment_templates(id),
  stage_num       INT NOT NULL,           -- 1-5
  config          JSONB NOT NULL,         -- 阶段专属配置（见下方）
  passing_score   INT DEFAULT 60,         -- 通过分数线
  created_at      TIMESTAMP DEFAULT NOW()
)
```

### 4.3 各阶段Config字段详细结构

**阶段一 Config（JSONB）：**

```json
{
  "ai_client": {
    "name": "张厂长",
    "age": 48,
    "position": "生产部门负责人",
    "personality": "务实、对技术半懂不懂、预算敏感",
    "surface_info": [
      "工厂有质检问题",
      "人工漏检率大概10%"
    ],
    "hidden_layer_1": [
      "现有一套老旧MES系统",
      "质检员流动率高"
    ],
    "hidden_layer_2": [
      "MES系统数据质量很差",
      "真实预算只有20万"
    ],
    "hidden_layer_3": [
      "明年有大客户审厂，质检记录需要数字化"
    ],
    "defense_rules": {
      "budget": "先回避，被追问会说'你们先报方案'",
      "technical_details": "不懂装硬撑，用模糊语言带过"
    },
    "dialog_style": "直接，不喜欢绕弯子，经常说'这个能落地吗'"
  },
  "teaching_checkpoints": [
    {
      "round": 1,
      "key": "establish_rapport",
      "description": "建立信任，让客户愿意开口",
      "scoring_criteria": "客户状态从防御变为配合"
    }
  ],
  "combat_end_triggers": [
    "行了，你先整理一下，下次来再谈",
    "我这边还有个会，咱下次再聊"
  ],
  "evaluation_dimensions": {
    "status_survey": 0.2,
    "pain_point": 0.2,
    "expectation": 0.15,
    "constraint": 0.2,
    "data": 0.15,
    "summary": 0.1
  }
}
```

**阶段二 Config（JSONB）：**

```json
{
  "red_light_rules": [
    "核心需求方向判断错误",
    "客户痛点完全未提炼",
    "文档存在明显逻辑矛盾"
  ],
  "yellow_light_rules": [
    "信息有遗漏但方向正确",
    "某维度描述不够具体"
  ],
  "reference_answers": {
    "core_requirement": "...",
    "feasibility_conclusion": "...",
    "tech_stack_recommendation": "..."
  },
  "ai_reviewer_persona": "严格的技术评审官",
  "framework_visibility": {
    "first_attempt": "full",
    "second_attempt": "headers_only",
    "third_plus": "blank"
  }
}
```

**阶段三 Config（JSONB）：**

```json
{
  "materials": [
    {
      "filename": "质检报告样本.pdf",
      "description": "50份质检报告，含合格/不合格",
      "file_key": "s3://bucket/templates/mfg/reports.pdf"
    }
  ],
  "recommended_strategy": {
    "chunk_strategy": "recursive",
    "chunk_size": 500,
    "overlap": 50,
    "retrieval_strategy": "hybrid",
    "vector_weight": 0.6,
    "keyword_weight": 0.4
  },
  "hit_rate_test_set": [
    {
      "question": "零件漏检率如何统计？",
      "answer_chunk_ids": ["chunk_23", "chunk_24"]
    }
  ],
  "passing_hit_rate": 0.6,
  "recommended_hit_rate": 0.8
}
```

**阶段四 Config（JSONB）：**

```json
{
  "standard_qa_tests": [
    {
      "question": "质检操作规范第三条是什么？",
      "expected_keywords": ["操作规范", "质检"],
      "is_in_scope": true
    },
    {
      "question": "今天股市行情怎么样？",
      "expected_behavior": "refuse",
      "is_in_scope": false
    }
  ],
  "multi_turn_test": [
    {"role": "user", "content": "漏检率超标的处理流程是什么？"},
    {"role": "user", "content": "刚才说的第一步具体怎么操作？"}
  ],
  "required_workflow_nodes": ["input", "knowledge_retrieval", "llm", "output"]
}
```

**阶段五 Config（JSONB）：**

```json
{
  "health_check_path": "/health",
  "acceptance_tests": [
    {
      "type": "http_get",
      "path": "/health",
      "expected_status": 200
    },
    {
      "type": "qa_test",
      "questions": ["..."]
    },
    {
      "type": "restart_recovery",
      "description": "重启容器后服务自动恢复"
    }
  ]
}
```

### 4.4 原材料文件存储

```
存储方案：MinIO（自托管对象存储）

文件组织结构：
  /templates/{template_id}/materials/   平台预置原材料
  /sessions/{session_id}/uploads/       学生上传文件
  /sessions/{session_id}/outputs/       学生输出物

访问控制：
  · 原材料：所有注册学生可读，不可写
  · 学生文件：仅本人可读写，教师可读
  · 通过预签名URL提供临时访问，不直接暴露存储地址
```

---

## 五、模块四：学习进度与状态管理

### 5.1 核心数据模型

```sql
-- 课程表（教师创建，关联实验包）
courses (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  teacher_id      UUID REFERENCES users(id),
  template_id     UUID REFERENCES experiment_templates(id),
  name            VARCHAR(200) NOT NULL,
  semester        VARCHAR(50),
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMP DEFAULT NOW()
)

-- 课程学生关联表
course_students (
  course_id       UUID REFERENCES courses(id),
  student_id      UUID REFERENCES users(id),
  enrolled_at     TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (course_id, student_id)
)

-- 实验会话表（一个学生一次实验的完整记录）
experiment_sessions (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  student_id      UUID REFERENCES users(id),
  course_id       UUID REFERENCES courses(id),
  template_id     UUID REFERENCES experiment_templates(id),
  attempt_number  INT DEFAULT 1,          -- 同一实验的第几次尝试
  status          ENUM('not_started', 'in_progress', 'completed'),
  current_stage   INT DEFAULT 1,
  dev_path        ENUM('low_code', 'code') NULL,  -- 阶段四路径选择
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  total_score     FLOAT,
  created_at      TIMESTAMP DEFAULT NOW()
)

-- 阶段记录表
stage_records (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  session_id      UUID REFERENCES experiment_sessions(id),
  stage_num       INT NOT NULL,
  status          ENUM('not_started', 'teaching', 'combat', 'completed'),
  skipped_teaching BOOLEAN DEFAULT false,  -- 是否跳过教学模式
  started_at      TIMESTAMP,
  completed_at    TIMESTAMP,
  auto_score      FLOAT,
  ai_score        FLOAT,
  teacher_score   FLOAT,
  final_score     FLOAT,
  yellow_flags    JSONB DEFAULT '[]'       -- 黄灯债务记录
)

-- 检查点记录表
checkpoint_records (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  stage_record_id UUID REFERENCES stage_records(id),
  checkpoint_key  VARCHAR(100) NOT NULL,
  passed          BOOLEAN NOT NULL,
  attempt_count   INT DEFAULT 1,
  data            JSONB,                   -- 检查点相关的原始数据
  passed_at       TIMESTAMP
)

-- 对话记录表（阶段一）
interview_messages (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  session_id      UUID REFERENCES experiment_sessions(id),
  visit_round     INT DEFAULT 1,
  role            ENUM('student', 'ai_client'),
  content         TEXT NOT NULL,
  timestamp       TIMESTAMP DEFAULT NOW()
)

-- 文档提交记录表（阶段二）
document_submissions (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  stage_record_id UUID REFERENCES stage_records(id),
  doc_type        ENUM('requirements', 'feasibility', 'architecture'),
  content         JSONB NOT NULL,          -- 文档结构化内容
  version         INT DEFAULT 1,
  ai_review       JSONB,                   -- AI评审结果
  submitted_at    TIMESTAMP DEFAULT NOW()
)
```

### 5.2 状态流转规则

```
实验会话状态流转：
  not_started
    ↓ 学生点击开始
  in_progress
    ↓ 五个阶段全部completed
  completed

阶段状态流转：
  not_started
    ↓ 学生进入该阶段
  teaching（或直接跳到combat，记录skipped_teaching=true）
    ↓ 进入实战模式
  combat
    ↓ 通过验收
  completed

跨阶段推进规则：
  · 当前阶段status=completed，下一阶段才解锁
  · 阶段二红灯未清除，不能推进到completed
  · 阶段三Hit Rate未达60%，不能推进到completed
  · 阶段四验收测试未通过，不能推进到completed
  · 阶段五验收通过，整个session标记为completed
```

### 5.3 教学模式跳过记录

```
跳过教学模式的处理：
  · skipped_teaching字段记录为true
  · 不影响学生通过实验
  · 记录在学习画像中，教师可见
  · 画像描述：
    "该学生选择跳过教学引导，直接进入实战模式"
    不做负面评价，只是客观记录学习路径
```

---

## 六、模块五：评分与学习画像系统

### 6.1 评分三层架构

```
第一层：自动评分（客观，实时生成）
  触发时机：检查点通过、验收测试完成
  评分内容：
    · 检查点完成率
    · 验收测试通过情况
    · Hit Rate等量化指标
  权重：占各阶段总分的60%

第二层：AI评审（半客观，提交后异步生成）
  触发时机：学生提交设计说明、完成对话
  评分内容：
    · 阶段一：访谈质量（六维度覆盖率）
    · 阶段二：文档质量（准确性、完整性、逻辑性）
    · 阶段四五：设计说明质量
  权重：占各阶段总分的30%

第三层：教师评分（主观，异步）
  触发时机：教师主动进入评分界面
  评分内容：AI评审可能误判的主观内容
  规则：
    · 教师评分可以覆盖AI评审结果
    · 教师未评分时，该10%按AI评审结果填充
  权重：占各阶段总分的10%
```

### 6.2 各阶段权重

```
综合得分计算：

  阶段一 × 20%
  阶段二 × 20%
  阶段三 × 15%
  阶段四 × 30%   ← 最高，核心实操环节
  阶段五 × 15%

  = 综合得分（满分100分）
```

### 6.3 学习画像生成

完成全部五个阶段后自动生成，包含以下维度：

```sql
-- 学习画像表
learning_profiles (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  session_id      UUID REFERENCES experiment_sessions(id),
  student_id      UUID REFERENCES users(id),

  -- 五阶段得分
  stage_scores    JSONB,  -- {stage1: 82, stage2: 71, ...}

  -- 能力维度分析
  ability_scores  JSONB,
  -- {
  --   client_communication: {score: 75, level: "中", comment: "..."},
  --   requirements_analysis: {score: 82, level: "强", comment: "..."},
  --   tech_selection: {score: 90, level: "强", comment: "..."},
  --   engineering: {score: 68, level: "中", comment: "..."},
  --   delivery: {score: 75, level: "中", comment: "..."}
  -- }

  -- 学习行为记录
  behavior_data   JSONB,
  -- {
  --   skipped_teaching_stages: [3],
  --   total_hours: 12.5,
  --   retry_counts: {stage1_combat: 3, stage2_doc1: 2},
  --   yellow_flags_count: 2,
  --   yellow_flags_cleared: 1
  -- }

  -- 文字评语
  highlights      TEXT,   -- 最值得肯定的表现
  improvements    TEXT,   -- 最值得加强的方向
  ai_summary      TEXT,   -- AI生成的综合评语

  generated_at    TIMESTAMP DEFAULT NOW()
)
```

### 6.4 教师评分界面设计

```
教师评分视图：

课程：[课程名称]  待评分：12人

学生列表：
  张三  阶段四设计说明  AI评审：78分  [查看并评分]
  李四  阶段五交付文档  AI评审：85分  [查看并评分]
  ...

评分界面：
  学生提交内容：[展示设计说明全文]
  AI评审结果：[展示AI的评审意见和给分]

  教师评分：
  工作流设计合理性  [  ] / 15分
  Prompt工程质量   [  ] / 15分
  问题解决描述     [  ] / 10分
  教师备注：[文本框]

  [提交评分]
```

---

## 七、模块六：AI能力网关

### 7.1 网关职责

```
统一管理职责：
  · 集中管理所有AI服务的API Key
  · API Key不暴露给前端，只在后端服务层调用
  · 按院校和学生统计Token消耗
  · 限流保护（防止异常调用）
  · 失败重试（最多3次，指数退避）
  · 降级处理（AI服务不可用时的fallback）
```

### 7.2 模型路由策略

```
场景                  模型              原因
────────────────────  ────────────────  ──────────────────
AI模拟客户对话        Claude Sonnet     角色扮演能力强
AI导师助手（教学）    Claude Haiku      高频调用，低成本
文档质量AI评审        Claude Sonnet     需要深度理解和判断
设计说明AI评审        Claude Sonnet     需要深度理解和判断
客户记忆摘要生成      Claude Haiku      结构化任务，低复杂度
学习画像文字生成      Claude Sonnet     需要综合分析能力
报告和总结生成        Claude Haiku      结构化输出，低复杂度
```

### 7.3 限流规则

```
学生级别限流：
  · AI客户对话：每分钟最多10条消息
  · AI评审请求：每小时最多20次
  · 防止学生刷请求消耗Token配额

院校级别限流：
  · 根据License的Token配额自动限流
  · 月度Token超出80%时发送预警通知
  · 超出100%时降级AI功能
```

### 7.4 Token消耗统计

```sql
-- Token消耗记录表
token_usage_logs (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  user_id         UUID REFERENCES users(id),
  session_id      UUID,
  usage_type      VARCHAR(50),  -- 'ai_client', 'ai_tutor', 'ai_review'等
  model           VARCHAR(100),
  input_tokens    INT NOT NULL,
  output_tokens   INT NOT NULL,
  total_tokens    INT NOT NULL,
  created_at      TIMESTAMP DEFAULT NOW()
)
```

---

## 八、模块七：通知与消息系统

### MVP阶段：站内消息

```
学生侧通知：
  · 关卡完成 → AI分析报告已生成，点击查看
  · 阶段验收通过 → 进入下一阶段
  · 教师完成评分 → 你的[阶段N]评分已更新
  · 黄灯提醒 → 进入[阶段N]时提示历史黄灯

教师侧通知：
  · 有学生完成实验，等待教师评分
  · 有学生在某阶段停滞超过7天（可配置）
  · 有学生实验会话完成

实现方式：
  MVP：数据库轮询 + 页面顶部通知角标
  后续迭代：WebSocket实时推送 + 邮件通知
```

```sql
-- 通知表
notifications (
  id              UUID PRIMARY KEY,
  institution_id  UUID NOT NULL,
  user_id         UUID REFERENCES users(id),
  type            VARCHAR(50) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  content         TEXT,
  related_id      UUID,                   -- 关联的session/stage ID
  is_read         BOOLEAN DEFAULT false,
  created_at      TIMESTAMP DEFAULT NOW()
)
```

---

## 九、完整数据模型总览

```
核心表关系图：

institutions
    ↓ 1:N
users (role: admin/teacher/student)
    ↓
courses (teacher创建，关联template)
    ↓ M:N
course_students
    ↓
experiment_sessions (student × course × template)
    ↓ 1:5
stage_records (每阶段一条)
    ↓
checkpoint_records  interview_messages  document_submissions
    ↓
learning_profiles (完成后生成)

experiment_templates (平台维护)
    ↓ 1:5
stage_configs (每阶段配置)
```

---

## 十、后续迭代升级计划

### 平台架构升级

```
v1.x → v2.0（触发条件：单院校学生超500人或有严格隔离需求）
  · 多租户方案升级：行级隔离 → Schema隔离
  · 数据库读写分离
  · Redis缓存层加入

v2.0 → v3.0（触发条件：院校数量超50所）
  · 容器编排：Docker Compose → Kubernetes
  · 支持超大客户独立数据库实例
  · CI/CD流水线完善
```

### 功能迭代计划

```
v1.1：
  · 教师端完善（批量评分、班级对比分析）
  · 邮件通知系统
  · 第二个行业实验场景包

v1.2：
  · WebSocket实时通知
  · 学生互评功能
  · 阶段四语音输入支持

v2.0：
  · 开放教师创建实验包（基础模板）
  · 实验包版本管理
  · 数据导出功能（教务系统对接）

v2.5：
  · 实验包市场（教师发布和分享）
  · 联合共建工具
  · 配套教材生成系统
```

---

*文档版本：v1.0 | 下一步：更新阶段三文档定位，然后整理完整的技术架构文档和开发计划*
