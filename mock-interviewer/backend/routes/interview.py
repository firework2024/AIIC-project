from flask import Blueprint, request, jsonify, send_file
import uuid
import io
from flask_cors import cross_origin

from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

from core.question_generator import generate_next_question
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
MAX_QUESTIONS = 5


# ======================================================
# START INTERVIEW
# ======================================================
@interview_bp.route("/start", methods=["POST"])
def start_interview():
    form = request.form

    name = form.get("name")
    interview_mode = form.get("mode", "normal")
    confidence = int(form.get("confidence", 5))

    if not name:
        return jsonify({"error": "Name is required"}), 400

    resume_text = ""
    project_readme = ""
    project_name = ""

    if interview_mode == "normal":
        role = form.get("role")
        topic = form.get("topic")

        if not role or not topic:
            return jsonify({"error": "Role and topic are required"}), 400

        resume_file = request.files.get("resume")
        if resume_file:
            ok, res = is_valid_resume(resume_file)
            if not ok:
                return jsonify({"error": res}), 400
            resume_text = res

    elif interview_mode == "project":
        github_url = form.get("github_url")

        if not github_url or not is_valid_github_url(github_url):
            return jsonify({"error": "Valid GitHub URL is required"}), 400

        project_readme = fetch_readme(github_url)
        if not project_readme:
            project_readme = "README not available. Ask high-level architecture questions."

        project_name = extract_repo_name(github_url)
        role = "Technical"
        topic = "Project"
        confidence = 0

    else:
        return jsonify({"error": "Invalid interview mode"}), 400

    session_id = str(uuid.uuid4())

    INTERVIEW_SESSIONS[session_id] = {
        "name": name,
        "interview_mode": interview_mode,
        "role": role,
        "topic": topic,
        "confidence": confidence,
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
        competence_summary="Interview started",
        qa_history=[],
        is_fresher=True,
        interview_mode=interview_mode,
        project_readme=project_readme,
        project_name=project_name,
        resume_text=resume_text
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
        return jsonify({"error": "Invalid JSON payload"}), 400

    session_id = data.get("session_id")
    answer = data.get("answer", "").strip()

    if not session_id:
        return jsonify({"error": "session_id missing"}), 400

    session = INTERVIEW_SESSIONS.get(session_id)
    if not session:
        return jsonify({"error": "Session expired. Please restart interview."}), 400

    question = session["current_question"]

    session["qa_history"].append({
        "question": question,
        "answer": answer or "Don't know"
    })

    evaluation = evaluate_answer(
        session["role"],
        session["topic"],
        question,
        answer
    )

    session["evaluation_history"].append(evaluation)
    session["question_count"] += 1

    competence = estimate_competence(
        session["topic"],
        session["confidence"],
        session["evaluation_history"]
    )

    if session["question_count"] >= MAX_QUESTIONS:
        report = generate_final_report(
            session["role"],
            session["topic"],
            session["confidence"],
            competence.get("estimated_competence"),
            session["qa_history"],
            session["name"]
        )
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
        resume_text=session["resume_text"]
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
        return jsonify({"error": "Report content missing"}), 400

    report_text = data["report"]

    buffer = io.BytesIO()
    pdf = canvas.Canvas(buffer, pagesize=A4)
    width, height = A4

    y = height - 40
    for line in report_text.split("\n"):
        if y < 40:
            pdf.showPage()
            y = height - 40
        pdf.drawString(40, y, line[:110])
        y -= 14

    pdf.save()
    buffer.seek(0)

    return send_file(
        buffer,
        as_attachment=True,
        download_name="Interview_Report.pdf",
        mimetype="application/pdf"
    )
