from datetime import datetime

from utils.llm_client import call_llm
from config.prompts import LANGUAGE_RULES, FINAL_REPORT_PROMPT


def generate_final_report(
    role,
    topic,
    confidence,
    estimated_competence,
    qa_history,
    candidate_name,
    jd_text="",
    business_context="",
):
    history = ""
    for i, qa in enumerate(qa_history, 1):
        history += (
            f"Q{i}: {qa['question']}\n"
            f"候选人回答：\n{qa['answer']}\n\n"
        )

    prompt = FINAL_REPORT_PROMPT.format(
        language_rules=LANGUAGE_RULES,
        candidate_name=candidate_name,
        date=datetime.now().strftime("%Y-%m-%d"),
        role=role,
        topic=topic,
        jd_text=(jd_text or "未提供JD。")[:5000],
        business_context=business_context or "无业务模拟上下文。",
        confidence=confidence,
        estimated_competence=estimated_competence,
        history=history,
    )

    report = call_llm(prompt)

    if "下一步准备建议" not in report or "最终得分" not in report:
        continuation_prompt = (
            "请用简体中文从中断处继续同一份面试报告。\n"
            "不要重复已经写过的部分。\n\n"
            f"目前已有报告：\n{report}\n\n"
            "请继续："
        )
        continuation = call_llm(
            continuation_prompt,
            temperature=0.4,
            max_tokens=1024,
        )
        report = report.rstrip() + "\n\n" + continuation.lstrip()

    return report
