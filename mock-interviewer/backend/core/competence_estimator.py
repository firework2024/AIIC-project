import json
from utils.llm_client import call_llm
from config.prompts import LANGUAGE_RULES, COMPETENCE_ESTIMATION_PROMPT


def estimate_competence(role, topic, confidence, evaluation_history, jd_text=""):
    history = ""
    for e in evaluation_history:
        history += f"得分:{e['score']} 优势:{e['strengths']} 不足:{e['weaknesses']}\n"

    try:
        return json.loads(
            call_llm(
                COMPETENCE_ESTIMATION_PROMPT.format(
                    language_rules=LANGUAGE_RULES,
                    role=role,
                    topic=topic,
                    confidence=confidence,
                    jd_text=(jd_text or "未提供JD。")[:5000],
                    evaluation_history=history
                )
            )
        )
    except Exception:
        return {
            "estimated_competence": confidence,
            "confidence_alignment": "aligned",
            "weak_areas": [],
            "next_question_intent": "similar",
            "reasoning": "模型输出解析失败，使用候选人自评作为保底估计。"
        }
