import React, { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { submitAnswer } from "../services/api";
import Editor from "@monaco-editor/react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Mic, Square, Send, Code, FileText, AlertCircle, Loader2, Sparkles, ChevronDown, ChevronUp, Lightbulb } from "lucide-react";

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

const TOTAL_QUESTIONS = 5;
const ANSWER_BOX_HEIGHT = 500;

export default function Interview() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [question, setQuestion] = useState("");
  const [textAnswer, setTextAnswer] = useState("");
  const [codeAnswer, setCodeAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showTips, setShowTips] = useState(false);

  const [questionIndex, setQuestionIndex] = useState(0);
  const [activeTab, setActiveTab] = useState("answer");

  /* 🔊 Voice */
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRef = useRef(null);

  const topic = sessionStorage.getItem("topic") || "";
  const language = useMemo(() => languageFromTopic(topic), [topic]);

  /* -------------------------------
     Voice helpers
  -------------------------------- */
  const speakQuestion = (text) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
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
    const q = sessionStorage.getItem("current_question");
    if (!q) {
      setError("Interview session expired. Please restart.");
      return;
    }
    setQuestion(q);
    setQuestionIndex(0);
    speakQuestion(q);
    return () => window.speechSynthesis.cancel();
  }, []);

  /* -------------------------------
     Submit answer
  -------------------------------- */
  const handleSubmit = async () => {
    if (activeTab === "answer" && !textAnswer.trim() || activeTab === "code" && !codeAnswer.trim()) {
      setError("Please complete the active section before submitting.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const combinedAnswer = textAnswer + (codeAnswer ? "\n\n--- CODE ---\n" + codeAnswer : "");
      const res = await submitAnswer({ session_id: sessionId, answer: combinedAnswer });

      if (res.data.done) {
        sessionStorage.removeItem("current_question");
        sessionStorage.setItem("final_report", res.data.report);
        sessionStorage.setItem("evaluation_history", JSON.stringify(res.data.evaluation_history));
        navigate(`/report/${sessionId}`);
        return;
      }

      sessionStorage.setItem("current_question", res.data.next_question);
      setQuestion(res.data.next_question);
      setTextAnswer("");
      setCodeAnswer("");
      setActiveTab("answer");
      setQuestionIndex((q) => q + 1);
      speakQuestion(res.data.next_question);
      setShowTips(false); // Hide tips for new question

    } catch (err) {
      setError(err?.response?.data?.error || "Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const progressPercent = Math.min(((questionIndex + 1) / TOTAL_QUESTIONS) * 100, 100);

  return (
    <div className="w-full mx-auto space-y-6 pb-20 px-0 md:px-4">

      {/* HEADER & PROGRESS */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end text-slate-400 text-sm font-medium">
          <span>Question {questionIndex + 1} of {TOTAL_QUESTIONS}</span>
          <span>{Math.round(progressPercent)}% Completed</span>
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
              Interview Question
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

      {/* ANSWER SECTION */}
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          {/* Left: Tab Switcher */}
          <div className="flex bg-slate-900/50 p-1 rounded-xl w-full md:w-auto border border-slate-700/50">
            <button
              onClick={() => setActiveTab("answer")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "answer" ? "bg-primary text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
            >
              <FileText className="w-4 h-4" /> Explanation
            </button>
            <button
              onClick={() => setActiveTab("code")}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === "code" ? "bg-secondary text-white shadow-lg" : "text-slate-400 hover:text-white"
                }`}
            >
              <Code className="w-4 h-4" /> Code Editor
            </button>
          </div>

          {/* Right: Actions (Tips + Submit) */}
          <div className="flex items-center gap-3 w-full md:w-auto justify-end">
            <button
              onClick={() => setShowTips(!showTips)}
              className="flex items-center gap-2 text-sm text-yellow-500 hover:text-yellow-400 transition-colors px-3 py-2 rounded-lg hover:bg-yellow-500/10"
            >
              <Lightbulb className="w-4 h-4" />
              {showTips ? "Hide Tips" : "Tips"}
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
                  Evaluating...
                </>
              ) : (
                <>
                  Submit <Send className="w-4 h-4 ml-2" />
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
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> Use the STAR method (Situation, Task, Action, Result)</li>
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> Explain time & space complexity for code</li>
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> State your assumptions clearly</li>
                  <li className="flex gap-2"><span className="text-yellow-500">•</span> Focus on the 'why', not just the 'how'</li>
                </ul>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <Card className="min-h-[500px] p-0 overflow-hidden bg-slate-900/50 border-slate-800 focus-within:border-primary/50 transition-colors">
          {activeTab === "answer" ? (
            <textarea
              value={textAnswer}
              onChange={(e) => setTextAnswer(e.target.value)}
              className="w-full h-full min-h-[500px] bg-transparent p-6 text-slate-200 resize-none focus:outline-none placeholder:text-slate-600 leading-relaxed text-lg font-sans"
              placeholder="Type your explanation here..."
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

      </div>
    </div>
  );
}
