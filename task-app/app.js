/* =========================================================
   リズムワーク - からだと気分に合わせるフリーランスのタスク管理
   データはすべて localStorage に保存（サーバー送信なし）
   ========================================================= */

const STORAGE_KEY = "rhythm-work-v1";

const SYMPTOMS = [
  "生理中", "お腹が痛い", "頭痛", "眠い・寝不足", "だるい", "イライラ",
  "落ち込み", "肌荒れ", "むくみ", "食欲すごい",
  "子ども体調不良", "保育園・学校お休み", "家族の予定あり", "外出あり"
];

const PHASES = {
  menstrual: {
    label: "月経期",
    cls: "phase-menstrual",
    copy: "からだが休みたがっている時期。締切のない軽いタスクや事務作業だけにして、進まなくてもOKと決めておくのがコツ。",
    fit: ["light"]
  },
  follicular: {
    label: "卵胞期",
    cls: "phase-follicular",
    copy: "エネルギーが上がってくる時期。新しい提案、企画、重めの制作など「頭を使う仕事」を前倒しで進めるチャンス。",
    fit: ["heavy", "mid", "light"]
  },
  ovulation: {
    label: "排卵期",
    cls: "phase-ovulation",
    copy: "人と関わる仕事が向く時期。打ち合わせ、営業メール、SNS発信、クライアントへの相談はここに寄せると楽。",
    fit: ["heavy", "mid", "light"]
  },
  luteal: {
    label: "黄体期",
    cls: "phase-luteal",
    copy: "集中して仕上げる時期。見直し・修正・納品準備など「決まったことを丁寧にやる」仕事と相性◎。予定は詰め込みすぎない。",
    fit: ["mid", "light"]
  },
  pms: {
    label: "PMS注意期",
    cls: "phase-luteal",
    copy: "生理前で気分やからだが揺れやすい時期。重い判断や新規案件は避けて、軽めのタスクと休息を優先。できたら十分。",
    fit: ["light", "mid"]
  },
  late: {
    label: "生理予定日を過ぎています",
    cls: "phase-late",
    copy: "予定日を過ぎています。生理が来たらカレンダーで開始日を登録してください。無理のないペースで。",
    fit: ["light", "mid"]
  }
};

const ENERGY_LABEL = { light: "🍃 軽い", mid: "🌿 ふつう", heavy: "🌳 重い" };
const PRIORITY_LABEL = { high: "優先度：高", mid: "優先度：中", low: "優先度：低" };
const ENERGY_RANK = { light: 1, mid: 2, heavy: 3 };
const PRIORITY_RANK = { high: 0, mid: 1, low: 2 };

/* ---------- state ---------- */
const defaultState = () => ({
  settings: { cycleLength: 28, periodLength: 5, pmsDays: 5 },
  periods: [],
  checkins: {},
  tasks: [],
  wins: []
});

let state = loadState();
let selectedDate = ymd(new Date());
let calCursor = startOfMonth(new Date());
let currentStatusTab = "open";
let checkinDraft = { energy: 0, mood: 0, symptoms: [] };

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    return { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings || {}) } };
  } catch (e) {
    return defaultState();
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    toast("保存できませんでした（容量不足の可能性）");
  }
}

