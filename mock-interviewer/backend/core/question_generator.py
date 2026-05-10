from utils.llm_client import call_llm
from difflib import SequenceMatcher
from config.prompts import (
    INTERVIEW_QUESTION_SCOPE_RULES,
    LANGUAGE_RULES,
    QUESTION_GENERATION_PROMPT,
    RESUME_QUESTION_PROMPT,
    WORK_SAMPLE_INTERVIEW_PROMPT,
    BUSINESS_CONTEXT_PROMPT,
    BUSINESS_SIMULATION_PROMPT,
    MIXED_INTERVIEW_PROMPT,
)

RESUME_QUESTION_SLOTS = {
    "mixed": (1, 2, 3, 4),
}

MAX_MIXED_RESUME_DEEP_DIVE_QUESTIONS = 4

PROFESSIONAL_COURSE_KEYWORDS = [
    "金融学",
    "公司金融",
    "公司理财",
    "投资学",
    "证券投资",
    "金融市场",
    "金融工程",
    "衍生品",
    "固定收益",
    "计量经济",
    "计量经济学",
    "统计学",
    "概率论",
    "线性代数",
    "微积分",
    "会计学",
    "财务会计",
    "管理会计",
    "财务管理",
    "审计",
    "商业银行",
    "国际金融",
    "宏观经济",
    "微观经济",
    "产业经济",
    "python",
    "sql",
    "excel",
    "机器学习",
    "数据分析",
    "econometrics",
    "statistics",
    "linear algebra",
    "corporate finance",
    "financial accounting",
    "accounting",
    "investments",
    "investment",
    "derivatives",
    "fixed income",
]


def sanitize_question(text: str) -> str:
    if not text:
        return "请介绍一次你做过的金融或商业判断，以及你当时权衡了哪些因素？"

    text = text.strip().strip("\"'“”")

    code_indicators = [
        "def ",
        "class ",
        "for ",
        "while ",
        "=",
        "{",
        "}",
        "return ",
        "if ",
        "else",
        "print(",
    ]
    has_code = (
        "```" in text
        or any(indicator in text for indicator in code_indicators)
        and "\n" in text
    )
    if has_code:
        return text

    lines = [line.strip() for line in text.split("\n") if line.strip()]
    cleaned_lines = []
    for line in lines:
        cleaned_lines.append(line.lstrip("0123456789.-) ").strip())

    final_text = " ".join(cleaned_lines).strip().strip("\"'“”")
    if final_text and "?" not in final_text and "？" not in final_text:
        final_text += "？"
    return final_text


def is_ineffective_answer(answer: str, evaluation: dict | None = None) -> bool:
    text = str(answer or "").strip().lower()
    if evaluation and float(evaluation.get("score", 10) or 0) <= 2:
        return True
    if len(text) < 15:
        return True
    return any(token in text for token in ("don't know", "dont know", "skip", "不知道", "不清楚", "不会", "跳过"))


def question_similarity(left: str, right: str) -> float:
    def compact(value):
        return "".join(str(value or "").lower().split())

    a = compact(left)
    b = compact(right)
    if not a or not b:
        return 0
    return SequenceMatcher(None, a, b).ratio()


def guided_fallback_question(role: str, topic: str, question_focus: str = "") -> str:
    if "简历" in question_focus:
        return "刚才这个经历没有展开清楚。我们先降一步：请只选一个你亲自做过的动作，说明当时目标是什么、你怎么做、最后产生了什么结果？"
    if "作品" in question_focus:
        return "刚才没有形成有效回答。我们先聚焦作品本身：请指出你这份作品里最关键的一个假设，并说明如果这个假设不成立，你的结论会怎样变化？"
    if "业务" in question_focus or "压力" in question_focus:
        return "刚才没有形成有效判断。我们先拆小一点：在这个业务场景里，你会优先验证哪一个事实或指标，为什么它会决定你的下一步动作？"
    return f"刚才没有形成有效回答。我们先换一个更小的问题：围绕{role}的{topic}场景，你会先看哪一个关键指标或证据来做判断，并说明理由？"


