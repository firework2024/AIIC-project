from flask import Blueprint, request, jsonify, send_file
import uuid
import io
from flask_cors import cross_origin

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont

from core.question_generator import generate_business_context, generate_next_question
from core.evaluator import evaluate_answer
from core.competence_estimator import estimate_competence
from core.report_generator import generate_final_report
from utils.resume_validator import is_valid_resume
from utils.github_fetcher import (
    is_valid_github_url,
    fetch_readme,
    extract_repo_name
)

interview_bp = Blueprint("interview", __name__)

INTERVIEW_SESSIONS = {}
MAX_QUESTIONS = 8


def build_fallback_report(session, estimated_competence):
    lines = [
        "1. 最终得分与结论",
        f"- 最终得分：{estimated_competence}/10",
        "- 结论：有潜力",
        "- 一句话理由：系统已完成面试，但详细报告生成失败，先返回简化结果。",
        "",
        "2. 逐题简评",
    ]

    for i, (qa, evaluation) in enumerate(
        zip(session["qa_history"], session["evaluation_history"]),
        start=1,
    ):
        lines.extend(
            [
                f"Q{i}. 问题：",
                qa["question"],
                "",
                "候选人回答：",
                qa["answer"],
                "",
                "评价：",
                f"- 得分：{evaluation.get('score', 0)}/10",
                f"- 优势：{evaluation.get('strengths', '暂无')}",
                f"- 改进：{evaluation.get('weaknesses', '暂无')}",
                "",
            ]
        )

    lines.extend(
        [
            "3. 下一步准备建议",
            "- 回顾每道题中的关键假设和推理逻辑。",
            "- 围绕目标 JD 补充更具体的岗位案例和经历表达。",
            "- 强化金融 technical、商业判断和结构化沟通。",
        ]
    )
    return "\n".join(lines)


# ======================================================
# START INTERVIEW
# ======================================================
@interview_bp.route("/start", methods=["POST"])
def start_interview():
    form = request.form

    name = form.get("name")
    interview_mode = form.get("mode", "normal")
    confidence = int(form.get("confidence", 5))
    jd_text = form.get("jd_text", "").strip()

    if not name:
        return jsonify({"error": "请填写姓名"}), 400

    resume_text = ""
    project_readme = ""
    project_name = ""

    if interview_mode in ("normal", "business", "mixed"):
        role = form.get("role")
        topic = form.get("topic")

        if not role or not topic:
            return jsonify({"error": "请选择岗位方向和业务主题"}), 400

        resume_file = request.files.get("resume")
        if interview_mode == "normal" and not resume_file:
            return jsonify({"error": "简历深挖模式需要先上传简历"}), 400
        if resume_file:
            ok, res = is_valid_resume(resume_file)
            if not ok:
                return jsonify({"error": res}), 400
            resume_text = res

    elif interview_mode == "project":
        github_url = form.get("github_url")

        if not github_url or not is_valid_github_url(github_url):
            return jsonify({"error": "请输入有效的 GitHub URL"}), 400

        project_readme = fetch_readme(github_url)
        if not project_readme:
            project_readme = "README 不可用。请围绕项目的业务价值、数据、方法和风险提出高层问题。"

        project_name = extract_repo_name(github_url)
        role = "金融项目"
        topic = "项目复盘"
        confidence = 0

    else:
        return jsonify({"error": "无效的面试模式"}), 400

    business_context = ""
    if interview_mode in ("business", "mixed"):
        business_context = generate_business_context(
            role=role,
            topic=topic,
            jd_text=jd_text
        )

    session_id = str(uuid.uuid4())

    INTERVIEW_SESSIONS[session_id] = {
        "name": name,
        "interview_mode": interview_mode,
        "role": role,
        "topic": topic,
        "confidence": confidence,
        "jd_text": jd_text,
        "business_context": business_context,
        "resume_text": resume_text,
        "project_readme": project_readme,
        "project_name": project_name,
        "qa_history": [],
        "evaluation_history": [],
        "question_count": 0,
        "current_question": None
    }

    first_question = generate_next_question(
        role=role,
        topic=topic,
        confidence=confidence,
        competence_summary="面试刚开始",
        qa_history=[],
        is_fresher=True,
        interview_mode=interview_mode,
        project_readme=project_readme,
        project_name=project_name,
        resume_text=resume_text,
        jd_text=jd_text,
        business_context=business_context
    )

    INTERVIEW_SESSIONS[session_id]["current_question"] = first_question

    return jsonify({
        "session_id": session_id,
        "question": first_question
    }), 200


# ======================================================
# ANSWER QUESTION
# ======================================================
@interview_bp.route("/answer", methods=["POST"])
def submit_answer():
    data = request.get_json(silent=True)

    if not data:
        return jsonify({"error": "请求格式无效"}), 400

    session_id = data.get("session_id")
    answer = data.get("answer", "").strip()

    if not session_id:
        return jsonify({"error": "缺少 session_id"}), 400

    session = INTERVIEW_SESSIONS.get(session_id)
    if not session:
        return jsonify({"error": "面试会话已失效，请重新开始。"}), 400

    question = session["current_question"]

    session["qa_history"].append({
        "question": question,
        "answer": answer or "Don't know"
    })

    evaluation = evaluate_answer(
        session["role"],
        session["topic"],
        question,
        answer,
        session.get("jd_text", ""),
        session.get("business_context", "")
    )

    session["evaluation_history"].append(evaluation)
    session["question_count"] += 1

    competence = estimate_competence(
        session["role"],
        session["topic"],
        session["confidence"],
        session["evaluation_history"],
        session.get("jd_text", "")
    )

    if session["question_count"] >= MAX_QUESTIONS:
        estimated_competence = competence.get("estimated_competence", session["confidence"])
        try:
            report = generate_final_report(
                session["role"],
                session["topic"],
                session["confidence"],
                estimated_competence,
                session["qa_history"],
                session["name"],
                session.get("jd_text", ""),
                session.get("business_context", "")
            )
            if not report or report.startswith("LLM Error:"):
                report = build_fallback_report(session, estimated_competence)
        except Exception:
            report = build_fallback_report(session, estimated_competence)
        return jsonify({
            "done": True, 
            "report": report,
            "evaluation_history": session["evaluation_history"]
        }), 200

    next_question = generate_next_question(
        role=session["role"],
        topic=session["topic"],
        confidence=session["confidence"],
        competence_summary=competence.get("reasoning", ""),
        qa_history=session["qa_history"],
        is_fresher=True,
        interview_mode=session["interview_mode"],
        project_readme=session["project_readme"],
        project_name=session["project_name"],
        resume_text=session["resume_text"],
        jd_text=session.get("jd_text", ""),
        business_context=session.get("business_context", "")
    )

    session["current_question"] = next_question

    return jsonify({
        "done": False,
        "next_question": next_question
    }), 200

# ======================================================
# DOWNLOAD REPORT PDF (STATELESS ✅)
# ======================================================
@interview_bp.route("/report/pdf", methods=["POST"])
@cross_origin()
def download_report_pdf():
    data = request.get_json(silent=True)

    if not data or "report" not in data:
        return jsonify({"error": "缺少报告内容"}), 400

    report_text = data["report"]

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
    pdf.setFont("STSong-Light", 10)
    width, height = A4

    y = height - 40
    for line in report_text.split("\n"):
        if y < 40:
            pdf.showPage()
            pdf.setFont("STSong-Light", 10)
            y = height - 40
        pdf.drawString(40, y, line[:110])
        y -= 14

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="金融面试报告.pdf",
        mimetype="application/pdf"
    )
