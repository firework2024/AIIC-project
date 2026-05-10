import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Select } from "../components/ui/Select";
import { fetchTopics, startInterview } from "../services/api";
import { Briefcase, Code, User, Github, Upload, Loader2, Sparkles } from "lucide-react";

export default function Setup() {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [topics, setTopics] = useState({});
    const [error, setError] = useState("");

    const [formData, setFormData] = useState({
        name: "",
        mode: "normal", // normal, project
        role: "Technical",
        topic: "",
        confidence: 5,
        github: "",
        resume: null
    });

    useEffect(() => {
        fetchTopics().then((res) => {
            setTopics(res.data);
        }).catch(err => console.error("Failed to load topics", err));
    }, []);

    const handleStart = async () => {
        if (!formData.name) return setError("Please enter your name");
        if (formData.mode === "normal" && !formData.topic) return setError("Please select a topic");
        if (formData.mode === "project" && !formData.github) return setError("Please enter a GitHub URL");

        setLoading(true);
        setError("");

        try {
            const data = new FormData();
            data.append("name", formData.name);
            data.append("mode", formData.mode);
            data.append("confidence", formData.confidence);

            if (formData.mode === "normal") {
                data.append("role", formData.role);
                data.append("topic", formData.topic);
                if (formData.resume) data.append("resume", formData.resume);
            } else {
                data.append("github_url", formData.github);
            }

            const res = await startInterview(data);

            sessionStorage.setItem("session_id", res.data.session_id);
            sessionStorage.setItem("current_question", res.data.question);
            sessionStorage.setItem("topic", formData.topic || "Project"); // For syntax highlighting hints

            navigate(`/interview/${res.data.session_id}`);
        } catch (err) {
            setError(err.response?.data?.error || "Failed to start session");
        } finally {
            setLoading(false);
        }
    };

    const getTopicOptions = () => {
        let allTopics = [];
        Object.keys(topics).forEach(category => {
            // flatten for simpler dropdown, or could do grouped
            allTopics.push({ label: `--- ${category} ---`, value: "", disabled: true });
            topics[category].forEach(t => allTopics.push({ label: t, value: t }));
        });
        return allTopics;
    };

    return (
        <div className="flex items-center justify-center min-h-[80vh]">
            <Card className="w-full max-w-2xl bg-slate-900/40 border-slate-800/50 backdrop-blur-xl">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">Configure Your Interview</h2>
                    <p className="text-slate-400">Customize the AI persona and difficulty level</p>
                </div>

                <div className="space-y-6">
                    <Input
                        label="Full Name"
                        placeholder="e.g. Alex Chen"
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />

                    {/* Mode Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={() => setFormData({ ...formData, mode: "normal" })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "normal"
                                    ? "bg-primary/20 border-primary text-white"
                                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <User className="w-6 h-6" />
                            <span className="font-medium">Standard Interview</span>
                        </button>
                        <button
                            onClick={() => setFormData({ ...formData, mode: "project" })}
                            className={`p-4 rounded-xl border flex flex-col items-center gap-2 transition-all ${formData.mode === "project"
                                    ? "bg-secondary/20 border-secondary text-white"
                                    : "bg-slate-900/50 border-slate-700 text-slate-400 hover:bg-slate-800"
                                }`}
                        >
                            <Github className="w-6 h-6" />
                            <span className="font-medium">Project Review</span>
                        </button>
                    </div>

                    {formData.mode === "normal" && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="space-y-6"
                        >
                            <div className="grid grid-cols-2 gap-4">
                                <Select
                                    label="Role Type"
                                    value={formData.role}
                                    onChange={e => setFormData({ ...formData, role: e.target.value })}
                                    options={[
                                        { label: "Technical", value: "Technical" },
                                        { label: "HR / Soft Skills", value: "HR" },
                                        { label: "Behavioral", value: "Behavioral" }
                                    ]}
                                />
                                <Select
                                    label="Topic"
                                    value={formData.topic}
                                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                                    options={[
                                        { label: "Select a topic", value: "" },
                                        ...getTopicOptions().filter(o => !o.disabled) // Simple filtering
                                    ]}
                                />
                            </div>

                            {/* Resume Upload */}
                            <div className="p-6 border-2 border-dashed border-slate-700 rounded-xl hover:border-slate-500 transition-colors text-center cursor-pointer relative group">
                                <input
                                    type="file"
                                    accept=".pdf,.docx,.txt"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={e => setFormData({ ...formData, resume: e.target.files[0] })}
                                />
                                <div className="flex flex-col items-center gap-2 text-slate-400 group-hover:text-slate-200">
                                    <Upload className="w-8 h-8" />
                                    <span className="text-sm font-medium">
                                        {formData.resume ? formData.resume.name : "Upload Resume (Optional)"}
                                    </span>
                                    <span className="text-xs text-slate-500">PDF or DOCX</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {formData.mode === "project" && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                        >
                            <Input
                                label="GitHub Repository URL"
                                placeholder="https://github.com/username/repo"
                                value={formData.github}
                                onChange={e => setFormData({ ...formData, github: e.target.value })}
                                icon={Github}
                            />
                        </motion.div>
                    )}

                    {/* Confidence Slider */}
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-slate-400">
                            <label>Difficulty / Confidence</label>
                            <span>{formData.confidence}/10</span>
                        </div>
                        <input
                            type="range"
                            min="1"
                            max="10"
                            value={formData.confidence}
                            onChange={e => setFormData({ ...formData, confidence: parseInt(e.target.value) })}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-primary hover:accent-primary-hover"
                        />
                    </div>

                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}

                    <Button
                        onClick={handleStart}
                        disabled={loading}
                        className="w-full text-lg"
                        variant="glow"
                    >
                        {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Start Session"}
                    </Button>

                </div>
            </Card>
        </div>
    );
}
