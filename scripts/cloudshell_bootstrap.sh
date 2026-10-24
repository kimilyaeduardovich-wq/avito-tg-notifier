#!/usr/bin/env bash
# Yandex Cloud Shell: скачать репо → .env → деплой функции + таймер → один invoke.
# Перед запуском: ~/avito.env с TG_CHAT_ID и ACCOUNT_* (см. make_cloudshell_paste.sh).
set -euo pipefail

WORK=/tmp/avito-deploy
rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"

BRANCH="${AVITO_BRANCH:-fix/avito-netcheck}"
curl -fsSL -o avito.zip \
  "https://github.com/kimilyaeduardovich-wq/avito-tg-notifier/archive/refs/heads/${BRANCH}.zip"

python3 - <<'PY'
import zipfile, shutil
from pathlib import Path
zipfile.ZipFile("avito.zip").extractall(".")
src = next(Path(".").glob("avito-tg-notifier-*"))
dest = Path("repo")
if dest.exists():
    shutil.rmtree(dest)
# Cloud Shell иногда блокирует copy2 (mode/times) — копируем только содержимое
shutil.copytree(src, dest, copy_function=shutil.copyfile)
print("ready", dest.resolve())
PY

cd "$WORK/repo"

if [ -f "$HOME/avito.env" ]; then
  cp "$HOME/avito.env" .env
fi
if [ ! -f .env ]; then
  echo "Нет .env — сначала создай ~/avito.env (или запусти paste-скрипт с Mac)"
  exit 1
fi

python3 -m venv .venv
.venv/bin/pip -q install --upgrade pip
.venv/bin/pip -q install 'boto3>=1.34' 'httpx>=0.27' 'python-dotenv>=1.0'

mkdir -p data
if [ -f "$HOME/avito.seen.json" ] && [ -s "$HOME/avito.seen.json" ]; then
  cp "$HOME/avito.seen.json" data/seen.json
  echo "state from ~/avito.seen.json"
else
  curl -fsSL -o data/seen.json \
    "https://raw.githubusercontent.com/kimilyaeduardovich-wq/avito-tg-notifier/avito-bot-state/seen.json" \
    || echo '{"accounts":{}}' > data/seen.json
fi

# Cloud Shell: без endpoint/cloud/folder yc падает
yc config set endpoint api.cloud.yandex.net:443
yc config set cloud-id "${YC_CLOUD_ID:-b1gibv98bqrmvdmhomm8}"
yc config set folder-id "${YC_FOLDER_ID:-b1g302pgg5aano245jk5}"

mkdir -p "$HOME/.avito-tg-notifier"
if [ -f "$HOME/.avito-tg-notifier/yc_state_key.json" ]; then
  cp "$HOME/.avito-tg-notifier/yc_state_key.json" data/yc_state_key.json
fi

chmod +x scripts/deploy_yandex.sh
bash scripts/deploy_yandex.sh

if [ -f data/yc_state_key.json ]; then
  cp data/yc_state_key.json "$HOME/.avito-tg-notifier/yc_state_key.json"
fi

echo "=== invoke once ==="
yc serverless function invoke --name avito-tg-poller --data '{}' || true
echo
echo "=== logs (если log-group нет — не страшно) ==="
yc serverless function logs avito-tg-poller --since 5m 2>/dev/null || true
echo "DONE. Таймер: каждую минуту. После стабильных логов — выключи Mac-поллер."
