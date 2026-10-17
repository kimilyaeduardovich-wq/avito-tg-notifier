/* Ресепшн+ — демо на языке салона красоты. Без реальных интеграций. */

const SESSION_KEY = "resepshn_session";

const STAGE = {
  cold: "Ещё присматривается",
  warm: "Интересуется",
  hot: "Почти записалась",
  booked: "Записалась",
  lost: "Ушла без записи",
  cancelled: "Отменила",
};

const QUALITY = {
  ok: "Всё ок",
  weak: "Есть слабые места",
  fail: "Разговор сорвался",
};

const REASON_LABELS = {
  slow_reply: "Долго не отвечали",
  price_dump: "Назвали цену не из прайса",
  no_slot: "Не предложили конкретное время",
  no_followup: "Обещали вернуться — и пропали",
  price_objection: "Смутила цена",
  fear: "Гостья сомневается / боится",
  no_alternative: "Не предложили другой вариант",
  lost_to_competitor: "Ушла к другому салону",
  waiting_client: "Ждём ответа гостьи",
  no_second_offer: "Не сделали второе предложение",
  admin_missed: "Администратор упустил диалог",
  client_health: "Противопоказания — не потеря выручки",
};

const ROLE_LABEL = { owner: "владелец", admin: "администратор", master: "мастер" };

