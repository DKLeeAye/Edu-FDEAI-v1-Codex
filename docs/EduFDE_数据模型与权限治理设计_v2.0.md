# EduFDE 数据模型与权限治理设计 v2.0

> 状态：v2.0 草案  
> 上位依据：`EduFDE_终局总体方案设计_v2.0.md`  
> 替代范围：`EduFDE_平台底层能力设计_v1.0.md` 与 `EduFDE_技术架构文档_v1.0.md` 中的数据库、权限、状态流转相关内容

---

## 一、设计目标

数据模型必须支撑：

- SaaS、专有租户、私有化实例
- 多角色、多作用域权限
- 实验包版本锁定
- 五阶段项目证据链
- Artifact 统一产物模型
- AI 与教师共同评价
- 黄灯债务跨阶段追踪
- 项目档案袋和学习画像
- 审计和合规

---

## 二、数据域划分

### 2.1 组织与部署域

实体：

- `tenants`
- `institutions`
- `departments`
- `deployment_instances`
- `licenses`

### 2.2 身份与权限域

实体：

- `users`
- `roles`
- `permissions`
- `user_role_assignments`
- `course_members`

### 2.3 内容资产域

实体：

- `experiment_packages`
- `experiment_package_versions`
- `stage_blueprints`
- `package_assets`
- `rubrics`
- `rubric_items`
- `ai_personas`
- `prompt_versions`
- `acceptance_tests`

### 2.4 教学运行域

实体：

- `courses`
- `class_groups`
- `course_enrollments`
- `experiment_sessions`
- `stage_records`
- `checkpoint_records`

### 2.5 证据与评价域

实体：

- `artifacts`
- `artifact_versions`
- `ai_reviews`
- `teacher_reviews`
- `grade_results`
- `yellow_flags`
- `project_portfolios`
- `learning_profiles`

### 2.6 AI 与审计域

实体：

- `ai_call_logs`
- `token_usage_logs`
- `audit_logs`
- `support_access_grants`
- `system_health_events`

---

## 三、权限模型

### 3.1 角色

终局角色：

- platform_admin
- platform_content_ops
- platform_delivery_ops
- institution_admin
- academic_lead
- teacher
- teaching_assistant
- student

### 3.2 作用域

权限作用域：

- platform
- tenant
- institution
- department
- course
- package
- deployment_instance

### 3.3 权限原则

- 一个用户可以有多个角色。
- 同一角色可以绑定不同作用域。
- 教师通过课程成员关系获得课程内权限。
- 助教权限由教师或课程管理员授予。
- 平台内容运营可管理实验包，不默认看学生数据。
- 平台运维访问客户实例必须有授权记录。

### 3.4 MVP 简化

MVP 可以使用简单枚举角色：

- admin
- teacher
- student

但服务层必须保留：

- tenant/institution 过滤
- course 作用域校验
- 后续扩展到 RBAC 的接口边界

---

## 四、实验包与课程绑定

课程必须绑定实验包版本。

```text
experiment_package
  → experiment_package_version
    → course
      → experiment_session
```

原因：

- 保证历史课程可追溯
- 保证成绩可比
- 避免实验包更新影响进行中的课程
- 支持院校定制包

---

## 五、统一 Artifact 模型

### 5.1 设计目标

所有阶段产物统一保存为 Artifact。

Artifact 是项目档案袋、AI 评审、教师评分和学习画像的共同输入。

### 5.2 Artifact 类型

建议类型：

- `interview_transcript`
- `visit_summary`
- `requirement_hypothesis`
- `requirements_document`
- `feasibility_report`
- `technical_solution`
- `knowledge_engineering_decision`
- `risk_forecast`
- `agent_design_note`
- `agent_link`
- `test_result`
- `delivery_document`
- `acceptance_record`
- `operation_note`

### 5.3 Artifact 字段

建议字段：

- id
- tenant_id
- institution_id
- course_id
- session_id
- stage_record_id
- artifact_type
- title
- content_json
- file_record_id
- version
- status
- submitted_by
- submitted_at
- reviewed_at

---

## 六、黄灯债务模型

黄灯债务是跨阶段教学机制，不应只存在于 JSON 字段。

### 6.1 字段建议

- id
- tenant_id
- session_id
- source_stage
- source_artifact_id
- source_review_id
- flag_type
- severity
- description
- impact_stage
- acknowledged_by_student
- acknowledged_at
- cleared
- cleared_by_artifact_id
- teacher_confirmed
- created_at

### 6.2 状态

- open
- acknowledged
- carried_forward
- cleared
- waived_by_teacher

### 6.3 使用方式

- 阶段二产生黄灯。
- 阶段三/四入口提示相关黄灯。
- 学生可通过后续 Artifact 证明已处理。
- 教师可确认清除或豁免。

---

## 七、项目档案袋

项目档案袋是一个 session 的完整证据索引。

包含：

- 五阶段关键 Artifact
- 关键 AI 评审
- 教师批注
- 黄灯债务
- 测试结果
- 最终成绩
- 学习画像

项目档案袋用于：

- 学生复盘
- 教师评分
- 班级复盘
- 导出成果
- 学习画像生成

---

## 八、状态流转

### 8.1 通用阶段状态

建议状态：

- locked
- not_started
- in_learning
- in_practice
- submitted
- revision_required
- warning_confirmed
- completed
- skipped

### 8.2 阶段推进规则

- 当前阶段未 completed，后续阶段默认 locked。
- 红灯未清除，不允许阶段 completed。
- 黄灯可确认后继续，但必须进入债务记录。
- 阶段四验收不通过，不允许进入阶段五。
- 阶段五验收完成后 session completed。

### 8.3 教学环节跳过

允许学生跳过教学引导，但必须记录：

- skipped_learning = true
- skipped_reason 可选
- 在学习画像中客观记录，不作为负面评价。

---

## 九、评分模型

评分不应只存在于 `stage_records.score`。

建议模型：

- `rubrics`
- `rubric_items`
- `grade_results`
- `grade_result_items`
- `grade_sources`

评分来源：

- auto_check
- ai_review
- teacher_review

教师可以：

- 接受 AI 建议
- 调整分数
- 覆盖分数
- 标记 AI 误判
- 添加批注

---

## 十、审计模型

必须审计：

- 登录
- 权限变更
- 课程创建
- 实验包发布
- 成绩修改
- 数据导出
- AI 关键评审
- 平台运维访问
- 私有化升级

审计字段：

- actor_user_id
- action
- resource_type
- resource_id
- scope
- ip_address
- user_agent
- reason
- created_at

---

## 十一、MVP 范围

MVP 做：

- users
- institutions 或 tenants
- courses
- course_members/enrollments
- experiment_package_versions
- experiment_sessions
- stage_records
- artifacts
- ai_reviews
- yellow_flags 最小模型
- learning_profiles 最小模型
- ai_call_logs

MVP 暂不做：

- 完整 RBAC/ABAC
- support_access_grants
- 完整 data export jobs
- 完整 audit 后台
- 多部署实例管理后台

---

## 十二、待确认事项

1. MVP 是否直接引入 `tenant_id`，还是 `institution_id` 先承担租户作用域。
2. Artifact 的 `content_json` 是否统一采用 JSON Schema 校验。
3. 黄灯债务是否允许教师手动创建。
4. 学习画像是否每次阶段完成后增量更新，还是全部完成后生成。
5. 成绩修改是否必须要求教师填写原因。

