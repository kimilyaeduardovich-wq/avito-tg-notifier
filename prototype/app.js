/* Ресепшн+ UI-прототип: имитация по docs/resepshn-tech-spec.md, без API */

const REASON_LABELS = {
  slow_reply: "Медленный ответ",
  price_dump: "Цена мимо прайса",
  no_slot: "Не предложили окно",
  no_followup: "Нет follow-up",
  price_objection: "Возражение по цене",
  fear: "Страх / сомнение",
  no_alternative: "Нет альтернативы",
  lost_to_competitor: "Ушёл к конкуренту",
  waiting_client: "Ждём клиента",
  no_second_offer: "Нет второго оффера",
  admin_missed: "Пропуск администратора",
  client_health: "Противопоказания (не потеря)",
};

const DIALOGS = [
  {
    id: "d1",
    channel: "avito",
    channelLabel: "Авито",
    client: "Анна К.",
    manager: "admin",
    unanswered: true,
    waitMin: 1320,
    preview: "Жду уже второй день",
    messages: [
      { role: "client", text: "Здравствуйте! Сколько стоит окрашивание корней?", time: "11:02" },
      { role: "staff", text: "Добрый день! От 3500", time: "11:18" },
      { role: "client", text: "В прайсе у вас от 4500… И на субботу есть окошко?", time: "11:20" },
      { role: "staff", text: "Сейчас уточню и напишу", time: "11:45" },
      { role: "client", text: "Жду уже второй день", time: "вчера 19:10" },
    ],
    analysis: {
      stage: "hot",
      stage_confidence: 0.86,
      want: "Окрашивание корней в субботу",
      outcome: "Диалог завис: цена спорная, слот не предложен, обещание без follow-up",
      reasons: [
        { code: "price_dump", quote: "От 3500", explain: "В БЗ от 4500 ₽, акция не названа" },
        { code: "no_slot", quote: "на субботу есть окошко?", explain: "Конкретное время не предложено" },
        { code: "no_followup", quote: "уточню и напишу", explain: "Обещание сорвано > 24 ч" },
        { code: "slow_reply", quote: "Жду уже второй день", explain: "first_reply / ожидание вне SLA" },
      ],
      lost_sum: 4500,
      admin_score: 2,
      next_step: "Сегодня до 15:00 извиниться, назвать цену из прайса и дать 2 окна",
      notes: "3+ причин → quality=fail по правилам",
      engine: "llm",
      quality: "fail",
      suggestions: [
        {
          label: "Дожим",
          recommended: true,
          goal: "booking",
          text: "Анна, простите за задержку — это наша ошибка. Окрашивание корней от 4 500 ₽. На субботу свободно 11:00 и 15:30. Какое окно закрепить?",
        },
        {
          label: "Мягко",
          recommended: false,
          goal: "trust",
          text: "Анна, спасибо что написали ещё раз. Уточнила прайс: от 4 500 ₽. Могу подобрать удобное время на субботу — удобнее утро или день?",
        },
        {
          label: "Через доверие",
          recommended: false,
          goal: "care",
          text: "Понимаю, неприятно ждать. С моей стороны промах. Готова сразу зафиксировать слот и прислать подтверждение в этот чат.",
        },
      ],
    },
  },
  {
    id: "d2",
    channel: "telegram",
    channelLabel: "Telegram",
    client: "Мария",
    manager: "admin",
    unanswered: false,
    waitMin: 8,
    preview: "Ок, давайте 16:30",
    messages: [
      { role: "client", text: "Привет! У меня завтра маникюр в 12:00, можно на 18:00?", time: "09:14" },
      { role: "staff", text: "На 18:00 свободно нет. Есть 16:30.", time: "09:22" },
      { role: "client", text: "Ок, давайте 16:30. Предоплата нужна?", time: "09:25" },
      { role: "staff", text: "На маникюр нет, просто приходите. Запись на 16:30 закрепила.", time: "09:27" },
    ],
    analysis: {
      stage: "booked",
      stage_confidence: 0.94,
      want: "Перенос маникюра на вечер",
      outcome: "Запись перенесена на 16:30",
      reasons: [],
      lost_sum: 0,
      admin_score: 5,
      next_step: "Напоминание за 24 ч и 2 ч",
      notes: "Есть конкретный слот и закрытие",
      engine: "rules",
      quality: "ok",
      suggestions: [
        { label: "Дожим", recommended: false, goal: "booking", text: "Если вдруг 16:30 перестанет подходить — напишите, подберём другое окно." },
        { label: "Мягко", recommended: true, goal: "care", text: "Отлично, ждём вас завтра в 16:30. Если понадобится перенос — лучше предупредить заранее." },
        { label: "Через доверие", recommended: false, goal: "trust", text: "Закрепила. Пришлю напоминание перед визитом." },
      ],
    },
  },
  {
    id: "d3",
    channel: "vk",
    channelLabel: "VK",
    client: "Елена П.",
    manager: "owner",
    unanswered: true,
    waitMin: 55,
    preview: "А сколько тогда выйдет?",
    messages: [
      { role: "client", text: "Добрый день! Первый раз хочу на ламинирование ресниц. Есть скидка новым?", time: "14:01" },
      { role: "staff", text: "Да, всегда скидываем новым 20%", time: "14:40" },
      { role: "client", text: "А сколько тогда выйдет и когда ближайшее окно?", time: "14:42" },
    ],
    analysis: {
      stage: "warm",
      stage_confidence: 0.79,
      want: "Ламинирование ресниц со скидкой новому клиенту",
      outcome: "Скидка названа вне БЗ; цена и слот не закрыты",
      reasons: [
        { code: "price_dump", quote: "всегда скидываем новым 20%", explain: "В акциях салона скидка не 20% «всегда»" },
        { code: "no_slot", quote: "когда ближайшее окно?", explain: "Окно не предложено" },
      ],
      lost_sum: 3500,
      admin_score: 3,
      next_step: "Назвать цену из прайса с корректной акцией и 2 слота",
      notes: "1–2 причины → quality=weak",
      engine: "llm",
      quality: "weak",
      suggestions: [
        {
          label: "Дожим",
          recommended: true,
          goal: "booking",
          text: "Елена, ламинирование — 3 500 ₽. Для новых до 31.10 −15% (итог 2 975 ₽). Окна: завтра 12:00 и 17:30. Какое удобнее?",
        },
        { label: "Мягко", recommended: false, goal: "trust", text: "Уточнила условия: для новых −15% до конца месяца. Могу предложить два окна на этой неделе." },
        { label: "Через доверие", recommended: false, goal: "care", text: "Важно назвать точную цену из прайса. Напишите удобный день — подберу мастера." },
      ],
    },
  },
  {
    id: "d4",
    channel: "telegram",
    channelLabel: "Telegram",
    client: "Ирина",
    manager: "admin",
    unanswered: true,
    waitMin: 1800,
    preview: "…",
    messages: [
      { role: "client", text: "Можно записаться на стрижку на пятницу?", time: "пн 10:00" },
      { role: "staff", text: "Да, напишите удобное время", time: "пн 12:30" },
    ],
    analysis: {
      stage: "cold",
      stage_confidence: 0.71,
      want: "Стрижка в пятницу",
      outcome: "Клиент замолчал после общего вопроса без слотов",
      reasons: [
        { code: "no_slot", quote: "напишите удобное время", explain: "Нет конкретных окон" },
        { code: "no_followup", quote: "…", explain: "Тишина > 24 ч, реактивация не отправлена" },
      ],
      lost_sum: 3200,
      admin_score: 2,
      next_step: "Одно короткое сообщение с 2 окнами в пятницу",
      notes: "",
      engine: "rules",
      quality: "weak",
      suggestions: [
        {
          label: "Дожим",
          recommended: true,
          goal: "booking",
          text: "Ирина, по пятнице ещё есть 11:00 и 16:00 на стрижку (3 200 ₽). Закрепить одно из окон?",
        },
        { label: "Мягко", recommended: false, goal: "care", text: "Если пятница ещё актуальна — напишите, подберу время." },
        { label: "Через доверие", recommended: false, goal: "trust", text: "Могу сразу предложить два свободных окна, без лишних вопросов." },
      ],
    },
  },
];