const DIALOGS = [
  {
    id: "d1",
    channel: "avito",
    channelLabel: "Авито",
    client: "Анна К.",
    manager: "admin",
    managerName: "Аня",
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
      want: "Хочет окрашивание корней на субботу",
      outcome: "Переписка зависла: цена не сошлась с прайсом, время не предложили, обещали написать и пропали",
      reasons: [
        { code: "price_dump", quote: "От 3500", explain: "В прайсе салона от 4 500 ₽, акцию не назвали" },
        { code: "no_slot", quote: "на субботу есть окошко?", explain: "Не предложили два конкретных окна" },
        { code: "no_followup", quote: "уточню и напишу", explain: "Обещание висит больше суток" },
        { code: "slow_reply", quote: "Жду уже второй день", explain: "Гостья явно ждёт — это критично для записи" },
      ],
      lost_sum: 4500,
      admin_score: 2,
      next_step: "Сегодня до 15:00 извиниться, назвать цену из прайса и предложить 2 окна на субботу",
      notes: "Сразу несколько ошибок — разговор на грани потери",
      engine: "llm",
      quality: "fail",
      suggestions: [
        {
          label: "Дожать к записи",
          recommended: true,
          goal: "записать",
          text: "Анна, простите за задержку — это наша ошибка. Окрашивание корней от 4 500 ₽. На субботу свободно 11:00 и 15:30. Какое время вам удобнее закрепить?",
        },
        {
          label: "Мягко и спокойно",
          recommended: false,
          goal: "вернуть доверие",
          text: "Анна, спасибо, что написали ещё раз. Уточнила по прайсу: от 4 500 ₽. Могу подобрать удобное время на субботу — вам удобнее утро или день?",
        },
        {
          label: "Через заботу",
          recommended: false,
          goal: "поддержать",
          text: "Понимаю, неприятно ждать. С моей стороны промах. Готова сразу зафиксировать время и прислать подтверждение в этот чат.",
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
    managerName: "Аня",
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
      want: "Перенести маникюр на вечер",
      outcome: "Перенесли на 16:30 — гостья записана",
      reasons: [],
      lost_sum: 0,
      admin_score: 5,
      next_step: "Напомнить за сутки и за 2 часа до визита",
      notes: "Есть конкретное время и закрытие — образец хорошей работы",
      engine: "rules",
      quality: "ok",
      suggestions: [
        { label: "Дожать к записи", recommended: false, goal: "записать", text: "Если вдруг 16:30 перестанет подходить — напишите, подберём другое окошко." },
        { label: "Мягко и спокойно", recommended: true, goal: "поддержать", text: "Отлично, ждём вас завтра в 16:30. Если понадобится перенос — лучше предупредить заранее." },
        { label: "Через заботу", recommended: false, goal: "вернуть доверие", text: "Закрепила. Перед визитом пришлю короткое напоминание." },
      ],
    },
  },
  {
    id: "d3",
    channel: "vk",
    channelLabel: "ВКонтакте",
    client: "Елена П.",
    manager: "owner",
    managerName: "Владелец",
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
      want: "Первое ламинирование ресниц со скидкой для новой гостьи",
      outcome: "Скидку назвали «на глаз», цену и время так и не закрыли",
      reasons: [
        { code: "price_dump", quote: "всегда скидываем новым 20%", explain: "В акциях салона нет «всегда −20%» — только актуальная акция из прайса" },
        { code: "no_slot", quote: "когда ближайшее окно?", explain: "Не предложили конкретные часы" },
      ],
      lost_sum: 3500,
      admin_score: 3,
      next_step: "Назвать цену из прайса с правильной акцией и дать 2 свободных окна",
      notes: "Гостья ещё тёплая — можно вернуть сегодня",
      engine: "llm",
      quality: "weak",
      suggestions: [
        {
          label: "Дожать к записи",
          recommended: true,
          goal: "записать",
          text: "Елена, ламинирование — 3 500 ₽. Для новых до 31.10 скидка −15% (итог 2 975 ₽). Окна: завтра 12:00 и 17:30. Какое удобнее?",
        },
        { label: "Мягко и спокойно", recommended: false, goal: "вернуть доверие", text: "Уточнила условия: для новых −15% до конца месяца. Могу предложить два окна на этой неделе." },
        { label: "Через заботу", recommended: false, goal: "поддержать", text: "Важно назвать точную цену из прайса. Напишите удобный день — подберу мастера." },
      ],
    },
  },
  {
    id: "d4",
    channel: "telegram",
    channelLabel: "Telegram",
    client: "Ирина",
    manager: "admin",
    managerName: "Аня",
    unanswered: true,
    waitMin: 1800,
    preview: "Тишина после вопроса про пятницу",
    messages: [
      { role: "client", text: "Можно записаться на стрижку на пятницу?", time: "пн 10:00" },
      { role: "staff", text: "Да, напишите удобное время", time: "пн 12:30" },
    ],
    analysis: {
      stage: "cold",
      stage_confidence: 0.71,
      want: "Стрижка в пятницу",
      outcome: "Гостья замолчала — спросили «когда удобно», но сами окна не предложили",
      reasons: [
        { code: "no_slot", quote: "напишите удобное время", explain: "Лучше сразу дать 2–3 свободных часа" },
        { code: "no_followup", quote: "тишина", explain: "Больше суток нет второго сообщения — пора мягко написать снова" },
      ],
      lost_sum: 3200,
      admin_score: 2,
      next_step: "Одно короткое сообщение с двумя окнами в пятницу",
      notes: "",
      engine: "rules",
      quality: "weak",
      suggestions: [
        {
          label: "Дожать к записи",
          recommended: true,
          goal: "записать",
          text: "Ирина, по пятнице ещё есть 11:00 и 16:00 на стрижку (3 200 ₽). Закрепить одно из окон?",
        },
        { label: "Мягко и спокойно", recommended: false, goal: "поддержать", text: "Если пятница ещё актуальна — напишите, подберу время." },
        { label: "Через заботу", recommended: false, goal: "вернуть доверие", text: "Могу сразу предложить два свободных окна, без лишних вопросов." },
      ],
    },
  },
];

const CHANNELS = [
  { id: "telegram", title: "Telegram", desc: "Бот салона: гости пишут вам в Telegram", mode: "api", allowed: true },
  { id: "vk", title: "ВКонтакте", desc: "Сообщения сообщества — привычный канал для многих гостей", mode: "api", allowed: true },
  { id: "max", title: "MAX", desc: "Бот в мессенджере MAX", mode: "api", allowed: true },
  { id: "widget", title: "Окно на сайте", desc: "Кнопка «записаться» на сайте салона", mode: "api", allowed: true },
  { id: "whatsapp", title: "WhatsApp для бизнеса", desc: "Официальный бизнес-номер WhatsApp", mode: "waba", allowed: true },
  { id: "instagram", title: "Instagram Direct", desc: "Директ бизнес-аккаунта через официальный вход", mode: "oauth", allowed: true },
  { id: "wa_qr", title: "WhatsApp с телефона", desc: "Личный WhatsApp через QR", mode: "blocked", allowed: false },
  { id: "tg_personal", title: "Личный Telegram", desc: "Обычный аккаунт администратора", mode: "blocked", allowed: false },
];

