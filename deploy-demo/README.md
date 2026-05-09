# AIIC Chatbot Demo

A minimal public chatbot demo for the AIIC hackathon deployment check.

## Local Run

```bash
python3 -m venv .venv
. .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app:app --host 127.0.0.1 --port 8000
```

Set the real `DEEPSEEK_API_KEY` in the environment before using the chat API. Do not commit real API keys.

## Server Deploy

The current server layout uses:

```text
/root/aiic-deploy/AIIC-project/deploy-demo
/etc/aiic-chatbot.env
systemd service: aiic-chatbot
nginx site: /etc/nginx/sites-available/aiic-chatbot
```

Deploy from a clean Ubuntu server:

```bash
apt-get update
apt-get install -y git python3-venv python3-pip nginx curl
mkdir -p /root/aiic-deploy
cd /root/aiic-deploy
git clone https://github.com/firework2024/AIIC-project.git
cd AIIC-project/deploy-demo
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt
cp deploy/aiic-chatbot.service /etc/systemd/system/aiic-chatbot.service
cp deploy/nginx.conf /etc/nginx/sites-available/aiic-chatbot
ln -sf /etc/nginx/sites-available/aiic-chatbot /etc/nginx/sites-enabled/aiic-chatbot
rm -f /etc/nginx/sites-enabled/default
date -Iseconds > DEPLOYED_AT.txt
nginx -t
systemctl daemon-reload
systemctl enable --now aiic-chatbot
systemctl restart nginx
```

Create `/etc/aiic-chatbot.env` separately:

```text
DEEPSEEK_API_KEY=your-real-key
DEEPSEEK_MODEL=deepseek-v4-flash
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

Public URL:

```text
http://8.140.221.115/
```
