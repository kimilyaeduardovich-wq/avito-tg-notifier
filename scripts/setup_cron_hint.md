# Cron каждые 2 минуты (обязательно для стабильности)

GitHub Actions `schedule` часто опаздывает и формально ≥5 мин на одну запись.
Для **каждые 2 минуты** настройте бесплатный [cron-job.org](https://cron-job.org):

1. Зарегистрируйтесь / войдите.
2. **Create cronjob**:
   - **Title:** `avito-tg-notifier`
   - **URL:**  
     `https://api.github.com/repos/kimilyaeduardovich-wq/avito-tg-notifier/actions/workflows/poll.yml/dispatches`
   - **Schedule:** every **2 minutes**
   - **Request method:** `POST`
   - **Headers:**
     - `Accept` = `application/vnd.github+json`
     - `Authorization` = `Bearer <GITHUB_PAT>`
     - `X-GitHub-Api-Version` = `2022-11-28`
     - `Content-Type` = `application/json`
   - **Body:** `{"ref":"main"}`

3. PAT: GitHub → Settings → Developer settings → Personal access tokens  
   Classic token с галками **`repo`** + **`workflow`**.

После сохранения в Actions должны появляться runs с `workflow_dispatch` примерно раз в 2 минуты.
