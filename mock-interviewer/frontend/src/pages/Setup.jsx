import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { fetchTopics, startInterview } from "../services/api";
import { BarChart3, BriefcaseBusiness, FileText, Loader2, Shuffle, Timer, Upload, UserRound, Zap } from "lucide-react";

const ROLE_OPTIONS = [
    { label: "投行承销与并购顾问", value: "投资银行" },
    { label: "证券销售交易与市场产品", value: "二级市场与交易" },
    { label: "资产管理与财富管理", value: "资产与财富管理" },
    { label: "卖方研究与投研分析", value: "研究" },
    { label: "私募股权、创投与另类资产", value: "私募与另类投资" },
    { label: "风险管理、合规与金融运营", value: "风控、合规与运营" },
    { label: "公司金融、司库与战略财务", value: "公司金融与战略" },
    { label: "金融科技、量化与数据产品", value: "金融科技与数据" },
];

const DIFFICULTY_OPTIONS = [
    { label: "易", value: 3, description: "基础问法，适合热身" },
    { label: "中", value: 6, description: "标准校招面试强度" },
    { label: "难", value: 9, description: "更接近高压终面" },
];

const PRESSURE_OPTIONS = [
    { label: "易", value: 3, description: "语气温和，追问较少" },
    { label: "中", value: 6, description: "正常面试压力，适度追问" },
    { label: "难", value: 9, description: "压力面强度，更犀利且追问更密集" },
];

const MODE_DESCRIPTIONS = {
    normal: "只围绕上传简历连续追问 8 题，重点考察实习、项目、研究、比赛和行为证据。",
    business: "根据 JD 生成金融业务场景，让你以目标岗位身份处理一个现场可回答的业务判断。",
    mixed: "综合覆盖简历深挖、业务模拟、金融 technical、数据分析、沟通协作和压力追问。",
    project: "解析行研报告、PPT 或投资备忘录，围绕假设、证据链、数据质量和结论稳健性提问。",
};

const MODE_HINT_ALIGN = {
    left: "left-0",
    center: "left-1/2 -translate-x-1/2",
    right: "right-0",
};

