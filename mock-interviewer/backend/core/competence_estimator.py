import json
from utils.llm_client import call_llm
from config.prompts import COMPETENCE_ESTIMATION_PROMPT


def estimate_competence(topic, confidence, evaluation_history):
    history = ""
    for e in evaluation_history:
        history += f"Score:{e['score']} Strengths:{e['strengths']} Weaknesses:{e['weaknesses']}\n"

    try:
        return json.loads(
            call_llm(
                COMPETENCE_ESTIMATION_PROMPT.format(
                    topic=topic,
                    confidence=confidence,
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
            "reasoning": "Fallback"
        }
