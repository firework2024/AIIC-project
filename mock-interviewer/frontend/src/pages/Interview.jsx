import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import { AlertCircle, Loader2, MessageCircle, Mic, Send, Square, Timer, Zap } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { clarifyQuestion, submitAnswer, transcribeAudio } from "../services/api";
import { saveInterviewRecord } from "../utils/interviewStorage";

const TOTAL_QUESTIONS = 8;

const getDraftKey = (sessionId) => `interview_active_draft_v2_${sessionId}`;

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function pressureLabel(value) {
  const level = Number(value || 6);
  if (level <= 3) return "易";
  if (level >= 9) return "难";
  return "中";
}

export default function Interview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const draftKey = useMemo(() => getDraftKey(sessionId), [sessionId]);

  const [question, setQuestion] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clarificationText, setClarificationText] = useState("");
  const [clarifications, setClarifications] = useState([]);
  const [clarifying, setClarifying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [deadlineAt, setDeadlineAt] = useState(() => sessionStorage.getItem("deadline_at") || "");
  const [questionStartedAt, setQuestionStartedAt] = useState(() => sessionStorage.getItem("question_started_at") || "");
  const [pressureIndex, setPressureIndex] = useState(() => Number(sessionStorage.getItem("pressure_index") || 5));
  const [questionIndex, setQuestionIndex] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timeoutSubmittedRef = useRef(false);

  const deadlineMs = deadlineAt ? new Date(deadlineAt).getTime() : 0;
  const questionStartedMs = questionStartedAt ? new Date(questionStartedAt).getTime() : 0;
  const remainingSeconds = deadlineMs ? Math.ceil((deadlineMs - now) / 1000) : null;
  const questionElapsedSeconds = questionStartedMs ? Math.floor((now - questionStartedMs) / 1000) : 0;
  const progressPercent = Math.min(((questionIndex + 1) / TOTAL_QUESTIONS) * 100, 100);
  const isTimeCritical = remainingSeconds !== null && remainingSeconds <= 60;

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
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

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
      displayStudyCards: data.display_study_cards || [],
    });

    sessionStorage.removeItem("current_question");
    localStorage.removeItem(draftKey);
    sessionStorage.setItem("final_report", data.report);
    sessionStorage.setItem("final_score", JSON.stringify(data.final_score));
    sessionStorage.setItem("qa_history", JSON.stringify(data.qa_history || []));
    sessionStorage.setItem("evaluation_history", JSON.stringify(data.evaluation_history || []));
    sessionStorage.setItem("knowledge_gaps", JSON.stringify(data.knowledge_gaps || []));
    sessionStorage.setItem("study_cards", JSON.stringify(data.study_cards || []));
    sessionStorage.setItem("display_study_cards", JSON.stringify(data.display_study_cards || []));
    sessionStorage.setItem("history_record_id", record.id);
    navigate(`/report/${sessionId}`);
  };

  useEffect(() => {
    let savedDraft = null;
    try {
      savedDraft = JSON.parse(localStorage.getItem(draftKey) || "null");
    } catch {
      savedDraft = null;
    }

    const q = savedDraft?.question || sessionStorage.getItem("current_question");
    if (!q) {
      setError("面试会话已失效，请重新开始。");
      return undefined;
    }

    setQuestion(q);
    setQuestionIndex(savedDraft?.questionIndex || 0);
    setTextAnswer(savedDraft?.textAnswer || "");
    setClarificationText(savedDraft?.clarificationText || "");
    setClarifications(savedDraft?.clarifications || []);
    setQuestionStartedAt(savedDraft?.questionStartedAt || sessionStorage.getItem("question_started_at") || "");
    setDeadlineAt(sessionStorage.getItem("deadline_at") || "");
    setPressureIndex(Number(sessionStorage.getItem("pressure_index") || 5));
    sessionStorage.setItem("current_question", q);
    speakQuestion(q);
    return () => window.speechSynthesis.cancel();
  }, [draftKey]);

  useEffect(() => {
    if (!question) return;
    localStorage.setItem(
      draftKey,
      JSON.stringify({
        question,
        textAnswer,
        clarificationText,
        clarifications,
        questionIndex,
        questionStartedAt,
        updatedAt: new Date().toISOString(),
      }),
    );
    sessionStorage.setItem("current_question", question);
  }, [draftKey, question, textAnswer, clarificationText, clarifications, questionIndex, questionStartedAt]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

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

  const handleSubmit = async () => {
    if (!textAnswer.trim()) {
      setError("请先输入或录制本题回答。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await submitAnswer({ session_id: sessionId, answer: textAnswer });
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
      setClarificationText("");
      setClarifications([]);
      setQuestionIndex((q) => q + 1);
      speakQuestion(res.data.next_question);
    } catch (err) {
      setError(err?.response?.data?.error || "服务器错误，请稍后重试。");
    } finally {
      setLoading(false);
    }
  };

  const handleClarify = async () => {
    if (!clarificationText.trim()) {
      setError("请先输入你想确认的题意或边界条件。");
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
      setError(err?.response?.data?.error || "明确问题请求失败，请稍后重试。");
    } finally {
      setClarifying(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("当前浏览器不支持麦克风录音，请使用 Chrome/Edge 并通过 HTTPS 打开页面。");
      return;
    }

    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data?.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = async () => {
        setRecording(false);
        setTranscribing(true);
        stream.getTracks().forEach((track) => track.stop());

        try {
          const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
          if (!blob.size) {
            setError("没有录到有效语音，请重新尝试。");
            return;
          }
          const formData = new FormData();
          formData.append("audio", blob, "answer.webm");
          const res = await transcribeAudio(formData);
          const transcript = (res.data?.text || "").trim();
          if (!transcript) {
            setError("语音识别没有返回文本，可以说得更清楚一点后重试。");
            return;
          }
          setTextAnswer((prev) => `${prev}${prev.trim() ? "\n" : ""}${transcript}`);
        } catch (err) {
          setError(err?.response?.data?.error || "语音识别失败，请稍后重试。");
        } finally {
          setTranscribing(false);
        }
      };

      recorder.start();
      setRecording(true);
    } catch {
      setRecording(false);
      setError("无法访问麦克风，请检查浏览器权限或 HTTPS 证书是否已接受。");
    }
  };

  const handleVoiceAnswer = () => {
    if (recording) stopRecording();
    else startRecording();
  };

  return (
    <div className="w-full mx-auto space-y-6 pb-20 px-0 md:px-4">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-3 text-sm font-medium">
          <div className="flex flex-wrap items-center gap-3 text-slate-400">
            <span>第 {questionIndex + 1} 题 / 共 {TOTAL_QUESTIONS} 题</span>
            <span>已完成 {Math.round(progressPercent)}%</span>
            <span className="inline-flex items-center gap-1 text-slate-300">
              <Zap className="w-4 h-4" /> 压力面 {pressureLabel(pressureIndex)}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border ${isTimeCritical ? "text-red-200 border-red-400/50 bg-red-500/15" : "text-cyan-100 border-cyan-300/30 bg-cyan-300/10"}`}>
              <Timer className="w-4 h-4" /> 整场剩余 {remainingSeconds === null ? "--:--" : formatDuration(remainingSeconds)}
            </span>
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-slate-700 bg-slate-900/70 text-slate-300">
              本题已用 {formatDuration(questionElapsedSeconds)}
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

      <Card className="border-t-4 border-t-primary relative overflow-visible">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-4 flex-1">
            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">面试问题</h3>
            <div className="prose prose-invert max-w-none text-lg leading-relaxed">
              <ReactMarkdown>{question}</ReactMarkdown>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (isSpeaking ? stopSpeaking() : speakQuestion(question))}
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
          className="bg-red-500/10 border border-red-500/20 text-red-300 p-4 rounded-xl flex items-center gap-2"
        >
          <AlertCircle className="w-5 h-5" />
          {error}
        </motion.div>
      )}

      {clarifications.length > 0 && (
        <Card className="space-y-4 border-cyan-300/40 bg-cyan-950/40">
          <h3 className="text-sm font-bold uppercase tracking-widest text-cyan-300">明确问题记录</h3>
          <div className="space-y-3">
            {clarifications.map((item, idx) => (
              <div key={idx} className="space-y-2 text-sm">
                <div className="rounded-lg bg-slate-950/70 border border-slate-700 p-3 text-slate-100">
                  <span className="text-cyan-300 font-medium">你：</span>{item.request}
                </div>
                <div className="rounded-lg bg-cyan-950/50 border border-cyan-300/30 p-3 text-slate-50">
                  <span className="text-cyan-300 font-medium">面试官说明：</span>{item.response}
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
              <h2 className="text-base font-semibold text-cyan-100">明确问题</h2>
              <p className="text-sm text-cyan-100/70">用于确认题目边界、可用假设或回答范围；不计入题数，也不会单独评分。</p>
            </div>
          </div>
          <span className="text-xs px-3 py-1 rounded-full border border-cyan-300/30 text-cyan-100 bg-cyan-300/10 w-fit">不计分</span>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <input
            value={clarificationText}
            onChange={(e) => setClarificationText(e.target.value)}
            className="flex-1 px-4 py-3 rounded-xl bg-slate-950/80 border border-cyan-300/25 text-slate-50 placeholder:text-slate-300/70 focus:outline-none focus:border-cyan-200 focus:ring-2 focus:ring-cyan-300/20"
            placeholder="例如：这个场景是否可以做合理假设？是否只考虑境内市场？需要从哪个角色视角回答？"
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
                确认中
              </>
            ) : (
              <>
                <MessageCircle className="w-4 h-4 mr-2" />
                提交问题
              </>
            )}
          </Button>
        </div>
      </section>

      <section className="rounded-2xl border border-primary/30 bg-slate-950/30 p-5 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-50">正式回答区</h2>
            <p className="text-sm text-slate-300">这里的内容会作为本题最终答案提交并整体评分。</p>
          </div>
          <span className="text-xs px-3 py-1 rounded-full border border-primary/30 text-primary bg-primary/10 w-fit">计入评分</span>
        </div>

        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <Button
            onClick={handleVoiceAnswer}
            disabled={loading || transcribing}
            variant={recording ? "outline" : "secondary"}
            className="w-full md:w-auto"
          >
            {transcribing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                识别中...
              </>
            ) : recording ? (
              <>
                <Square className="w-4 h-4 mr-2 fill-current" />
                停止并转写
              </>
            ) : (
              <>
                <Mic className="w-4 h-4 mr-2" />
                语音回答
              </>
            )}
          </Button>

          <Button
            onClick={handleSubmit}
            disabled={loading || transcribing}
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

        <Card className="min-h-[500px] p-0 overflow-hidden bg-slate-950/85 border-primary/20 focus-within:border-primary/60 transition-colors shadow-inner shadow-black/30">
          <textarea
            value={textAnswer}
            onChange={(e) => setTextAnswer(e.target.value)}
            className="w-full h-full min-h-[500px] bg-transparent p-6 text-slate-50 caret-primary resize-none focus:outline-none placeholder:text-slate-300/70 leading-relaxed text-lg font-sans"
            placeholder="可以直接输入，也可以点击“语音回答”后说出答案，转写文本会自动加入这里。"
            autoFocus
          />
        </Card>
      </section>
    </div>
  );
}
