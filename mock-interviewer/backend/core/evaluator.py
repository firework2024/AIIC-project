import json
import re
from utils.llm_client import call_llm
from config.prompts import ANSWER_EVALUATION_PROMPT

SKIP_PHRASES = [
    "don't know",
    "dont know",
    "do not know",
    "no idea",
    "skip",
    "not sure"
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


def evaluate_answer(role, topic, question, answer):
    # -------------------------------
    # Skipped / empty answer
    # -------------------------------
    if is_skipped_answer(answer):
        return {
            "score": 1,
            "technical_accuracy": 1,
            "communication_clarity": 1,
            "problem_solving": 1,
            "strengths": "The candidate recognized their uncertainty.",
            "weaknesses": "Did not attempt to explain the concept. Knowledge gap identified.",
            "depth_assessment": "none"
        }

    # -------------------------------
    # LLM-based evaluation
    # -------------------------------
    prompt = ANSWER_EVALUATION_PROMPT.format(
        role=role,
        topic=topic,
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
            "problem_solving": parsed.get("problem_solving", 5),
            "strengths": parsed.get(
                "strengths",
                "The candidate demonstrated partial understanding."
            ),
            "weaknesses": parsed.get(
                "weaknesses",
                "Some concepts need clearer explanation."
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
            "strengths": "The candidate showed a reasonable attempt and partial understanding.",
            "weaknesses": "Some gaps in explanation or technical depth.",
            "depth_assessment": "surface"
        }
