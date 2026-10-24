#!/usr/bin/env bash
# На Mac: короткая вставка для Cloud Shell (без seen.json — иначе Shell падает на paste).
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

# Короткий скрипт: только env + curl bootstrap с GitHub (без гигантского state).
cat > "$OUT" <<EOF
# Ресепшн+/поллер — короткая установка в Cloud Shell. Вставь и Enter.
set -e
echo "1/3 пишем ~/avito.env"
echo "$ENV_B64" | base64 -d > "\$HOME/avito.env"
chmod 600 "\$HOME/avito.env"
echo "2/3 качаем bootstrap"
curl -fsSL -o /tmp/avito_boot.sh \\
  "https://raw.githubusercontent.com/kimilyaeduardovich-wq/avito-tg-notifier/fix/avito-netcheck/scripts/cloudshell_bootstrap.sh"
chmod +x /tmp/avito_boot.sh
echo "3/3 деплой"
export YC_CLOUD_ID="\${YC_CLOUD_ID:-b1gibv98bqrmvdmhomm8}"
export YC_FOLDER_ID="\${YC_FOLDER_ID:-b1g302pgg5aano245jk5}"
export AVITO_BRANCH="\${AVITO_BRANCH:-fix/avito-netcheck}"
bash /tmp/avito_boot.sh
echo "OK — не закрывай Shell, пока не увидишь DONE"
EOF

chmod +x "$OUT"
BYTES=$(wc -c < "$OUT" | tr -d ' ')
echo "wrote $OUT ($BYTES bytes)"
if [ "$BYTES" -gt 4000 ]; then
  echo "WARN: paste still large — Cloud Shell may drop it"
fi
if command -v pbcopy >/dev/null 2>&1; then
  pbcopy < "$OUT"
  echo "в буфере — Cloud Shell: Cmd+V → Enter"
fi
