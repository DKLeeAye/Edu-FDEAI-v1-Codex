from __future__ import annotations

import re
from typing import Any


GUIDED_LEVELS: list[dict[str, str]] = [
    {
        "key": "trust_building",
        "title": "建立信任与破冰",
        "goal": "建立合作氛围，说明访谈目的，避免一开始就问系统功能。",
    },
    {
        "key": "business_context",
        "title": "摸清业务现状",
        "goal": "确认现有流程、参与角色、数据流转和高频工作场景。",
    },
    {
        "key": "pain_point",
        "title": "定位核心痛点",
        "goal": "把客户说的麻烦追问成可验证的影响、频率和后果。",
    },
    {
        "key": "constraints",
        "title": "澄清期望与约束",
        "goal": "澄清预算、时间、系统边界、组织阻力和一线接受度。",
    },
    {
        "key": "data_feasibility",
        "title": "数据与可行性探测",
        "goal": "确认数据来源、字段质量、更新频率、权限和样例可用性。",
    },
    {
        "key": "summary_alignment",
        "title": "总结确认与推进",
        "goal": "复述问题定义和未确认点，让客户确认优先级和下一步材料。",
    },
]

GUIDED_LEVEL_KEYS = [level["key"] for level in GUIDED_LEVELS]

FORBIDDEN_CUSTOMER_REPLY_RULES: tuple[tuple[re.Pattern[str], str], ...] = (
    (
        re.compile(r"(你们|您们|贵方|你方).{0,16}(痛点|需求|方案|怎么考虑|打算|准备怎么)"),
        "客户不能要求学生提供客户侧痛点、需求或方案思路。",
    ),
    (
        re.compile(r"有没有什么.{0,10}(痛点|需求|问题|挑战)"),
        "客户不能把痛点发现责任反问给学生。",
    ),
    (
        re.compile(r"(你们|您们|贵方|你方).{0,12}具体.{0,10}(痛点|需求|问题|挑战)"),
        "客户不能询问学生有什么具体痛点或具体需求。",
    ),
)


def get_guided_level(level_key: str) -> dict[str, str]:
    for level in GUIDED_LEVELS:
        if level["key"] == level_key:
            return level
    raise ValueError(f"Unsupported guided training level '{level_key}'")


def next_guided_level(level_key: str) -> str | None:
    try:
        index = GUIDED_LEVEL_KEYS.index(level_key)
    except ValueError as exc:
        raise ValueError(f"Unsupported guided training level '{level_key}'") from exc
    if index >= len(GUIDED_LEVEL_KEYS) - 1:
        return None
    return GUIDED_LEVEL_KEYS[index + 1]


def resolve_customer_persona(
    manifest: dict[str, Any],
    *,
    mode: str,
) -> dict[str, Any]:
    bindings = (
        manifest.get("stage_1_ai_config", {})
        if isinstance(manifest.get("stage_1_ai_config"), dict)
        else {}
    )
    persona_bindings = bindings.get("customer_persona_bindings", {})
    binding_key = "guided_default" if mode == "guided" else "practice_default"
    persona_id = persona_bindings.get(binding_key) if isinstance(persona_bindings, dict) else None
    personas = manifest.get("customer_personas", [])
    if isinstance(personas, list):
        for persona in personas:
            if isinstance(persona, dict) and persona.get("id") == persona_id:
                return persona
    legacy = manifest.get("stage_1_ai_customer_persona")
    if isinstance(legacy, dict) and legacy:
        return {
            "id": "legacy_stage_1_customer",
            "name": "客户代表",
            "position": legacy.get("role") or "生产部门负责人",
            "personality": legacy.get("personality") or "",
            "surface_need": legacy.get("public_goal") or "",
            "hidden_motivation": legacy.get("hidden_driver") or "",
            "release_rules": legacy.get("release_rules") or [],
            "refusal_boundaries": ["不扮演导师、评审或解题助手。"],
        }
    raise ValueError("Stage one customer persona is not configured for this package version")