const ModeHint = ({ children, align = "center" }) => (
    <span className={`pointer-events-none absolute top-full z-30 mt-3 w-72 max-w-[calc(100vw-3rem)] rounded-xl border border-slate-700 bg-slate-950/95 px-4 py-3 text-left text-xs leading-relaxed text-slate-200 opacity-0 shadow-2xl shadow-black/40 backdrop-blur transition-all duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 ${MODE_HINT_ALIGN[align]}`}>
        {children}
    </span>
);

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
        resume: null,
        workSample: null,
        jdText: "",
        timeLimitMinutes: 20,
        pressureIndex: 6,
    });

    const getTopicOptionsForRole = (role) => {
        const roleTopics = topics[role] || [];
        return roleTopics.map((topic) => ({ label: topic, value: topic }));
    };

    const selectedRoleLabel = ROLE_OPTIONS.find((option) => option.value === formData.role)?.label || formData.role;
    const selectedDifficulty = DIFFICULTY_OPTIONS.find((option) => option.value === formData.confidence) || DIFFICULTY_OPTIONS[1];
    const selectedPressure = PRESSURE_OPTIONS.find((option) => option.value === formData.pressureIndex) || PRESSURE_OPTIONS[1];
    const timeLimitPercent = (formData.timeLimitMinutes / 60) * 100;

    const handleRoleChange = (role) => {
        const nextTopics = topics[role] || [];
        setFormData((prev) => ({
            ...prev,
            role,
            topic: nextTopics.includes(prev.topic) ? prev.topic : "",
        }));
    };

    useEffect(() => {
        fetchTopics()
            .then((res) => setTopics(res.data))
            .catch((err) => console.error("Failed to load topics", err));
    }, []);

    useEffect(() => {
        if (!formData.topic) return;
        const currentTopics = topics[formData.role] || [];
        if (currentTopics.length && !currentTopics.includes(formData.topic)) {
            setFormData((prev) => ({ ...prev, topic: "" }));
        }
    }, [formData.role, formData.topic, topics]);

    const handleStart = async () => {
        if (!formData.name) return setError("请输入姓名");
        if (formData.mode !== "project" && !formData.topic) return setError("请选择细分业务模块");
        if (formData.mode === "project" && !formData.workSample) return setError("作品答辩模式需要上传作品文件");

        if (formData.mode === "normal" && !formData.resume) return setError("简历深挖模式需要先上传简历");
        setLoading(true);
        setError("");

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("mode", formData.mode);
            data.append("confidence", formData.confidence);
            data.append("jd_text", formData.jdText);
            data.append("time_limit_minutes", formData.timeLimitMinutes);
            data.append("pressure_index", formData.pressureIndex);
            data.append("role", formData.role);
            data.append("topic", formData.topic || "作品答辩");

            if (formData.mode === "project") {
                data.append("work_sample", formData.workSample);
            } else {
                if (formData.resume) data.append("resume", formData.resume);
            }

            const res = await startInterview(data);

            sessionStorage.setItem("session_id", res.data.session_id);
            sessionStorage.setItem("current_question", res.data.question);
            sessionStorage.setItem("candidate_name", formData.name);
            sessionStorage.setItem("topic", formData.topic || "作品答辩");
            sessionStorage.setItem("target_role", formData.role);
            sessionStorage.setItem("interview_mode", formData.mode);
            sessionStorage.setItem("deadline_at", res.data.deadline_at);
            sessionStorage.setItem("time_limit_minutes", String(res.data.time_limit_minutes || formData.timeLimitMinutes));
            sessionStorage.setItem("pressure_index", String(res.data.pressure_index || formData.pressureIndex));
            sessionStorage.setItem("question_started_at", res.data.question_started_at);

            navigate(`/interview/${res.data.session_id}`);
        } catch (err) {
            setError(err.response?.data?.error || "启动面试失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-4xl bg-slate-900/40 border-slate-800/50 backdrop-blur-xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">配置金融求职模拟面试</h2>
                    <p className="text-slate-400">先选一级赛道，再选择该赛道下的细分业务模块，开始岗位定制化中文面试。</p>
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
                            className={`group relative p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "normal"
                                ? "bg-primary/20 border-primary text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <UserRound className="w-6 h-6" />
                            <span className="font-medium">简历深挖</span>
                            <ModeHint align="left">{MODE_DESCRIPTIONS.normal}</ModeHint>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, mode: "business" })}
                            className={`group relative p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "business"
                                ? "bg-secondary/20 border-secondary text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <BriefcaseBusiness className="w-6 h-6" />
                            <span className="font-medium">业务模拟</span>
                            <ModeHint>{MODE_DESCRIPTIONS.business}</ModeHint>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, mode: "mixed" })}
                            className={`group relative p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "mixed"
                                ? "bg-emerald-500/20 border-emerald-400 text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <Shuffle className="w-6 h-6" />
                            <span className="font-medium">混合面试</span>
                            <ModeHint>{MODE_DESCRIPTIONS.mixed}</ModeHint>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, mode: "project" })}
                            className={`group relative p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "project"
                                ? "bg-accent/20 border-accent text-white"
                                : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <FileText className="w-6 h-6" />
                            <span className="font-medium">作品答辩</span>
                            <ModeHint align="right">{MODE_DESCRIPTIONS.project}</ModeHint>
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
                                    label="一级赛道"
                                    value={formData.role}
                                    onChange={(e) => handleRoleChange(e.target.value)}
                                    options={ROLE_OPTIONS}
                                />
                                <Select
                                    label="细分业务模块"
                                    value={formData.topic}
                                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                    placeholder={`请选择 ${selectedRoleLabel} 下的模块`}
                                    options={getTopicOptionsForRole(formData.role)}
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
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <Select
                                    label="一级赛道"
                                    value={formData.role}
                                    onChange={(e) => handleRoleChange(e.target.value)}
                                    options={ROLE_OPTIONS}
                                />
                                <Select
                                    label="作品答辩方向"
                                    value={formData.topic}
                                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                    placeholder={`默认按 ${selectedRoleLabel} 视角答辩`}
                                    options={getTopicOptionsForRole(formData.role)}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-medium text-slate-300 ml-1">岗位 JD（可选）</label>
                                <textarea
                                    value={formData.jdText}
                                    onChange={(e) => setFormData({ ...formData, jdText: e.target.value })}
                                    className="w-full min-h-[140px] px-4 py-3 bg-slate-900/50 border border-slate-700/50 rounded-xl focus:border-primary/50 focus:ring-2 focus:ring-primary/20 placeholder:text-slate-600 text-slate-200 transition-all outline-none resize-y"
                                    placeholder="可粘贴目标岗位 JD，系统会从岗位视角追问你的作品。"
                                />
                            </div>

                            <div className="p-6 border-2 border-dashed border-accent/50 rounded-xl hover:border-accent transition-colors text-center cursor-pointer relative group bg-accent/5">
                                <input
                                    type="file"
                                    accept=".pdf,.txt,.pptx"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={(e) => setFormData({ ...formData, workSample: e.target.files[0] })}
                                />
                                <div className="flex flex-col items-center gap-2 text-slate-300 group-hover:text-white">
                                    <Upload className="w-8 h-8 text-accent" />
                                    <span className="text-sm font-medium">
                                        {formData.workSample ? formData.workSample.name : "上传作品：行研报告 / PPT / 投资备忘录"}
                                    </span>
                                    <span className="text-xs text-slate-500">支持 PDF、TXT、PPTX；系统会基于作品内容提问</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    <div className="space-y-2 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                        <div className="flex justify-between text-sm text-slate-400">
                            <label className="inline-flex items-center gap-2"><Timer className="w-4 h-4" />面试限时</label>
                        </div>
                        <div className="relative pt-5">
                            <span
                                className="absolute top-0 -translate-x-1/2 text-xs font-medium text-white"
                                style={{ left: `${timeLimitPercent}%` }}
                            >
                                {formData.timeLimitMinutes} 分钟
                            </span>
                            <input
                                type="range"
                                min="0"
                                max="60"
                                step="5"
                                value={formData.timeLimitMinutes}
                                onChange={(e) => setFormData({ ...formData, timeLimitMinutes: parseInt(e.target.value, 10) })}
                                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-white"
                            />
                        </div>
                        <div className="flex justify-between text-[11px] text-slate-500">
                            <span>0 分钟</span>
                            <span>30 分钟</span>
                            <span>60 分钟</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                            <div className="flex justify-between text-sm text-slate-400">
                                <label className="inline-flex items-center gap-2"><BarChart3 className="w-4 h-4" />模拟试题难度</label>
                                <span>{selectedDifficulty.label}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {DIFFICULTY_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, confidence: option.value })}
                                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${formData.confidence === option.value
                                            ? "border-primary bg-primary/20 text-white"
                                            : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">{selectedDifficulty.description}</p>
                        </div>

                        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/30 p-4">
                            <div className="flex justify-between text-sm text-slate-400">
                                <label className="inline-flex items-center gap-2"><Zap className="w-4 h-4" />压力面指数</label>
                                <span>{selectedPressure.label}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                                {PRESSURE_OPTIONS.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, pressureIndex: option.value })}
                                        className={`rounded-lg border px-3 py-2 text-sm font-medium transition-all ${formData.pressureIndex === option.value
                                            ? "border-red-400 bg-red-400/20 text-white"
                                            : "border-slate-700 bg-slate-900/60 text-slate-400 hover:border-slate-500 hover:text-slate-200"
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-slate-500">{selectedPressure.description}</p>
                        </div>
                    </div>

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
