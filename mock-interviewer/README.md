# 🤖 Composable AI Mock Interviewer  
### Composable, Adaptive & Feedback-Driven Interview Platform

## AIIC Project Initial Version

This copy is the AIIC project baseline deployed on the user's Alibaba Cloud ECS.

- Backend LLM provider: DeepSeek OpenAI-compatible Chat Completions API
- Model: `deepseek-v4-flash`
- Thinking mode: explicitly disabled with `thinking.type = "disabled"`
- API base path: frontend uses `/api` by default for same-origin Nginx deployment
- Secrets: real API keys are loaded from server environment variables and are not committed
- Public test URL used during setup: `https://8.140.221.115/`

[![Live Demo](https://img.shields.io/badge/Live-Demo-brightgreen)](https://composable-ai-mock-interviewer-ldcv.onrender.com)
[![Frontend](https://img.shields.io/badge/Frontend-React-blue)](https://react.dev)
[![Backend](https://img.shields.io/badge/Backend-Flask-black)](https://flask.palletsprojects.com)
[![LLM](https://img.shields.io/badge/LLM-Groq%20(LLaMA3)-purple)](https://groq.com)

An **AI-powered mock interview platform** that dynamically adapts questions, evaluates answers, tracks interview memory, and generates a **detailed final interview report**.

Unlike traditional interview tools that rely on static question lists, this system is built using **composable AI blocks** that work together to simulate a **real interviewer**.

---

## 🚀 Live Demo

🔗 **Frontend + Backend (Deployed)**  
👉 [https://composable-ai-mock-interviewer-ldcv.onrender.com](https://composable-ai-mock-interviewer-five.vercel.app/)

---

## 🎯 Problem Statement

Most interview preparation platforms suffer from:
- Static, predefined questions
- No adaptability based on answers
- No real evaluation or feedback
- No scoring or interview summary

This project solves that by building a **stateful, adaptive AI interviewer** that:
- Adjusts questions in real time
- Evaluates answers fairly (not overly strict)
- Tracks confidence vs competence
- Produces a professional interview report

---

## ✅ Hackathon Requirements Coverage

| Requirement | Status |
|------------|--------|
| Interview type selection (HR / Tech / Behavioral) | ✅ |
| Context input (Topic / Resume / Project) | ✅ |
| Adaptive interview (≥ 5 Q&A turns) | ✅ |
| Evaluation logic + scoring | ✅ |
| Final interview report | ✅ |
| Composable interview flow | ✅ |
| Audio (voice-based questions) | ✅ |
| Working UI | ✅ |
| Candidate Q&A experience | ✅ |

---

## 🧠 Composable AI Architecture

The system is built using **independent AI blocks**:
```text
Role Block (Interview Type)
↓
Question Generator (LLM)
↓
Memory Block (Q&A History)
↓
Evaluation Block (Scoring)
↓
Feedback Block (Improvements)
↓
Final Report Generator
```

Each block is **loosely coupled**, making the system:
- Extensible
- Maintainable
- Easy to upgrade

---

## 🧩 Interview Modes

### 1️⃣ Normal Interview
- Select interview type: **Technical / HR / Behavioral**
- Select topic (Python, JavaScript, SQL, etc.)
- Optional resume upload
- Adaptive questioning based on performance

### 2️⃣ Project (GitHub) Interview
- Provide a **GitHub repository URL**
- AI reads the project **README**
- Questions focus on:
  - Design decisions
  - Architecture
  - Technical trade-offs
- Evaluates real-world understanding

---

## 🎤 Audio Mode (Voice Questions)

- Each interview question is **narrated using browser speech synthesis**
- Candidate can replay the question anytime
- Improves accessibility and realism

---

## 🧠 Adaptive Questioning Logic

Next question depends on:
- Quality of previous answers
- Interview phase (warm-up → intermediate → advanced)
- Candidate confidence vs observed competence
- Resume or project context (if provided)

This avoids:
- Repetition
- Random difficulty jumps
- Static interview flows

---

## 📊 Evaluation & Scoring

Each answer is evaluated on:
- Conceptual correctness
- Clarity of explanation
- Depth of understanding
- Practical reasoning

The evaluator is **intentionally mellowed**:
- Near-correct answers are not harshly penalized
- Encourages learning instead of discouragement

---

## 📄 Final Interview Report

After 5 interview questions, the system generates a **professional interview report**, including:

- Overall performance summary
- Strengths and weaknesses
- Confidence vs competence comparison
- Question-wise evaluation
- Final score & verdict
- Actionable improvement tips

📥 **Report can be downloaded as PDF**

---

## 🧠 Where AI Is Used

AI is used across the system:

- **Question Generation:** LLM dynamically creates interview questions
- **Adaptive Logic:** Next question depends on previous answers
- **Answer Evaluation:** AI scores responses and highlights gaps
- **Competence Estimation:** Tracks performance trends
- **Final Report Generation:** AI writes a structured interview report
- **Audio Narration:** AI-assisted text-to-speech (browser API)
- **Documentation:** This README was structured using **AI-assisted tooling (readme.so)**

---

## 🖥️ Technology Stack

### Frontend
- React (Vite)
- Tailwind CSS
- Monaco Editor (code answers)
- React Markdown

### Backend
- Python
- Flask
- Flask-CORS

### AI / LLM
- Groq API
- LLaMA 3.1 (8B Instant)

### Deployment
- Frontend: **Vercel**
- Backend: **Render**

---

## 📂 Project Structure

```text
frontend/
├── src/
│ ├── components/
│ ├── pages/
│ ├── services/
│ └── context/

backend/
├── routes/
├── core/
├── utils/
├── config/
└── app.py
```


---

## 🔐 Environment Variables

Create a `.env` file inside `backend/`:

```env
GROQ_API_KEY=your_groq_api_key
FLASK_ENV=production
```

## 🧪 Running Locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```


## 🚀 Deployment Details

**Backend:** Deployed on Render  
**Frontend:** Deployed on Vercel  

### 🔗 API Base URL
```js
const API = "https://composable-ai-mock-interviewer-ldcv.onrender.com/api";
```

## 🔮 Future Improvements

- Code execution sandbox for real-time evaluation  
- Multi-candidate analytics dashboard  
- Recruiter / interviewer dashboard  
- Persistent interview history per user  
- Difficulty calibration based on role and experience  
- Interview performance comparison metrics  

---

## 👨‍💻 Author

**Koushik Gupta**  
*B.Tech (Information Technology)*  
**AI Systems | Full-Stack Developer**

---

## 🏁 Final Note

This project demonstrates how **AI interviews should be built**:

- **Modular**  
- **Adaptive**  
- **Fair**  
- **Insightful**  

> **Not just asking questions —  
> but understanding the candidate.**