const CHANNELS = [
  { id: "telegram", title: "Telegram", desc: "Бот салона · aiogram 3 · webhook/polling", mode: "api", allowed: true },
  { id: "vk", title: "ВКонтакте", desc: "Сообщения сообщества · Callback API", mode: "api", allowed: true },
  { id: "max", title: "MAX", desc: "Bot API платформы", mode: "api", allowed: true },
  { id: "widget", title: "Виджет сайта", desc: "Свой JS + SSE · страница записи", mode: "api", allowed: true },
  { id: "whatsapp", title: "WhatsApp", desc: "Только Cloud API / WABA", mode: "waba", allowed: true },
  { id: "instagram", title: "Instagram", desc: "Только Messaging API · OAuth", mode: "oauth", allowed: true },
  { id: "wa_qr", title: "WhatsApp с телефона", desc: "QR / личная сессия", mode: "blocked", allowed: false },
  { id: "tg_personal", title: "Личный Telegram", desc: "Userbot / QR", mode: "blocked", allowed: false },
];

const SERVICES = [
  { name: "Маникюр + покрытие", price: 2800, duration: 90 },
  { name: "Окрашивание корней", price: 4500, duration: 120 },
  { name: "Стрижка женская", price: 3200, duration: 60 },
  { name: "Ламинирование ресниц", price: 3500, duration: 75 },
];

