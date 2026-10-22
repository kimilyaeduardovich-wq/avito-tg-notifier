#!/usr/bin/env bash
# Yandex Cloud Shell bootstrap (no git clone; PEP668-safe venv).
set -euo pipefail

WORK=/tmp/avito-deploy
rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"

curl -fsSL -o avito.zip \
  "https://github.com/kimilyaeduardovich-wq/avito-tg-notifier/archive/refs/heads/fix/avito-netcheck.zip"
python3 - <<'PY'
import zipfile, shutil
from pathlib import Path
zipfile.ZipFile("avito.zip").extractall(".")
src = next(Path(".").glob("avito-tg-notifier-*"))
# copy without preserving mode/times (Cloud Shell blocks that)
dest = Path("repo")
if dest.exists():
    shutil.rmtree(dest)
shutil.copytree(src, dest, copy_function=shutil.copyfile)
print("ready", dest)
PY

cd "$WORK/repo"

if [ -f "$HOME/avito.env" ]; then
  cp "$HOME/avito.env" .env
fi
if [ ! -f .env ]; then
  echo "Нет .env — сначала создай ~/avito.env"
  exit 1
fi

python3 -m venv .venv
.venv/bin/pip -q install --upgrade pip
.venv/bin/pip -q install 'boto3>=1.34' 'httpx>=0.27' 'python-dotenv>=1.0'

mkdir -p data
echo '{"accounts":{}}' > data/seen.json
curl -fsSL -o data/seen.json \
  "https://raw.githubusercontent.com/kimilyaeduardovich-wq/avito-tg-notifier/avito-bot-state/seen.json" \
  || echo '{"accounts":{}}' > data/seen.json

chmod +x scripts/deploy_yandex.sh
bash scripts/deploy_yandex.sh

echo "=== invoke ==="
yc serverless function invoke --name avito-tg-poller --data '{}' || true
echo
yc serverless function logs avito-tg-poller --since 5m || true
