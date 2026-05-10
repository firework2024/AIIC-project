import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { downloadReportPdf } from "../services/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { getInterviewRecord } from "../utils/interviewStorage";
import { Download, RotateCcw, Award, CheckCircle, AlertTriangle, Zap, Target, Brain, BookOpen } from "lucide-react";

function getVerdict(score) {
  if (score >= 8) return { label: "强匹配", color: "text-green-400 border-green-400/20 bg-green-400/10" };
  if (score >= 6) return { label: "有竞争力", color: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" };
  if (score >= 4) return { label: "需要加强", color: "text-yellow-400 border-yellow-400/10 bg-yellow-400/10" };
  return { label: "暂未准备好", color: "text-red-400 border-red-400/20 bg-red-400/10" };
}

function getPersona(score) {
  if (score >= 9) return { title: "接近 Offer 水平", desc: "金融知识、商业判断和岗位匹配度都较强。" };
  if (score >= 7) return { title: "有竞争力候选人", desc: "岗位准备度较好，表达和实际推理比较扎实。" };
  if (score >= 5) return { title: "成长型候选人", desc: "有一定基础，但金融 case 和 JD 定向例子还需要加深。" };
  if (score >= 3) return { title: "早期准备阶段", desc: "有部分可取思路，但核心面试工具箱仍需打磨。" };
  return { title: "需要补基础", desc: "建议先补金融基础、岗位认知和结构化表达。" };
}

function readSessionJson(key, fallback) {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    return fallback;
  }
}

export default function Report() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const savedRecord = getInterviewRecord(sessionId);
  const report = savedRecord?.report || sessionStorage.getItem("final_report");
  const history = useMemo(
    () => savedRecord?.evaluationHistory || readSessionJson("evaluation_history", []),
    [savedRecord]
  );
  const qaHistory = useMemo(
    () => savedRecord?.qaHistory || readSessionJson("qa_history", []),
    [savedRecord]
  );
  const studyCards = useMemo(
    () => savedRecord?.studyCards || readSessionJson("study_cards", []),
    [savedRecord]
  );
  const knowledgeGaps = useMemo(
    () => savedRecord?.knowledgeGaps || readSessionJson("knowledge_gaps", []),
    [savedRecord]
  );

  if (!report) {
    return <div className="text-center text-red-400 mt-20">未找到报告，请先完成一场面试。</div>;
  }

  const score = Number(savedRecord?.finalScore ?? readSessionJson("final_score", 0)) || 0;
  const verdict = getVerdict(score);
  const persona = getPersona(score);

  const insights = (() => {
    if (!history.length) return { strength: "暂无", weakness: "暂无" };
    const bestQ = [...history].sort((a, b) => (b.score || 0) - (a.score || 0))[0];
    const worstQ = [...history].sort((a, b) => (a.score || 0) - (b.score || 0))[0];
    return {
      strength: bestQ?.strengths || "整体稳定性",
      weakness: worstQ?.weaknesses || "岗位相关金融深度",
    };
  })();

  const handleDownload = async () => {
    const res = await downloadReportPdf(report);
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "金融面试报告.pdf";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-up pb-20">
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">金融面试报告</h1>
        <p className="text-slate-400 max-w-2xl">
          复盘你的金融面试表现、岗位匹配度、遗漏知识点和逐题反馈。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900/20 border-indigo-500/20 min-h-[220px]">
          <h3 className="text-slate-400 font-medium mb-4 uppercase tracking-wider text-sm">最终结论</h3>
          <div className="text-6xl font-bold text-white mb-2">{score}<span className="text-2xl text-slate-500">/10</span></div>
          <div className={`px-4 py-1.5 rounded-full border text-sm font-semibold tracking-wide ${verdict.color}`}>
            {verdict.label}
          </div>
          <p className="text-xs text-slate-500 mt-4">由逐题评分平均得到</p>
        </Card>

        <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[220px] bg-gradient-to-br from-slate-900 to-purple-900/10">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-slate-400 font-medium mb-1 uppercase tracking-wider text-sm">候选人准备度</h3>
          <div className="text-2xl font-bold text-white mb-2">{persona.title}</div>
          <p className="text-slate-400 text-sm leading-relaxed">{persona.desc}</p>
        </Card>

        <Card className="flex flex-col justify-center p-8 min-h-[220px] space-y-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-400 shrink-0 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">主要优势</h4>
              <p className="text-sm text-slate-400 line-clamp-2">{insights.strength}</p>
            </div>
          </div>
          <div className="w-full h-px bg-slate-800" />
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-red-400 shrink-0 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">重点提升</h4>
              <p className="text-sm text-slate-400 line-clamp-2">{insights.weakness}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          遗漏知识点
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {studyCards.length ? studyCards.map((card, idx) => (
            <Card key={`${card.title}-${idx}`} className="space-y-3 border-cyan-400/20">
              <div className="flex items-center gap-2 text-cyan-300">
                <BookOpen className="w-5 h-5" />
                <h3 className="font-semibold">{card.title}</h3>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{card.summary}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{card.why_it_matters}</p>
              <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-sm text-slate-300">
                {card.review_prompt}
              </div>
            </Card>
          )) : (
            <Card className="text-slate-400">暂无明确知识卡片。</Card>
          )}
        </div>
        {!!knowledgeGaps.length && (
          <p className="text-sm text-slate-500">
            共识别 {knowledgeGaps.length} 个遗漏知识点，已自动沉淀到本机历史知识库。
          </p>
        )}
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white">逐题分析</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history.map((item, idx) => (
            <Card key={idx} className="space-y-4 hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg">
                  第 {idx + 1} 题
                </h3>
                <span className={`text-lg font-bold ${item.score >= 7 ? "text-green-400" : item.score >= 5 ? "text-yellow-400" : "text-red-400"}`}>
                  {item.score}/10
                </span>
              </div>
              {qaHistory[idx]?.question && (
                <p className="text-sm text-slate-400 line-clamp-3">{qaHistory[idx].question}</p>
              )}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs uppercase text-slate-500 font-bold">优势</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.strengths}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs uppercase text-slate-500 font-bold">改进</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.weaknesses}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">完整文字报告</h2>
        <Card className="prose prose-invert max-w-none p-8 bg-slate-900/30">
          <ReactMarkdown>{report}</ReactMarkdown>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 py-8">
        <Button onClick={handleDownload} variant="primary" icon={Download} className="w-full sm:w-auto px-8">
          下载 PDF 报告
        </Button>
        <Button onClick={() => navigate("/history")} variant="outline" className="w-full sm:w-auto px-8">
          查看历史
        </Button>
        <Button onClick={() => navigate("/")} variant="outline" icon={RotateCcw} className="w-full sm:w-auto px-8">
          开始新面试
        </Button>
      </div>
    </div>
  );
}