const SERVICES = [
  { name: "Маникюр + покрытие", price: 2800, duration: 90 },
  { name: "Окрашивание корней", price: 4500, duration: 120 },
  { name: "Стрижка женская", price: 3200, duration: 60 },
  { name: "Ламинирование ресниц", price: 3500, duration: 75 },
];

const MASTERS = [
  { name: "Ольга", spec: "окрашивание и стрижки", schedule: "пн–сб 10:00–20:00 · окна по 30 мин · перерыв 15 мин" },
  { name: "Катя", spec: "маникюр и педикюр", schedule: "вт–вс 11:00–19:00 · окна по 30 мин · перерыв 15 мин" },
];

const USERS = [
  { name: "Вы", role: "Владелец", phone: "+7 ··· 01" },
  { name: "Аня", role: "Администратор", phone: "+7 ··· 22" },
  { name: "Ольга", role: "Мастер", phone: "+7 ··· 33" },
];

const BOOKINGS = [
  { time: "11:00", client: "Мария", service: "Маникюр", master: "Катя", status: "confirmed", statusLabel: "Подтверждена", remind: "Напомнили за сутки · ещё раз в 09:00" },
  { time: "14:30", client: "Света", service: "Стрижка", master: "Ольга", status: "new", statusLabel: "Ждёт подтверждения", remind: "Ждём ответ гостьи" },
  { time: "16:30", client: "Мария", service: "Маникюр (перенос)", master: "Катя", status: "confirmed", statusLabel: "Подтверждена", remind: "Напоминание за 2 часа запланировано" },
  { time: "09:00", client: "Даша", service: "Окрашивание", master: "Ольга", status: "no_show", statusLabel: "Неявка", remind: "Не пришла" },
];

const METRICS_7 = [
  { val: "18 мин", lbl: "Как быстро отвечаем впервые", formula: "Среднее время до первого ответа администратора" },
  { val: "28%", lbl: "Ответили слишком поздно", formula: "Доля диалогов, где первый ответ дольше 15 минут" },
  { val: "31%", lbl: "Довели до записи", formula: "Сколько переписок закончились записью к мастеру" },
  { val: "11 200 ₽", lbl: "Упустили выручки", formula: "Сумма услуг, которые не состоялись из‑за срывов в переписке" },
];

const REASONS_STATS = [
  { code: "no_slot", share: "34%", sum: "6 400 ₽" },
  { code: "price_dump", share: "22%", sum: "4 500 ₽" },
  { code: "no_followup", share: "18%", sum: "3 200 ₽" },
  { code: "slow_reply", share: "15%", sum: "2 800 ₽" },
];

const ADMIN_STATS = [
  { name: "Аня", score: "3,1", dialogs: 42, conversion: "29%" },
  { name: "Владелец", score: "3,8", dialogs: 18, conversion: "39%" },
];

const FORMULAS = [
  "«Ждут ответа» — гостья написала, а салон молчит больше суток",
  "«Вернули уснувших» — написали повторно, и гостья всё‑таки записалась",
  "«Неявки» — подтвердили визит, но не пришли",
  "«Постоянные» — гости с двумя и более визитами",
  "Оценка администратора считается по скорости, точности прайса и тому, предложили ли время — не «на глаз»",
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
  }, 2600);
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function formatWait(min) {
  if (min < 60) return `ждёт ${min} мин`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h >= 24) {
    const d = Math.floor(h / 24);
    return `ждёт уже ${d} ${d === 1 ? "день" : "дня"}`;
  }
  return m ? `ждёт ${h} ч ${m} мин` : `ждёт ${h} ч`;
}

