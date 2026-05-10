import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Mic, Cpu, FileText, Sparkles } from "lucide-react";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center max-w-5xl mx-auto w-full space-y-20">
      <div className="text-center space-y-8 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm mb-4 animate-fade-up">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>Powered by DeepSeek V4 Flash</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-white animate-fade-up" style={{ animationDelay: "0.1s" }}>
          Mock-Me
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary text-glow">
            一对一定制金融面试训练
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: "0.2s" }}>
          围绕简历、JD 和作品材料生成贴近真实业务场景的问题，支持压力面、明确问题、语音作答与复盘知识卡片。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: "0.3s" }}>
          <Link to="/interview/new">
            <Button size="lg" variant="glow" icon={Mic} className="w-full sm:w-auto min-w-[200px] text-lg">
              开始模拟面试
            </Button>
          </Link>
          <Link to="/history">
            <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[160px] text-lg">
              查看历史记录
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-fade-up" style={{ animationDelay: "0.4s" }}>
        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">简历与 JD 深挖</h3>
          <p className="text-slate-400">
            将候选人的经历、岗位要求和行业方向合并进问题生成，让训练更接近一对一面试准备。
          </p>
        </Card>

        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4 text-secondary">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">业务场景模拟</h3>
          <p className="text-slate-400">
            基于目标岗位构造可现场回答的业务问题，避免泛泛题库和需要查资料的报告式任务。
          </p>
        </Card>

        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 text-accent">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">复盘与知识卡片</h3>
          <p className="text-slate-400">
            面试后保留历史记录、评分报告和遗漏知识点，帮助候选人把薄弱项沉淀成下一轮训练材料。
          </p>
        </Card>
      </div>
    </div>
  );
}
