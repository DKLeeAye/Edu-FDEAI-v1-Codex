# EduFDE AI 能力与治理设计 v2.0

> 状态：v2.0 草案  
> 上位依据：`EduFDE_终局总体方案设计_v2.0.md`  
> 替代范围：技术架构文档中的 AI 网关、平台 AI 智能体，以及各阶段文档中分散的 AI 能力设计

---

## 一、设计定位

EduFDE 的 AI 能力不是简单调用大模型，而是一套可配置、可评估、可审计、可降级的教学智能体系统。

AI 在平台中的角色：

- 提供真实交互体验
- 提供过程反馈
- 提高教师评审效率
- 生成学习画像和教学复盘

AI 不应成为不可解释的最终裁判。

---

## 二、AI 能力分层

### 2.1 体验型 AI

面向学生实时交互。

包括：

- AI 客户
- AI 导师
- AI 编程助手
- AI 客户验收模拟

要求：

- 流式响应
- 角色稳定
- 边界清晰
- 成本可控
- 可降级

### 2.2 评审型 AI

面向阶段产物质量反馈。

包括：

- 需求文档评审
- 可行性报告评审
- 总体技术方案评审
- 知识工程决策评审
- 智能体设计说明评审
- 交付文档评审

要求：

- 基于 Rubric
- 引用证据
- 输出结构化
- 教师可复核
- 可记录版本

### 2.3 分析型 AI

面向学习画像和教学复盘。

包括：

- 学生学习画像
- 班级复盘
- 课程质量分析
- 实验包问题分析

要求：

- 基于项目档案袋
- 不凭空评价
- 不生成不可解释标签
- 支持教师审核

### 2.4 治理底座

包括：

- AI Gateway
- Prompt 版本管理
- 模型路由
- Token 统计
- 限流
- fallback
- AI 调用审计
- 安全过滤
- 质量评测集

---

## 三、AI Gateway

### 3.1 职责

AI Gateway 统一管理：

- 模型供应商
- API Key
- usage_type 路由
- Prompt 版本
- Token 统计
- 限流策略
- fallback 策略
- 调用日志
- 安全策略

业务服务不得直接调用模型。

### 3.2 usage_type

建议 usage_type：

- ai_client
- ai_tutor
- doc_review
- design_review
- delivery_review
- profile_generation
- class_review
- memory_summary
- report_generation
- coding_assistant
- embedding

### 3.3 路由配置

路由按以下维度配置：

- usage_type
- tenant
- deployment_instance
- experiment_package_version
- cost_policy
- quality_policy

### 3.4 日志字段

AI 调用日志记录：

- user_id
- tenant_id
- course_id
- session_id
- stage_num
- usage_type
- provider
- model
- prompt_version_id
- input_tokens
- output_tokens
- total_tokens
- latency_ms
- success
- error_code
- created_at

---

## 四、Prompt 与 Agent 版本

### 4.1 版本原则

课程开始后应锁定：

- AI 客户 Prompt
- AI 评审 Prompt
- AI 导师 Prompt
- 学习画像 Prompt
- 模型配置

原因：

- 保证课程难度稳定
- 保证评分可比
- 保证历史结果可解释

### 4.2 Prompt 元数据

Prompt 版本应记录：

- name
- usage_type
- version
- content
- variables_schema
- output_schema
- model_recommendation
- created_by
- status
- changelog

---

## 五、AI 客户

### 5.1 职责

AI 客户用于阶段一需求访谈。

职责：

- 扮演客户角色
- 控制隐藏信息释放
- 根据提问质量调整配合度
- 生成多轮拜访记忆摘要
- 支持自然结束对话

### 5.2 行为边界

AI 客户不得：

- 主动泄露隐藏信息
- 直接告诉学生标准答案
- 脱离角色解释教学意图
- 因重复提问重置记忆

AI 客户应：

- 保持角色一致
- 根据问题质量释放信息
- 对浅层问题给模糊答案
- 对触及痛点的问题提供更多信息

### 5.3 质量测试

发布实验包前测试：

- 隐藏信息泄露测试
- 角色一致性测试
- 自然结束测试
- 预算回避测试
- 技术细节模糊回答测试

---

## 六、AI 评审

### 6.1 输入

AI 评审必须输入：

- 学生 Artifact
- 当前阶段 Rubric
- 阶段上下文
- 前序阶段产物
- 红黄灯规则
- 参考答案或参考要点

### 6.2 输出

AI 评审必须结构化输出：

- rubric_item_id
- finding_type
- severity
- quoted_evidence
- explanation
- suggested_revision
- suggested_score
- confidence
- red_or_yellow_flag

### 6.3 教师复核

教师可以：

- 接受
- 修改
- 覆盖
- 标记误判
- 添加批注

AI 评审不是最终成绩。

---

## 七、AI 导师

### 7.1 职责

AI 导师用于全程学习引导。

职责：

- 回答当前阶段相关问题
- 解释知识点
- 提供方向性提示
- 引导学生回看材料

### 7.2 边界

AI 导师不得：

- 直接生成完整答案
- 替学生填写文档
- 泄露标准答案
- 超出当前阶段知识范围

### 7.3 降级

当 AI 导师不可用时，可降级为：

- 静态知识卡片
- FAQ
- 阶段操作说明

---

## 八、学习画像 AI

### 8.1 输入

学习画像必须基于：

- 项目档案袋
- 阶段得分
- Artifact
- AI 评审
- 教师批注
- 黄灯债务
- 测试结果
- 时间和重试数据

### 8.2 输出

输出：

- 五阶段表现
- 能力维度评分
- 关键证据引用
- 优势
- 改进建议
- 下一步学习建议

### 8.3 约束

不得生成：

- 不可解释人格评价
- 与证据无关的结论
- 对学生造成标签化伤害的表达

---

## 九、成本与降级

### 9.1 成本控制

按以下维度统计：

- tenant
- institution
- course
- student
- usage_type
- model

### 9.2 限流

建议：

- 学生对话频率限制
- AI 评审频率限制
- 院校 Token 月度配额
- usage_type 级限额

### 9.3 降级策略

| AI 能力 | 降级策略 |
---|---|
| AI 客户 | 提示稍后继续，不用静态内容替代 |
| AI 导师 | 静态知识卡片和 FAQ |
| AI 评审 | 异步排队，先保存提交 |
| 学习画像 | 延迟生成 |
| 班级复盘 | 延迟生成 |

---

## 十、MVP 范围

MVP 做：

- AI Gateway 内置模块
- ai_client
- doc_review
- ai_tutor 基础版
- profile_generation 基础版
- AI 调用日志
- Token 统计
- Prompt 版本字段

MVP 暂不做：

- 完整 Prompt 管理后台
- 自动评测集后台
- 多模型 A/B 测试
- 本地模型适配
- 完整安全过滤平台

---

## 十一、待确认事项

1. MVP 默认模型供应商和生产模型供应商是否分离。
2. AI 评审结构化输出是否使用 JSON Schema 强约束。
3. AI 客户是否全部采用 LangGraph 编排，还是先用普通服务状态机。
4. AI 导师是否在 MVP 全阶段开放。
5. Prompt 版本后台是否进入 v1。