const MASTERS = [
  { name: "Ольга", spec: "волосы", schedule: "пн–сб 10:00–20:00 · шаг 30 · буфер 15" },
  { name: "Катя", spec: "ногти", schedule: "вт–вс 11:00–19:00 · шаг 30 · буфер 15" },
];

const USERS = [
  { name: "Владелец", role: "owner", phone: "+7···01" },
  { name: "Администратор Аня", role: "admin", phone: "+7···22" },
  { name: "Мастер Ольга", role: "master", phone: "+7···33" },
];

const BOOKINGS = [
  { time: "11:00", client: "Мария", service: "Маникюр", master: "Катя", status: "confirmed", remind: "24ч отправлено · 2ч в 09:00" },
  { time: "14:30", client: "Света", service: "Стрижка", master: "Ольга", status: "new", remind: "ждёт подтверждения" },
  { time: "16:30", client: "Мария (перенос)", service: "Маникюр", master: "Катя", status: "confirmed", remind: "2ч запланировано" },
  { time: "09:00", client: "Даша", service: "Окрашивание", master: "Ольга", status: "no_show", remind: "неявка отмечена" },
];

const METRICS_7 = [
  { val: "18 мин", lbl: "Скорость первого ответа", formula: "медиана first_reply_sec (без автоответа)" },
  { val: "28%", lbl: "Доля просроченных", formula: "first_reply_sec > 900 / все диалоги" },
  { val: "31%", lbl: "Конверсия в запись", formula: "диалоги с booking / все за период" },
  { val: "11 200 ₽", lbl: "Упущенная сумма", formula: "Σ lost_sum по lost|cold|warm без записи" },
];

const REASONS_STATS = [
  { code: "no_slot", share: "34%", sum: "6 400 ₽" },
  { code: "price_dump", share: "22%", sum: "4 500 ₽" },
  { code: "no_followup", share: "18%", sum: "3 200 ₽" },
  { code: "slow_reply", share: "15%", sum: "2 800 ₽" },
];

