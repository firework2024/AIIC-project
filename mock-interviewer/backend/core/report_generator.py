from datetime import datetime

GENERIC_KNOWLEDGE_TITLES = {
    "题目相关核心概念",
    "结构化作答方法",
    "岗位相关核心概念",
}

MAX_STUDY_CARDS_PER_INTERVIEW = 6


def normalize_card_key(title):
    key = str(title or "").lower().strip()
    for left, right in (("（", "）"), ("(", ")")):
        while left in key and right in key and key.index(left) < key.index(right):
            start = key.index(left)
            end = key.index(right, start)
            key = key[:start] + key[end + 1:]
    for token in (" ", "　", "-", "_", "：", ":", "，", ",", "。", "、", "与", "和", "的"):
        key = key.replace(token, "")
    aliases = {
        "港交所对返利计提会计处理指引": "收入确认返利计提",
        "hkfrs15收入确认": "收入确认返利计提",
        "preipo对赌条款": "对赌条款回购风险",
    }
    for old, new in aliases.items():
        key = key.replace(old, new)
    return key


def calculate_final_score(evaluation_history):
    scores = [
        float(item.get("score", 0))
        for item in evaluation_history
        if isinstance(item, dict)
    ]
    if not scores:
        return 0
    return round(sum(scores) / len(scores), 1)


def verdict_for_score(score):
    if score >= 8:
        return "强匹配"
    if score >= 6:
        return "有竞争力"
    if score >= 4:
        return "需要加强"
    return "暂未准备好"


def collect_knowledge_gaps(evaluation_history):
    seen_gaps = set()
    seen_cards = set()
    gaps = []
    cards = []

    def add_fallback_card(question_index, title):
        if title in GENERIC_KNOWLEDGE_TITLES:
            return
        if len(cards) >= MAX_STUDY_CARDS_PER_INTERVIEW:
            return
        key = normalize_card_key(title)
        if key in seen_cards:
            return
        seen_cards.add(key)
        cards.append({
            "question_index": question_index,
            "title": title,
            "summary": "这次面试暴露出该知识点掌握不稳定，需要补充定义、适用条件、典型场景和常见面试问法。",
            "why_it_matters": "该知识点会影响金融面试中的专业判断、业务分析和表达可信度。",
            "review_prompt": f"请用 2 分钟解释“{title}”，并结合一个金融业务或岗位场景举例。",
        })

    for index, item in enumerate(evaluation_history, start=1):
        item_gaps = []
        for gap in item.get("knowledge_gaps", []) or []:
            gap = str(gap).strip()
            if not gap or gap in GENERIC_KNOWLEDGE_TITLES:
                continue
            item_gaps.append(gap)
            if gap not in seen_gaps:
                seen_gaps.add(gap)
                gaps.append({"question_index": index, "title": gap})

        for card in item.get("study_cards", []) or []:
            title = str(card.get("title", "")).strip()
            if not title or title in GENERIC_KNOWLEDGE_TITLES:
                continue
            if len(cards) >= MAX_STUDY_CARDS_PER_INTERVIEW:
                continue
            key = normalize_card_key(title)
            if key in seen_cards:
                continue
            seen_cards.add(key)
            cards.append({
                "question_index": index,
                "title": title,
                "summary": str(card.get("summary", "")).strip(),
                "why_it_matters": str(card.get("why_it_matters", "")).strip(),
                "review_prompt": str(card.get("review_prompt", "")).strip(),
            })

        for gap in item_gaps:
            add_fallback_card(index, gap)

    return gaps, cards


