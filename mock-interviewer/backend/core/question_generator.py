from utils.llm_client import call_llm
from config.prompts import (
    LANGUAGE_RULES,
    QUESTION_GENERATION_PROMPT,
    RESUME_QUESTION_PROMPT,
    PROJECT_INTERVIEW_PROMPT,
    BUSINESS_CONTEXT_PROMPT,
    BUSINESS_SIMULATION_PROMPT,
    MIXED_INTERVIEW_PROMPT,
)

RESUME_QUESTION_SLOTS = {
    "mixed": (1, 2, 3, 4),
}

MAX_MIXED_RESUME_DEEP_DIVE_QUESTIONS = 4


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


def generate_next_question(
    role: str,
    topic: str,
    confidence: int,
    competence_summary: str,
    qa_history: list,
    is_fresher: bool,
    interview_mode: str = "normal",
    project_readme: str = "",
    project_name: str = "",
    resume_text: str = "",
    jd_text: str = "",
    business_context: str = "",
) -> str:
    question_number = len(qa_history) + 1

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
            history += f"Q{i}: {qa['question']}\nA{i}: {qa['answer']}\n\n"

    safe_jd = (jd_text or "未提供JD。请根据所选岗位方向和业务主题出题。")[:5000]

    if interview_mode == "project" and project_readme:
        prompt = PROJECT_INTERVIEW_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            project_name=project_name,
            readme=project_readme,
        )
        return sanitize_question(call_llm(prompt))

    if interview_mode == "business":
        prompt = BUSINESS_SIMULATION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            business_context=business_context or "暂无业务模拟上下文。",
            confidence=confidence,
            phase=phase,
            competence_summary=competence_summary,
            history=history,
        )
        return sanitize_question(call_llm(prompt))

    if interview_mode == "mixed" and should_force_resume_question(interview_mode, question_number, bool(resume_text)):
        prompt = RESUME_QUESTION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            resume_text=resume_text,
            history=history,
        )
        return sanitize_question(call_llm(prompt))

    if interview_mode == "mixed":
        prompt = MIXED_INTERVIEW_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            role=role,
            topic=topic,
            question_number=question_number,
            question_focus=mixed_question_focus(question_number, bool(resume_text)),
            jd_text=safe_jd,
            business_context=business_context or "暂无业务模拟上下文。",
            confidence=confidence,
            phase=phase,
            competence_summary=competence_summary,
            history=history,
        )
        return sanitize_question(call_llm(prompt))

    if interview_mode == "normal":
        prompt = RESUME_QUESTION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            resume_text=resume_text,
            history=history,
        )
        return sanitize_question(call_llm(prompt))

    if should_force_resume_question(interview_mode, question_number, bool(resume_text)):
        prompt = RESUME_QUESTION_PROMPT.format(
            language_rules=LANGUAGE_RULES,
            role=role,
            topic=topic,
            jd_text=safe_jd,
            resume_text=resume_text,
            history=history,
        )
        return sanitize_question(call_llm(prompt))

    prompt = QUESTION_GENERATION_PROMPT.format(
        language_rules=LANGUAGE_RULES,
        role=role,
        topic=topic,
        candidate_type="应届/初级候选人" if is_fresher else "有经验候选人",
        phase=phase,
        confidence=confidence,
        competence_summary=competence_summary,
        jd_text=safe_jd,
        history=history,
    )
    return sanitize_question(call_llm(prompt))