const ADMIN_STATS = [
  { name: "Аня (admin)", score: "3.1", dialogs: 42, conversion: "29%" },
  { name: "Владелец", score: "3.8", dialogs: 18, conversion: "39%" },
];

const FORMULAS = [
  "Ушли в тишину = is_unanswered и now − last_message_at > 24 ч",
  "Возврат уснувших = реактивированные с booking / все реактивированные",
  "Неявки = no_show / все confirmed",
  "Возвратные = клиенты с 2+ визитами / все с визитом",
  "admin_score 1..5 — только правила (SLA, слот, цена, follow-up), не ИИ",
];

let filter = "all";
let currentId = null;
let selectedSlot = null;
const channelState = Object.fromEntries(CHANNELS.filter((c) => c.allowed).map((c) => [c.id, "off"]));
channelState.telegram = "on";
channelState.vk = "on";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    el.hidden = true;
  }, 2400);
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatWait(min) {
  if (min < 60) return `${min} мин ожидания`;
  const h = Math.floor(min / 60);
  return `${h} ч ${min % 60} мин ожидания`;
}

function setView(name) {
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  const titles = {
    inbox: "Инбокс",
    analytics: "Аналитика",
    reminders: "Записи на день",
    settings: "Настройки",
    channels: "Каналы",
    booking: "Публичная запись",
    stand: "Стенд разбора",
  };
  $("#viewTitle").textContent = titles[name] || name;
}

function filteredDialogs() {
  return DIALOGS.filter((d) => {
    if (filter === "all") return true;
    if (filter === "unanswered") return d.unanswered;
    if (filter === "hot") return d.analysis.stage === "hot";
    if (filter === "lost") return d.analysis.lost_sum > 0 && d.analysis.stage !== "booked";
    if (filter === "telegram") return d.channel === "telegram";
    if (filter === "vk") return d.channel === "vk";
    if (filter === "admin") return d.manager === "admin";
    return true;
  });
}

function renderDialogList() {
  const list = filteredDialogs();
  const root = $("#dialogList");
  if (!list.length) {
    root.innerHTML = `<div class="empty-pane muted">Нет диалогов по фильтру</div>`;
    return;
  }
  root.innerHTML = list
    .map((d) => {
      const money =
        d.analysis.stage === "booked"
          ? `<span class="money ok">записан</span>`
          : d.analysis.lost_sum
            ? `<span class="money lost">упущено ${d.analysis.lost_sum.toLocaleString("ru-RU")} ₽</span>`
            : "";
      const wait = d.unanswered
        ? `<span class="wait-bad">${formatWait(d.waitMin)}</span>`
        : `<span class="muted">${d.waitMin} мин до ответа</span>`;
      return `
      <button type="button" class="dialog-item ${d.id === currentId ? "active" : ""}" data-id="${d.id}">
        <div class="who">${escapeHtml(d.client)}</div>
        <div class="preview">${escapeHtml(d.preview)}</div>
        <div class="meta">
          <span class="pill pill-channel">${escapeHtml(d.channelLabel)}</span>
          <span class="stage stage-${d.analysis.stage}">${d.analysis.stage}</span>
          ${wait}
          ${money}
        </div>
      </button>`;
    })
    .join("");
}