def finalize_question(
    text: str,
    role: str,
    topic: str,
    question_focus: str = "",
    previous_questions: list[str] | None = None,
) -> str:
    question = sanitize_question(text)
    for previous in previous_questions or []:
        if question_similarity(question, previous) >= 0.72:
            return guided_fallback_question(role, topic, question_focus)
    return question


def generate_business_context(role: str, topic: str, jd_text: str) -> str:
    if not jd_text:
        jd_text = "未提供JD。请根据所选岗位方向和业务主题推断一个真实场景。"

    return call_llm(
        BUSINESS_CONTEXT_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            role=role,
            topic=topic,
            jd_text=jd_text[:5000],
        ),
        temperature=0.4,
        max_tokens=900,
    )


def mixed_question_focus(question_number: int, has_resume: bool) -> str:
    schedule = {
        1: "简历深挖" if has_resume else "岗位动机与JD匹配",
        2: "简历深挖" if has_resume else "与JD相关的金融专业基础",
        3: "简历深挖" if has_resume else "商业意识、市场观点或行业判断",
        4: "简历深挖" if has_resume else "过往经历中的行为证据",
        5: "业务模拟场景",
        6: "与JD相关的建模、数据、Excel、SQL、Python或分析流程",
        7: "客户、利益相关方、团队协作或沟通挑战",
        8: "压力题，要求综合判断、权衡取舍并给出清晰建议",
    }
    return schedule.get(question_number, "基于上一轮回答的定向追问")


def should_force_resume_question(interview_mode: str, question_number: int, has_resume: bool) -> bool:
    if not has_resume:
        return False

    slots = RESUME_QUESTION_SLOTS.get(interview_mode, ())
    if interview_mode == "mixed" and len(slots) > MAX_MIXED_RESUME_DEEP_DIVE_QUESTIONS:
        slots = slots[:MAX_MIXED_RESUME_DEEP_DIVE_QUESTIONS]
    return question_number in slots


def extract_professional_courses(resume_text: str) -> list[str]:
    compact = str(resume_text or "").replace(" ", "").replace("\n", "")
    lowered = compact.lower()
    courses = []
    for course in PROFESSIONAL_COURSE_KEYWORDS:
        key = course.lower()
        if key in lowered and not any(course in item or item in course for item in courses):
            courses.append(course)
    return courses[:8]


def resume_question_focus(interview_mode: str, question_number: int, resume_text: str) -> str:
    if interview_mode == "normal" and resume_text and question_number in (7, 8):
        return "专业课抽问"
    return "经历追问"


