import React from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Mic, Cpu, FileText, ArrowRight, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center max-w-5xl mx-auto w-full space-y-20">

      {/* Hero Section */}
      <div className="text-center space-y-8 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-300 text-sm mb-4 animate-fade-up">
          <Sparkles className="w-4 h-4 text-primary" />
          <span>由 DeepSeek V4 Flash 驱动</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-white animate-fade-up" style={{ animationDelay: '0.1s' }}>
          金融求职 <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary text-glow">
            模拟面试助手
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          围绕真实 JD、金融专业题、业务场景和岗位匹配度进行中文模拟面试，并获得逐题反馈。
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/interview/new">
            <Button size="lg" variant="glow" icon={Mic} className="w-full sm:w-auto min-w-[200px] text-lg">
              开始模拟面试
            </Button>
          </Link>
          <Link to="/history">
            <Button size="lg" variant="outline" className="w-full sm:w-auto min-w-[160px] text-lg">
              查看历史
            </Button>
          </Link>
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">JD 定向出题</h3>
          <p className="text-slate-400">
            粘贴岗位 JD，系统会围绕职责、产品、工具、行业和能力要求生成问题。
          </p>
        </Card>

        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4 text-secondary">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">业务模拟场景</h3>
          <p className="text-slate-400">
            根据 JD 生成面试官人设和业务情境，模拟真实金融工作中的判断与沟通。
          </p>
        </Card>

        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 text-accent">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">岗位匹配报告</h3>
          <p className="text-slate-400">
            复盘专业基础、商业判断、表达清晰度和 JD 匹配度。
          </p>
        </Card>
      </div>

    </div>
  );
}