function renderAnalysis(a) {
  const engineClass = a.engine === "rules" ? "rules" : "";
  const reasons = a.reasons.length
    ? a.reasons
        .map(
          (r) => `<div class="reason">
        <code>${r.code}</code> ${escapeHtml(REASON_LABELS[r.code] || r.code)}
        <div class="muted">«${escapeHtml(r.quote)}» — ${escapeHtml(r.explain)}</div>
      </div>`
        )
        .join("")
    : `<div class="muted">Причин потери нет</div>`;

  return `
    <div class="row" style="margin:0 0 8px;justify-content:space-between">
      <span class="stage stage-${a.stage}">${a.stage}</span>
      <span class="engine-tag ${engineClass}">engine: ${a.engine} · ${a.quality}</span>
    </div>
    <div class="kv">
      <div><strong>Что хотел</strong><span>${escapeHtml(a.want)}</span></div>
      <div><strong>Чем закончилось</strong><span>${escapeHtml(a.outcome)}</span></div>
      <div><strong>Что делать сейчас</strong><span>${escapeHtml(a.next_step)}</span></div>
      <div><strong>admin_score / lost_sum</strong><span>${a.admin_score}/5 · ${a.lost_sum.toLocaleString("ru-RU")} ₽ · conf ${Math.round(a.stage_confidence * 100)}%</span></div>
    </div>
    <strong class="tiny muted">Причины (из правил)</strong>
    ${reasons}
    ${a.notes ? `<p class="tiny muted mt">${escapeHtml(a.notes)}</p>` : ""}
  `;
}

function renderSuggestions(a) {
  $("#suggestions").innerHTML = a.suggestions
    .map(
      (s, i) => `
    <div class="suggestion ${s.recommended ? "rec" : ""}">
      <div class="lab">
        <span>${escapeHtml(s.label)}${s.recommended ? " · рекомендую" : ""}</span>
        <span class="muted">${escapeHtml(s.goal)}</span>
      </div>
      <div class="txt">${escapeHtml(s.text)}</div>
      <button type="button" class="btn ghost sm" data-suggest="${i}">Вставить в ответ</button>
    </div>`
    )
    .join("");
}

function openDialog(id) {
  currentId = id;
  const d = DIALOGS.find((x) => x.id === id);
  if (!d) return;
  $("#emptyPane").hidden = true;
  $("#dialogContent").hidden = false;
  renderDialogList();

  $("#dialogHeader").innerHTML = `
    <div>
      <h2>${escapeHtml(d.client)}</h2>
      <div class="muted">менеджер: ${d.manager} · стадия из разбора в очереди</div>
    </div>
    <div class="row" style="margin:0">
      <span class="pill pill-channel">${escapeHtml(d.channelLabel)}</span>
      <span class="stage stage-${d.analysis.stage}">${d.analysis.stage}</span>
    </div>`;

  $("#messages").innerHTML = d.messages
    .map(
      (m) => `<div class="bubble ${m.role}">${escapeHtml(m.text)}<span class="time">${escapeHtml(m.time)}</span></div>`
    )
    .join("");

  $("#analysisBody").innerHTML = renderAnalysis(d.analysis);
  renderSuggestions(d.analysis);
  $("#replyField").value = "";
}

async function reanalyze() {
  const d = DIALOGS.find((x) => x.id === currentId);
  if (!d) return;
  $("#analysisBody").innerHTML = `<p class="muted">Задача в очереди RQ… debounce 2 мин (в демо 1.2 с)</p>`;
  await wait(1200);
  // imitate fallback note
  const copy = { ...d.analysis, engine: Math.random() > 0.3 ? "llm" : "rules" };
  d.analysis = copy;
  $("#analysisBody").innerHTML = renderAnalysis(copy);
  renderSuggestions(copy);
  toast("Разбор записан в analysis (демо). Страница читает готовое.");
}

function renderChannels() {
  $("#channels").innerHTML = CHANNELS.map((c) => {
    if (!c.allowed) {
      return `<article class="channel blocked">
        <span class="status block">не подключаем</span>
        <h3>${c.title}</h3>
        <p>${c.desc}. По ТЗ §8 — принципиальный запрет (риск блокировки номера).</p>
        <button type="button" class="btn ghost" disabled>Недоступно</button>
      </article>`;
    }
    const on = channelState[c.id] === "on";
    return `<article class="channel">
      <span class="status ${on ? "on" : "off"}">${on ? "подключено (демо)" : "не подключено"}</span>
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <button type="button" class="btn ${on ? "ghost" : "primary"}" data-connect="${c.id}">
        ${on ? "Отключить" : c.mode === "oauth" ? "OAuth (демо)" : c.mode === "waba" ? "WABA (демо)" : "Подключить API"}
      </button>
    </article>`;
  }).join("");
}

