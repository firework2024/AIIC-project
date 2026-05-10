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

GENERIC_GAP_TITLES = {
    "题目相关核心概念",
    "结构化作答方法",
    "岗位相关核心概念",
}


QUESTION_KNOWLEDGE_CARD_PROMPT = """
你是一位金融行业面试教练。请为下面这道面试题生成候选人复习用的知识卡片。

请只根据题目本身、岗位方向、业务主题、JD 和业务上下文，提炼回答这道题最需要掌握的 2 到 3 个“具体知识点卡片”。
候选人的回答状态只用于判断需要复习，不要把候选人的具体措辞当成知识点来源。

要求：
- 必须是具体金融/商业/会计/估值/尽调/监管/数据分析知识点，不能写“题目相关核心概念”“岗位相关核心概念”“结构化作答方法”这类泛泛标题。
- 如果题目是业务场景题，卡片应覆盖场景背后的专业判断工具，而不是复述题目。
- 卡片要能让候选人下次复习时直接使用。

岗位方向：{role}
业务主题：{topic}
JD：
{jd_text}
业务模拟上下文：
{business_context}
面试题：
{question}
候选人回答状态：
{answer_status}

只输出 JSON，不要输出 markdown：
{{
  "knowledge_gaps": ["具体知识点1", "具体知识点2"],
  "study_cards": [
    {{
      "title": "具体知识点名称",
      "summary": "用中文解释这个知识点是什么",
      "why_it_matters": "说明它为什么对这道题和该岗位面试重要",
      "review_prompt": "给候选人的复习或自测问题"
    }}
  ]
}}
"""


def normalize_study_cards(cards, fallback_gap=""):
    if not isinstance(cards, list):
        cards = []

    normalized = []
    for card in cards:
        if not isinstance(card, dict):
            continue
        title = str(card.get("title", "")).strip()
        if not title or title in GENERIC_GAP_TITLES:
            continue
        normalized.append({
            "title": title,
            "summary": str(card.get("summary", "需要补充该知识点的定义、适用场景和常见面试问法。")).strip(),
            "why_it_matters": str(card.get("why_it_matters", "该知识点会影响金融业务判断、建模分析或岗位匹配表达。")).strip(),
            "review_prompt": str(card.get("review_prompt", f"请用 2 分钟解释{title}，并结合一个金融场景举例。")).strip(),
        })

    if not normalized and fallback_gap and fallback_gap not in GENERIC_GAP_TITLES:
        normalized.append({
            "title": fallback_gap,
            "summary": "这道题暴露出该概念或方法掌握不够稳定，需要回到定义、公式、适用条件和业务含义重新梳理。",
            "why_it_matters": "面试官通常会用这个知识点判断候选人是否具备岗位所需的基础分析能力。",
            "review_prompt": f"请解释“{fallback_gap}”，并说明它在金融业务或面试 case 中如何使用。",
        })

    return normalized


def fallback_gaps_from_question(question):
    text = str(question or "")
    lowered = text.lower()

    rules = [
        (lambda t, l: any(word in t for word in ("返利", "计提", "冲回")) or "hkfrs 15" in l,
         ["收入确认与返利计提", "会计估计变更与审计调整"]),
        (lambda t, l: any(word in t for word in ("对赌", "回购", "业绩承诺")),
         ["Pre-IPO对赌条款与回购风险", "对赌条款的信息披露要求"]),
        (lambda t, l: "pe倍数" in l or "市盈率" in t or ("估值" in t and any(word in t for word in ("可比", "倍数", "区间"))),
         ["相对估值法与PE倍数", "可比公司选择与估值区间论证"]),
        (lambda t, l: any(word in t for word in ("IPO", "发行", "申报", "问询")),
         ["IPO审核问询回复逻辑", "发行上市时间表与合规风险权衡"]),
        (lambda t, l: any(word in t for word in ("毛利率", "盈利", "持续盈利")),
         ["毛利率变动分析", "持续盈利能力判断"]),
        (lambda t, l: any(word in t for word in ("关联交易", "应收账款", "回款")),
         ["关联交易核查", "应收账款回收风险分析"]),
        (lambda t, l: any(word in t for word in ("研发费用", "科技属性", "硬科技")),
         ["科创属性评价指标", "研发费用率与技术壁垒判断"]),
        (lambda t, l: any(word in t for word in ("路演", "投资者", "创始人")),
         ["投资者沟通与预期管理", "融资故事与财务事实一致性"]),
        (lambda t, l: any(word in t for word in ("并购", "协同")),
         ["并购协同效应评估", "交易估值与尽调重点"]),
        (lambda t, l: any(word in t for word in ("现金流", "偿债")) or "ebitda" in l,
         ["现金流质量分析", "EBITDA与偿债能力判断"]),
    ]

    gaps = []
    for matches, titles in rules:
        if matches(text, lowered):
            gaps.extend(titles)

    if not gaps:
        gaps = ["题目场景对应的金融分析框架", "业务风险识别与取舍逻辑"]

    deduped = []
    for gap in gaps:
        if gap not in deduped:
            deduped.append(gap)
    return deduped[:3]


