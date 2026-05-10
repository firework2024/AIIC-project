import React, { useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import { downloadReportPdf } from "../services/api";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Download, RotateCcw, Award, CheckCircle, AlertTriangle, Zap, Target, Brain } from "lucide-react";

function extractScore(report) {
  const match = report.match(/Final Score:\s*(\d+)/i) || report.match(/Estimated competence:\s*(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function getVerdict(score) {
  if (score >= 8) return { label: "Strong Hire", color: "text-green-400 border-green-400/20 bg-green-400/10" };
  if (score >= 6) return { label: "Hire with Confidence", color: "text-emerald-400 border-emerald-400/20 bg-emerald-400/10" };
  if (score >= 4) return { label: "Needs Improvement", color: "text-yellow-400 border-yellow-400/20 bg-yellow-400/10" };
  return { label: "Not Interview Ready", color: "text-red-400 border-red-400/20 bg-red-400/10" };
}

function getPersona(score) {
  if (score >= 9) return { title: "The Architect", desc: "Deep technical mastery and system-level thinking." };
  if (score >= 7) return { title: "Senior Engineer", desc: "Solid problem solving and clear communication." };
  if (score >= 5) return { title: "Mid-Level Developer", desc: "Good foundation, but needs more depth in edge cases." };
  if (score >= 3) return { title: "Junior Developer", desc: "Growing knowledge, focusing on fundamentals." };
  return { title: "Aspiring Coder", desc: "Early in the journey. Keep practicing!" };
}

export default function Report() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const report = sessionStorage.getItem("final_report");
  const historyStr = sessionStorage.getItem("evaluation_history");

  const history = useMemo(() => {
    try {
      return historyStr ? JSON.parse(historyStr) : [];
    } catch (e) {
      return [];
    }
  }, [historyStr]);

  // Extract Top Strength & Weakness from history
  const insights = useMemo(() => {
    if (!history.length) return { strength: "N/A", weakness: "N/A" };

    // Find question with highest score
    const bestQ = [...history].sort((a, b) => b.score - a.score)[0];
    // Find question with lowest score
    const worstQ = [...history].sort((a, b) => a.score - b.score)[0];

    return {
      strength: bestQ?.strengths || "General consistency",
      weakness: worstQ?.weaknesses || "Technical depth"
    };
  }, [history]);

  if (!report) {
    return <div className="text-center text-red-400 mt-20">No report found. Please complete an interview first.</div>;
  }

  const score = extractScore(report);
  const verdict = getVerdict(score);
  const persona = getPersona(score);

  const handleDownload = async () => {
    const res = await downloadReportPdf(report);
    const blob = new Blob([res.data], { type: "application/pdf" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "Interview_Report.pdf";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-fade-up pb-20">

      {/* HEADER */}
      <div className="flex flex-col items-center justify-center text-center space-y-4">
        <div className="inline-flex p-3 rounded-full bg-primary/10 text-primary mb-2">
          <Award className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Interview Performance Report</h1>
        <p className="text-slate-400 max-w-2xl">
          Here is a detailed breakdown of your technical interview session. Review your key strengths, areas for improvement, and detailed question analysis.
        </p>
      </div>

      {/* TOP SECTION: KEY METRICS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* SCORE CARD */}
        <Card className="flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-900/20 border-indigo-500/20 min-h-[220px]">
          <h3 className="text-slate-400 font-medium mb-4 uppercase tracking-wider text-sm">Final Verdict</h3>
          <div className="text-6xl font-bold text-white mb-2">{score}<span className="text-2xl text-slate-500">/10</span></div>
          <div className={`px-4 py-1.5 rounded-full border text-sm font-semibold tracking-wide ${verdict.color}`}>
            {verdict.label}
          </div>
        </Card>

        {/* PERSONA CARD (Replaces Charts) */}
        <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[220px] bg-gradient-to-br from-slate-900 to-purple-900/10">
          <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 text-purple-400">
            <Brain className="w-6 h-6" />
          </div>
          <h3 className="text-slate-400 font-medium mb-1 uppercase tracking-wider text-sm">Interview Persona</h3>
          <div className="text-2xl font-bold text-white mb-2">{persona.title}</div>
          <p className="text-slate-400 text-sm leading-relaxed">{persona.desc}</p>
        </Card>

        {/* FOCUS AREAS CARD */}
        <Card className="flex flex-col justify-center p-8 min-h-[220px] space-y-4">
          <div className="flex items-start gap-3">
            <Zap className="w-5 h-5 text-yellow-400 shrink-0 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Top Strength</h4>
              <p className="text-sm text-slate-400 line-clamp-2">{insights.strength}</p>
            </div>
          </div>
          <div className="w-full h-px bg-slate-800" />
          <div className="flex items-start gap-3">
            <Target className="w-5 h-5 text-red-400 shrink-0 mt-1" />
            <div>
              <h4 className="text-sm font-bold text-slate-300 uppercase tracking-wide mb-1">Primary Focus</h4>
              <p className="text-sm text-slate-400 line-clamp-2">{insights.weakness}</p>
            </div>
          </div>
        </Card>

      </div>

      {/* QUESTION BREAKDOWN SECTION */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          Question Analysis
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {history.map((item, idx) => (
            <Card key={idx} className="space-y-4 hover:border-primary/30 transition-colors">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-lg">
                  Question {idx + 1}
                </h3>
                <span className={`text-lg font-bold ${item.score >= 7 ? 'text-green-400' : item.score >= 5 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {item.score}/10
                </span>
              </div>

              {/* Specific Insights */}
              <div className="space-y-3 pt-2">
                <div className="flex gap-3 items-start">
                  <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs uppercase text-slate-500 font-bold">Strengths</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.strengths}</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-xs uppercase text-slate-500 font-bold">Improvements</span>
                    <p className="text-sm text-slate-300 leading-relaxed">{item.weaknesses}</p>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* FULL REPORT */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">Full Written Report</h2>
        <Card className="prose prose-invert max-w-none p-8 bg-slate-900/30">
          <ReactMarkdown>{report}</ReactMarkdown>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row justify-center gap-4 py-8">
        <Button onClick={handleDownload} variant="primary" icon={Download} className="w-full sm:w-auto px-8">
          Download PDF Report
        </Button>
        <Button onClick={() => navigate("/")} variant="outline" icon={RotateCcw} className="w-full sm:w-auto px-8">
          Start New Interview
        </Button>
      </div>

    </div>
  );
}