function connectChannel(id) {
  const ch = CHANNELS.find((c) => c.id === id);
  if (!ch?.allowed) return;
  if (channelState[id] === "on") {
    channelState[id] = "off";
    renderChannels();
    toast(`${ch.title}: отключено (демо)`);
    return;
  }
  openModal(`
    <h2 style="margin:0 0 8px;font-family:var(--display)">${escapeHtml(ch.title)}</h2>
    <p class="lead">Имитация официального подключения. Реальные запросы не уходят. Токен в проде — Fernet в credentials_enc.</p>
    <label class="field-label">Токен / client id (фейк)</label>
    <input readonly value="demo_${id}_••••••••" />
    <div class="row">
      <button type="button" class="btn primary" id="saveCh">Сохранить</button>
      <button type="button" class="btn ghost" id="cancelCh">Отмена</button>
    </div>
  `);
  $("#saveCh").onclick = () => {
    channelState[id] = "on";
    closeModal();
    renderChannels();
    toast(`${ch.title}: подключено (демо)`);
  };
  $("#cancelCh").onclick = closeModal;
}

function openModal(html) {
  $("#modalBody").innerHTML = html;
  $("#modal").hidden = false;
  $("#modal").setAttribute("aria-hidden", "false");
}

function closeModal() {
  $("#modal").hidden = true;
  $("#modal").setAttribute("aria-hidden", "true");
  $("#modalBody").innerHTML = "";
}

function renderAnalytics() {
  $("#metrics").innerHTML = METRICS_7.map(
    (m) => `<div class="metric"><div class="val">${m.val}</div><div class="lbl">${m.lbl}</div><div class="formula">${m.formula}</div></div>`
  ).join("");
  $("#reasonsTable").innerHTML =
    `<thead><tr><th>Код</th><th>Доля</th><th>Сумма</th></tr></thead><tbody>` +
    REASONS_STATS.map(
      (r) => `<tr><td><code>${r.code}</code><div class="tiny muted">${REASON_LABELS[r.code]}</div></td><td>${r.share}</td><td>${r.sum}</td></tr>`
    ).join("") +
    `</tbody>`;
  $("#adminsTable").innerHTML =
    `<thead><tr><th>Кто</th><th>Score</th><th>Диалоги</th><th>Конверсия</th></tr></thead><tbody>` +
    ADMIN_STATS.map((a) => `<tr><td>${a.name}</td><td>${a.score}</td><td>${a.dialogs}</td><td>${a.conversion}</td></tr>`).join("") +
    `</tbody>`;
  $("#formulasList").innerHTML = FORMULAS.map((f) => `<li>${escapeHtml(f)}</li>`).join("");
}

function renderReminders() {
  $("#bookingsTable").innerHTML =
    `<thead><tr><th>Время</th><th>Клиент</th><th>Услуга</th><th>Мастер</th><th>Статус</th><th>Напоминания</th><th></th></tr></thead><tbody>` +
    BOOKINGS.map(
      (b, i) => `<tr>
      <td>${b.time}</td><td>${b.client}</td><td>${b.service}</td><td>${b.master}</td>
      <td><span class="stage stage-${b.status === "confirmed" || b.status === "new" ? "booked" : "lost"}">${b.status}</span></td>
      <td class="tiny muted">${b.remind}</td>
      <td>${b.status === "confirmed" || b.status === "new" ? `<button type="button" class="linkish" data-noshow="${i}">Неявка</button>` : "—"}</td>
    </tr>`
    ).join("") +
    `</tbody>`;
}