def infer_question_knowledge_cards(role, topic, question, jd_text="", business_context="", answer_status="需要复习"):
    prompt = QUESTION_KNOWLEDGE_CARD_PROMPT.format(
        role=role,
        topic=topic,
        jd_text=(jd_text or "未提供JD。")[:5000],
        business_context=business_context or "无业务模拟上下文。",
        question=safe_prompt_text(question),
        answer_status=answer_status,
    )

    try:
        response = call_llm(prompt, temperature=0.2, max_tokens=1000)
        parsed = safe_json_parse(response)
        gaps = parsed.get("knowledge_gaps", [])
        if not isinstance(gaps, list):
            gaps = [str(gaps)]
        gaps = [
            str(gap).strip()
            for gap in gaps
            if str(gap).strip() and str(gap).strip() not in GENERIC_GAP_TITLES
        ][:3]
        cards = normalize_study_cards(parsed.get("study_cards", []))
        if cards:
            if not gaps:
                gaps = [card["title"] for card in cards]
            return gaps, cards
    except Exception:
        pass

    gaps = fallback_gaps_from_question(question)
    cards = [
        {
            "title": gap,
            "summary": "这是回答该题需要调用的关键分析工具，需要掌握定义、判断口径、适用场景和常见风险点。",
            "why_it_matters": "候选人如果不能解释这个知识点，通常难以在金融面试中完成有依据的业务判断。",
            "review_prompt": f"请用 2 分钟解释“{gap}”，并结合这道面试题说出一个可操作的分析步骤。",
        }
        for gap in gaps
    ]
    return gaps, cards


def safe_prompt_text(text):
    return str(text or "").replace("<", "＜").replace(">", "＞")


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


def format_clarification_history(clarifications):
    if not clarifications:
        return "无。"

    lines = []
    for i, item in enumerate(clarifications, start=1):
        lines.append(f"候选人明确问题{i}：{safe_prompt_text(item.get('request', ''))}")
        lines.append(f"面试官说明{i}：{safe_prompt_text(item.get('response', ''))}")
    return "\n".join(lines)


def evaluate_answer(role, topic, question, answer, jd_text="", business_context="", clarifications=None):
    # -------------------------------
    # Skipped / empty answer
    # -------------------------------
    if is_skipped_answer(answer):
        knowledge_gaps, study_cards = infer_question_knowledge_cards(
            role,
            topic,
            question,
            jd_text,
            business_context,
            "候选人回答过短、跳过或表示不会",
        )
        return {
            "score": 1,
            "technical_accuracy": 1,
            "communication_clarity": 1,
            "problem_solving": 1,
            "business_judgment": 1,
            "jd_alignment": 1,
            "strengths": "候选人能够承认不确定性。",
            "weaknesses": "没有尝试展开分析，暴露出相关知识或经验缺口。",
            "knowledge_gaps": knowledge_gaps,
            "study_cards": study_cards,
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
        question=safe_prompt_text(question),
        clarification_history=format_clarification_history(clarifications or []),
        answer=safe_prompt_text(answer)
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

        if score < 8 or knowledge_gaps:
            question_gaps, study_cards = infer_question_knowledge_cards(
                role,
                topic,
                question,
                jd_text,
                business_context,
                f"候选人本题得分 {score}/10，需要针对题目复习",
            )
            knowledge_gaps = question_gaps
        else:
            study_cards = []

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
            "study_cards": study_cards,
            "depth_assessment": parsed.get(
                "depth_assessment",
                "surface"
            )
        }

    except Exception:
        # -------------------------------
        # FINAL SAFE FALLBACK
        # -------------------------------
        knowledge_gaps, study_cards = infer_question_knowledge_cards(
            role,
            topic,
            question,
            jd_text,
            business_context,
            "评分模型输出异常，但仍需要基于题目生成复习卡片",
        )
        return {
            "score": 5,
            "technical_accuracy": 5,
            "communication_clarity": 5,
            "problem_solving": 5,
            "business_judgment": 5,
            "jd_alignment": 5,
            "strengths": "候选人做出了合理尝试，并展现出部分理解。",
            "weaknesses": "表达、业务判断或岗位相关深度仍有改进空间。",
            "knowledge_gaps": knowledge_gaps,
            "study_cards": study_cards,
            "depth_assessment": "surface"
        }