def generate_final_report(
    role,
    topic,
    confidence,
    estimated_competence,
    qa_history,
    candidate_name,
    jd_text="",
    business_context="",
    evaluation_history=None,
):
    evaluation_history = evaluation_history or []
    final_score = calculate_final_score(evaluation_history)
    if not final_score and estimated_competence is not None:
        final_score = round(float(estimated_competence), 1)

    verdict = verdict_for_score(final_score)
    knowledge_gaps, study_cards = collect_knowledge_gaps(evaluation_history)

    lines = [
        "1. 最终得分与结论",
        f"- 最终得分：{final_score}/10",
        f"- 结论：{verdict}",
        f"- 候选人自评准备度：{confidence}/10",
        f"- 面试日期：{datetime.now().strftime('%Y-%m-%d')}",
        f"- 候选人：{candidate_name}",
        f"- 目标方向：{role} / {topic}",
        "- 评分口径：最终得分由逐题结构化评分平均得到，因此与上方逐题评分保持一致。",
        "",
        "2. 岗位匹配总结",
        f"- 本次面试围绕 {role} - {topic} 展开。",
        "- 如果候选人的回答能持续体现具体经历、金融业务判断、结构化推理和 JD 对齐，匹配度会更高。",
        "- 当前主要风险来自逐题反馈中暴露的知识缺口、案例颗粒度不足或业务判断不够落地。",
        "",
        "3. 主要优势",
    ]

    strengths = [
        item.get("strengths", "")
        for item in evaluation_history
        if item.get("strengths")
    ][:4]
    if strengths:
        lines.extend([f"- {strength}" for strength in strengths])
    else:
        lines.append("- 暂无足够信息，需要完成更多有效回答。")

    lines.extend(["", "4. 重点改进方向"])
    weaknesses = [
        item.get("weaknesses", "")
        for item in evaluation_history
        if item.get("weaknesses")
    ][:5]
    if weaknesses:
        lines.extend([f"- {weakness}" for weakness in weaknesses])
    else:
        lines.append("- 建议加强岗位相关知识、案例表达和结构化沟通。")

    lines.extend(["", "5. 遗漏知识点"])
    if knowledge_gaps:
        for gap in knowledge_gaps[:12]:
            lines.append(f"- 第 {gap['question_index']} 题：{gap['title']}")
    else:
        lines.append("- 暂未识别到明确知识点缺口。")

    lines.extend(["", "6. 插卡式知识库"])
    if study_cards:
        for card in study_cards[:12]:
            lines.extend([
                f"知识卡片：{card['title']}",
                f"- 来源题目：第 {card['question_index']} 题",
                f"- 解释：{card['summary'] or '建议补充定义、适用场景和常见面试问法。'}",
                f"- 为什么重要：{card['why_it_matters'] or '它会影响岗位相关的分析判断和表达质量。'}",
                f"- 自测：{card['review_prompt'] or '请用自己的话解释该知识点，并结合一个金融场景举例。'}",
                "",
            ])
    else:
        lines.append("- 暂无知识卡片。")

    lines.extend(["", "7. 逐题复盘"])
    for i, qa in enumerate(qa_history, start=1):
        evaluation = evaluation_history[i - 1] if i - 1 < len(evaluation_history) else {}
        lines.extend([
            f"Q{i}. 问题：{qa.get('question', '')}",
            "",
        ])
        clarifications = qa.get("clarifications", []) or []
        if clarifications:
            lines.append("候选人反问与面试官澄清：")
            for item in clarifications:
                lines.append(f"- 候选人：{item.get('request', '')}")
                lines.append(f"- 面试官：{item.get('response', '')}")
            lines.append("")
        lines.extend([
            f"候选人回答：{qa.get('answer', '')}",
            "",
            "评价：",
            f"- 得分：{evaluation.get('score', 0)}/10",
            f"- 优势：{evaluation.get('strengths', '暂无')}",
            f"- 改进：{evaluation.get('weaknesses', '暂无')}",
        ])
        gaps = evaluation.get("knowledge_gaps", []) or []
        if gaps:
            lines.append(f"- 知识点：{'、'.join(str(gap) for gap in gaps)}")
        lines.append("")

    lines.extend([
        "8. 下一步准备建议",
        "- 先复盘低分题，把每题缺失的概念整理成 3 句话：定义、适用场景、面试表达。",
        "- 针对 JD 准备 3 个可复用案例，分别覆盖分析能力、业务判断和沟通协作。",
        "- 对每张知识卡片做 2 分钟口头复述，再补一个真实金融场景例子。",
        "- 每次模拟后只挑 2 到 3 个薄弱点集中修正，避免复习目标过散。",
    ])

    return "\n".join(lines)
