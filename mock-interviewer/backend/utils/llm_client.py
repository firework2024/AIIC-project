import os

import requests
from dotenv import load_dotenv

load_dotenv()

API_KEY = os.getenv("DEEPSEEK_API_KEY")
BASE_URL = os.getenv("DEEPSEEK_BASE_URL", "https://api.deepseek.com").rstrip("/")
MODEL_NAME = os.getenv("DEEPSEEK_MODEL", "deepseek-v4-flash")


def call_llm(prompt: str, temperature: float = 0.6, max_tokens: int = 2048) -> str:
    """
    Call DeepSeek through its OpenAI-compatible chat completions API.
    """
    if not API_KEY:
        return "LLM Error: DEEPSEEK_API_KEY is not configured"

    payload = {
        "model": MODEL_NAME,
        "messages": [{"role": "user", "content": prompt}],
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
        "thinking": {"type": "disabled"},
    }

    try:
        response = requests.post(
            f"{BASE_URL}/chat/completions",
            headers={
                "Authorization": f"Bearer {API_KEY}",
                "Content-Type": "application/json",
            },
            json=payload,
            timeout=45,
        )
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"].get("content", "")
        if content:
            return content.strip()
        return "LLM Error: DeepSeek returned empty content."
    except Exception as e:
        return f"LLM Error: {str(e)}"
