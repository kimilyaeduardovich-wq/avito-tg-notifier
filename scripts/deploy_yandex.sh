#!/usr/bin/env bash
# Деплой поллера в Yandex Cloud Functions (российский IP, таймер раз в минуту).
# Повторный запуск безопасен: существующие ресурсы переиспользуются, выкатывается новая версия кода.
# Требует: yc CLI с `yc init`, локальный .env с ACCOUNT_*.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
if [ -x "$ROOT/.venv/bin/python" ]; then
  PY="$ROOT/.venv/bin/python"
else
  PY="python3"
fi

FUNC_NAME="avito-tg-poller"
SA_NAME="avito-tg-poller-sa"
TRIGGER_NAME="avito-tg-every-minute"
KEY_FILE="$ROOT/data/yc_state_key.json"

# Ensure yc profile is complete (Cloud Shell often misses endpoint/cloud-id).
yc config set endpoint api.cloud.yandex.net:443 >/dev/null
if [ -z "$(yc config get cloud-id 2>/dev/null || true)" ]; then
  yc config set cloud-id "${YC_CLOUD_ID:-b1gibv98bqrmvdmhomm8}"
fi
FOLDER_ID="$(yc config get folder-id 2>/dev/null || true)"
if [ -z "$FOLDER_ID" ]; then
  FOLDER_ID="${YC_FOLDER_ID:-b1g302pgg5aano245jk5}"
  yc config set folder-id "$FOLDER_ID"
fi
BUCKET="avito-tg-state-${FOLDER_ID}"
echo "folder=$FOLDER_ID bucket=$BUCKET cloud=$(yc config get cloud-id 2>/dev/null || true)"

sa_json_id() {
  "$PY" -c 'import json,sys; print(json.load(sys.stdin)["id"])' 2>/dev/null || true
}
SA_ID="$(yc iam service-account get --name "$SA_NAME" --format json 2>/dev/null | sa_json_id)"
if [ -z "$SA_ID" ]; then
  CREATE_OUT="$(yc iam service-account create --name "$SA_NAME" --format json 2>&1)" || {
    echo "FAILED create SA: $CREATE_OUT"
    exit 1
  }
  SA_ID="$(printf '%s' "$CREATE_OUT" | sa_json_id)"
  if [ -z "$SA_ID" ]; then
    echo "FAILED parse SA id: $CREATE_OUT"
    exit 1
  fi
  echo "created service account $SA_ID"
fi
for ROLE in storage.editor functions.functionInvoker; do
  yc resource-manager folder add-access-binding "$FOLDER_ID" \
    --role "$ROLE" --subject "serviceAccount:$SA_ID" >/dev/null 2>&1 || true
done

if ! yc storage bucket get --name "$BUCKET" >/dev/null 2>&1; then
  yc storage bucket create --name "$BUCKET" >/dev/null
  echo "created bucket $BUCKET"
fi

mkdir -p "$ROOT/data"
if [ ! -s "$KEY_FILE" ]; then
  yc iam access-key create --service-account-id "$SA_ID" --format json > "$KEY_FILE"
  chmod 600 "$KEY_FILE"
  echo "created static access key"
fi
ACCESS_KEY="$("$PY" -c 'import json,sys; print(json.load(open(sys.argv[1]))["access_key"]["key_id"])' "$KEY_FILE")"
SECRET_KEY="$("$PY" -c 'import json,sys; print(json.load(open(sys.argv[1]))["secret"])' "$KEY_FILE")"

# Перенос текущего state, чтобы после переезда не было повторных уведомлений по старым чатам.
"$PY" - "$BUCKET" "$ACCESS_KEY" "$SECRET_KEY" "$ROOT/data/seen.json" <<'PY'
import sys, boto3
bucket, ak, sk, path = sys.argv[1:5]
s3 = boto3.client("s3", endpoint_url="https://storage.yandexcloud.net", region_name="ru-central1",
                  aws_access_key_id=ak, aws_secret_access_key=sk)
try:
    s3.head_object(Bucket=bucket, Key="seen.json")
    print("state already in bucket")
except Exception:
    try:
        body = open(path, "rb").read()
    except FileNotFoundError:
        print("no local state — function will bootstrap without alerts")
    else:
        s3.put_object(Bucket=bucket, Key="seen.json", Body=body, ContentType="application/json")
        print(f"uploaded state {len(body)} bytes")
PY

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
mkdir -p "$STAGE/app"
cp app/__init__.py app/config.py app/avito.py app/poller.py app/state.py app/telegram.py "$STAGE/app/"
cp yandex/index.py yandex/requirements.txt "$STAGE/"

ENV_ARGS=()
while IFS= read -r -d '' PAIR; do
  ENV_ARGS+=(--environment "$PAIR")
done < <("$PY" - <<'PY'
import sys
from dotenv import dotenv_values
for k, v in dotenv_values(".env").items():
    if v and (k == "TG_CHAT_ID" or k.startswith("ACCOUNT_")):
        sys.stdout.write(f"{k}={v}\0")
PY
)
ENV_ARGS+=(
  --environment "STATE_S3_BUCKET=$BUCKET"
  --environment "STATE_S3_ACCESS_KEY=$ACCESS_KEY"
  --environment "STATE_S3_SECRET_KEY=$SECRET_KEY"
)

if ! yc serverless function get --name "$FUNC_NAME" >/dev/null 2>&1; then
  yc serverless function create --name "$FUNC_NAME" >/dev/null
  echo "created function $FUNC_NAME"
fi

yc serverless function version create \
  --function-name "$FUNC_NAME" \
  --runtime python312 \
  --entrypoint index.handler \
  --memory 128m \
  --execution-timeout 50s \
  --source-path "$STAGE" \
  "${ENV_ARGS[@]}" >/dev/null
echo "deployed new version"

if ! yc serverless trigger get --name "$TRIGGER_NAME" >/dev/null 2>&1; then
  yc serverless trigger create timer \
    --name "$TRIGGER_NAME" \
    --cron-expression '* * ? * * *' \
    --invoke-function-name "$FUNC_NAME" \
    --invoke-function-service-account-id "$SA_ID" >/dev/null
  echo "created timer trigger (every minute)"
fi

echo "OK. Логи: yc serverless function logs $FUNC_NAME --since 10m"
