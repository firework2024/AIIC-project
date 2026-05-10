const HISTORY_KEY = "finance_interview_history_v1";

export function readInterviewHistory() {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

export function saveInterviewRecord(record) {
  const records = readInterviewHistory();
  const nextRecord = {
    ...record,
    id: record.id || crypto.randomUUID(),
    savedAt: record.savedAt || new Date().toISOString(),
  };

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
    for (const card of record.studyCards || []) {
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
