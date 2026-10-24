#!/usr/bin/env bash
# На Mac: собирает одну команду для вставки в Yandex Cloud Shell (с .env и state).
# Секреты в буфер /tmp — в git не попадают.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

OUT="${1:-/tmp/avito_cloudshell_paste.sh}"
FILTERED="$(mktemp)"
trap 'rm -f "$FILTERED"' EXIT

python3 - "$FILTERED" <<'PY'
import sys
from pathlib import Path
out = Path(sys.argv[1])
try:
    from dotenv import dotenv_values
except ImportError:
    def dotenv_values(p):
        d = {}
        for line in Path(p).read_text().splitlines():
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, v = line.split("=", 1)
            d[k.strip()] = v.strip().strip('"').strip("'")
        return d
vals = dotenv_values(".env")
lines = []
for k, v in vals.items():
    if v and (k == "TG_CHAT_ID" or k.startswith("ACCOUNT_")):
        lines.append(f"{k}={v}")
out.write_text("\n".join(lines) + "\n")
print(f"env keys={len(lines)}")
PY

ENV_B64="$(base64 < "$FILTERED" | tr -d '\n')"
SEEN_B64=""
if [ -s data/seen.json ]; then
  SEEN_B64="$(base64 < data/seen.json | tr -d '\n')"
fi

{
  cat <<EOF
#!/usr/bin/env bash
# Вставь целиком в Yandex Cloud Shell и нажми Enter.
set -euo pipefail
echo "$ENV_B64" | base64 -d > "\$HOME/avito.env"
chmod 600 "\$HOME/avito.env"
EOF

  if [ -n "$SEEN_B64" ]; then
    cat <<EOF
echo "$SEEN_B64" | base64 -d > "\$HOME/avito.seen.json"
EOF
  else
    cat <<'EOF'
rm -f "$HOME/avito.seen.json"
EOF
  fi

  cat <<'EOF'
export YC_CLOUD_ID="${YC_CLOUD_ID:-b1gibv98bqrmvdmhomm8}"
export YC_FOLDER_ID="${YC_FOLDER_ID:-b1g302pgg5aano245jk5}"
export AVITO_BRANCH="${AVITO_BRANCH:-fix/avito-netcheck}"

WORK=/tmp/avito-deploy
rm -rf "$WORK"
mkdir -p "$WORK"
cd "$WORK"

curl -fsSL -o avito.zip \
  "https://github.com/kimilyaeduardovich-wq/avito-tg-notifier/archive/refs/heads/${AVITO_BRANCH}.zip"

python3 - <<'PY'
import zipfile, shutil
from pathlib import Path
zipfile.ZipFile("avito.zip").extractall(".")
src = next(Path(".").glob("avito-tg-notifier-*"))
dest = Path("repo")
if dest.exists():
    shutil.rmtree(dest)
shutil.copytree(src, dest, copy_function=shutil.copyfile)
print("ready", dest.resolve())
PY

cd "$WORK/repo"
cp "$HOME/avito.env" .env

python3 -m venv .venv
.venv/bin/pip -q install --upgrade pip
.venv/bin/pip -q install 'boto3>=1.34' 'httpx>=0.27' 'python-dotenv>=1.0'

mkdir -p data
if [ -f "$HOME/avito.seen.json" ] && [ -s "$HOME/avito.seen.json" ]; then
  cp "$HOME/avito.seen.json" data/seen.json
  echo "state from Mac seen.json"
else
  curl -fsSL -o data/seen.json \
    "https://raw.githubusercontent.com/kimilyaeduardovich-wq/avito-tg-notifier/avito-bot-state/seen.json" \
    || echo '{"accounts":{}}' > data/seen.json
fi

yc config set endpoint api.cloud.yandex.net:443
yc config set cloud-id "$YC_CLOUD_ID"
yc config set folder-id "$YC_FOLDER_ID"

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
yc serverless function logs avito-tg-poller --since 5m 2>/dev/null || true
echo "DONE"
EOF
} > "$OUT"

chmod +x "$OUT"
echo "wrote $OUT ($(wc -c < "$OUT") bytes)"
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy < "$OUT"
  echo "скопировано в буфер — в Cloud Shell: Cmd+V → Enter"
fi