def generate_next_question(
    role: str,
    topic: str,
    confidence: int,
    competence_summary: str,
    qa_history: list,
    is_fresher: bool,
    interview_mode: str = "normal",
    work_sample_text: str = "",
    work_sample_name: str = "",
    resume_text: str = "",
    jd_text: str = "",
    business_context: str = "",
    pressure_index: int = 5,
    evaluation_history: list | None = None,
) -> str:
    question_number = len(qa_history) + 1
    evaluation_history = evaluation_history or []

    if question_number <= 2:
        phase = "热身"
    elif question_number <= 4:
        phase = "中段"
    else:
        phase = "深挖"

    history = "暂无历史问答。"
    if qa_history:
        history = ""
        for i, qa in enumerate(qa_history, start=1):
            evaluation = evaluation_history[i - 1] if i - 1 < len(evaluation_history) else {}
            answer_status = "无效回答，需要降阶引导" if is_ineffective_answer(qa.get("answer", ""), evaluation) else "有效回答"
            history += f"Q{i}: {qa['question']}\nA{i}: {qa['answer']}\n回答状态: {answer_status}\n\n"

    previous_questions = [qa.get("question", "") for qa in qa_history if qa.get("question")]
    last_evaluation = evaluation_history[-1] if evaluation_history else {}
    last_answer = qa_history[-1].get("answer", "") if qa_history else ""
    last_was_ineffective = bool(qa_history) and is_ineffective_answer(last_answer, last_evaluation)
    if last_was_ineffective:
        history += (
            "\n下一题调整要求：上一题候选人没有给出有效回复。"
            "不要重复上一题，不要换个说法继续问同一个判断。"
            "请降阶引导，把问题拆成一个更小、更容易现场回答的入口，"
            "例如先问一个关键指标、一个判断依据、一个优先验证事实或一个亲自做过的动作。"
            "仍然保持真实面试语气，不要教学或给答案。\n"
        )

    safe_jd = (jd_text or "未提供JD。请根据所选岗位方向和业务主题出题。")[:5000]
    course_list = "、".join(extract_professional_courses(resume_text)) or (
        "未通过关键词稳定识别。请直接从简历的教育背景、主修课程、相关课程、专业技能、项目技术栈中自行识别一门专业课或专业工具来提问。"
    )

    if interview_mode == "project" and work_sample_text:
        prompt = WORK_SAMPLE_INTERVIEW_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            work_sample_name=work_sample_name or "候选人作品",
            role=role,
            topic=topic,
            pressure_index=pressure_index,
            work_sample_text=work_sample_text[:9000],
            history=history,
        )
        return finalize_question(call_llm(prompt), role, topic, "作品答辩", previous_questions)

    if interview_mode == "business":
        prompt = BUSINESS_SIMULATION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            question_scope_rules=INTERVIEW_QUESTION_SCOPE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            business_context=business_context or "暂无业务模拟上下文。",
            confidence=confidence,
            pressure_index=pressure_index,
            phase=phase,
            competence_summary=competence_summary,
            history=history,
        )
        return finalize_question(call_llm(prompt), role, topic, "业务模拟场景", previous_questions)

    if interview_mode == "mixed" and should_force_resume_question(interview_mode, question_number, bool(resume_text)):
        question_focus = resume_question_focus(interview_mode, question_number, resume_text)
        prompt = RESUME_QUESTION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            question_scope_rules=INTERVIEW_QUESTION_SCOPE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            resume_text=resume_text,
            history=history,
            question_focus=question_focus,
            course_list=course_list,
        )
        return finalize_question(call_llm(prompt), role, topic, question_focus, previous_questions)

    if interview_mode == "mixed":
        question_focus = mixed_question_focus(question_number, bool(resume_text))
        prompt = MIXED_INTERVIEW_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            question_scope_rules=INTERVIEW_QUESTION_SCOPE_RULES,
            role=role,
            topic=topic,
            question_number=question_number,
            question_focus=question_focus,
            jd_text=safe_jd,
            business_context=business_context or "暂无业务模拟上下文。",
            confidence=confidence,
            pressure_index=pressure_index,
            phase=phase,
            competence_summary=competence_summary,
            history=history,
        )
        return finalize_question(call_llm(prompt), role, topic, question_focus, previous_questions)

    if interview_mode == "normal":
        question_focus = resume_question_focus(interview_mode, question_number, resume_text)
        prompt = RESUME_QUESTION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            question_scope_rules=INTERVIEW_QUESTION_SCOPE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            resume_text=resume_text,
            history=history,
            question_focus=question_focus,
            course_list=course_list,
        )
        return finalize_question(call_llm(prompt), role, topic, question_focus, previous_questions)

    if should_force_resume_question(interview_mode, question_number, bool(resume_text)):
        question_focus = resume_question_focus(interview_mode, question_number, resume_text)
        prompt = RESUME_QUESTION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            question_scope_rules=INTERVIEW_QUESTION_SCOPE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            resume_text=resume_text,
            history=history,
            question_focus=question_focus,
            course_list=course_list,
        )
        return finalize_question(call_llm(prompt), role, topic, question_focus, previous_questions)

    prompt = QUESTION_GENERATION_PROMPT.format(
        language_rules=LANGUAGE_RULES,
        question_scope_rules=INTERVIEW_QUESTION_SCOPE_RULES,
        role=role,
        topic=topic,
        candidate_type="应届/初级候选人" if is_fresher else "有经验候选人",
        phase=phase,
        confidence=confidence,
        pressure_index=pressure_index,
        competence_summary=competence_summary,
        jd_text=safe_jd,
        history=history,
    )
    return finalize_question(call_llm(prompt), role, topic, "", previous_questions)
