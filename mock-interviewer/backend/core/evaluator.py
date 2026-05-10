import json
import re
from utils.llm_client import call_llm
from config.prompts import LANGUAGE_RULES, ANSWER_EVALUATION_PROMPT

SKIP_PHRASES = [
    "don't know",
    "dont know",
    "do not know",
    "no idea",
    "skip",
    "not sure",
    "不知道",
    "不清楚",
    "跳过",
    "不会",
]


def is_skipped_answer(answer: str) -> bool:
    if not answer or len(answer.strip()) < 15:
        return True

    ans = answer.lower()
    return any(phrase in ans for phrase in SKIP_PHRASES)


def safe_json_parse(text: str) -> dict:
    """
    Extracts the first JSON object from LLM output safely.
    """
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        raise ValueError("No JSON object found in LLM response")
    return json.loads(match.group())


def evaluate_answer(role, topic, question, answer, jd_text="", business_context=""):
    # -------------------------------
    # Skipped / empty answer
    # -------------------------------
    if is_skipped_answer(answer):
        return {
            "score": 1,
            "technical_accuracy": 1,
            "communication_clarity": 1,
            "problem_solving": 1,
            "business_judgment": 1,
            "jd_alignment": 1,
            "strengths": "候选人能够承认不确定性。",
            "weaknesses": "没有尝试展开分析，暴露出相关知识或经验缺口。",
            "depth_assessment": "none"
        }

    # -------------------------------
    # LLM-based evaluation
    # -------------------------------
    prompt = ANSWER_EVALUATION_PROMPT.format(
        language_rules=LANGUAGE_RULES,
        role=role,
        topic=topic,
        jd_text=(jd_text or "未提供JD。")[:5000],
        business_context=business_context or "无业务模拟上下文。",
        question=question,
        answer=answer
    )

    response = call_llm(prompt)

    try:
        parsed = safe_json_parse(response)

        # ---- Soft score correction (VERY IMPORTANT) ----
        score = parsed.get("score", 5)

        # If answer is mostly correct but unclear, gently boost
        if score <= 4 and len(answer.split()) > 40:
            score = min(score + 1, 6)

        parsed["score"] = score

        return {
            "score": score,
            "technical_accuracy": parsed.get("technical_accuracy", 5),
            "communication_clarity": parsed.get("communication_clarity", 5),
            "problem_solving": parsed.get(
                "business_judgment",
                parsed.get("problem_solving", 5)
            ),
            "business_judgment": parsed.get("business_judgment", 5),
            "jd_alignment": parsed.get("jd_alignment", 5),
            "strengths": parsed.get(
                "strengths",
                "候选人展现出部分理解。"
            ),
            "weaknesses": parsed.get(
                "weaknesses",
                "部分概念或业务判断还需要更清晰地说明。"
            ),
            "depth_assessment": parsed.get(
                "depth_assessment",
                "surface"
            )
        }

    except Exception:
        # -------------------------------
        # FINAL SAFE FALLBACK
        # -------------------------------
        return {
            "score": 5,
            "technical_accuracy": 5,
            "communication_clarity": 5,
            "problem_solving": 5,
            "business_judgment": 5,
            "jd_alignment": 5,
            "strengths": "候选人做出了合理尝试，并展现出部分理解。",
            "weaknesses": "表达、业务判断或岗位相关深度仍有改进空间。",
            "depth_assessment": "surface"
        }