def build_customer_system_prompt(
    *,
    manifest: dict[str, Any],
    persona: dict[str, Any],
    mode: str,
    level: dict[str, str] | None = None,
    student_intent: dict[str, Any] | None = None,
    information_release: dict[str, Any] | None = None,
) -> str:
    mode_rule = (
        "当前是教学引导模式。你可以把业务事实表达得更清楚，但仍是客户本人；"
        "不得扮演训练引导者，不得替学生推进访谈。"
        if mode == "guided"
        else "当前是项目实战模式。你必须严格保持真实客户身份，不主动提示学生应该问什么。"
    )
    level_rule = ""
    if level is not None:
        level_rule = f"当前训练关卡：{level['title']}。关卡目标：{level['goal']}。"
    if student_intent is None:
        student_intent = classify_student_question("", level_key=level.get("key") if level else None)
    if information_release is None:
        information_release = decide_customer_information_release(
            persona=persona,
            level=level,
            student_intent=student_intent,
            mode=mode,
        )
    return "\n".join(
        [
            "你正在扮演 EduFDE 阶段一需求访谈中的客户访谈对象。",
            "你是被访谈客户，不是导师、评审、解题助手、采访者或产品经理；"
            "不要解释教学目标、Rubric 或标准答案。",
            mode_rule,
            level_rule,
            f"业务场景：{manifest.get('scenario') or '汽车零部件质检智能体'}。",
            "公司背景私有设定："
            f"{manifest.get('company_profile') or '中型制造企业正在推进质检数字化'}。"
            "这不是开场白，未列入本轮允许释放信息的内容不得主动说出。",
            f"客户公开身份：{_format_context(_public_persona_context(persona))}。",
            "客户私有事实："
            f"表层诉求={persona.get('surface_need') or manifest.get('surface_need') or '希望提升质检效率'}；"
            f"隐藏动机={persona.get('hidden_motivation') or manifest.get('real_driver') or '质检追溯能力不足'}；"
            f"项目顾虑={_format_context(persona.get('project_concerns'))}。",
            f"信息释放规则：{_format_context(persona.get('release_rules'))}。",
            f"本轮学生问题意图：{_format_context(student_intent)}。",
            f"本轮允许释放信息：{_format_context(information_release.get('allowed_facts'))}。",
            f"本轮必须保留信息：{_format_context(information_release.get('withheld_facts'))}。",
            f"本轮回答策略：{information_release.get('reply_strategy') or '只回答学生问到的相关事实。'}",
            f"拒答边界：{_format_context(persona.get('refusal_boundaries'))}。",
            "回答规则：保持客户口吻，只回答学生当前问到的相关事实；"
            "不要一次性打包现状、痛点、约束、数据和期望。",
            "学生问得笼统时只给表层信息；学生追问到审厂、合规、数据质量、"
            "流程责任或一线使用障碍时，再按本轮允许释放信息给更具体内容。",
            "访谈方向由学生负责。不要询问学生有什么痛点，不要询问学生有什么需求，"
            "不要询问学生准备做什么方案，不要把客户侧问题抛回给学生。",
            "你可以反问，但只能用于澄清学生问题范围或会议安排，例如“你是想先了解流程，"
            "还是先了解资料准备？”；不得反问“你们怎么考虑”“有没有具体痛点”。",
            "总结确认关卡中，如果学生已经表达回去准备方案、材料或汇报，优先给出确认和收尾，"
            "不要再用问句打开新的对话循环。",
            "不要主动替学生总结完整需求，不要给出技术方案，不要建议他们该怎么做。",
            f"如果学生询问称呼、姓名或怎么称呼你，必须使用客户角色姓名"
            f"“{persona.get('name') or '客户代表'}”，不得自造姓名或临时改名。",
            "破冰关卡优先回答姓名、职位、职责和表层工作场景；不要主动释放隐藏动机。",
            "每次回复控制在 2 到 4 句中文，使用第一人称客户口吻，避免顾问式和导师式表达。",
        ]
    )


def build_feedback_system_prompt(
    *,
    level: dict[str, str],
    persona: dict[str, Any],
) -> str:
    return "\n".join(
        [
            "你是 EduFDE 阶段一教学引导模式的访谈训练反馈智能体。",
            "你不能替学生生成下一轮标准答案，只评价学生刚才的问题质量。",
            f"当前关卡：{level['title']}。关卡目标：{level['goal']}。",
            f"客户角色摘要：{_format_context({'position': persona.get('position'), 'personality': persona.get('personality')})}。",
            "请从开放性、聚焦度、证据意识、追问深度四个维度反馈，并判断是否可以继续本关。",
            "输出自然中文摘要即可，平台会把它保存为结构化反馈字段。",
        ]
    )


def build_practice_evaluation_system_prompt(*, persona: dict[str, Any]) -> str:
    return "\n".join(
        [
            "你是 EduFDE 阶段一项目实战模式的综合评估智能体。",
            "你只能评估正式项目实战证据：客户访谈记录、拜访间整理和问题发现总结。",
            "不要读取或引用教学引导训练记录。",
            "评估必须面向进入阶段二前的需求理解质量，重点检查业务现状、核心痛点、约束、数据基础、成功标准和未确认问题。",
            f"客户角色摘要：{_format_context({'name': persona.get('name'), 'position': persona.get('position'), 'responsibilities': persona.get('responsibilities')})}。",
            "输出自然中文评估摘要，指出信息覆盖度、关键遗漏、阶段二风险和建议补问方向。",
        ]
    )


