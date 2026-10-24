#!/usr/bin/env bash
# На Mac: две ОДНОСТРОЧНЫЕ команды для Cloud Shell.
# Нельзя вставлять set -e / многострочный скрипт в интерактивный Shell —
# при ошибке сессия закрывается (выглядит как «exit»).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

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
lines = [f"{k}={v}" for k, v in vals.items() if v and (k == "TG_CHAT_ID" or k.startswith("ACCOUNT_"))]
out.write_text("\n".join(lines) + "\n")
print(f"env keys={len(lines)}")
PY

ENV_B64="$(base64 < "$FILTERED" | tr -d '\n')"
STEP1="/tmp/avito_step1.sh"
STEP2="/tmp/avito_step2.sh"
BOOT_URL="https://raw.githubusercontent.com/kimilyaeduardovich-wq/avito-tg-notifier/fix/avito-netcheck/scripts/cloudshell_bootstrap.sh"

printf '%s\n' "echo '${ENV_B64}' | base64 -d > \"\$HOME/avito.env\" && chmod 600 \"\$HOME/avito.env\" && echo ENV_OK" > "$STEP1"
printf '%s\n' "curl -fsSL -o /tmp/avito_boot.sh \"${BOOT_URL}\" && bash /tmp/avito_boot.sh" > "$STEP2"

cat > /tmp/avito_cloudshell_STEPS.txt <<EOF
Cloud Shell — только ОДНА строка за раз (не многострочный скрипт).

1) Сейчас в буфере ШАГ 1 — вставь Cmd+V, Enter.
   Жди: ENV_OK

2) Потом вставь ШАГ 2 (одна строка):
$(cat "$STEP2")

Жди: DONE
EOF

pbcopy < "$STEP1"
echo "ШАГ 1 в буфере ($(wc -c < "$STEP1" | tr -d ' ') bytes)"
echo "ШАГ 2:"
cat "$STEP2"
echo "инструкция: /tmp/avito_cloudshell_STEPS.txt"
