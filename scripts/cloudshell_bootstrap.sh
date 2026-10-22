#!/usr/bin/env bash
# Run inside Yandex Cloud Shell after uploading ~/avito.env (or repo .env).
set -euo pipefail
cd ~/avito-tg-notifier 2>/dev/null || {
  git clone -b fix/avito-netcheck --depth 1 https://github.com/kimilyaeduardovich-wq/avito-tg-notifier.git ~/avito-tg-notifier
  cd ~/avito-tg-notifier
}
if [ -f "$HOME/avito.env" ]; then
  cp "$HOME/avito.env" .env
fi
if [ ! -f .env ]; then
  echo "Нет файла .env. Загрузи avito.env в Cloud Shell (иконка Upload) в домашнюю папку."
  exit 1
fi
python3 - <<'PY'
from pathlib import Path
p = Path("scripts/deploy_yandex.sh")
t = p.read_text().replace('PY="$ROOT/.venv/bin/python"', 'PY="python3"')
p.write_text(t)
PY
python3 -m pip -q install --user 'boto3>=1.34' 'httpx>=0.27' 'python-dotenv>=1.0'
export PATH="$HOME/.local/bin:$PATH"
mkdir -p data
git fetch origin avito-bot-state:avito-bot-state 2>/dev/null || true
git show avito-bot-state:seen.json > data/seen.json 2>/dev/null || echo '{"accounts":{}}' > data/seen.json
chmod +x scripts/deploy_yandex.sh
bash scripts/deploy_yandex.sh
echo "=== invoke ==="
yc serverless function invoke --name avito-tg-poller --data '{}' || true
yc serverless function logs avito-tg-poller --since 5m || true
