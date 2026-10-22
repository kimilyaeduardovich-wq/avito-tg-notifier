#!/usr/bin/env bash
# Yandex Cloud Shell: без git clone (там chmod ломается).
set -euo pipefail

ROOT="${HOME}/avito-tg-notifier"
rm -rf "$ROOT"
mkdir -p /tmp/avito-src
cd /tmp/avito-src
rm -rf avito-tg-notifier-fix-avito-netcheck avito.zip
curl -fsSL -o avito.zip \
  "https://github.com/kimilyaeduardovich-wq/avito-tg-notifier/archive/refs/heads/fix/avito-netcheck.zip"
python3 - <<'PY'
import zipfile
from pathlib import Path
zipfile.ZipFile("avito.zip").extractall(".")
print("extracted", list(Path(".").glob("avito-tg-notifier-*")))
PY
SRC=$(echo /tmp/avito-src/avito-tg-notifier-*)
rm -rf "$ROOT"
mv "$SRC" "$ROOT"
cd "$ROOT"

if [ -f "$HOME/avito.env" ]; then
  cp "$HOME/avito.env" .env
fi
if [ ! -f .env ]; then
  echo "Нет .env. Загрузи файл avito.env с рабочего стола в Cloud Shell (Upload) в домашнюю папку."
  exit 1
fi

# Cloud Shell: python3, не .venv
python3 - <<'PY'
from pathlib import Path
p = Path("scripts/deploy_yandex.sh")
t = p.read_text().replace('PY="$ROOT/.venv/bin/python"', 'PY="python3"')
p.write_text(t)
PY

python3 -m pip -q install --user 'boto3>=1.34' 'httpx>=0.27' 'python-dotenv>=1.0'
export PATH="$HOME/.local/bin:$PATH"
mkdir -p data
echo '{"accounts":{}}' > data/seen.json
# optional: try pull state without full git clone
curl -fsSL -o /tmp/seen.json \
  "https://raw.githubusercontent.com/kimilyaeduardovich-wq/avito-tg-notifier/avito-bot-state/seen.json" \
  && cp /tmp/seen.json data/seen.json && echo "state loaded" || echo "state bootstrap empty"

chmod +x scripts/deploy_yandex.sh
bash scripts/deploy_yandex.sh
echo "=== invoke ==="
yc serverless function invoke --name avito-tg-poller --data '{}' || true
echo
yc serverless function logs avito-tg-poller --since 5m || true