/* ---------- date helpers ---------- */
function pad(n) {
  return String(n).padStart(2, "0");
}
function ymd(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function parseYmd(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function addDays(s, n) {
  const d = parseYmd(s);
  d.setDate(d.getDate() + n);
  return ymd(d);
}
function diffDays(a, b) {
  return Math.round((parseYmd(b) - parseYmd(a)) / 86400000);
}
function startOfMonth(d) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function todayStr() {
  return ymd(new Date());
}
function fmtShort(s) {
  const d = parseYmd(s);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
function fmtLong(s) {
  const d = parseYmd(s);
  const w = ["日", "月", "火", "水", "木", "金", "土"][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${w}）`;
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- cycle logic ---------- */
function sortedPeriods() {
  return [...state.periods].sort();
}

function effectiveCycleLength() {
  const p = sortedPeriods();
  if (p.length >= 2) {
    const recent = p.slice(-4);
    const gaps = [];
    for (let i = 1; i < recent.length; i++) gaps.push(diffDays(recent[i - 1], recent[i]));
    const valid = gaps.filter((g) => g >= 18 && g <= 60);
    if (valid.length) return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
  }
  return state.settings.cycleLength;
}

function cycleInfo(dateStr) {
  const periods = sortedPeriods();
  const cycleLength = effectiveCycleLength();
  const { periodLength, pmsDays } = state.settings;
  let lastStart = [...periods].reverse().find((p) => p <= dateStr);

  if (!lastStart) return null;

  let dayInCycle = diffDays(lastStart, dateStr) + 1;
  // 未来の日付は、予測周期で開始日を前に進めて時期を推定する
  if (dateStr > todayStr() && dayInCycle > cycleLength) {
    const shift = Math.floor((dayInCycle - 1) / cycleLength) * cycleLength;
    lastStart = addDays(lastStart, shift);
    dayInCycle -= shift;
  }
  const nextStart = addDays(lastStart, cycleLength);
  const ovulationDay = Math.max(periodLength + 2, cycleLength - 14);
  let phase;

  if (dayInCycle <= periodLength) phase = "menstrual";
  else if (dayInCycle > cycleLength) phase = "late";
  else if (dayInCycle >= ovulationDay - 1 && dayInCycle <= ovulationDay + 1) phase = "ovulation";
  else if (dayInCycle < ovulationDay - 1) phase = "follicular";
  else if (dayInCycle > cycleLength - pmsDays) phase = "pms";
  else phase = "luteal";

  return {
    lastStart,
    nextStart,
    dayInCycle,
    cycleLength,
    ovulationDay,
    phase,
    daysToNext: diffDays(dateStr, nextStart)
  };
}

/* 予測：将来の生理日を返す（表示中の月だけ計算） */
function predictedPeriodDays(fromStr, toStr) {
  const periods = sortedPeriods();
  if (!periods.length) return new Set();
  const cycleLength = effectiveCycleLength();
  const { periodLength } = state.settings;
  const set = new Set();
  let start = periods[periods.length - 1];
  for (let i = 0; i < 6; i++) {
    start = addDays(start, cycleLength);
    if (start > toStr) break;
    for (let d = 0; d < periodLength; d++) {
      const day = addDays(start, d);
      if (day >= fromStr && day <= toStr) set.add(day);
    }
  }
  return set;
}

/* ---------- UI helpers ---------- */
const $ = (id) => document.getElementById(id);
let toastTimer;
function toast(msg) {
  const el = $("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1800);
}

function switchView(name) {
  document.querySelectorAll(".view").forEach((v) => v.classList.add("hidden"));
  $(`view-${name}`).classList.remove("hidden");
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("active", t.dataset.view === name));
  window.scrollTo({ top: 0 });
  if (name === "calendar") renderCalendar();
  if (name === "log") renderLog();
  if (name === "settings") renderSettings();
}

/* ---------- home ---------- */
function renderHeader() {
  $("todayLabel").textContent = fmtLong(todayStr());
  $("streakBadge").textContent = `🔥 ${streak()}日`;
}

function streak() {
  let count = 0;
  let d = todayStr();
  if (!state.checkins[d]) d = addDays(d, -1);
  while (state.checkins[d]) {
    count++;
    d = addDays(d, -1);
  }
  return count;
}

function renderPhase() {
  const card = $("phaseCard");
  const info = cycleInfo(todayStr());
  card.className = "card phase-card";
  if (!info) {
    $("phaseBadge").textContent = "周期未設定";
    $("phaseDay").textContent = "";
    $("phaseCopy").textContent = PHASES_EMPTY;
    $("phaseNext").textContent = "";
    return;
  }
  const ph = PHASES[info.phase];
  card.classList.add(ph.cls);
  $("phaseBadge").textContent = ph.label;
  $("phaseDay").textContent = `周期${info.dayInCycle}日目`;
  $("phaseCopy").textContent = ph.copy;
  if (info.phase === "late") {
    $("phaseNext").textContent = `予定日から${-info.daysToNext}日経過（推定周期 ${info.cycleLength}日）`;
  } else {
    $("phaseNext").textContent = `次の生理予定：${fmtShort(info.nextStart)}（あと${info.daysToNext}日）・推定周期 ${info.cycleLength}日`;
  }
}
const PHASES_EMPTY = "「周期」タブで生理開始日を登録すると、今のからだの時期とおすすめの働き方が表示されます。";

function renderCheckinForm() {
  const today = state.checkins[todayStr()];
  if (today) {
    checkinDraft = { energy: today.energy, mood: today.mood, symptoms: [...(today.symptoms || [])] };
    $("hoursInput").value = today.hours;
    $("memoInput").value = today.memo || "";
    $("checkinSaved").textContent = "今日の記録は保存済み。変更したら再保存できます。";
  }
  $("hoursOutput").textContent = fmtHours(Number($("hoursInput").value));

  document.querySelectorAll("#energyScale .scale-btn").forEach((b) =>
    b.classList.toggle("active", Number(b.dataset.value) === checkinDraft.energy)
  );
  document.querySelectorAll("#moodScale .scale-btn").forEach((b) =>
    b.classList.toggle("active", Number(b.dataset.value) === checkinDraft.mood)
  );

  const wrap = $("symptomChips");
  wrap.innerHTML = "";
  SYMPTOMS.forEach((s) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "chip" + (checkinDraft.symptoms.includes(s) ? " active" : "");
    b.textContent = s;
    b.addEventListener("click", () => {
      const i = checkinDraft.symptoms.indexOf(s);
      if (i >= 0) checkinDraft.symptoms.splice(i, 1);
      else checkinDraft.symptoms.push(s);
      b.classList.toggle("active");
    });
    wrap.appendChild(b);
  });
}

function fmtHours(h) {
  if (h === 0) return "今日は休む";
  return `${h}時間`;
}

function saveCheckin() {
  if (!checkinDraft.energy || !checkinDraft.mood) {
    toast("エネルギーと気分を選んでください");
    return;
  }
  const hours = Number($("hoursInput").value);
  state.checkins[todayStr()] = {
    energy: checkinDraft.energy,
    mood: checkinDraft.mood,
    symptoms: [...checkinDraft.symptoms],
    hours,
    memo: $("memoInput").value.trim()
  };
  // 「生理中」チップが押されていて開始日が未登録なら、自動で開始日候補にする
  if (checkinDraft.symptoms.includes("生理中")) {
    const info = cycleInfo(todayStr());
    if (!info || info.phase !== "menstrual") {
      if (!state.periods.includes(todayStr())) {
        state.periods.push(todayStr());
        toast("今日を生理開始日として登録しました");
      }
    }
  }
  saveState();
  $("checkinSaved").textContent = "保存しました 🌸";
  renderHeader();
  renderPhase();
  renderReco();
}

/* ---------- recommendations ---------- */
function allowedEnergies(energy, phase) {
  let byEnergy;
  if (energy <= 2) byEnergy = ["light"];
  else if (energy === 3) byEnergy = ["light", "mid"];
  else byEnergy = ["light", "mid", "heavy"];
  if (!phase) return byEnergy;
  const byPhase = PHASES[phase].fit;
  // 体調が良ければ周期の制限は緩める（エネルギー4以上なら周期の目安より本人の感覚を優先）
  if (energy >= 4) return byEnergy;
  return byEnergy.filter((e) => byPhase.includes(e));
}

function renderReco() {
  const list = $("recoList");
  const today = state.checkins[todayStr()];
  const open = state.tasks.filter((t) => t.status !== "done");
  list.innerHTML = "";

  if (!open.length) {
    $("recoSummary").textContent = "";
    $("recoHint").textContent = "未完了のタスクがありません。「タスク」タブから追加できます。";
    return;
  }
  if (!today) {
    $("recoSummary").textContent = "";
    $("recoHint").textContent = "今日のコンディションを保存すると、体調に合ったタスクを提案します。";
    // それでも締切が近いものは見せる
    const urgent = open
      .filter((t) => t.deadline && diffDays(todayStr(), t.deadline) <= 2)
      .sort(sortByDeadline);
    urgent.slice(0, 3).forEach((t) => list.appendChild(taskItem(t, { reason: "締切が近いので確認だけでも" })));
    return;
  }

  const info = cycleInfo(todayStr());
  const allowed = allowedEnergies(today.energy, info ? info.phase : null);
  const budget = today.hours;

  if (budget === 0) {
    $("recoSummary").textContent = "休息日";
    $("recoHint").textContent = "今日は休む日。締切が迫っているものだけ確認して、あとはからだを優先してください。";
    open
      .filter((t) => t.deadline && diffDays(todayStr(), t.deadline) <= 1)
      .sort(sortByDeadline)
      .forEach((t) => list.appendChild(taskItem(t, { reason: "締切が迫っています。連絡だけでも" })));
    if (!list.children.length) {
      const li = document.createElement("li");
      li.className = "empty";
      li.textContent = "急ぎのものはありません。ゆっくり休んでください 🍵";
      list.appendChild(li);
    }
    return;
  }

  // 締切→優先度→エネルギー（軽い順）で並べ、時間の枠内で詰める
  const candidates = open
    .map((t) => ({ t, ok: allowed.includes(t.energy) }))
    .sort((a, b) => sortByDeadline(a.t, b.t));

  let used = 0;
  const picked = [];
  const skipped = [];
  candidates.forEach(({ t, ok }) => {
    const h = Number(t.hours) || 1;
    const overdue = t.deadline && diffDays(todayStr(), t.deadline) <= 0;
    if ((ok || overdue) && used + h <= budget + 0.5) {
      used += h;
      picked.push({ t, reason: recoReason(t, ok, overdue, today, info) });
    } else if (!ok) {
      skipped.push(t);
    }
  });

  $("recoSummary").textContent = `${fmtHours(budget)} / ${picked.length}件`;
  const phaseLabel = info ? PHASES[info.phase].label : "";
  const energyLabel = ["", "ぐったり", "低め", "ふつう", "良い", "絶好調"][today.energy];
  const heavySkipped = skipped.length ? `重めのタスク${skipped.length}件は今日は見送り。` : "";
  $("recoHint").textContent = `${phaseLabel ? phaseLabel + "・" : ""}エネルギー「${energyLabel}」に合わせて選びました。${heavySkipped}`;

  picked.forEach(({ t, reason }) => list.appendChild(taskItem(t, { reason })));
  if (!picked.length) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "今日の枠に合うタスクがありません。時間を増やすか、タスクを小さく分けてみましょう。";
    list.appendChild(li);
  }
}

function recoReason(t, ok, overdue, today, info) {
  if (overdue) return "締切当日・超過。最優先で";
  if (t.deadline) {
    const d = diffDays(todayStr(), t.deadline);
    if (d <= 2) return `締切まであと${d}日`;
  }
  if (t.energy === "light" && today.energy <= 2) return "しんどい日でも進めやすい軽さ";
  if (t.energy === "heavy") return "エネルギーがある今のうちに";
  if (info && info.phase === "luteal" && t.energy === "mid") return "集中しやすい時期にぴったり";
  return "今日の体調に合っています";
}

function sortByDeadline(a, b) {
  const da = a.deadline || "9999-99-99";
  const db = b.deadline || "9999-99-99";
  if (da !== db) return da < db ? -1 : 1;
  if (PRIORITY_RANK[a.priority] !== PRIORITY_RANK[b.priority]) return PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return ENERGY_RANK[a.energy] - ENERGY_RANK[b.energy];
}

/* ---------- wins ---------- */
function renderWins() {
  const list = $("winList");
  list.innerHTML = "";
  const todays = state.wins.filter((w) => w.date === todayStr());
  todays.forEach((w) => {
    const li = document.createElement("li");
    const span = document.createElement("span");
    span.textContent = `🌸 ${w.text}`;
    const del = document.createElement("button");
    del.className = "icon-button";
    del.textContent = "×";
    del.setAttribute("aria-label", "削除");
    del.addEventListener("click", () => {
      state.wins = state.wins.filter((x) => x.id !== w.id);
      saveState();
      renderWins();
    });
    li.append(span, del);
    list.appendChild(li);
  });
}

/* ---------- tasks ---------- */
let taskEnergyValue = "light";

function taskItem(t, opts = {}) {
  const li = document.createElement("li");
  li.className = "task-item" + (t.status === "done" ? " done" : "");

  const check = document.createElement("button");
  check.type = "button";
  check.className = "task-check" + (t.status === "done" ? " done" : "");
  check.textContent = t.status === "done" ? "✓" : "";
  check.setAttribute("aria-label", t.status === "done" ? "未完了に戻す" : "完了にする");
  check.addEventListener("click", () => toggleTask(t.id));

  const body = document.createElement("div");
  body.className = "task-body";
  const title = document.createElement("p");
  title.className = "task-title";
  title.textContent = t.title;
  body.appendChild(title);

  const meta = document.createElement("div");
  meta.className = "task-meta";
  if (t.client) meta.appendChild(tag(t.client));
  if (t.deadline) {
    const d = diffDays(todayStr(), t.deadline);
    let cls = "";
    let label = `締切 ${fmtShort(t.deadline)}`;
    if (t.status !== "done") {
      if (d < 0) { cls = "overdue"; label = `${-d}日超過`; }
      else if (d === 0) { cls = "overdue"; label = "今日締切"; }
      else if (d <= 3) { cls = "soon"; label = `あと${d}日`; }
    }
    meta.appendChild(tag(label, cls));
  }
  meta.appendChild(tag(`${t.hours}h`));
  meta.appendChild(tag(ENERGY_LABEL[t.energy], t.energy));
  if (t.priority === "high") meta.appendChild(tag("優先度 高", "high"));
  body.appendChild(meta);

  if (opts.reason) {
    const r = document.createElement("p");
    r.className = "reco-reason";
    r.textContent = `→ ${opts.reason}`;
    body.appendChild(r);
  }

  li.append(check, body);

  if (opts.actions) {
    const actions = document.createElement("div");
    actions.className = "task-actions";
    const edit = document.createElement("button");
    edit.className = "icon-button";
    edit.textContent = "✎";
    edit.setAttribute("aria-label", "編集");
    edit.addEventListener("click", () => editTask(t.id));
    const del = document.createElement("button");
    del.className = "icon-button";
    del.textContent = "🗑";
    del.setAttribute("aria-label", "削除");
    del.addEventListener("click", () => {
      if (confirm(`「${t.title}」を削除しますか？`)) {
        state.tasks = state.tasks.filter((x) => x.id !== t.id);
        saveState();
        renderTasks();
        renderReco();
      }
    });
    actions.append(edit, del);
    li.appendChild(actions);
  }
  return li;
}

function tag(text, cls = "") {
  const s = document.createElement("span");
  s.className = "tag" + (cls ? " " + cls : "");
  s.textContent = text;
  return s;
}

function toggleTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  if (t.status === "done") {
    t.status = "todo";
    delete t.doneAt;
  } else {
    t.status = "done";
    t.doneAt = todayStr();
    toast("おつかれさま！1件完了 🎉");
  }
  saveState();
  renderTasks();
  renderReco();
}

function clients() {
  return [...new Set(state.tasks.map((t) => t.client).filter(Boolean))].sort();
}

function renderTasks() {
  const list = $("taskList");
  const filter = $("clientFilter").value;
  list.innerHTML = "";

  // クライアント候補
  const cl = clients();
  $("clientList").innerHTML = cl.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");
  const sel = $("clientFilter");
  const prev = sel.value;
  sel.innerHTML = `<option value="">すべて</option>` + cl.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
  sel.value = cl.includes(prev) ? prev : "";

  let items = state.tasks.filter((t) => (currentStatusTab === "done" ? t.status === "done" : t.status !== "done"));
  if (sel.value) items = items.filter((t) => t.client === sel.value);
  if (currentStatusTab === "done") items.sort((a, b) => (b.doneAt || "").localeCompare(a.doneAt || ""));
  else items.sort(sortByDeadline);

  items.forEach((t) => list.appendChild(taskItem(t, { actions: true })));
  $("taskEmpty").classList.toggle("hidden", items.length > 0);
  if (currentStatusTab === "done") $("taskEmpty").textContent = "完了したタスクはまだありません。";
  else $("taskEmpty").textContent = "未完了のタスクはありません。上のフォームから追加してみましょう。";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

function setTaskEnergy(v) {
  taskEnergyValue = v;
  document.querySelectorAll("#taskEnergy button").forEach((b) => b.classList.toggle("active", b.dataset.value === v));
}

function resetTaskForm() {
  $("taskForm").reset();
  $("taskId").value = "";
  $("taskFormTitle").textContent = "タスクを追加";
  $("taskSubmit").textContent = "追加する";
  $("taskCancel").classList.add("hidden");
  setTaskEnergy("light");
}

function editTask(id) {
  const t = state.tasks.find((x) => x.id === id);
  if (!t) return;
  $("taskId").value = t.id;
  $("taskTitle").value = t.title;
  $("taskClient").value = t.client || "";
  $("taskDeadline").value = t.deadline || "";
  $("taskHours").value = String(t.hours);
  $("taskPriority").value = t.priority;
  setTaskEnergy(t.energy);
  $("taskFormTitle").textContent = "タスクを編集";
  $("taskSubmit").textContent = "保存する";
  $("taskCancel").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function submitTask(e) {
  e.preventDefault();
  const id = $("taskId").value;
  const data = {
    title: $("taskTitle").value.trim(),
    client: $("taskClient").value.trim(),
    deadline: $("taskDeadline").value || "",
    hours: Number($("taskHours").value),
    priority: $("taskPriority").value,
    energy: taskEnergyValue
  };
  if (!data.title) return;
  if (id) {
    const t = state.tasks.find((x) => x.id === id);
    Object.assign(t, data);
    toast("タスクを更新しました");
  } else {
    state.tasks.push({ id: uid(), status: "todo", createdAt: todayStr(), ...data });
    toast("タスクを追加しました");
  }
  saveState();
  resetTaskForm();
  renderTasks();
  renderReco();
}

/* ---------- calendar ---------- */
function renderCalendar() {
  const y = calCursor.getFullYear();
  const m = calCursor.getMonth();
  $("calTitle").textContent = `${y}年${m + 1}月`;
  const grid = $("calGrid");
  grid.innerHTML = "";

  const first = new Date(y, m, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthStart = ymd(first);
  const monthEnd = ymd(new Date(y, m, daysInMonth));
  const predicted = predictedPeriodDays(monthStart, monthEnd);
  const deadlines = new Set(state.tasks.filter((t) => t.status !== "done" && t.deadline).map((t) => t.deadline));
  const today = todayStr();

  const total = Math.ceil((startOffset + daysInMonth) / 7) * 7;
  for (let i = 0; i < total; i++) {
    const dayNum = i - startOffset + 1;
    const cell = document.createElement("button");
    cell.type = "button";
    cell.className = "cal-day";
    if (dayNum < 1 || dayNum > daysInMonth) {
      cell.classList.add("other");
      cell.disabled = true;
      cell.innerHTML = "&nbsp;";
      grid.appendChild(cell);
      continue;
    }
    const ds = ymd(new Date(y, m, dayNum));
    cell.textContent = dayNum;
    if (ds === today) cell.classList.add("today");
    if (ds === selectedDate) cell.classList.add("selected");

    const info = cycleInfo(ds);
    if (predicted.has(ds)) cell.classList.add("predict");
    else if (info && info.phase === "menstrual") cell.classList.add("period");
    else if (info && info.phase === "ovulation") cell.classList.add("ovulation");
    else if (info && info.phase === "pms") cell.classList.add("pms");

    const dots = document.createElement("div");
    dots.className = "cal-dots";
    if (deadlines.has(ds)) dots.appendChild(dot("dot-deadline"));
    const c = state.checkins[ds];
    if (c) dots.appendChild(dot(c.mood <= 2 || c.energy <= 2 ? "dot-mood-low" : "dot-checkin"));
    cell.appendChild(dots);

    cell.addEventListener("click", () => {
      selectedDate = ds;
      renderCalendar();
    });
    grid.appendChild(cell);
  }
  renderDayDetail();
}

function dot(cls) {
  const d = document.createElement("i");
  d.className = "dot " + cls;
  return d;
}

function renderDayDetail() {
  const ds = selectedDate;
  $("dayDetailTitle").textContent = fmtLong(ds);
  const body = $("dayDetailBody");
  body.innerHTML = "";

  const info = cycleInfo(ds);
  const rows = [];
  if (info) {
    rows.push(["からだの時期", `${PHASES[info.phase].label}（周期${info.dayInCycle}日目）`]);
  } else {
    rows.push(["からだの時期", "生理開始日が未登録"]);
  }
  const c = state.checkins[ds];
  if (c) {
    const e = ["", "😴", "😌", "🙂", "😊", "🔥"][c.energy];
    const mo = ["", "🌧", "☁️", "⛅", "🌤", "☀️"][c.mood];
    rows.push(["コンディション", `エネルギー${e} 気分${mo}・作業${fmtHours(c.hours)}`]);
    if (c.symptoms && c.symptoms.length) rows.push(["サイン", c.symptoms.join("、")]);
    if (c.memo) rows.push(["メモ", c.memo]);
  }
  const dl = state.tasks.filter((t) => t.deadline === ds);
  if (dl.length) rows.push(["締切", dl.map((t) => `${t.title}${t.status === "done" ? "（完了）" : ""}`).join(" / ")]);
  const wins = state.wins.filter((w) => w.date === ds);
  if (wins.length) rows.push(["できたこと", wins.map((w) => w.text).join(" / ")]);

  rows.forEach(([k, v]) => {
    const row = document.createElement("div");
    row.className = "detail-row";
    const b = document.createElement("b");
    b.textContent = k;
    const span = document.createElement("span");
    span.textContent = v;
    row.append(b, span);
    body.appendChild(row);
  });

  const isStart = state.periods.includes(ds);
  $("togglePeriod").textContent = isStart ? "生理開始日の登録を取り消す" : "この日を生理開始日にする";
}

function togglePeriod() {
  const ds = selectedDate;
  if (ds > todayStr()) {
    toast("未来の日付は登録できません");
    return;
  }
  const i = state.periods.indexOf(ds);
  if (i >= 0) {
    state.periods.splice(i, 1);
    toast("取り消しました");
  } else {
    // 近すぎる登録（同じ生理の別日）を防ぐ
    const near = state.periods.find((p) => Math.abs(diffDays(p, ds)) < 10);
    if (near) {
      toast(`${fmtShort(near)}の登録と近すぎます`);
      return;
    }
    state.periods.push(ds);
    toast("生理開始日を登録しました");
  }
  saveState();
  renderCalendar();
  renderPhase();
  renderReco();
}

/* ---------- log ---------- */
function renderLog() {
  const chart = $("chart");
  chart.innerHTML = "";
  const days = [];
  for (let i = 13; i >= 0; i--) days.push(addDays(todayStr(), -i));
  days.forEach((ds) => {
    const col = document.createElement("div");
    col.className = "bar-col";
    const info = cycleInfo(ds);
    if (info) col.classList.add(PHASES[info.phase].cls);
    const bars = document.createElement("div");
    bars.className = "bars";
    const c = state.checkins[ds];
    const be = document.createElement("div");
    be.className = "bar bar-energy";
    be.style.height = c ? `${c.energy * 20}%` : "2px";
    const bm = document.createElement("div");
    bm.className = "bar bar-mood";
    bm.style.height = c ? `${c.mood * 20}%` : "2px";
    bars.append(be, bm);
    const label = document.createElement("span");
    label.className = "bar-label";
    label.textContent = String(parseYmd(ds).getDate());
    col.title = c ? `${fmtShort(ds)} エネルギー${c.energy} 気分${c.mood}` : `${fmtShort(ds)} 記録なし`;
    col.append(bars, label);
    chart.appendChild(col);
  });
  let legend = chart.nextElementSibling;
  if (!legend || !legend.classList.contains("chart-legend")) {
    legend = document.createElement("div");
    legend.className = "chart-legend";
    legend.innerHTML = `<span><i class="lg" style="background:var(--accent)"></i> エネルギー</span><span><i class="lg" style="background:var(--blue)"></i> 気分</span><span>日付が赤字＝月経期</span>`;
    chart.after(legend);
  }

  // 今週のふりかえり
  const weekAgo = addDays(todayStr(), -6);
  const doneThisWeek = state.tasks.filter((t) => t.status === "done" && t.doneAt && t.doneAt >= weekAgo).length;
  const winsThisWeek = state.wins.filter((w) => w.date >= weekAgo).length;
  const checkinsThisWeek = Object.keys(state.checkins).filter((d) => d >= weekAgo && d <= todayStr());
  const avgEnergy = checkinsThisWeek.length
    ? (checkinsThisWeek.reduce((a, d) => a + state.checkins[d].energy, 0) / checkinsThisWeek.length).toFixed(1)
    : "-";
  $("stats").innerHTML = `
    <div class="stat"><b>${doneThisWeek}</b><span>完了タスク</span></div>
    <div class="stat"><b>${winsThisWeek}</b><span>できたこと</span></div>
    <div class="stat"><b>${avgEnergy}</b><span>平均エネルギー</span></div>
  `;

  // よく出るサイン（直近3周期≒90日）
  const from = addDays(todayStr(), -effectiveCycleLength() * 3);
  const counts = {};
  Object.entries(state.checkins).forEach(([d, c]) => {
    if (d < from) return;
    (c.symptoms || []).forEach((s) => (counts[s] = (counts[s] || 0) + 1));
  });
  const sl = $("symptomStats");
  sl.innerHTML = "";
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  if (!entries.length) {
    sl.innerHTML = `<li class="empty">まだ記録がありません</li>`;
  } else {
    entries.forEach(([s, n]) => {
      const li = document.createElement("li");
      li.innerHTML = `<span>${escapeHtml(s)}</span><span>${n}回</span>`;
      sl.appendChild(li);
    });
  }

  // 履歴
  const h = $("history");
  h.innerHTML = "";
  const dates = Object.keys(state.checkins).sort().reverse().slice(0, 30);
  if (!dates.length) h.innerHTML = `<li class="empty">まだ記録がありません</li>`;
  dates.forEach((d) => {
    const c = state.checkins[d];
    const info = cycleInfo(d);
    const li = document.createElement("li");
    const e = ["", "😴", "😌", "🙂", "😊", "🔥"][c.energy];
    const mo = ["", "🌧", "☁️", "⛅", "🌤", "☀️"][c.mood];
    li.innerHTML = `<span class="h-date">${fmtShort(d)}</span>${e}${mo} ${fmtHours(c.hours)}${info ? `・${PHASES[info.phase].label}` : ""}` +
      `${c.symptoms && c.symptoms.length ? `<span class="h-memo">${escapeHtml(c.symptoms.join("、"))}</span>` : ""}` +
      `${c.memo ? `<span class="h-memo">${escapeHtml(c.memo)}</span>` : ""}`;
    h.appendChild(li);
  });
}

/* ---------- settings ---------- */
function renderSettings() {
  $("cycleLength").value = state.settings.cycleLength;
  $("periodLength").value = state.settings.periodLength;
  $("pmsDays").value = state.settings.pmsDays;
  const p = sortedPeriods();
  if (p.length >= 2) {
    $("cycleAuto").textContent = `記録から推定した周期：${effectiveCycleLength()}日（記録が2回以上あると、こちらを優先して予測します）`;
  } else {
    $("cycleAuto").textContent = "生理開始日を2回以上登録すると、実際の周期から自動で予測します。";
  }
}

function saveSettings() {
  const cl = Number($("cycleLength").value);
  const pl = Number($("periodLength").value);
  const pd = Number($("pmsDays").value);
  if (!(cl >= 20 && cl <= 45) || !(pl >= 2 && pl <= 10) || !(pd >= 0 && pd <= 10)) {
    toast("入力範囲を確認してください");
    return;
  }
  state.settings = { cycleLength: cl, periodLength: pl, pmsDays: pd };
  saveState();
  $("settingsSaved").textContent = "保存しました";
  renderPhase();
  renderReco();
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `rhythm-work-${todayStr()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function importData(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.tasks)) throw new Error("bad");
      if (!confirm("現在のデータをバックアップの内容で置き換えます。よろしいですか？")) return;
      state = { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...(parsed.settings || {}) } };
      saveState();
      renderAll();
      toast("読み込みました");
    } catch (e) {
      toast("読み込めないファイルです");
    }
  };
  reader.readAsText(file);
}

function resetData() {
  if (!confirm("すべてのデータを削除します。元に戻せません。よろしいですか？")) return;
  state = defaultState();
  checkinDraft = { energy: 0, mood: 0, symptoms: [] };
  saveState();
  $("memoInput").value = "";
  $("hoursInput").value = 3;
  $("checkinSaved").textContent = "";
  renderAll();
  toast("削除しました");
}

/* ---------- init ---------- */
function renderAll() {
  renderHeader();
  renderPhase();
  renderCheckinForm();
  renderReco();
  renderWins();
  renderTasks();
  renderCalendar();
  renderLog();
  renderSettings();
}

function bind() {
  document.querySelectorAll(".tab").forEach((t) => t.addEventListener("click", () => switchView(t.dataset.view)));

  document.querySelectorAll("#energyScale .scale-btn").forEach((b) =>
    b.addEventListener("click", () => {
      checkinDraft.energy = Number(b.dataset.value);
      document.querySelectorAll("#energyScale .scale-btn").forEach((x) => x.classList.toggle("active", x === b));
    })
  );
  document.querySelectorAll("#moodScale .scale-btn").forEach((b) =>
    b.addEventListener("click", () => {
      checkinDraft.mood = Number(b.dataset.value);
      document.querySelectorAll("#moodScale .scale-btn").forEach((x) => x.classList.toggle("active", x === b));
    })
  );
  $("hoursInput").addEventListener("input", () => {
    $("hoursOutput").textContent = fmtHours(Number($("hoursInput").value));
  });
  $("saveCheckin").addEventListener("click", saveCheckin);

  $("winForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const text = $("winInput").value.trim();
    if (!text) return;
    state.wins.push({ id: uid(), date: todayStr(), text });
    saveState();
    $("winInput").value = "";
    renderWins();
    toast("えらい！🌸");
  });

  $("taskForm").addEventListener("submit", submitTask);
  $("taskCancel").addEventListener("click", resetTaskForm);
  document.querySelectorAll("#taskEnergy button").forEach((b) => b.addEventListener("click", () => setTaskEnergy(b.dataset.value)));
  $("clientFilter").addEventListener("change", renderTasks);
  document.querySelectorAll("#statusTabs button").forEach((b) =>
    b.addEventListener("click", () => {
      currentStatusTab = b.dataset.status;
      document.querySelectorAll("#statusTabs button").forEach((x) => x.classList.toggle("active", x === b));
      renderTasks();
    })
  );

  $("prevMonth").addEventListener("click", () => {
    calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() - 1, 1);
    renderCalendar();
  });
  $("nextMonth").addEventListener("click", () => {
    calCursor = new Date(calCursor.getFullYear(), calCursor.getMonth() + 1, 1);
    renderCalendar();
  });
  $("togglePeriod").addEventListener("click", togglePeriod);

  $("saveSettings").addEventListener("click", saveSettings);
  $("exportBtn").addEventListener("click", exportData);
  $("importInput").addEventListener("change", (e) => {
    if (e.target.files[0]) importData(e.target.files[0]);
    e.target.value = "";
  });
  $("resetBtn").addEventListener("click", resetData);
}

bind();
renderAll();
