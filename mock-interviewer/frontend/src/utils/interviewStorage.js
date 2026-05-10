const HISTORY_KEY = "finance_interview_history_v1";
const GENERIC_CARD_TITLES = new Set([
  "题目相关核心概念",
  "结构化作答方法",
  "岗位相关核心概念",
]);

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function getGapTitle(gap) {
  if (!gap) return "";
  if (typeof gap === "string") return gap.trim();
  return String(gap.title || gap.name || gap.knowledge_point || "").trim();
}

function isGenericTitle(title) {
  return GENERIC_CARD_TITLES.has(String(title || "").trim());
}

function normalizeCardKey(title) {
  let key = String(title || "").toLowerCase().trim();
  key = key.replace(/（[^）]*）/g, "").replace(/\([^)]*\)/g, "");
  key = key.replace(/[ \u3000\-_:：,，.。、]/g, "");
  key = key.replace(/[与和的]/g, "");
  key = key.replace(/港交所对返利计提会计处理指引/g, "收入确认返利计提");
  key = key.replace(/hkfrs15收入确认/g, "收入确认返利计提");
  key = key.replace(/preipo对赌条款/g, "对赌条款回购风险");
  return key;
}

function fallbackStudyCard(title) {
  return {
    title,
    summary: "这次面试暴露出该知识点掌握不稳定，需要补充定义、适用条件、典型场景和常见面试问法。",
    why_it_matters: "该知识点会影响金融面试中的专业判断、业务分析和表达可信度。",
    review_prompt: `请用 2 分钟解释“${title}”，并结合一个金融业务或岗位场景举例。`,
  };
}

function normalizeCard(card, fallbackTitle = "") {
  if (typeof card === "string") {
    const title = card.trim();
    return title ? fallbackStudyCard(title) : null;
  }

  if (!card || typeof card !== "object") return null;

  const title = String(card.title || card.name || fallbackTitle || "").trim();
  if (!title || isGenericTitle(title)) return null;

  const fallback = fallbackStudyCard(title);
  return {
    ...card,
    title,
    question_index: card.question_index || card.questionIndex,
    summary: String(card.summary || card.explanation || fallback.summary).trim(),
    why_it_matters: String(card.why_it_matters || card.whyItMatters || fallback.why_it_matters).trim(),
    review_prompt: String(card.review_prompt || card.reviewPrompt || fallback.review_prompt).trim(),
  };
}

export function normalizeStudyCards(record = {}) {
  const seen = new Set();
  const seenTitles = new Set();
  const cards = [];

  const addCard = (card, fallbackTitle = "", questionIndex = "") => {
    const normalized = normalizeCard(card, fallbackTitle);
    if (!normalized) return;
    if (questionIndex && !normalized.question_index) normalized.question_index = questionIndex;
    const titleKey = normalizeCardKey(normalized.title);
    const sourceKey = normalized.question_index || "";
    if (!card && seenTitles.has(`${sourceKey}-${titleKey}`)) return;
    const key = `${sourceKey}-${titleKey}-${normalized.summary}`;
    if (seen.has(key)) return;
    seen.add(key);
    seenTitles.add(`${sourceKey}-${titleKey}`);
    cards.push(normalized);
  };

  for (const card of asArray(record.studyCards)) addCard(card);
  for (const card of asArray(record.study_cards)) addCard(card);

  const evaluations = [
    ...asArray(record.evaluationHistory),
    ...asArray(record.evaluation_history),
  ];

  for (const item of evaluations) {
    for (const card of asArray(item?.study_cards || item?.studyCards)) {
      addCard(card, "", item?.question_index || item?.questionIndex);
    }
  }

  for (const gap of normalizeKnowledgeGaps(record)) {
    const title = getGapTitle(gap);
    if (title && !isGenericTitle(title)) addCard(null, title, gap.question_index || gap.questionIndex);
  }

  return cards;
}

export function normalizeKnowledgeGaps(record = {}) {
  const seen = new Set();
  const gaps = [];

  const addGap = (gap, questionIndex) => {
    const title = getGapTitle(gap);
    if (!title || isGenericTitle(title)) return;
    const key = title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    gaps.push({
      ...(typeof gap === "object" && gap ? gap : {}),
      title,
      question_index: gap?.question_index || gap?.questionIndex || questionIndex,
    });
  };

  for (const gap of asArray(record.knowledgeGaps)) addGap(gap);
  for (const gap of asArray(record.knowledge_gaps)) addGap(gap);

  const evaluations = [
    ...asArray(record.evaluationHistory),
    ...asArray(record.evaluation_history),
  ];

  evaluations.forEach((item, index) => {
    for (const gap of asArray(item?.knowledge_gaps || item?.knowledgeGaps)) {
      addGap(gap, index + 1);
    }
  });

  return gaps;
}

export function normalizeInterviewRecord(record = {}) {
  const normalized = {
    ...record,
    knowledgeGaps: normalizeKnowledgeGaps(record),
  };
  normalized.studyCards = normalizeStudyCards(normalized);
  return normalized;
}

export function readInterviewHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    const records = raw ? JSON.parse(raw) : [];
    return Array.isArray(records) ? records.map(normalizeInterviewRecord) : [];
  } catch (error) {
    return [];
  }
}

export function saveInterviewRecord(record) {
  const records = readInterviewHistory();
  const nextRecord = normalizeInterviewRecord({
    ...record,
    id: record.id || crypto.randomUUID(),
    savedAt: record.savedAt || new Date().toISOString(),
  });

  const deduped = records.filter((item) => item.id !== nextRecord.id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify([nextRecord, ...deduped].slice(0, 50)));
  return nextRecord;
}

export function getInterviewRecord(id) {
  return readInterviewHistory().find((item) => item.id === id) || null;
}

export function deleteInterviewRecord(id) {
  const records = readInterviewHistory().filter((item) => item.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(records));
}

export function collectAllStudyCards() {
  const seen = new Set();
  const cards = [];

  for (const record of readInterviewHistory()) {
    for (const card of normalizeStudyCards(record)) {
      const key = `${card.title}-${card.summary}`;
      if (seen.has(key)) continue;
      seen.add(key);
      cards.push({
        ...card,
        interviewId: record.id,
        interviewTitle: `${record.role || "金融面试"} / ${record.topic || "综合"}`,
        savedAt: record.savedAt,
      });
    }
  }

  return cards;
}