function renderSettings() {
  $("#servicesTable").innerHTML =
    `<thead><tr><th>Услуга</th><th>Цена</th><th>Мин</th></tr></thead><tbody>` +
    SERVICES.map((s) => `<tr><td>${s.name}</td><td>${s.price.toLocaleString("ru-RU")} ₽</td><td>${s.duration}</td></tr>`).join("") +
    `</tbody>`;
  $("#mastersList").innerHTML = MASTERS.map(
    (m) => `<div class="master-card"><strong>${m.name}</strong> · ${m.spec}<div class="tiny muted">${m.schedule}</div></div>`
  ).join("");
  $("#usersTable").innerHTML =
    `<thead><tr><th>Имя</th><th>Роль</th><th>Телефон</th></tr></thead><tbody>` +
    USERS.map((u) => `<tr><td>${u.name}</td><td><code>${u.role}</code></td><td>${u.phone}</td></tr>`).join("") +
    `</tbody>`;
}

function renderBookingPublic() {
  $("#bookService").innerHTML = SERVICES.map((s) => `<option>${s.name} — ${s.price} ₽</option>`).join("");
  const masterSel = $("#bookMaster");
  masterSel.innerHTML =
    `<option value="any">Любой свободный</option>` + MASTERS.map((m) => `<option>${m.name}</option>`).join("");
  const slots = ["11:00", "12:30", "15:30", "17:00", "18:30"];
  $("#bookSlots").innerHTML = slots
    .map((s) => `<button type="button" class="slot ${selectedSlot === s ? "active" : ""}" data-slot="${s}">${s}</button>`)
    .join("");
}

