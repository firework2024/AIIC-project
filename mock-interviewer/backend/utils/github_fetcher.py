import re
import requests


def is_valid_github_url(url: str) -> bool:
    return bool(re.match(r"https://github\.com/[\w\-]+/[\w\-]+", url))


def extract_repo_name(repo_url: str) -> str:
    return repo_url.rstrip("/").split("/")[-1]


def fetch_readme(repo_url: str) -> str:
    """
    Fetch README content from GitHub repository
    Works reliably on Render / Railway
    """
    try:
        api = repo_url.replace("github.com", "api.github.com/repos")
        url = f"{api}/readme"

        headers = {
            "Accept": "application/vnd.github.v3.raw",
            "User-Agent": "AI-Mock-Interviewer"
        }

        r = requests.get(url, headers=headers, timeout=15)

        if r.status_code == 200 and r.text.strip():
            return r.text

        return ""

    except Exception as e:
        print("README fetch error:", e)
        return ""



def is_strong_readme(readme: str) -> bool:
    if not readme:
        return False
    keywords = ["architecture", "features", "workflow", "tech stack", "design"]
    return len(readme.split()) > 150 or any(k in readme.lower() for k in keywords)


def fetch_repo_tree(repo_url: str) -> list[str]:
    """
    Fetch full repository file tree (for future code-based interview)
    """
    try:
        api = repo_url.replace("github.com", "api.github.com/repos")
        url = f"{api}/git/trees/HEAD?recursive=1"
        r = requests.get(url, timeout=10)
        if r.status_code != 200:
            return []
        return [
            f["path"]
            for f in r.json().get("tree", [])
            if f.get("type") == "blob"
        ]
    except Exception:
        return []


IMPORTANT_PATTERNS = [
    "app.py", "main.py", "server.py",
    "models", "routes", "controllers",
    "services", "views",
    "index.js", "app.js",
    "requirements.txt", "package.json"
]


def select_important_files(paths, limit=4):
    chosen = []
    for p in paths:
        for key in IMPORTANT_PATTERNS:
            if key in p.lower():
                chosen.append(p)
                break
        if len(chosen) >= limit:
            break
    return chosen


def fetch_file_content(repo_url: str, path: str) -> str:
    """
    Fetch file content (used later for deep code interviews)
    """
    try:
        api = repo_url.replace("github.com", "api.github.com/repos")
        url = f"{api}/contents/{path}"
        headers = {"Accept": "application/vnd.github.v3.raw"}
        r = requests.get(url, headers=headers, timeout=10)
        return r.text[:3000] if r.status_code == 200 else ""
    except Exception:
        return ""
