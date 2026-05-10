import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { collectAllStudyCards, deleteInterviewRecord, readInterviewHistory } from "../utils/interviewStorage";
import { BookOpen, Calendar, FileText, History as HistoryIcon, Trash2 } from "lucide-react";

function formatTime(value) {
  if (!value) return "未知时间";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

export default function History() {
  const [version, setVersion] = useState(0);
  const records = useMemo(() => readInterviewHistory(), [version]);
  const cards = useMemo(() => collectAllStudyCards(), [version]);

  const handleDelete = (id) => {
    deleteInterviewRecord(id);
    setVersion((value) => value + 1);
  };

  return (
    <div className="max-w-7xl mx-auto w-full space-y-10 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm mb-4">
            <HistoryIcon className="w-4 h-4" />
            本机记忆
          </div>
          <h1 className="text-4xl font-bold text-white">面试历史与知识库</h1>
          <p className="text-slate-400 mt-3">
            这里保存当前浏览器里的面试记录、报告和遗漏知识点。
          </p>
        </div>
        <Link to="/interview/new">
          <Button variant="glow" className="w-full md:w-auto">开始新面试</Button>
        </Link>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white">历史面试</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {records.length ? records.map((record) => (
            <Card key={record.id} className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-white">
                    {record.role || "金融面试"} / {record.topic || "综合"}
                  </h3>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mt-2">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-4 h-4" />{formatTime(record.savedAt)}</span>
                    <span>{record.name || "未命名候选人"}</span>
                    <span>{record.mode || "interview"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-white">{record.finalScore || 0}<span className="text-base text-slate-500">/10</span></div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {(record.knowledgeGaps || []).slice(0, 5).map((gap, idx) => (
                  <span key={idx} className="px-2.5 py-1 rounded-full bg-slate-800 text-xs text-slate-300">
                    {gap.title || gap}
                  </span>
                ))}
              </div>

              <div className="flex gap-3">
                <Link to={`/report/${record.id}`} className="flex-1">
                  <Button variant="primary" icon={FileText} className="w-full">查看报告</Button>
                </Link>
                <Button variant="outline" icon={Trash2} onClick={() => handleDelete(record.id)}>
                  删除
                </Button>
              </div>
            </Card>
          )) : (
            <Card className="text-slate-400 lg:col-span-2">
              暂无历史记录。完成一场面试后，系统会自动保存到这里。
            </Card>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-white">插卡式知识库</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {cards.length ? cards.map((card, idx) => (
            <Card key={`${card.title}-${idx}`} className="space-y-3 border-cyan-400/20">
              <div className="flex items-start gap-3">
                <BookOpen className="w-5 h-5 text-cyan-300 shrink-0 mt-1" />
                <div>
                  <h3 className="font-semibold text-white">{card.title}</h3>
                  <p className="text-xs text-slate-500">{card.interviewTitle} · {formatTime(card.savedAt)}</p>
                </div>
              </div>
              <p className="text-sm text-slate-300 leading-relaxed">{card.summary}</p>
              <p className="text-sm text-slate-400 leading-relaxed">{card.why_it_matters}</p>
              <div className="rounded-lg bg-slate-950/60 border border-slate-800 p-3 text-sm text-slate-300">
                {card.review_prompt}
              </div>
            </Card>
          )) : (
            <Card className="text-slate-400 md:col-span-2 xl:col-span-3">
              暂无知识卡片。回答知识性问题暴露短板后，系统会自动生成卡片。
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