function bind() {
  $$(".nav-item").forEach((b) => b.addEventListener("click", () => setView(b.dataset.view)));

  $("#inboxFilters").addEventListener("click", (e) => {
    const chip = e.target.closest("[data-filter]");
    if (!chip) return;
    filter = chip.dataset.filter;
    $$("#inboxFilters .chip").forEach((c) => c.classList.toggle("active", c === chip));
    renderDialogList();
  });

  $("#dialogList").addEventListener("click", (e) => {
    const item = e.target.closest("[data-id]");
    if (item) openDialog(item.dataset.id);
  });

  $("#reanalyzeBtn").addEventListener("click", reanalyze);

  $("#suggestions").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-suggest]");
    if (!btn || !currentId) return;
    const d = DIALOGS.find((x) => x.id === currentId);
    const s = d.analysis.suggestions[Number(btn.dataset.suggest)];
    $("#replyField").value = s.text;
    toast("Подсказка вставлена. Можно править до отправки. Исход (booked/no_answer/refused) пишется после факта.");
  });

  $("#sendReply").addEventListener("click", () => {
    const text = $("#replyField").value.trim();
    if (!text) return toast("Вставьте или напишите ответ");
    const d = DIALOGS.find((x) => x.id === currentId);
    d.messages.push({ role: "staff", text, time: "сейчас" });
    d.unanswered = false;
    openDialog(currentId);
    toast("Сообщение ушло в канал (демо). suggestion.sent_at / edited зафиксированы.");
  });

  $("#createBooking").addEventListener("click", () => {
    if (!currentId) return;
    const d = DIALOGS.find((x) => x.id === currentId);
    openModal(`
      <h2 style="margin:0 0 8px;font-family:var(--display)">Создать запись</h2>
      <p class="lead">Клиент: ${escapeHtml(d.client)}. Слот из расписания мастера + буфер. UNIQUE (master_id, starts_at) для new|confirmed.</p>
      <label class="field-label">Услуга</label>
      <select id="mService">${SERVICES.map((s) => `<option>${s.name}</option>`).join("")}</select>
      <label class="field-label">Мастер</label>
      <select>${MASTERS.map((m) => `<option>${m.name}</option>`).join("")}</select>
      <label class="field-label">Старт</label>
      <input type="datetime-local" value="2026-10-18T15:30" />
      <div class="row">
        <button type="button" class="btn primary" id="saveBook">Создать</button>
        <button type="button" class="btn ghost" id="cancelBook">Отмена</button>
      </div>
    `);
    $("#saveBook").onclick = () => {
      d.analysis.stage = "booked";
      d.analysis.lost_sum = 0;
      d.analysis.outcome = "Создана booking из карточки диалога";
      d.analysis.quality = "ok";
      closeModal();
      openDialog(currentId);
      toast("booking создана · suggestion.outcome → booked (демо)");
    };
    $("#cancelBook").onclick = closeModal;
  });

  $("#channels").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-connect]");
    if (btn) connectChannel(btn.dataset.connect);
  });

  $("#bookingsTable").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-noshow]");
    if (!btn) return;
    BOOKINGS[Number(btn.dataset.noshow)].status = "no_show";
    BOOKINGS[Number(btn.dataset.noshow)].remind = "неявка (демо)";
    renderReminders();
    toast("Статус no_show · попадёт в метрику неявок");
  });

  $("#addService").onclick = () => toast("В проде — форма услуги в settings + Alembic не нужен для строк");
  $("#addMaster").onclick = () => toast("В проде — master.schedule JSONB");

  $("#bookSlots").addEventListener("click", (e) => {
    const s = e.target.closest("[data-slot]");
    if (!s) return;
    selectedSlot = s.dataset.slot;
    renderBookingPublic();
  });

  $("#bookSubmit").onclick = () => {
    if (!selectedSlot) return toast("Выберите окно");
    if (!$("#bookConsent").checked) return toast("Нужно согласие на обработку ПДн");
    if (!$("#bookName").value.trim() || !$("#bookPhone").value.trim()) return toast("Имя и телефон");
    toast("Запись создана (демо). Напоминания 24 ч и 2 ч встанут в очередь.");
  };

  $("#pasteFill").onclick = () => {
    $("#pasteArea").value = `Клиент: Здравствуйте! Сколько стоит окрашивание корней?
Админ: От 3500
Клиент: В прайсе от 4500… На субботу есть окно?
Админ: Уточню и напишу
Клиент: Жду второй день`;
  };

  $("#pasteAnalyze").onclick = async () => {
    if (!$("#pasteArea").value.trim()) return toast("Вставьте переписку");
    const box = $("#standResult");
    box.hidden = false;
    box.innerHTML = `<p class="muted">Очередь: ingest → rules → llm (timeout 20 с) → analysis…</p>`;
    await wait(1200);
    box.innerHTML = renderAnalysis(DIALOGS[0].analysis) + `<p class="tiny muted mt">Контракт JSON стабилен: stage, want, outcome, reasons[], lost_sum, admin_score, next_step, suggestions[], engine, quality</p>`;
    toast("Готовый разбор прочитан из analysis, не посчитан в HTTP");
  };

  $$(".period-switch .chip").forEach((c) =>
    c.addEventListener("click", () => {
      $$(".period-switch .chip").forEach((x) => x.classList.toggle("active", x === c));
      toast(`Период: ${c.dataset.period} дней (агрегаты из SQL/кэша 5 мин)`);
    })
  );

  $("#roleSelect").onchange = () => {
    const role = $("#roleSelect").value;
    $("#roleHint").textContent = `роль: ${role}`;
    if (role === "master") toast("Мастер видит свои записи/диалоги, не всю ленту (правило ТЗ)");
    else toast(`Сессия как ${role}`);
  };

  $("#salonSelect").onchange = () => toast(`salon_id переключён (демо): ${$("#salonSelect").value}`);

  $("#modalClose").onclick = closeModal;
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
}

function init() {
  bind();
  renderDialogList();
  renderChannels();
  renderAnalytics();
  renderReminders();
  renderSettings();
  renderBookingPublic();
  openDialog(DIALOGS[0].id);
}

init();
