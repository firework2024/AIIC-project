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


def normalize_study_cards(cards, fallback_gap=""):
    if not isinstance(cards, list):
        cards = []

    normalized = []
    for card in cards[:4]:
        if not isinstance(card, dict):
            continue
        title = str(card.get("title", "")).strip()
        if not title:
            continue
        normalized.append({
            "title": title,
            "summary": str(card.get("summary", "需要补充该知识点的定义、适用场景和常见面试问法。")).strip(),
            "why_it_matters": str(card.get("why_it_matters", "该知识点会影响金融业务判断、建模分析或岗位匹配表达。")).strip(),
            "review_prompt": str(card.get("review_prompt", f"请用 2 分钟解释{title}，并结合一个金融场景举例。")).strip(),
        })

    if not normalized and fallback_gap:
        normalized.append({
            "title": fallback_gap,
            "summary": "这道题暴露出该概念或方法掌握不够稳定，需要回到定义、公式、适用条件和业务含义重新梳理。",
            "why_it_matters": "面试官通常会用这个知识点判断候选人是否具备岗位所需的基础分析能力。",
            "review_prompt": f"请解释“{fallback_gap}”，并说明它在金融业务或面试 case 中如何使用。",
        })

    return normalized


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
            "knowledge_gaps": ["题目相关核心概念", "结构化作答方法"],
            "study_cards": normalize_study_cards([], "题目相关核心概念"),
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

        knowledge_gaps = parsed.get("knowledge_gaps", [])
        if not isinstance(knowledge_gaps, list):
            knowledge_gaps = [str(knowledge_gaps)]
        knowledge_gaps = [str(gap).strip() for gap in knowledge_gaps if str(gap).strip()][:5]

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
            "knowledge_gaps": knowledge_gaps,
            "study_cards": normalize_study_cards(
                parsed.get("study_cards", []),
                knowledge_gaps[0] if knowledge_gaps else ""
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
            "knowledge_gaps": ["岗位相关核心概念"],
            "study_cards": normalize_study_cards([], "岗位相关核心概念"),
            "depth_assessment": "surface"
        }