function setView(name) {
  $$(".view").forEach((v) => v.classList.toggle("active", v.id === `view-${name}`));
  $$(".nav-item").forEach((b) => b.classList.toggle("active", b.dataset.view === name));
  const titles = {
    inbox: "Переписки",
    analytics: "Как идут продажи",
    reminders: "Записи на сегодня",
    settings: "Салон и прайс",
    channels: "Откуда пишут гости",
    booking: "Онлайн-запись",
    stand: "Разобрать свой чат",
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
    root.innerHTML = `<div class="empty-pane muted">По этому фильтру пока никого нет</div>`;
    return;
  }
  root.innerHTML = list
    .map((d) => {
      const money =
        d.analysis.stage === "booked"
          ? `<span class="money ok">запись есть</span>`
          : d.analysis.lost_sum
            ? `<span class="money lost">−${d.analysis.lost_sum.toLocaleString("ru-RU")} ₽</span>`
            : "";
      const wait = d.unanswered
        ? `<span class="wait-bad">${formatWait(d.waitMin)}</span>`
        : `<span class="muted">ответили за ${d.waitMin} мин</span>`;
      return `
      <button type="button" class="dialog-item ${d.id === currentId ? "active" : ""}" data-id="${d.id}">
        <div class="who">${escapeHtml(d.client)}</div>
        <div class="preview">${escapeHtml(d.preview)}</div>
        <div class="meta">
          <span class="pill pill-channel">${escapeHtml(d.channelLabel)}</span>
          <span class="stage stage-${d.analysis.stage}">${STAGE[d.analysis.stage]}</span>
          ${wait}
          ${money}
        </div>
      </button>`;
    })
    .join("");
}

function renderAnalysis(a) {
  const deep = a.engine === "llm";
  const reasons = a.reasons.length
    ? a.reasons
        .map(
          (r) => `<div class="reason">
        <strong>${escapeHtml(REASON_LABELS[r.code] || r.code)}</strong>
        <div class="muted">«${escapeHtml(r.quote)}» — ${escapeHtml(r.explain)}</div>
      </div>`
        )
        .join("")
    : `<div class="muted">Явных ошибок в диалоге нет — можно спокойно вести к записи</div>`;

  return `
    <div class="row" style="margin:0 0 8px;justify-content:space-between;align-items:center">
      <span class="stage stage-${a.stage}">${STAGE[a.stage]}</span>
      <span class="engine-tag ${deep ? "" : "rules"}">${deep ? "Полный разбор" : "Быстрая проверка"} · ${QUALITY[a.quality]}</span>
    </div>
    <div class="kv">
      <div><strong>Чего хочет гостья</strong><span>${escapeHtml(a.want)}</span></div>
      <div><strong>Чем закончилось сейчас</strong><span>${escapeHtml(a.outcome)}</span></div>
      <div><strong>Что сделать прямо сейчас</strong><span>${escapeHtml(a.next_step)}</span></div>
      <div><strong>Оценка работы / упущенная сумма</strong><span>${a.admin_score} из 5 · ${a.lost_sum ? a.lost_sum.toLocaleString("ru-RU") + " ₽" : "нет потерь"}</span></div>
    </div>
    <strong class="tiny muted">Почему так вышло</strong>
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
        <span>${escapeHtml(s.label)}${s.recommended ? " · лучше так" : ""}</span>
        <span class="muted">${escapeHtml(s.goal)}</span>
      </div>
      <div class="txt">${escapeHtml(s.text)}</div>
      <button type="button" class="btn ghost sm" data-suggest="${i}">Взять этот текст</button>
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
      <div class="muted">ведёт ${escapeHtml(d.managerName)} · ${STAGE[d.analysis.stage].toLowerCase()}</div>
    </div>
    <div class="row" style="margin:0">
      <span class="pill pill-channel">${escapeHtml(d.channelLabel)}</span>
      <span class="stage stage-${d.analysis.stage}">${STAGE[d.analysis.stage]}</span>
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
  $("#analysisBody").innerHTML = `<p class="muted">Смотрим переписку… обычно несколько секунд</p>`;
  await wait(1200);
  d.analysis = { ...d.analysis, engine: Math.random() > 0.3 ? "llm" : "rules" };
  $("#analysisBody").innerHTML = renderAnalysis(d.analysis);
  renderSuggestions(d.analysis);
  toast("Разбор обновлён. Можно брать готовый ответ справа.");
}

function renderChannels() {
  $("#channels").innerHTML = CHANNELS.map((c) => {
    if (!c.allowed) {
      return `<article class="channel blocked">
        <span class="status block">не подключаем</span>
        <h3>${c.title}</h3>
        <p>${c.desc}. Так защищаем номер салона от блокировок.</p>
        <button type="button" class="btn ghost" disabled>Недоступно</button>
      </article>`;
    }
    const on = channelState[c.id] === "on";
    const action =
      c.mode === "oauth" ? "Войти через Instagram" : c.mode === "waba" ? "Подключить WhatsApp" : "Подключить";
    return `<article class="channel">
      <span class="status ${on ? "on" : "off"}">${on ? "подключено" : "ещё не подключено"}</span>
      <h3>${c.title}</h3>
      <p>${c.desc}</p>
      <button type="button" class="btn ${on ? "ghost" : "primary"}" data-connect="${c.id}">
        ${on ? "Отключить" : action}
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
    toast(`${ch.title}: отключили`);
    return;
  }
  openModal(`
    <h2 style="margin:0 0 8px;font-family:var(--display)">${escapeHtml(ch.title)}</h2>
    <p class="lead">В демо подключение имитируется. В рабочей версии вы просто подтверждаете доступ салона — без сложных настроек на экране.</p>
    <div class="row">
      <button type="button" class="btn primary" id="saveCh">Подключить</button>
      <button type="button" class="btn ghost" id="cancelCh">Отмена</button>
    </div>
  `);
  $("#saveCh").onclick = () => {
    channelState[id] = "on";
    closeModal();
    renderChannels();
    toast(`${ch.title}: готово, сообщения появятся в «Переписках»`);
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
    `<thead><tr><th>Причина</th><th>Как часто</th><th>Сколько денег</th></tr></thead><tbody>` +
    REASONS_STATS.map(
      (r) => `<tr><td>${REASON_LABELS[r.code]}</td><td>${r.share}</td><td>${r.sum}</td></tr>`
    ).join("") +
    `</tbody>`;
  $("#adminsTable").innerHTML =
    `<thead><tr><th>Кто</th><th>Оценка</th><th>Диалогов</th><th>Довели до записи</th></tr></thead><tbody>` +
    ADMIN_STATS.map((a) => `<tr><td>${a.name}</td><td>${a.score}</td><td>${a.dialogs}</td><td>${a.conversion}</td></tr>`).join("") +
    `</tbody>`;
  $("#formulasList").innerHTML = FORMULAS.map((f) => `<li>${escapeHtml(f)}</li>`).join("");
}

