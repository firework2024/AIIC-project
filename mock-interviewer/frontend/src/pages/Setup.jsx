import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { fetchTopics, startInterview } from "../services/api";
import { BarChart3, BriefcaseBusiness, Building2, Github, Loader2, Shuffle, Upload, UserRound } from "lucide-react";

const ROLE_OPTIONS = [
    { label: "投资银行", value: "投资银行" },
    { label: "二级市场 / 销售交易", value: "二级市场 / 销售交易" },
    { label: "资产与财富管理", value: "资产与财富管理" },
    { label: "研究", value: "研究" },
    { label: "私募与另类投资", value: "私募与另类投资" },
    { label: "风控 / 合规 / 运营", value: "风控 / 合规 / 运营" },
    { label: "公司金融 / 战略", value: "公司金融 / 战略" },
    { label: "金融科技 / 数据", value: "金融科技 / 数据" },
];

export default function Setup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [topics, setTopics] = useState({});
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        mode: "normal",
        role: "投资银行",
        topic: "",
        confidence: 5,
        github: "",
        resume: null,
        jdText: "",
    });

    useEffect(() => {
        fetchTopics()
            .then((res) => setTopics(res.data))
            .catch((err) => console.error("Failed to load topics", err));
    }, []);

    const handleStart = async () => {
        if (!formData.name) return setError("请输入姓名");
        if (formData.mode !== "project" && !formData.topic) return setError("请选择金融业务主题");
        if (formData.mode === "project" && !formData.github) return setError("请输入 GitHub 仓库 URL");

        if (formData.mode === "normal" && !formData.resume) return setError("简历深挖模式需要先上传简历");
        setLoading(true);
        setError("");

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("mode", formData.mode);
            data.append("confidence", formData.confidence);
            data.append("jd_text", formData.jdText);

            if (formData.mode === "project") {
                data.append("github_url", formData.github);
            } else {
                data.append("role", formData.role);
                data.append("topic", formData.topic);
                if (formData.resume) data.append("resume", formData.resume);
            }

            const res = await startInterview(data);

            sessionStorage.setItem("session_id", res.data.session_id);
            sessionStorage.setItem("current_question", res.data.question);
            sessionStorage.setItem("topic", formData.topic || "Project");
            sessionStorage.setItem("target_role", formData.role);
            sessionStorage.setItem("interview_mode", formData.mode);

            navigate(`/interview/${res.data.session_id}`);
        } catch (err) {
            setError(err.response?.data?.error || "启动面试失败");
        } finally {
            setLoading(false);
        }
    };

    const getTopicOptions = () => {
        const allTopics = [];
        Object.keys(topics).forEach((category) => {
            topics[category].forEach((topic) => {
                allTopics.push({ label: `${category} - ${topic}`, value: topic });
            });
        });
        return allTopics;
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-4xl bg-slate-900/40 border-slate-800/50 backdrop-blur-xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">配置金融求职模拟面试</h2>
                    <p className="text-slate-400">粘贴 JD，选择金融方向，开始岗位定制化中文面试。</p>
                </div>

                <div className="space-y-6">
                    <Input
                        label="候选人姓名"
                        placeholder="例如：张同学"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <button
                            onClick={() => setFormData({ ...formData, mode: "normal" })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "normal"
                                ? "bg-primary/20 border-primary text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <UserRound className="w-6 h-6" />
                            <span className="font-medium">简历深挖</span>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, mode: "business" })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "business"
                                ? "bg-secondary/20 border-secondary text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <BriefcaseBusiness className="w-6 h-6" />
                            <span className="font-medium">业务模拟</span>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, mode: "mixed" })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "mixed"
                                ? "bg-emerald-500/20 border-emerald-400 text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <Shuffle className="w-6 h-6" />
                            <span className="font-medium">混合面试</span>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, mode: "project" })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "project"
                                ? "bg-accent/20 border-accent text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <Github className="w-6 h-6" />
                            <span className="font-medium">项目复盘</span>
                        </button>
                    </div>

                    {formData.mode !== "project" && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label="目标岗位方向"
                                    value={formData.role}
                                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    options={ROLE_OPTIONS}
                                />
                                <Select
                                    label="业务主题"
                                    value={formData.topic}
                                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                    options={[
                                        { label: "请选择金融业务主题", value: "" },
                                        ...getTopicOptions(),
                                    ]}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">岗位 JD</label>
                                <textarea
                                    value={formData.jdText}
                                    onChange={(e) => setFormData({ ...formData, jdText: e.target.value })}
                                    className="w-full min-h-[180px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-slate-600 text-slate-200 transition-all outline-none resize-y"
                                    placeholder="请粘贴目标岗位 JD。建议包含职责、技能要求、产品/业务线、行业覆盖、工具和评价标准。中文或英文 JD 都可以。"
                                />
                            </div>

                            <div className="p-6 border-2 border-dashed border-slate-700 rounded-xl hover:border-slate-500 transition-colors text-center cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setFormData({ ...formData, resume: e.target.files[0] })}
                                />
                                <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-slate-200">
                                    <Upload className="w-8 h-8" />
                                    <span className="text-sm font-medium">
                                        {formData.resume ? formData.resume.name : formData.mode === "normal" ? "上传简历（必需）" : "上传简历（可选）"}
                                    </span>
                                    <span className="text-xs text-slate-500">当前 PDF 解析效果最好</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {formData.mode === "project" && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Input
                                label="GitHub 仓库 URL"
                                placeholder="https://github.com/username/repo"
                                value={formData.github}
                                onChange={(e) => setFormData({ ...formData, github: e.target.value })}
                            />
                        </motion.div>
                    )}

                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-400">
                            <label>自评准备度</label>
                            <span>{formData.confidence}/10</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={formData.confidence}
                            onChange={(e) => setFormData({ ...formData, confidence: parseInt(e.target.value, 10) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover"
                        />
                    </div>

                    {formData.mode === "business" && (
                        <div className="flex items-start gap-3 rounded-xl border border-secondary/20 bg-secondary/10 p-4 text-sm text-slate-300">
                            <Building2 className="w-5 h-5 text-secondary mt-0.5 shrink-0" />
                            <p>
                                业务模拟会根据 JD 生成面试官人设和金融业务场景，并围绕场景追问。
                            </p>
                        </div>
                    )}

                    {formData.mode === "mixed" && (
                        <div className="flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-slate-300">
                            <Shuffle className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
                            <p>
                                混合面试共 8 题；如果上传简历，前 4 题连续简历深挖，后 4 题覆盖业务模拟、金融 technical、数据分析、沟通协作和压力追问。
                            </p>
                        </div>
                    )}

                    {formData.mode === "normal" && (
                        <div className="flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-4 text-sm text-slate-300">
                            <BarChart3 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                            <p>
                                简历深挖共 8 题，只围绕你上传的简历连续追问，重点拷打实习、项目、比赛、研究和行为证据，不会切到别的题型。
                            </p>
                        </div>
                    )}

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <Button
                        onClick={handleStart}
                        disabled={loading}
                        className="w-full text-lg"
                        variant="glow"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "开始面试"}
                    </Button>
                </div>
            </Card>
        </div>
    );
}
