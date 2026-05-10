import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { clarifyQuestion, submitAnswer } from "../services/api";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Mic, Square, Send, Code, FileText, AlertCircle, Loader2, Lightbulb, MessageCircle, Timer, Zap } from "lucide-react";
import { saveInterviewRecord } from "../utils/interviewStorage";

/* -------------------------------
   Language mapping
-------------------------------- */
const languageFromTopic = (topic = "") => {
  const t = topic.toLowerCase();
  if (t.includes("python")) return "python";
  if (t.includes("java") && !t.includes("javascript")) return "java";
  if (t.includes("c++")) return "cpp";
  if (t.includes("javascript")) return "javascript";
  if (t.includes("sql")) return "sql";
  if (t.includes("node")) return "javascript";
  if (t.includes("flask") || t.includes("django")) return "python";
  if (t.includes("api")) return "javascript";
  return "plaintext";
};

const TOTAL_QUESTIONS = 8;
const ANSWER_BOX_HEIGHT = 500;

const getDraftKey = (sessionId) => `interview_active_draft_v1_${sessionId}`;

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function Interview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [codeAnswer, setCodeAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTips, setShowTips] = useState(false);
  const [clarificationText, setClarificationText] = useState("");
  const [clarifications, setClarifications] = useState([]);
  const [clarifying, setClarifying] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [deadlineAt, setDeadlineAt] = useState(() => sessionStorage.getItem("deadline_at") || "");
  const [questionStartedAt, setQuestionStartedAt] = useState(() => sessionStorage.getItem("question_started_at") || "");
  const [pressureIndex, setPressureIndex] = useState(() => Number(sessionStorage.getItem("pressure_index") || 5));
  const timeoutSubmittedRef = useRef(false);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("answer");

  /* 🔊 Voice */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef(null);

  const topic = sessionStorage.getItem("topic") || "";
  const language = useMemo(() => languageFromTopic(topic), [topic]);
  const draftKey = useMemo(() => getDraftKey(sessionId), [sessionId]);
  const deadlineMs = deadlineAt ? new Date(deadlineAt).getTime() : 0;
  const questionStartedMs = questionStartedAt ? new Date(questionStartedAt).getTime() : 0;
  const remainingSeconds = deadlineMs ? Math.ceil((deadlineMs - now) / 1000) : null;
  const questionElapsedSeconds = questionStartedMs ? Math.floor((now - questionStartedMs) / 1000) : 0;

  /* -------------------------------
     Voice helpers
  -------------------------------- */
  const speakQuestion = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  /* -------------------------------
     Load first question
  -------------------------------- */
  useEffect(() => {
    let savedDraft = null;
    try {
      savedDraft = JSON.parse(localStorage.getItem(draftKey) || "null");
    } catch (e) {
      savedDraft = null;
    }

    const q = savedDraft?.question || sessionStorage.getItem("current_question");
    if (!q) {
      setError("面试会话已失效，请重新开始。");
      return;
    }
    setQuestion(q);
    setQuestionIndex(savedDraft?.questionIndex || 0);
    setTextAnswer(savedDraft?.textAnswer || "");
    setCodeAnswer(savedDraft?.codeAnswer || "");
    setActiveTab(savedDraft?.activeTab || "answer");
    setClarificationText(savedDraft?.clarificationText || "");
    setClarifications(savedDraft?.clarifications || []);
    setDeadlineAt(sessionStorage.getItem("deadline_at") || "");
    setQuestionStartedAt(savedDraft?.questionStartedAt || sessionStorage.getItem("question_started_at") || "");
    setPressureIndex(Number(sessionStorage.getItem("pressure_index") || 5));
    sessionStorage.setItem("current_question", q);
    speakQuestion(q);
    return () => window.speechSynthesis.cancel();
  }, [draftKey]);

  useEffect(() => {
    if (!question) return;

    const draft = {
      question,
      textAnswer,
      codeAnswer,
      activeTab,
      clarificationText,
      clarifications,
      questionIndex,
      questionStartedAt,
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(draftKey, JSON.stringify(draft));
    sessionStorage.setItem("current_question", question);
  }, [draftKey, question, textAnswer, codeAnswer, activeTab, clarificationText, clarifications, questionIndex, questionStartedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const persistFinishedInterview = (data) => {
    const metadata = data.metadata || {};
    const record = saveInterviewRecord({
      id: sessionId,
      name: metadata.name || sessionStorage.getItem("candidate_name") || "",
      mode: metadata.mode || sessionStorage.getItem("interview_mode") || "",
      role: metadata.role || sessionStorage.getItem("target_role") || "",
      topic: metadata.topic || sessionStorage.getItem("topic") || "",
      finalScore: data.final_score,
      report: data.report,
      qaHistory: data.qa_history || [],
      evaluationHistory: data.evaluation_history || [],
      knowledgeGaps: data.knowledge_gaps || [],
      studyCards: data.study_cards || [],
    });

    sessionStorage.removeItem("current_question");
    localStorage.removeItem(draftKey);
    sessionStorage.setItem("final_report", data.report);
    sessionStorage.setItem("final_score", JSON.stringify(data.final_score));
    sessionStorage.setItem("qa_history", JSON.stringify(data.qa_history || []));
    sessionStorage.setItem("evaluation_history", JSON.stringify(data.evaluation_history));
    sessionStorage.setItem("knowledge_gaps", JSON.stringify(data.knowledge_gaps || []));
    sessionStorage.setItem("study_cards", JSON.stringify(data.study_cards || []));
    sessionStorage.setItem("history_record_id", record.id);
    navigate(`/report/${sessionId}`);
  };

  useEffect(() => {
    if (!deadlineMs || remainingSeconds === null || remainingSeconds > 0 || timeoutSubmittedRef.current) return;
    timeoutSubmittedRef.current = true;
    setLoading(true);
    setError("面试时间已到，正在结算未回答题目。");
    submitAnswer({ session_id: sessionId, answer: "", timeout: true })
      .then((res) => {
        if (res.data.done) persistFinishedInterview(res.data);
      })
      .catch((err) => setError(err?.response?.data?.error || "限时结算失败，请稍后重试。"))
      .finally(() => setLoading(false));
  }, [deadlineMs, remainingSeconds, sessionId]);

  /* -------------------------------
     Submit answer
  -------------------------------- */
  const handleSubmit = async () => {
    if (activeTab === "answer" && !textAnswer.trim() || activeTab === "code" && !codeAnswer.trim()) {
      setError("请先完成当前输入区再提交。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const combinedAnswer = textAnswer + (codeAnswer ? "\n\n--- CODE ---\n" + codeAnswer : "");
      const res = await submitAnswer({ session_id: sessionId, answer: combinedAnswer });

      if (res.data.done) {
        persistFinishedInterview(res.data);
        return;
      }

      sessionStorage.setItem("current_question", res.data.next_question);
      if (res.data.deadline_at) {
        sessionStorage.setItem("deadline_at", res.data.deadline_at);
        setDeadlineAt(res.data.deadline_at);
      }
      if (res.data.question_started_at) {
        sessionStorage.setItem("question_started_at", res.data.question_started_at);
        setQuestionStartedAt(res.data.question_started_at);
      }
      if (res.data.pressure_index) {
        sessionStorage.setItem("pressure_index", String(res.data.pressure_index));
        setPressureIndex(Number(res.data.pressure_index));
      }
      localStorage.removeItem(draftKey);
      setQuestion(res.data.next_question);
      setTextAnswer("");
      setCodeAnswer("");
      setClarificationText("");
      setClarifications([]);
      setActiveTab("answer");
      setQuestionIndex((q) => q + 1);
      speakQuestion(res.data.next_question);
      setShowTips(false); // Hide tips for new question

    } catch (err) {
      setError(err?.response?.data?.error || "服务器错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleClarify = async () => {
    if (!clarificationText.trim()) {
      setError("请先输入你想向面试官确认的问题。");
      return;
    }

    setClarifying(true);
    setError("");

    try {
      const res = await clarifyQuestion({
        session_id: sessionId,
        clarification: clarificationText,
      });
      setClarifications(res.data.clarifications || []);
      setClarificationText("");
    } catch (err) {
      setError(err?.response?.data?.error || "澄清请求失败，请稍后重试。");
    } finally {
      setClarifying(false);
    }
  };

  const progressPercent = Math.min(((questionIndex + 1) / TOTAL_QUESTIONS) * 100, 100);
  const isTimeCritical = remainingSeconds !== null && remainingSeconds <= 60;

  return (
    <div className="w-full mx-auto space-y-6 pb-20 px-0 md:px-4">

      {/* HEADER & PROGRESS */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 text-sm font-medium">
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <span>第 {questionIndex + 1} 题 / 共 {TOTAL_QUESTIONS} 题</span>
            <span>已完成 {Math.round(progressPercent)}%</span>
            <span className="inline-flex items-center gap-1 text-slate-300"><Zap className="w-4 h-4" />压力 {pressureIndex}/10</span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${isTimeCritical ? "text-red-200 border-red-400/50 bg-red-500/15" : "text-cyan-100 border-cyan-300/30 bg-cyan-300/10"}`}>
              <Timer className="w-4 h-4" />剩余 {remainingSeconds === null ? "--:--" : formatDuration(remainingSeconds)}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-slate-700 bg-slate-900/70 text-slate-300">
              本题 {formatDuration(questionElapsedSeconds)}
            </span>
          </div>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${progressPercent}%` }}
            transition={{ duration: 0.5 }}
            className="h-full bg-gradient-to-r from-primary to-secondary"
          />
        </div>
      </div>

      {/* QUESTION CARD */}
      <Card className="border-t-4 border-t-primary relative overflow-visible">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-4 flex-1">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">
              面试问题
            </h3>
            <div className="prose prose-invert max-w-none text-lg leading-relaxed">
              <ReactMarkdown>{question}</ReactMarkdown>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => isSpeaking ? stopSpeaking() : speakQuestion(question)}
            className="shrink-0"
          >
            {isSpeaking ? <Square className="w-4 h-4 fill-current" /> : <Mic className="w-4 h-4" />}
          </Button>
        </div>
      </Card>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      {clarifications.length > 0 && (
        <Card className="space-y-4 border-cyan-300/40 bg-cyan-950/40">
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300">反问澄清记录</h3>
          <div className="space-y-3">
            {clarifications.map((item, idx) => (
              <div key={idx} className="space-y-2 text-sm">
                <div className="rounded-lg bg-slate-950/70 border border-slate-700 p-3 text-slate-100">
                  <span className="text-cyan-300 font-medium">你：</span>{item.request}
                </div>
                <div className="rounded-lg bg-cyan-950/50 border border-cyan-300/30 p-3 text-slate-50">
                  <span className="text-cyan-300 font-medium">面试官：</span>{item.response}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <section className="rounded-2xl border border-cyan-300/30 bg-cyan-950/30 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-300/15 text-cyan-200 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-cyan-100">向面试官澄清</h2>
              <p className="text-sm text-cyan-100/70">不确定题意时先反问；澄清不会计入题数，也不会单独评分。</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full border border-cyan-300/30 text-cyan-100 bg-cyan-300/10 w-fit">
            辅助沟通区
          </span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={clarificationText}
            onChange={(e) => setClarificationText(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950/80 border border-cyan-300/25 text-slate-50 placeholder:text-slate-300/70 focus:outline-none focus:border-cyan-200 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="例如：这个场景里是否可以做合理假设？是否只考虑境内市场？"
          />
          <Button
            onClick={handleClarify}
            disabled={clarifying || loading}
            variant="outline"
            className="border-cyan-300/40 text-cyan-100 hover:border-cyan-200 hover:text-white bg-cyan-300/5"
          >
            {clarifying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                澄清中
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                发送澄清
              </>
            )}
          </Button>
        </div>
      </section>

      {/* ANSWER SECTION */}
      <section className="rounded-2xl border border-primary/30 bg-slate-950/30 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-50">正式回答区</h2>
            <p className="text-sm text-slate-300">这里的内容会作为本题最终答案提交并整体评分。</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full border border-primary/30 text-primary bg-primary/10 w-fit">
            计入评分
          </span>
        </div>
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Left: Tab Switcher */}
          <div className="flex bg-slate-900/50 p-1 rounded-xl w-full md:w-auto border border-slate-700/50">
            <button
              onClick={() => setActiveTab("answer")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "answer" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
            >
              <FileText className="w-4 h-4" /> 文字回答
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "code" ? "bg-secondary text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
            >
              <Code className="w-4 h-4" /> 建模/分析笔记
            </button>
          </div>

          {/* Right: Actions (Tips + Submit) */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowTips(!showTips)}
              className="flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 transition-colors px-3 py-2 rounded-lg hover:bg-yellow-500/10"
            >
              <Lightbulb className="w-4 h-4" />
              {showTips ? "隐藏提示" : "答题提示"}
            </button>

            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full md:w-auto px-6 py-2.5 shadow-lg shadow-primary/20 hover:shadow-primary/40 truncate"
              variant="glow"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  评估中...
                </>
              ) : (
                <>
                  提交 <Send className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Collapsible Tips */}
        <AnimatePresence>
          {showTips && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-sm text-yellow-200/80 mb-4">
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> 用“背景-分析-建议-风险”组织回答</li>
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> 主动联系 JD 和目标金融岗位</li>
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> 做估值、市场或客户判断前先说明假设</li>
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> 尽量使用交易、市场、研究、数据或实习中的具体例子</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <Card className="min-h-[500px] p-0 overflow-hidden bg-slate-950/85 border-primary/20 focus-within:border-primary/60 transition-colors shadow-inner shadow-black/30">
          {activeTab === "answer" ? (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="w-full h-full min-h-[500px] bg-transparent p-6 text-slate-50 caret-primary resize-none focus:outline-none placeholder:text-slate-300/70 leading-relaxed text-lg font-sans"
              placeholder="请在这里输入你的中文回答..."
              autoFocus
            />
          ) : (
            <Editor
              height={ANSWER_BOX_HEIGHT}
              language={language}
              theme="vs-dark"
              value={codeAnswer}
              onChange={(v) => setCodeAnswer(v || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 16,
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 24, bottom: 24 },
                fontFamily: "JetBrains Mono, monospace"
              }}
            />
          )}
        </Card>

      </section>
    </div>
  );
}
