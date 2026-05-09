import os
from pathlib import Path
from typing import Any

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(pattern="^(system|user|assistant)$")
    content: str = Field(min_length=1, max_length=8000)


class ChatRequest(BaseModel):
    messages: list[ChatMessage] = Field(min_length=1, max_length=30)


BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"

app = FastAPI(title="AIIC Chatbot Demo")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/")
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")}


@app.get("/deploy-info")
def deploy_info() -> dict[str, str]:
    deployed_at_path = BASE_DIR / "DEPLOYED_AT.txt"
    try:
        deployed_at = deployed_at_path.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        deployed_at = "unknown"
    return {
        "app": "AIIC Chatbot Demo",
        "deployed_at": deployed_at,
        "model": os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash"),
    }


@app.post("/api/chat")
async def chat(payload: ChatRequest) -> dict[str, Any]:
    api_key = os.getenv("DEEPSEEK_API_KEY")
    if not api_key:
        raise HTTPException(status_code=500, detail="Server API key is not configured")

    base_url = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
    model = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")
    messages = [message.model_dump() for message in payload.messages]

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "messages": messages,
                    "temperature": 0.7,
                    "stream": False,
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"DeepSeek request failed: {exc}") from exc

    if response.status_code >= 400:
        detail = response.text[:500]
        raise HTTPException(status_code=502, detail=f"DeepSeek API error: {detail}")

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise HTTPException(status_code=502, detail="DeepSeek response did not include assistant content")

    return {"reply": content, "model": model}