function renderReminders() {
  $("#bookingsTable").innerHTML =
    `<thead><tr><th>Время</th><th>Гостья</th><th>Услуга</th><th>Мастер</th><th>Статус</th><th>Напоминания</th><th></th></tr></thead><tbody>` +
    BOOKINGS.map(
      (b, i) => `<tr>
      <td>${b.time}</td><td>${b.client}</td><td>${b.service}</td><td>${b.master}</td>
      <td><span class="stage stage-${b.status === "no_show" ? "lost" : "booked"}">${b.statusLabel}</span></td>
      <td class="tiny muted">${b.remind}</td>
      <td>${b.status === "confirmed" || b.status === "new" ? `<button type="button" class="linkish" data-noshow="${i}">Не пришла</button>` : "—"}</td>
    </tr>`
    ).join("") +
    `</tbody>`;
}

function renderSettings() {
  $("#servicesTable").innerHTML =
    `<thead><tr><th>Услуга</th><th>Цена</th><th>Длительность</th></tr></thead><tbody>` +
    SERVICES.map((s) => `<tr><td>${s.name}</td><td>${s.price.toLocaleString("ru-RU")} ₽</td><td>${s.duration} мин</td></tr>`).join("") +
    `</tbody>`;
  $("#mastersList").innerHTML = MASTERS.map(
    (m) => `<div class="master-card"><strong>${m.name}</strong> · ${m.spec}<div class="tiny muted">${m.schedule}</div></div>`
  ).join("");
  $("#usersTable").innerHTML =
    `<thead><tr><th>Имя</th><th>Роль</th><th>Телефон</th></tr></thead><tbody>` +
    USERS.map((u) => `<tr><td>${u.name}</td><td>${u.role}</td><td>${u.phone}</td></tr>`).join("") +
    `</tbody>`;
}