def classify_student_question(
    message: str,
    *,
    level_key: str | None = None,
) -> dict[str, Any]:
    normalized = message.strip()
    lower_message = normalized.lower()
    signals: list[str] = []
    if _contains_any(normalized, ("称呼", "贵姓", "姓名", "怎么叫", "怎么称呼")):
        signals.append("asks_salutation")
    if _contains_any(normalized, ("流程", "环节", "负责", "职责", "部门", "角色", "工作")):
        signals.append("asks_process")
    if _contains_any(normalized, ("痛点", "困难", "问题", "麻烦", "挑战", "影响", "卡点")):
        signals.append("asks_pain")
    if _contains_any(normalized, ("审厂", "合规", "客户要求", "追溯", "大客户")):
        signals.append("asks_audit_or_compliance")
    if _contains_any(normalized, ("数据", "字段", "mes", "erp", "excel", "记录", "样例")):
        signals.append("asks_data")
    if _contains_any(normalized, ("预算", "时间", "约束", "阻力", "接受", "试点", "替换")):
        signals.append("asks_constraints")
    if _contains_any(lower_message, ("ai", "智能体", "系统", "功能", "方案", "需求")):
        signals.append("solution_led")
    if not signals:
        signals.append("broad_opening")

    primary_intent = _primary_intent(signals)
    is_broad = len(normalized) < 16 or (
        "solution_led" in signals
        and not {"asks_process", "asks_pain", "asks_data", "asks_constraints"} & set(signals)
    )
    return {
        "level_key": level_key,
        "primary_intent": primary_intent,
        "signals": signals,
        "is_broad": is_broad,
        "is_solution_led": "solution_led" in signals,
    }


def decide_customer_information_release(
    *,
    persona: dict[str, Any],
    level: dict[str, str] | None,
    student_intent: dict[str, Any],
    mode: str,
) -> dict[str, Any]:
    level_key = (level or {}).get("key")
    signals = set(student_intent.get("signals") or [])
    allowed_facts = [
        f"姓名：{persona.get('name') or '客户代表'}",
        f"职位：{persona.get('position') or '业务负责人'}",
        f"职责：{_format_context(persona.get('responsibilities'))}",
        "可以说明你对 AI 技术半懂不懂，只能讲清自己的业务事实。",
    ]
    withheld_facts: list[str] = []
    reply_strategy = "只回答学生问到的相关事实，不替学生设计访谈路径。"

    surface_need = persona.get("surface_need")
    hidden_motivation = persona.get("hidden_motivation")
    concerns = persona.get("project_concerns")

    if level_key == "trust_building":
        allowed_facts.append("破冰阶段只释放姓名、职位、职责和表层工作场景。")
        if "asks_audit_or_compliance" not in signals:
            withheld_facts.append("不要主动释放审厂追溯压力。")
        if "asks_data" not in signals:
            withheld_facts.append("不要主动释放 MES 字段质量。")
        if "asks_constraints" not in signals:
            withheld_facts.append("不要主动释放一线阻力。")
        reply_strategy = (
            "如果学生一上来问 AI 或需求，先说明你能讲业务现状，"
            "不要反问学生痛点或方案。"
        )
    elif level_key == "summary_alignment":
        reply_strategy = (
            "当前是收尾确认。学生表示回去准备方案或汇报时，确认下一步材料和优先级即可，"
            "不要继续打开新议题，不要提出必须再次回答的问题。"
        )
        allowed_facts.append("可以确认下一步先看简洁方案、样例材料或优先问题清单。")

    if "asks_audit_or_compliance" in signals:
        allowed_facts.append(f"审厂/合规压力：{hidden_motivation or '有追溯压力'}")
    elif hidden_motivation:
        withheld_facts.append(f"隐藏动机：{hidden_motivation}")

    if "asks_data" in signals or level_key == "data_feasibility":
        allowed_facts.append("可以说明纸质、Excel、MES 字段和历史记录质量等数据现状。")
    else:
        withheld_facts.append("数据质量细节需等学生追问数据来源、字段完整性或系统现状。")

    if "asks_constraints" in signals or level_key == "constraints":
        allowed_facts.append(f"可以说明项目顾虑：{_format_context(concerns)}")
    else:
        withheld_facts.append("预算、系统替换、一线使用阻力等约束需等学生追问。")

    if "asks_pain" in signals or level_key in {"pain_point", "business_context"}:
        allowed_facts.append(f"表层诉求：{surface_need or '希望提升质检效率'}")
        allowed_facts.append("可以讲一到两个具体业务麻烦，但不要一次性给完整需求清单。")
    elif surface_need:
        allowed_facts.append(f"只可轻描淡写提到表层诉求：{surface_need}")

    return {
        "mode": mode,
        "level_key": level_key,
        "allowed_facts": allowed_facts,
        "withheld_facts": withheld_facts,
        "reply_strategy": reply_strategy,
        "forbidden_questions": [
            "你们有什么痛点？",
            "你们具体怎么考虑？",
            "你们准备做什么方案？",
            "你们有什么需求？",
        ],
    }


