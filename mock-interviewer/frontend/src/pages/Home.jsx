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
          <span>Powered by DeepSeek V4 Flash</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold font-display tracking-tight text-white animate-fade-up" style={{ animationDelay: '0.1s' }}>
          Master Your <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-purple-400 to-secondary text-glow">
            Interview Skills
          </span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed animate-fade-up" style={{ animationDelay: '0.2s' }}>
          Experience the future of interview preparation. Our AI adapts to your responses, providing real-time feedback and detailed performance analysis.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-up" style={{ animationDelay: '0.3s' }}>
          <Link to="/interview/new">
            <Button size="lg" variant="glow" icon={Mic} className="w-full sm:w-auto min-w-[200px] text-lg">
              Start Interview
            </Button>
          </Link>
          {/* <Button variant="outline" className="w-full sm:w-auto">
            View Demo
          </Button> */}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full animate-fade-up" style={{ animationDelay: '0.4s' }}>
        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center mb-4 text-primary">
            <Mic className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Real-time Analysis</h3>
          <p className="text-slate-400">
            Get instant feedback on your answers with voice-enabled interaction for a realistic experience.
          </p>
        </Card>

        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-secondary/20 flex items-center justify-center mb-4 text-secondary">
            <Cpu className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Adaptive AI</h3>
          <p className="text-slate-400">
            Dynamic questions that evolve based on your expertise level and previous responses.
          </p>
        </Card>

        <Card hover className="md:col-span-1">
          <div className="w-12 h-12 rounded-lg bg-accent/20 flex items-center justify-center mb-4 text-accent">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Detailed Reports</h3>
          <p className="text-slate-400">
            Comprehensive breakdown of your performance with actionable insights and skill mapping.
          </p>
        </Card>
      </div>

    </div>
  );
}