function renderBookingPublic() {
  $("#bookService").innerHTML = SERVICES.map((s) => `<option>${s.name} — ${s.price.toLocaleString("ru-RU")} ₽</option>`).join("");
  $("#bookMaster").innerHTML =
    `<option value="any">Кто свободен</option>` + MASTERS.map((m) => `<option>${m.name}</option>`).join("");
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
    $("#replyField").value = d.analysis.suggestions[Number(btn.dataset.suggest)].text;
    toast("Текст в поле ответа. Можно чуть поправить и отправить гостье.");
  });

  $("#sendReply").addEventListener("click", () => {
    const text = $("#replyField").value.trim();
    if (!text) return toast("Сначала выберите или напишите ответ");
    const d = DIALOGS.find((x) => x.id === currentId);
    d.messages.push({ role: "staff", text, time: "сейчас" });
    d.unanswered = false;
    openDialog(currentId);
    toast("Сообщение ушло гостье. В рабочей версии — прямо в мессенджер.");
  });

  $("#createBooking").addEventListener("click", () => {
    if (!currentId) return;
    const d = DIALOGS.find((x) => x.id === currentId);
    openModal(`
      <h2 style="margin:0 0 8px;font-family:var(--display)">Записать гостью</h2>
      <p class="lead">${escapeHtml(d.client)} — выберите услугу, мастера и время. Пересечений в расписании система не допустит.</p>
      <label class="field-label">Услуга</label>
      <select>${SERVICES.map((s) => `<option>${s.name}</option>`).join("")}</select>
      <label class="field-label">Мастер</label>
      <select>${MASTERS.map((m) => `<option>${m.name}</option>`).join("")}</select>
      <label class="field-label">Когда</label>
      <input type="datetime-local" value="2026-10-18T15:30" />
      <div class="row">
        <button type="button" class="btn primary" id="saveBook">Сохранить запись</button>
        <button type="button" class="btn ghost" id="cancelBook">Отмена</button>
      </div>
    `);
    $("#saveBook").onclick = () => {
      d.analysis.stage = "booked";
      d.analysis.lost_sum = 0;
      d.analysis.outcome = "Гостья записана из переписки";
      d.analysis.quality = "ok";
      closeModal();
      openDialog(currentId);
      toast("Запись создана. Напоминания уйдут за сутки и за 2 часа.");
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
    const i = Number(btn.dataset.noshow);
    BOOKINGS[i].status = "no_show";
    BOOKINGS[i].statusLabel = "Неявка";
    BOOKINGS[i].remind = "Отметили, что не пришла";
    renderReminders();
    toast("Неявка учтена — видно в «Как идут продажи»");
  });

  $("#addService").onclick = () => toast("В рабочей версии здесь откроется форма услуги и цены");
  $("#addMaster").onclick = () => toast("В рабочей версии — график мастера и услуги, которые делает");

  $("#bookSlots").addEventListener("click", (e) => {
    const s = e.target.closest("[data-slot]");
    if (!s) return;
    selectedSlot = s.dataset.slot;
    renderBookingPublic();
  });

  $("#bookSubmit").onclick = () => {
    if (!selectedSlot) return toast("Выберите удобное время");
    if (!$("#bookConsent").checked) return toast("Нужно согласие на обработку данных для записи");
    if (!$("#bookName").value.trim() || !$("#bookPhone").value.trim()) return toast("Укажите имя и телефон");
    toast("Готово! Запись принята. Перед визитом придёт напоминание.");
  };

  $("#pasteFill").onclick = () => {
    $("#pasteArea").value = `Гость: Здравствуйте! Сколько стоит окрашивание корней?
Администратор: От 3500
Гость: В прайсе от 4500… На субботу есть окно?
Администратор: Уточню и напишу
Гость: Жду второй день`;
  };

  $("#pasteAnalyze").onclick = async () => {
    if (!$("#pasteArea").value.trim()) return toast("Вставьте текст переписки");
    const box = $("#standResult");
    box.hidden = false;
    box.innerHTML = `<p class="muted">Читаем диалог: скорость ответов, прайс, не закрыли ли запись…</p>`;
    await wait(1200);
    box.innerHTML = renderAnalysis(DIALOGS[0].analysis);
    toast("Готово — ниже разбор понятным языком");
  };

  $$(".period-switch .chip").forEach((c) =>
    c.addEventListener("click", () => {
      $$(".period-switch .chip").forEach((x) => x.classList.toggle("active", x === c));
      toast(c.dataset.period === "7" ? "Показали неделю" : "Показали месяц");
    })
  );

  $("#roleSelect").onchange = () => {
    const role = $("#roleSelect").value;
    $("#roleHint").textContent = `сейчас: ${ROLE_LABEL[role]}`;
    if (role === "master") toast("Мастер видит свои записи и своих гостей, не все переписки салона");
    else toast(`Открыли кабинет как ${ROLE_LABEL[role]}`);
  };

  $("#salonSelect").onchange = () => {
    const salon = $("#salonSelect").value;
    toast(`Салон: ${salon}`);
    const s = getSession();
    if (s) {
      s.salon = salon;
      saveSession(s);
      paintAccount(s);
    }
  };

  $("#modalClose").onclick = closeModal;
  $("#modal").addEventListener("click", (e) => {
    if (e.target.id === "modal") closeModal();
  });
}

function getSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveSession(session) {
  const payload = JSON.stringify(session);
  sessionStorage.setItem(SESSION_KEY, payload);
  if (session.remember) localStorage.setItem(SESSION_KEY, payload);
  else localStorage.removeItem(SESSION_KEY);
}

function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

function paintAccount(session) {
  const name = session.name || "Владелец";
  const salon = session.salon || "Лаванда · Москва";
  const login = session.login || "";
  $("#accountName").textContent = name;
  $("#accountMeta").textContent = `${salon}${login ? ` · ${login}` : ""}`;
  $("#accountSub").textContent = "кабинет салона";
  const opt = [...$("#salonSelect").options].find((o) => o.value === salon || o.textContent === salon);
  if (opt) $("#salonSelect").value = opt.value;
  if (session.role && $("#roleSelect").querySelector(`option[value="${session.role}"]`)) {
    $("#roleSelect").value = session.role;
    $("#roleHint").textContent = `сейчас: ${ROLE_LABEL[session.role]}`;
  }
}

function showApp(session) {
  paintAccount(session);
  $("#authGate").hidden = true;
  $("#appShell").hidden = false;
  document.body.classList.add("is-authed");
}

function showAuth() {
  $("#authGate").hidden = false;
  $("#appShell").hidden = true;
  document.body.classList.remove("is-authed");
}

function enterCabinet(session) {
  saveSession(session);
  showApp(session);
  toast(`Добро пожаловать, ${session.name}. Кабинет «${session.salon.split("·")[0].trim()}» открыт`);
}

function guessNameFromLogin(login) {
  const raw = (login || "").trim();
  if (raw.includes("@")) {
    const local = raw.split("@")[0];
    if (/^[a-zа-яё._-]+$/i.test(local)) {
      const part = local.split(/[._-]/)[0];
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    }
  }
  return "Владелец";
}

function bindAuth() {
  $("#togglePass").onclick = () => {
    const input = $("#loginPass");
    const show = input.type === "password";
    input.type = show ? "text" : "password";
    $("#togglePass").textContent = show ? "скрыть" : "показать";
  };

  $("#loginForm").onsubmit = (e) => {
    e.preventDefault();
    const login = $("#loginPhone").value.trim();
    const pass = $("#loginPass").value;
    if (!login || pass.length < 4) {
      toast("Укажите телефон или почту и пароль от 4 символов");
      return;
    }
    const btn = $("#loginSubmit");
    btn.disabled = true;
    btn.textContent = "Открываем кабинет…";
    setTimeout(() => {
      enterCabinet({
        login,
        name: guessNameFromLogin(login),
        salon: "Лаванда · Москва",
        role: "owner",
        remember: $("#loginRemember").checked,
        at: Date.now(),
      });
      btn.disabled = false;
      btn.textContent = "Войти в кабинет";
    }, 650);
  };

  $("#demoLogin").onclick = () => {
    enterCabinet({
      login: "+7 926 000-11-22",
      name: "Ольга",
      salon: "Лаванда · Москва",
      role: "owner",
      remember: true,
      at: Date.now(),
    });
  };

  $("#logoutBtn").onclick = () => {
    clearSession();
    showAuth();
    $("#loginPass").value = "";
    toast("Вы вышли. Чтобы снова открыть кабинет — войдите");
  };
}

function bootAppData() {
  bind();
  renderDialogList();
  renderChannels();
  renderAnalytics();
  renderReminders();
  renderSettings();
  renderBookingPublic();
  openDialog(DIALOGS[0].id);
}

function init() {
  bindAuth();
  bootAppData();
  const session = getSession();
  if (session) showApp(session);
  else showAuth();
}

init();