def validate_customer_response(
    content: str,
    *,
    information_release: dict[str, Any] | None = None,
) -> dict[str, Any]:
    normalized = " ".join(content.strip().split())
    violations = [
        reason
        for pattern, reason in FORBIDDEN_CUSTOMER_REPLY_RULES
        if pattern.search(normalized)
    ]
    violations.extend(_withheld_information_violations(normalized, information_release))
    return {
        "is_valid": not violations,
        "violations": violations,
        "corrective_instruction": (
            "重新以被访谈客户身份回答。只能描述自己的业务事实、感受和限制；"
            "不要反问学生有什么痛点、需求或方案。"
        ),
    }


def build_customer_guard_retry_prompt(*, base_prompt: str, guard: dict[str, Any]) -> str:
    return "\n".join(
        [
            base_prompt,
            "",
            "上一版客户回复违反了角色边界，需要重写。",
            f"违规点：{_format_context(guard.get('violations'))}。",
            str(guard.get("corrective_instruction") or ""),
            "新回复必须像真实客户被访谈时的回答，不得出现“你们有什么痛点/需求/方案”等反问。",
        ]
    )


def build_customer_fallback_response(
    *,
    persona: dict[str, Any],
    student_intent: dict[str, Any],
) -> str:
    name = persona.get("name") or "客户代表"
    position = persona.get("position") or "业务负责人"
    signals = set(student_intent.get("signals") or [])
    if "asks_salutation" in signals:
        return f"你好，我是{name}，负责{position}相关工作。"
    if "solution_led" in signals:
        return (
            f"你好，我是{name}，主要负责工厂质量和质检材料准备。"
            "AI 方案我不太懂，我这边能讲清楚的是质检记录、异常追溯和资料准备的实际情况。"
        )
    return (
        f"我是{name}，负责{position}相关工作。"
        "目前质检记录整理和异常追溯比较占时间，具体情况需要结合我们现有流程来看。"
    )


def _format_context(value: Any) -> str:
    if value is None or value == "":
        return "未提供"
    if isinstance(value, dict):
        return "；".join(f"{key}: {_format_context(item)}" for key, item in value.items())
    if isinstance(value, list):
        return "、".join(_format_context(item) for item in value)
    return str(value)


def _public_persona_context(persona: dict[str, Any]) -> dict[str, Any]:
    return {
        "name": persona.get("name"),
        "position": persona.get("position"),
        "responsibilities": persona.get("responsibilities"),
        "personality": persona.get("personality"),
        "communication_preferences": persona.get("communication_preferences"),
        "professional_level": persona.get("professional_level"),
        "student_vendor_awareness": persona.get("student_vendor_awareness"),
    }


def _contains_any(value: str, keywords: tuple[str, ...]) -> bool:
    lowered = value.lower()
    return any(keyword.lower() in lowered for keyword in keywords)


def _withheld_information_violations(
    normalized_response: str,
    information_release: dict[str, Any] | None,
) -> list[str]:
    if not information_release:
        return []
    withheld_context = _format_context(information_release.get("withheld_facts"))
    violations: list[str] = []
    if "审厂" in withheld_context and re.search(
        r"(大客户|审厂|客户要求|追溯压力|合规压力)",
        normalized_response,
    ):
        violations.append("客户主动释放了本轮应保留的隐藏审厂/追溯压力。")
    if "数据质量" in withheld_context and re.search(
        r"(MES|字段|数据质量|历史记录质量)",
        normalized_response,
        re.IGNORECASE,
    ):
        violations.append("客户主动释放了本轮应保留的数据质量细节。")
    if "预算" in withheld_context and re.search(
        r"(预算|大规模替换|一线员工|阻力|重复录入)",
        normalized_response,
    ):
        violations.append("客户主动释放了本轮应保留的预算或落地阻力。")
    return violations


def _primary_intent(signals: list[str]) -> str:
    for signal in (
        "asks_salutation",
        "asks_process",
        "asks_pain",
        "asks_audit_or_compliance",
        "asks_data",
        "asks_constraints",
        "solution_led",
    ):
        if signal in signals:
            return signal
    return signals[0]
