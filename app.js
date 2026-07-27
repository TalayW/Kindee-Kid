"use strict";

/*
  กินดี Kids — เว็บแอปต้นแบบสำหรับโครงงานระดับประถม
  -----------------------------------------------------
  หลักการสำคัญ
  1) ไม่คำนวณน้ำหนักเป้าหมายหรือสั่งให้อดอาหาร
  2) ใช้จำนวน “ส่วน” เพื่อเรียนรู้ความหลากหลายของอาหาร
  3) ข้อมูลบันทึกเก็บไว้ใน localStorage ของอุปกรณ์
  4) AI ช่วยประเมินภาพ แต่ผู้ใช้ต้องตรวจและยืนยันผลก่อนบันทึก
  5) ไม่ส่งชื่อเล่น ระดับชั้น หรือชื่อโรงเรียนไปยังระบบ AI
*/

const STORAGE_KEYS = {
  entries: "kindee:entries:v1",
  profile: "kindee:profile:v1",
  goals: "kindee:goals:v1"
};

const memoryStorage = new Map();
let storageWarningShown = false;

function storageGetItem(key) {
  try {
    const value = window.localStorage.getItem(key);
    if (value !== null) return value;
  } catch (error) {
    console.warn("ไม่สามารถอ่าน localStorage ได้ จึงใช้หน่วยความจำชั่วคราว", error);
  }
  return memoryStorage.has(key) ? memoryStorage.get(key) : null;
}

function storageSetItem(key, value) {
  try {
    window.localStorage.setItem(key, value);
    memoryStorage.delete(key);
    return { persistent: true, error: null };
  } catch (error) {
    memoryStorage.set(key, value);
    return { persistent: false, error };
  }
}

function storageRemoveItem(key) {
  try {
    window.localStorage.removeItem(key);
  } catch (error) {
    console.warn("ไม่สามารถลบ localStorage ได้", error);
  }
  memoryStorage.delete(key);
}

const DEFAULT_PROFILE = {
  name: "",
  grade: "",
  school: ""
};

const DEFAULT_GOALS = {
  water: 6,
  fruit: 2,
  dairy: 1
};

const MEAL_TYPES = {
  breakfast: { label: "มื้อเช้า", icon: "🌅" },
  lunch: { label: "มื้อกลางวัน", icon: "☀️" },
  dinner: { label: "มื้อเย็น", icon: "🌙" },
  snack: { label: "อาหารว่าง", icon: "🍎" }
};

const MAIN_MEAL_TYPES = ["breakfast", "lunch", "dinner"];

const FOOD_GROUPS = {
  veg: {
    label: "ผัก",
    icon: "🥬",
    nutrient: "ใยอาหาร วิตามิน แร่ธาตุ",
    defaultTarget: 6
  },
  starch: {
    label: "ข้าว/แป้ง",
    icon: "🍚",
    nutrient: "พลังงานสำหรับเรียนและเล่น",
    defaultTarget: 3
  },
  protein: {
    label: "โปรตีน",
    icon: "🥚",
    nutrient: "การเจริญเติบโตและซ่อมแซมร่างกาย",
    defaultTarget: 3
  },
  fruit: {
    label: "ผลไม้",
    icon: "🍊",
    nutrient: "วิตามิน แร่ธาตุ และใยอาหาร",
    defaultTarget: 2
  },
  dairy: {
    label: "นม",
    icon: "🥛",
    nutrient: "โปรตีนและแคลเซียม",
    defaultTarget: 1
  }
};

const FOOD_TEMPLATES = [
  {
    name: "ข้าว + ผัดผัก + ไข่ต้ม",
    icon: "🍳",
    groups: { veg: 2, starch: 1, protein: 1, fruit: 0, dairy: 0 },
    flags: {}
  },
  {
    name: "ข้าว + แกงจืดเต้าหู้หมูสับ",
    icon: "🍲",
    groups: { veg: 1.5, starch: 1, protein: 1, fruit: 0, dairy: 0 },
    flags: {}
  },
  {
    name: "ข้าวกะเพราไก่ + แตงกวา",
    icon: "🍛",
    groups: { veg: 0.75, starch: 1, protein: 1, fruit: 0, dairy: 0 },
    flags: { fried: true }
  },
  {
    name: "ก๋วยเตี๋ยวน้ำ",
    icon: "🍜",
    groups: { veg: 0.75, starch: 1, protein: 0.75, fruit: 0, dairy: 0 },
    flags: {}
  },
  {
    name: "ข้าวต้มปลา",
    icon: "🥣",
    groups: { veg: 0.5, starch: 1, protein: 1, fruit: 0, dairy: 0 },
    flags: {}
  },
  {
    name: "ส้มตำ + ไก่ย่าง + ข้าวเหนียว",
    icon: "🥗",
    groups: { veg: 1.5, starch: 1, protein: 1, fruit: 0, dairy: 0 },
    flags: {}
  },
  {
    name: "ข้าวผัด",
    icon: "🍚",
    groups: { veg: 0.5, starch: 1.5, protein: 0.75, fruit: 0, dairy: 0 },
    flags: { fried: true }
  },
  {
    name: "ผลไม้ 1 ส่วน",
    icon: "🍎",
    groups: { veg: 0, starch: 0, protein: 0, fruit: 1, dairy: 0 },
    flags: {}
  },
  {
    name: "นม 1 แก้ว",
    icon: "🥛",
    groups: { veg: 0, starch: 0, protein: 0, fruit: 0, dairy: 1 },
    flags: {}
  },
  {
    name: "โยเกิร์ต + ผลไม้",
    icon: "🥣",
    groups: { veg: 0, starch: 0, protein: 0, fruit: 1, dairy: 1 },
    flags: {}
  },
  {
    name: "น้ำหวาน",
    icon: "🧋",
    groups: { veg: 0, starch: 0, protein: 0, fruit: 0, dairy: 0 },
    flags: { sweetDrink: true }
  },
  {
    name: "ขนมหวาน",
    icon: "🍰",
    groups: { veg: 0, starch: 0.5, protein: 0, fruit: 0, dairy: 0 },
    flags: { sweetSnack: true }
  }
];

const state = {
  entries: loadJson(STORAGE_KEYS.entries, {}),
  profile: { ...DEFAULT_PROFILE, ...loadJson(STORAGE_KEYS.profile, {}) },
  goals: normalizeGoals(loadJson(STORAGE_KEYS.goals, DEFAULT_GOALS)),
  dashboardDate: todayISO(),
  currentPhoto: "",
  editingOriginal: null,
  deferredInstallPrompt: null,
  toastTimer: null
};

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

const elements = {
  headerGreeting: $("#headerGreeting"),
  installButton: $("#installButton"),
  navButtons: $$(".nav-button"),
  routePanels: $$("[data-route-panel]"),
  dashboardDate: $("#dashboardDate"),
  scoreRing: $("#scoreRing"),
  scoreNumber: $("#scoreNumber"),
  scoreBadge: $("#scoreBadge"),
  scoreHeadline: $("#scoreHeadline"),
  suggestionList: $("#suggestionList"),
  waterCountLabel: $("#waterCountLabel"),
  waterCups: $("#waterCups"),
  nutrientGrid: $("#nutrientGrid"),
  mealBoard: $("#mealBoard"),
  mealForm: $("#mealForm"),
  editingId: $("#editingId"),
  mealDate: $("#mealDate"),
  mealType: $("#mealType"),
  mealName: $("#mealName"),
  mealPhoto: $("#mealPhoto"),
  photoPreview: $("#photoPreview"),
  aiMeta: $("#aiMeta"),
  removePhotoButton: $("#removePhotoButton"),
  templateButtons: $("#templateButtons"),
  portionControls: $("#portionControls"),
  flagSweetDrink: $("#flagSweetDrink"),
  flagFried: $("#flagFried"),
  flagSweetSnack: $("#flagSweetSnack"),
  mealNote: $("#mealNote"),
  saveMealButton: $("#saveMealButton"),
  resetMealButton: $("#resetMealButton"),
  previewVeg: $("#previewVeg"),
  previewStarch: $("#previewStarch"),
  previewProtein: $("#previewProtein"),
  platePreviewMessage: $("#platePreviewMessage"),
  historySummaryGrid: $("#historySummaryGrid"),
  historyChart: $("#historyChart"),
  historyList: $("#historyList"),
  exportCsvButton: $("#exportCsvButton"),
  exportJsonButton: $("#exportJsonButton"),
  printButton: $("#printButton"),
  profileForm: $("#profileForm"),
  profileName: $("#profileName"),
  profileGrade: $("#profileGrade"),
  profileSchool: $("#profileSchool"),
  goalsForm: $("#goalsForm"),
  goalWater: $("#goalWater"),
  goalFruit: $("#goalFruit"),
  goalDairy: $("#goalDairy"),
  demoDataButton: $("#demoDataButton"),
  importJsonInput: $("#importJsonInput"),
  clearDataButton: $("#clearDataButton"),
  toast: $("#toast"),
  confirmDialog: $("#confirmDialog"),
  confirmTitle: $("#confirmTitle"),
  confirmMessage: $("#confirmMessage")
};

function loadJson(key, fallback) {
  try {
    const raw = storageGetItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`อ่านข้อมูล ${key} ไม่สำเร็จ`, error);
    return fallback;
  }
}

function normalizeGoals(goals) {
  return {
    water: clampNumber(goals?.water, 1, 12, DEFAULT_GOALS.water),
    fruit: clampNumber(goals?.fruit, 0.5, 5, DEFAULT_GOALS.fruit),
    dairy: clampNumber(goals?.dairy, 0.5, 4, DEFAULT_GOALS.dairy)
  };
}

function clampNumber(value, min, max, fallback = min) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function roundHalf(value) {
  return Math.round(Number(value) * 2) / 2;
}

function formatPortion(value) {
  const number = Number(value) || 0;
  return Number.isInteger(number) ? String(number) : number.toFixed(1);
}

function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function addDays(dateString, amount) {
  const date = new Date(`${dateString}T12:00:00`);
  date.setDate(date.getDate() + amount);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function thaiDate(dateString, options = {}) {
  const date = new Date(`${dateString}T12:00:00`);
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: options.year ? "numeric" : undefined,
    weekday: options.weekday ? "short" : undefined
  }).format(date);
}

function safeId() {
  if (window.crypto?.randomUUID) return window.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isSafeImageDataUrl(value) {
  return typeof value === "string" && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(value);
}

function emptyDay() {
  return {
    water: 0,
    meals: {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: []
    }
  };
}

function normalizeDay(day) {
  const base = emptyDay();
  const normalized = {
    water: clampNumber(day?.water, 0, 20, 0),
    meals: {}
  };

  Object.keys(MEAL_TYPES).forEach((mealType) => {
    const items = Array.isArray(day?.meals?.[mealType]) ? day.meals[mealType] : [];
    normalized.meals[mealType] = items.map(normalizeEntry).filter(Boolean);
  });

  return { ...base, ...normalized };
}

function normalizeAiMetadata(ai) {
  if (!ai || typeof ai !== "object" || !ai.assisted) return null;
  const confidenceValues = new Set(["low", "medium", "high"]);
  const groups = {};
  Object.keys(FOOD_GROUPS).forEach((groupKey) => {
    groups[groupKey] = roundHalf(clampNumber(ai.groups?.[groupKey], 0, 6, 0));
  });

  return {
    assisted: true,
    userConfirmed: Boolean(ai.userConfirmed),
    confidence: confidenceValues.has(ai.confidence) ? ai.confidence : "low",
    mealName: String(ai.mealName || "").slice(0, 80),
    items: Array.isArray(ai.items)
      ? ai.items.slice(0, 12).map((item) => String(item || "").slice(0, 60)).filter(Boolean)
      : [],
    groups,
    analyzedAt: typeof ai.analyzedAt === "string" ? ai.analyzedAt : "",
    model: String(ai.model || "").slice(0, 50)
  };
}

function readAiMetadataFromForm() {
  if (!elements.aiMeta?.value) return null;
  try {
    return normalizeAiMetadata(JSON.parse(elements.aiMeta.value));
  } catch (error) {
    console.warn("อ่านข้อมูลผล AI ไม่สำเร็จ", error);
    return null;
  }
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") return null;
  const groups = {};
  Object.keys(FOOD_GROUPS).forEach((groupKey) => {
    groups[groupKey] = roundHalf(clampNumber(entry.groups?.[groupKey], 0, 6, 0));
  });

  return {
    id: typeof entry.id === "string" && entry.id ? entry.id : safeId(),
    name: String(entry.name || "อาหารไม่ระบุชื่อ").slice(0, 80),
    groups,
    flags: {
      sweetDrink: Boolean(entry.flags?.sweetDrink),
      fried: Boolean(entry.flags?.fried),
      sweetSnack: Boolean(entry.flags?.sweetSnack)
    },
    note: String(entry.note || "").slice(0, 180),
    photo: isSafeImageDataUrl(entry.photo) ? entry.photo : "",
    ai: normalizeAiMetadata(entry.ai),
    createdAt: typeof entry.createdAt === "string" ? entry.createdAt : new Date().toISOString()
  };
}

function getDay(dateString, create = false) {
  const existing = state.entries[dateString];
  if (existing) {
    const normalized = normalizeDay(existing);
    state.entries[dateString] = normalized;
    return normalized;
  }
  if (create) {
    state.entries[dateString] = emptyDay();
    return state.entries[dateString];
  }
  return emptyDay();
}

function persistEntries({ allowPhotoFallback = true } = {}) {
  const serialized = JSON.stringify(state.entries);
  const firstWrite = storageSetItem(STORAGE_KEYS.entries, serialized);
  if (firstWrite.persistent) return true;

  const errorName = firstWrite.error?.name || "";
  const isQuotaError = errorName === "QuotaExceededError" || errorName === "NS_ERROR_DOM_QUOTA_REACHED";

  if (isQuotaError && allowPhotoFallback) {
    const stripped = JSON.parse(JSON.stringify(state.entries));
    Object.values(stripped).forEach((day) => {
      Object.values(day?.meals || {}).forEach((entries) => {
        if (Array.isArray(entries)) entries.forEach((entry) => { entry.photo = ""; });
      });
    });
    state.entries = stripped;
    const secondWrite = storageSetItem(STORAGE_KEYS.entries, JSON.stringify(state.entries));
    if (secondWrite.persistent) {
      showToast("พื้นที่เก็บรูปเต็ม จึงบันทึกข้อมูลโดยไม่เก็บรูปภาพ");
      return true;
    }
  }

  if (!storageWarningShown) {
    storageWarningShown = true;
    showToast("เบราว์เซอร์นี้ไม่อนุญาตให้เก็บถาวร ข้อมูลจะอยู่ชั่วคราวจนกว่าจะปิดหน้า");
  }
  return true;
}

function persistProfile() {
  storageSetItem(STORAGE_KEYS.profile, JSON.stringify(state.profile));
}

function persistGoals() {
  storageSetItem(STORAGE_KEYS.goals, JSON.stringify(state.goals));
}

function aggregateDay(dateString) {
  const day = getDay(dateString);
  const totals = {
    veg: 0,
    starch: 0,
    protein: 0,
    fruit: 0,
    dairy: 0
  };
  const flags = { sweetDrink: 0, fried: 0, sweetSnack: 0 };
  let entryCount = 0;
  let mainMealCount = 0;

  Object.entries(day.meals).forEach(([mealType, entries]) => {
    if (MAIN_MEAL_TYPES.includes(mealType) && entries.length > 0) mainMealCount += 1;
    entries.forEach((entry) => {
      entryCount += 1;
      Object.keys(totals).forEach((groupKey) => {
        totals[groupKey] += Number(entry.groups?.[groupKey]) || 0;
      });
      Object.keys(flags).forEach((flagKey) => {
        if (entry.flags?.[flagKey]) flags[flagKey] += 1;
      });
    });
  });

  return {
    day,
    totals,
    flags,
    entryCount,
    mainMealCount
  };
}

function mealGroupTotals(entries) {
  const totals = { veg: 0, starch: 0, protein: 0, fruit: 0, dairy: 0 };
  entries.forEach((entry) => {
    Object.keys(totals).forEach((key) => {
      totals[key] += Number(entry.groups?.[key]) || 0;
    });
  });
  return totals;
}

function calculateScore(dateString) {
  const { day, totals, flags, entryCount, mainMealCount } = aggregateDay(dateString);
  if (entryCount === 0 && day.water === 0) {
    return { score: 0, totals, flags, entryCount, mainMealCount, breakdown: {} };
  }

  let mealBalance = 0;
  MAIN_MEAL_TYPES.forEach((mealType) => {
    const entries = day.meals[mealType];
    if (entries.length === 0) return;
    const groups = mealGroupTotals(entries);
    const vegScore = clamp(groups.veg / 2, 0, 1) * 8;
    const starchScore = clamp(groups.starch / 1, 0, 1) * 4;
    const proteinScore = clamp(groups.protein / 1, 0, 1) * 4;
    const varietyCount = [groups.veg, groups.starch, groups.protein].filter((value) => value > 0).length;
    const varietyScore = (varietyCount / 3) * 2;
    mealBalance += vegScore + starchScore + proteinScore + varietyScore;
  });

  const fruitScore = clamp(totals.fruit / state.goals.fruit, 0, 1) * 10;
  const dairyScore = clamp(totals.dairy / state.goals.dairy, 0, 1) * 8;
  const waterScore = clamp(day.water / state.goals.water, 0, 1) * 12;
  const regularityScore = clamp(mainMealCount / 3, 0, 1) * 8;
  const flagPenalty = Math.min(8, flags.sweetDrink * 2 + flags.fried + flags.sweetSnack);
  const choiceScore = entryCount > 0 ? 8 - flagPenalty : 0;

  const score = Math.round(clamp(
    mealBalance + fruitScore + dairyScore + waterScore + regularityScore + choiceScore,
    0,
    100
  ));

  return {
    score,
    totals,
    flags,
    entryCount,
    mainMealCount,
    breakdown: {
      mealBalance: Math.round(mealBalance),
      fruit: Math.round(fruitScore),
      dairy: Math.round(dairyScore),
      water: Math.round(waterScore),
      regularity: Math.round(regularityScore),
      choices: Math.round(choiceScore)
    }
  };
}

function scoreText(result, dateString) {
  const { score, totals, flags, entryCount, mainMealCount } = result;
  const day = getDay(dateString);

  let badge = "เริ่มบันทึกมื้อแรกกันเลย";
  let headline = "ทุกมื้อเล็ก ๆ นับเป็นก้าวที่ดี";

  if (entryCount > 0 || day.water > 0) {
    if (score >= 85) {
      badge = "นักกินดีดาวเขียว";
      headline = "วันนี้มีความหลากหลายและสมดุลดีมาก";
    } else if (score >= 70) {
      badge = "ใกล้จานสมดุลแล้ว";
      headline = "ทำได้ดี ลองเติมสิ่งที่ยังขาดอีกนิด";
    } else if (score >= 50) {
      badge = "กำลังสร้างนิสัยกินดี";
      headline = "ค่อย ๆ เติมความหลากหลายทีละมื้อ";
    } else {
      badge = "เริ่มต้นได้ดีแล้ว";
      headline = "ข้อมูลวันนี้ช่วยวางแผนมื้อต่อไปได้";
    }
  }

  const suggestions = [];
  if (mainMealCount < 3) suggestions.push(`ยังบันทึกมื้อหลัก ${mainMealCount}/3 มื้อ`);
  if (totals.veg < 6) suggestions.push("ลองเติมผักในมื้อต่อไป เช่น แตงกวา แครอท หรือผักใบเขียว");
  if (totals.protein < 3) suggestions.push("ลองเพิ่มโปรตีน เช่น ไข่ ปลา เต้าหู้ หรือเนื้อไม่ติดมัน");
  if (totals.fruit < state.goals.fruit) suggestions.push("ยังเติมผลไม้ได้อีกเล็กน้อยตามความเหมาะสม");
  if (totals.dairy < state.goals.dairy) suggestions.push("ลองเสริมนมหรืออาหารกลุ่มนมตามที่ผู้ปกครองเห็นว่าเหมาะสม");
  if (day.water < state.goals.water) suggestions.push(`ดื่มน้ำเปล่าแล้ว ${day.water}/${state.goals.water} แก้ว`);
  if (flags.sweetDrink > 0) suggestions.push("ครั้งถัดไปลองเลือกน้ำเปล่าแทนน้ำหวานหนึ่งครั้ง");

  if (score >= 85) {
    suggestions.unshift("ยอดเยี่ยม ลองเล่าให้ครอบครัวฟังว่าวันนี้จานไหนสมดุลที่สุด");
  }

  return { badge, headline, suggestions: suggestions.slice(0, 3) };
}

function targetsForDashboard() {
  return {
    veg: 6,
    starch: 3,
    protein: 3,
    fruit: state.goals.fruit,
    dairy: state.goals.dairy,
    water: state.goals.water
  };
}

function switchRoute(route, { updateHash = true, scroll = true } = {}) {
  const validRoutes = ["today", "record", "history", "learn", "settings"];
  const selected = validRoutes.includes(route) ? route : "today";

  elements.navButtons.forEach((button) => {
    const isActive = button.dataset.route === selected;
    button.classList.toggle("active", isActive);
    if (isActive) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });

  elements.routePanels.forEach((panel) => {
    const isActive = panel.dataset.routePanel === selected;
    panel.hidden = !isActive;
    panel.classList.toggle("active", isActive);
  });

  if (selected === "history") renderHistory();
  if (selected === "today") renderDashboard();
  if (selected === "settings") populateSettings();

  if (updateHash) history.replaceState(null, "", `#${selected}`);
  if (scroll) window.scrollTo({ top: 0, behavior: "smooth" });
}

function updateHeaderGreeting() {
  const name = state.profile.name.trim();
  elements.headerGreeting.textContent = name ? `สวัสดี ${name}` : "สวัสดี นักกินดี";
}

function renderDashboard() {
  elements.dashboardDate.value = state.dashboardDate;
  const result = calculateScore(state.dashboardDate);
  const text = scoreText(result, state.dashboardDate);

  elements.scoreNumber.textContent = result.score;
  elements.scoreRing.style.setProperty("--score-angle", `${result.score * 3.6}deg`);
  elements.scoreRing.setAttribute("aria-label", `คะแนนกินดี ${result.score} จาก 100`);
  elements.scoreBadge.textContent = text.badge;
  elements.scoreHeadline.textContent = text.headline;
  elements.suggestionList.innerHTML = text.suggestions.length
    ? text.suggestions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")
    : "<li>เริ่มจากบันทึกสิ่งที่กินจริง ไม่ต้องทำให้สมบูรณ์แบบ</li>";

  renderWaterTracker();
  renderNutrientGrid(result);
  renderMealBoard();
}

function renderWaterTracker() {
  const day = getDay(state.dashboardDate);
  const goal = state.goals.water;
  const displayCount = Math.max(8, goal);
  elements.waterCountLabel.textContent = `${day.water} / ${goal}`;
  elements.waterCups.innerHTML = "";

  for (let index = 1; index <= displayCount; index += 1) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `water-cup${index <= day.water ? " filled" : ""}`;
    button.dataset.cup = String(index);
    button.setAttribute("aria-label", `บันทึกน้ำ ${index} แก้ว`);
    button.setAttribute("aria-pressed", index <= day.water ? "true" : "false");
    button.textContent = "💧";
    elements.waterCups.appendChild(button);
  }
}

function renderNutrientGrid(result) {
  const targets = targetsForDashboard();
  const cards = [
    ...Object.entries(FOOD_GROUPS).map(([key, group]) => ({
      key,
      label: group.label,
      icon: group.icon,
      nutrient: group.nutrient,
      value: result.totals[key],
      target: targets[key]
    })),
    {
      key: "water",
      label: "น้ำเปล่า",
      icon: "💧",
      nutrient: "ช่วยให้ร่างกายสดชื่น",
      value: getDay(state.dashboardDate).water,
      target: targets.water
    }
  ];

  elements.nutrientGrid.innerHTML = cards.map((card) => {
    const percent = clamp((card.value / card.target) * 100, 0, 100);
    const unit = card.key === "water" ? "แก้ว" : "ส่วน";
    return `
      <article class="nutrient-card">
        <span class="nutrient-icon" aria-hidden="true">${card.icon}</span>
        <strong>${escapeHtml(card.label)}</strong>
        <p>${escapeHtml(card.nutrient)}</p>
        <div class="nutrient-value"><span>${formatPortion(card.value)} ${unit}</span><span>เป้า ${formatPortion(card.target)}</span></div>
        <div class="progress-track" aria-label="${escapeHtml(card.label)} ${Math.round(percent)} เปอร์เซ็นต์">
          <div class="progress-fill" style="width:${percent}%"></div>
        </div>
      </article>
    `;
  }).join("");
}

function renderMealBoard() {
  const day = getDay(state.dashboardDate);
  elements.mealBoard.innerHTML = "";

  Object.entries(MEAL_TYPES).forEach(([mealType, meta]) => {
    const column = document.createElement("article");
    column.className = "meal-column";
    const entries = day.meals[mealType];

    const header = document.createElement("div");
    header.className = "meal-column-header";
    header.innerHTML = `<h4>${meta.icon} ${escapeHtml(meta.label)}</h4><span class="meal-count">${entries.length}</span>`;
    column.appendChild(header);

    if (entries.length === 0) {
      const empty = document.createElement("button");
      empty.type = "button";
      empty.className = "meal-empty";
      empty.dataset.addMealType = mealType;
      empty.innerHTML = `<span aria-hidden="true">＋</span><strong>ยังไม่ได้บันทึก</strong><small>แตะเพื่อเพิ่ม</small>`;
      column.appendChild(empty);
    } else {
      entries.forEach((entry) => column.appendChild(createMealEntryElement(entry, mealType)));
    }

    elements.mealBoard.appendChild(column);
  });
}

function createMealEntryElement(entry, mealType) {
  const wrapper = document.createElement("article");
  wrapper.className = "meal-entry";

  if (isSafeImageDataUrl(entry.photo)) {
    const image = document.createElement("img");
    image.className = "meal-entry-photo";
    image.src = entry.photo;
    image.alt = `รูป ${entry.name}`;
    wrapper.appendChild(image);
  }

  const body = document.createElement("div");
  body.className = "meal-entry-body";

  const title = document.createElement("h5");
  title.textContent = entry.name;
  body.appendChild(title);

  const tags = document.createElement("div");
  tags.className = "group-tags";
  Object.entries(entry.groups).forEach(([groupKey, value]) => {
    if (value <= 0) return;
    const tag = document.createElement("span");
    tag.className = "group-tag";
    tag.textContent = `${FOOD_GROUPS[groupKey].icon} ${formatPortion(value)}`;
    tags.appendChild(tag);
  });
  if (entry.flags.sweetDrink) tags.appendChild(makeTag("🧋 น้ำหวาน"));
  if (entry.flags.fried) tags.appendChild(makeTag("🍟 ของทอด"));
  if (entry.flags.sweetSnack) tags.appendChild(makeTag("🍰 ขนมหวาน"));
  if (entry.ai?.assisted) {
    const confidenceLabel = { low: "ต่ำ", medium: "ปานกลาง", high: "สูง" }[entry.ai.confidence] || "";
    tags.appendChild(makeTag(`✨ AI ช่วยประเมิน${confidenceLabel ? ` • มั่นใจ${confidenceLabel}` : ""}`));
  }
  body.appendChild(tags);

  const actions = document.createElement("div");
  actions.className = "entry-actions";
  actions.innerHTML = `
    <button class="icon-button" type="button" data-edit-entry="${entry.id}" data-meal-type="${mealType}">แก้ไข</button>
    <button class="icon-button danger" type="button" data-delete-entry="${entry.id}" data-meal-type="${mealType}">ลบ</button>
  `;
  body.appendChild(actions);
  wrapper.appendChild(body);
  return wrapper;
}

function makeTag(text) {
  const tag = document.createElement("span");
  tag.className = "group-tag";
  tag.textContent = text;
  return tag;
}

function buildTemplateButtons() {
  elements.templateButtons.innerHTML = "";
  FOOD_TEMPLATES.forEach((template, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "template-button";
    button.dataset.templateIndex = String(index);
    button.textContent = `${template.icon} ${template.name}`;
    elements.templateButtons.appendChild(button);
  });
}

function buildPortionControls() {
  elements.portionControls.innerHTML = "";
  Object.entries(FOOD_GROUPS).forEach(([groupKey, group]) => {
    const card = document.createElement("div");
    card.className = "portion-card";
    card.innerHTML = `
      <span class="portion-icon" aria-hidden="true">${group.icon}</span>
      <strong>${escapeHtml(group.label)}</strong>
      <div class="stepper">
        <button class="step-button" type="button" data-step-group="${groupKey}" data-step="-0.5" aria-label="ลด${escapeHtml(group.label)}">−</button>
        <output class="step-value" id="portion-${groupKey}" data-portion-value="${groupKey}">0</output>
        <button class="step-button" type="button" data-step-group="${groupKey}" data-step="0.5" aria-label="เพิ่ม${escapeHtml(group.label)}">+</button>
      </div>
    `;
    elements.portionControls.appendChild(card);
  });
}

function getPortionsFromForm() {
  const portions = {};
  Object.keys(FOOD_GROUPS).forEach((key) => {
    portions[key] = Number($(`[data-portion-value="${key}"]`).dataset.value || 0);
  });
  return portions;
}

function setPortion(groupKey, value) {
  const output = $(`[data-portion-value="${groupKey}"]`);
  const normalized = roundHalf(clamp(value, 0, 6));
  output.dataset.value = String(normalized);
  output.value = formatPortion(normalized);
  output.textContent = formatPortion(normalized);
  renderPlatePreview();
}

function setAllPortions(groups = {}) {
  Object.keys(FOOD_GROUPS).forEach((key) => setPortion(key, groups[key] || 0));
}

function renderPlatePreview() {
  const portions = getPortionsFromForm();
  elements.previewVeg.textContent = formatPortion(portions.veg);
  elements.previewStarch.textContent = formatPortion(portions.starch);
  elements.previewProtein.textContent = formatPortion(portions.protein);

  if (portions.veg + portions.starch + portions.protein === 0) {
    elements.platePreviewMessage.textContent = "เริ่มเลือกหมู่อาหารจากภาพก่อนนะ";
    return;
  }

  const hasAll = portions.veg > 0 && portions.starch > 0 && portions.protein > 0;
  const closeToPlate = portions.veg >= 1.5 && portions.starch >= 0.5 && portions.protein >= 0.5;

  if (hasAll && closeToPlate) {
    elements.platePreviewMessage.textContent = "จานนี้มีองค์ประกอบหลักครบและใกล้เคียงจานสมดุล";
  } else if (!hasAll) {
    const missing = [];
    if (portions.veg === 0) missing.push("ผัก");
    if (portions.starch === 0) missing.push("ข้าว/แป้ง");
    if (portions.protein === 0) missing.push("โปรตีน");
    elements.platePreviewMessage.textContent = `จากภาพยังไม่พบ ${missing.join(" และ ")} ลองตรวจอีกครั้ง`;
  } else {
    elements.platePreviewMessage.textContent = "มีครบหลายกลุ่มแล้ว ปรับจำนวนส่วนให้ใกล้ภาพจริงได้เลย";
  }
}

function applyTemplate(template) {
  elements.mealName.value = template.name;
  setAllPortions(template.groups);
  elements.flagSweetDrink.checked = Boolean(template.flags?.sweetDrink);
  elements.flagFried.checked = Boolean(template.flags?.fried);
  elements.flagSweetSnack.checked = Boolean(template.flags?.sweetSnack);
  showToast("เติมค่าตัวอย่างแล้ว อย่าลืมปรับตามจานจริง");
}

function resetMealForm({ keepDate = true, keepMealType = false } = {}) {
  const date = elements.mealDate.value || state.dashboardDate || todayISO();
  const mealType = elements.mealType.value || "breakfast";
  elements.mealForm.reset();
  elements.editingId.value = "";
  state.editingOriginal = null;
  state.currentPhoto = "";
  if (elements.aiMeta) elements.aiMeta.value = "";
  window.dispatchEvent(new CustomEvent("kindee:ai-reset"));
  elements.mealDate.value = keepDate ? date : todayISO();
  elements.mealType.value = keepMealType ? mealType : "breakfast";
  setAllPortions({});
  renderPhotoPreview();
  elements.saveMealButton.textContent = "บันทึกมื้อนี้";
}

function renderPhotoPreview() {
  elements.photoPreview.innerHTML = "";
  if (isSafeImageDataUrl(state.currentPhoto)) {
    const image = document.createElement("img");
    image.src = state.currentPhoto;
    image.alt = "ตัวอย่างรูปอาหารที่เลือก";
    elements.photoPreview.appendChild(image);
    elements.removePhotoButton.classList.remove("hidden");
  } else {
    elements.photoPreview.innerHTML = "<span aria-hidden=\"true\">📷</span><p>ยังไม่มีรูปอาหาร</p>";
    elements.removePhotoButton.classList.add("hidden");
  }
}

async function compressImage(file) {
  if (!file || !file.type.startsWith("image/")) {
    throw new Error("กรุณาเลือกไฟล์รูปภาพ");
  }

  if (file.size > 12 * 1024 * 1024) {
    throw new Error("รูปมีขนาดใหญ่เกิน 12 MB กรุณาเลือกรูปที่เล็กลง");
  }

  const imageSource = await fileToImage(file);
  const maxSide = 480;
  const scale = Math.min(1, maxSide / Math.max(imageSource.width, imageSource.height));
  const width = Math.max(1, Math.round(imageSource.width * scale));
  const height = Math.max(1, Math.round(imageSource.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d", { alpha: false });
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.drawImage(imageSource, 0, 0, width, height);
  if (typeof imageSource.close === "function") imageSource.close();
  return canvas.toDataURL("image/jpeg", 0.67);
}

async function fileToImage(file) {
  if ("createImageBitmap" in window) {
    return createImageBitmap(file, { imageOrientation: "from-image" });
  }

  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("อ่านรูปไม่สำเร็จ"));
    reader.readAsDataURL(file);
  });

  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("เปิดรูปไม่สำเร็จ"));
    image.src = dataUrl;
  });
}

function saveMeal(event) {
  event.preventDefault();
  const date = elements.mealDate.value;
  const mealType = elements.mealType.value;
  const name = elements.mealName.value.trim();

  if (!date || !MEAL_TYPES[mealType]) {
    showToast("กรุณาเลือกวันที่และมื้ออาหาร");
    return;
  }

  if (!name) {
    elements.mealName.focus();
    showToast("กรุณาใส่ชื่อเมนูหรืออาหาร");
    return;
  }

  const wasEditing = Boolean(state.editingOriginal);
  const entry = normalizeEntry({
    id: elements.editingId.value || safeId(),
    name,
    groups: getPortionsFromForm(),
    flags: {
      sweetDrink: elements.flagSweetDrink.checked,
      fried: elements.flagFried.checked,
      sweetSnack: elements.flagSweetSnack.checked
    },
    note: elements.mealNote.value.trim(),
    photo: state.currentPhoto,
    ai: readAiMetadataFromForm(),
    createdAt: new Date().toISOString()
  });

  if (state.editingOriginal) {
    const oldDay = getDay(state.editingOriginal.date, true);
    oldDay.meals[state.editingOriginal.mealType] = oldDay.meals[state.editingOriginal.mealType]
      .filter((item) => item.id !== state.editingOriginal.id);
  }

  const day = getDay(date, true);
  day.meals[mealType].push(entry);
  if (!persistEntries()) return;

  state.dashboardDate = date;
  resetMealForm({ keepDate: true, keepMealType: true });
  renderDashboard();
  renderHistory();
  switchRoute("today");
  showToast(wasEditing ? "แก้ไขมื้ออาหารแล้ว" : "บันทึกมื้ออาหารแล้ว");
}

function startNewMeal(mealType = "breakfast") {
  resetMealForm({ keepDate: false });
  elements.mealDate.value = state.dashboardDate;
  elements.mealType.value = MEAL_TYPES[mealType] ? mealType : "breakfast";
  switchRoute("record");
  setTimeout(() => elements.mealName.focus(), 250);
}

function editEntry(date, mealType, entryId) {
  const day = getDay(date);
  const entry = day.meals[mealType]?.find((item) => item.id === entryId);
  if (!entry) {
    showToast("ไม่พบรายการที่ต้องการแก้ไข");
    return;
  }

  elements.editingId.value = entry.id;
  state.editingOriginal = { date, mealType, id: entry.id };
  elements.mealDate.value = date;
  elements.mealType.value = mealType;
  elements.mealName.value = entry.name;
  setAllPortions(entry.groups);
  elements.flagSweetDrink.checked = entry.flags.sweetDrink;
  elements.flagFried.checked = entry.flags.fried;
  elements.flagSweetSnack.checked = entry.flags.sweetSnack;
  elements.mealNote.value = entry.note;
  state.currentPhoto = entry.photo || "";
  if (elements.aiMeta) elements.aiMeta.value = entry.ai ? JSON.stringify(entry.ai) : "";
  renderPhotoPreview();
  elements.saveMealButton.textContent = "บันทึกการแก้ไข";
  switchRoute("record");
  window.dispatchEvent(new CustomEvent("kindee:ai-load", { detail: entry.ai || null }));
}

async function deleteEntry(date, mealType, entryId) {
  const day = getDay(date);
  const entry = day.meals[mealType]?.find((item) => item.id === entryId);
  if (!entry) return;

  const confirmed = await askConfirm("ลบรายการอาหาร", `ต้องการลบ “${entry.name}” หรือไม่?`);
  if (!confirmed) return;

  day.meals[mealType] = day.meals[mealType].filter((item) => item.id !== entryId);
  persistEntries();
  renderDashboard();
  renderHistory();
  showToast("ลบรายการแล้ว");
}

function setWater(cup) {
  const day = getDay(state.dashboardDate, true);
  const selected = clampNumber(cup, 0, 20, 0);
  day.water = day.water === selected ? Math.max(0, selected - 1) : selected;
  persistEntries();
  renderDashboard();
  renderHistory();
}

function lastSevenDates(base = todayISO()) {
  return Array.from({ length: 7 }, (_, index) => addDays(base, index - 6));
}

function renderHistory() {
  const dates = lastSevenDates();
  const rows = dates.map((date) => {
    const result = calculateScore(date);
    const day = getDay(date);
    const hasData = result.entryCount > 0 || day.water > 0;
    return { date, result, day, hasData };
  });

  const recorded = rows.filter((row) => row.hasData);
  const scores = recorded.map((row) => row.result.score);
  const average = scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : 0;
  const best = scores.length ? Math.max(...scores) : 0;
  const mealCount = recorded.reduce((sum, row) => sum + row.result.entryCount, 0);
  const waterTotal = recorded.reduce((sum, row) => sum + row.day.water, 0);

  const stats = [
    ["วันที่บันทึก", `${recorded.length}/7 วัน`],
    ["คะแนนเฉลี่ย", `${average}`],
    ["คะแนนสูงสุด", `${best}`],
    ["มื้อ / แก้วน้ำ", `${mealCount} / ${waterTotal}`]
  ];

  elements.historySummaryGrid.innerHTML = stats.map(([label, value]) => `
    <article class="history-stat"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>
  `).join("");

  drawHistoryChart(rows);
  elements.historyList.innerHTML = rows.slice().reverse().map((row) => {
    const groups = row.result.totals;
    const summary = row.hasData
      ? `มื้อ ${row.result.entryCount} รายการ • ผัก ${formatPortion(groups.veg)} • โปรตีน ${formatPortion(groups.protein)} • น้ำ ${row.day.water} แก้ว`
      : "ยังไม่มีข้อมูล";
    return `
      <article class="history-day">
        <div class="history-day-date"><strong>${escapeHtml(thaiDate(row.date, { weekday: true }))}</strong><span>${row.date}</span></div>
        <div class="history-score">${row.hasData ? row.result.score : "—"}</div>
        <div class="history-detail"><strong>${row.hasData ? scoreText(row.result, row.date).badge : "ยังไม่ได้บันทึก"}</strong><br>${escapeHtml(summary)}</div>
      </article>
    `;
  }).join("");
}

function drawHistoryChart(rows) {
  const canvas = elements.historyChart;
  if (!canvas) return;
  const cssWidth = Math.max(660, canvas.parentElement.clientWidth || 660);
  const cssHeight = 330;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(cssWidth * dpr);
  canvas.height = Math.round(cssHeight * dpr);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, cssWidth, cssHeight);

  const padding = { top: 24, right: 18, bottom: 54, left: 46 };
  const chartWidth = cssWidth - padding.left - padding.right;
  const chartHeight = cssHeight - padding.top - padding.bottom;

  ctx.font = "12px system-ui, sans-serif";
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#64726a";
  ctx.strokeStyle = "#dbe8dc";
  ctx.lineWidth = 1;

  [0, 25, 50, 75, 100].forEach((value) => {
    const y = padding.top + chartHeight - (value / 100) * chartHeight;
    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(cssWidth - padding.right, y);
    ctx.stroke();
    ctx.fillText(String(value), padding.left - 8, y);
  });

  const gap = Math.max(10, chartWidth * 0.02);
  const barWidth = Math.max(34, (chartWidth - gap * (rows.length - 1)) / rows.length);

  rows.forEach((row, index) => {
    const x = padding.left + index * (barWidth + gap);
    const score = row.hasData ? row.result.score : 0;
    const barHeight = Math.max(row.hasData ? 4 : 0, (score / 100) * chartHeight);
    const y = padding.top + chartHeight - barHeight;

    if (row.hasData) {
      ctx.fillStyle = score >= 80 ? "#2f8f5b" : score >= 55 ? "#f7b847" : "#78b9da";
      roundedRect(ctx, x, y, barWidth, barHeight, 10);
      ctx.fill();
      ctx.fillStyle = "#1f3026";
      ctx.textAlign = "center";
      ctx.textBaseline = "bottom";
      ctx.font = "700 12px system-ui, sans-serif";
      ctx.fillText(String(score), x + barWidth / 2, Math.max(14, y - 5));
    } else {
      ctx.strokeStyle = "#cfded1";
      ctx.setLineDash([4, 4]);
      roundedRect(ctx, x, padding.top + chartHeight - 8, barWidth, 8, 5);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = "#64726a";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(thaiDate(row.date, { weekday: true }).split(" ")[0], x + barWidth / 2, padding.top + chartHeight + 10);
  });
}

function roundedRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function exportCsv() {
  const header = [
    "date", "meal", "menu", "vegetable_portion", "starch_portion", "protein_portion",
    "fruit_portion", "dairy_portion", "sweet_drink", "fried_food", "sweet_snack",
    "ai_assisted", "ai_confidence", "ai_items", "water_cups", "daily_score", "note"
  ];
  const lines = [header.join(",")];

  Object.keys(state.entries).sort().forEach((date) => {
    const day = getDay(date);
    const score = calculateScore(date).score;
    Object.entries(day.meals).forEach(([mealType, entries]) => {
      entries.forEach((entry) => {
        const row = [
          date,
          MEAL_TYPES[mealType].label,
          entry.name,
          entry.groups.veg,
          entry.groups.starch,
          entry.groups.protein,
          entry.groups.fruit,
          entry.groups.dairy,
          entry.flags.sweetDrink ? 1 : 0,
          entry.flags.fried ? 1 : 0,
          entry.flags.sweetSnack ? 1 : 0,
          entry.ai?.assisted ? 1 : 0,
          entry.ai?.confidence || "",
          entry.ai?.items?.join(" | ") || "",
          day.water,
          score,
          entry.note
        ];
        lines.push(row.map(csvCell).join(","));
      });
    });

    if (Object.values(day.meals).every((entries) => entries.length === 0) && day.water > 0) {
      const row = [date, "water_only", "", 0, 0, 0, 0, 0, 0, 0, 0, 0, "", "", day.water, score, ""];
      lines.push(row.map(csvCell).join(","));
    }
  });

  downloadBlob(`kindee-data-${todayISO()}.csv`, `\ufeff${lines.join("\n")}`, "text/csv;charset=utf-8");
  showToast("ส่งออกไฟล์ CSV แล้ว");
}

function csvCell(value) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function exportJson() {
  const backup = {
    app: "kindee-kids",
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: state.profile,
    goals: state.goals,
    entries: state.entries
  };
  downloadBlob(
    `kindee-backup-${todayISO()}.json`,
    JSON.stringify(backup, null, 2),
    "application/json;charset=utf-8"
  );
  showToast("สำรองข้อมูล JSON แล้ว");
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importJson(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const entriesSource = data?.entries && typeof data.entries === "object" ? data.entries : data;
    const importedEntries = {};

    Object.entries(entriesSource || {}).forEach(([date, day]) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(date)) importedEntries[date] = normalizeDay(day);
    });

    if (Object.keys(importedEntries).length === 0) throw new Error("ไม่พบข้อมูลวันที่ที่ใช้ได้");

    const confirmed = await askConfirm("นำเข้าข้อมูล", "ข้อมูลที่นำเข้าจะรวมกับข้อมูลปัจจุบัน ต้องการดำเนินการหรือไม่?");
    if (!confirmed) return;

    state.entries = { ...state.entries, ...importedEntries };
    if (data.profile) state.profile = { ...DEFAULT_PROFILE, ...data.profile };
    if (data.goals) state.goals = normalizeGoals(data.goals);
    persistEntries();
    persistProfile();
    persistGoals();
    updateHeaderGreeting();
    populateSettings();
    renderDashboard();
    renderHistory();
    showToast("นำเข้าข้อมูลเรียบร้อยแล้ว");
  } catch (error) {
    console.error(error);
    showToast(`นำเข้าไม่สำเร็จ: ${error.message}`);
  } finally {
    elements.importJsonInput.value = "";
  }
}

function populateSettings() {
  elements.profileName.value = state.profile.name || "";
  elements.profileGrade.value = state.profile.grade || "";
  elements.profileSchool.value = state.profile.school || "";
  elements.goalWater.value = state.goals.water;
  elements.goalFruit.value = state.goals.fruit;
  elements.goalDairy.value = state.goals.dairy;
}

function saveProfile(event) {
  event.preventDefault();
  state.profile = {
    name: elements.profileName.value.trim().slice(0, 30),
    grade: elements.profileGrade.value,
    school: elements.profileSchool.value.trim().slice(0, 80)
  };
  persistProfile();
  updateHeaderGreeting();
  showToast("บันทึกโปรไฟล์แล้ว");
}

function saveGoals(event) {
  event.preventDefault();
  state.goals = normalizeGoals({
    water: elements.goalWater.value,
    fruit: elements.goalFruit.value,
    dairy: elements.goalDairy.value
  });
  persistGoals();
  populateSettings();
  renderDashboard();
  renderHistory();
  showToast("บันทึกเป้าหมายแล้ว");
}

async function addDemoData() {
  const confirmed = await askConfirm("ใส่ข้อมูลตัวอย่าง", "ระบบจะเพิ่มข้อมูลตัวอย่างย้อนหลัง 7 วันเพื่อใช้ทดลองกราฟ ต้องการดำเนินการหรือไม่?");
  if (!confirmed) return;

  const dates = lastSevenDates();
  dates.forEach((date, index) => {
    const day = emptyDay();
    const varyingVeg = 0.5 + (index % 4) * 0.5;
    day.water = 3 + (index % 5);
    day.meals.breakfast.push(normalizeEntry({
      name: index % 2 ? "ข้าวต้มปลา" : "นมและผลไม้",
      groups: index % 2
        ? { veg: 0.5, starch: 1, protein: 1, fruit: 0, dairy: 0 }
        : { veg: 0, starch: 0.5, protein: 0, fruit: 1, dairy: 1 },
      flags: {}
    }));
    day.meals.lunch.push(normalizeEntry({
      name: "ข้าว ผัดผัก และไข่",
      groups: { veg: varyingVeg, starch: 1, protein: 1, fruit: 0, dairy: 0 },
      flags: { fried: index === 1 || index === 4 }
    }));
    if (index > 1) {
      day.meals.dinner.push(normalizeEntry({
        name: "ข้าวและแกงจืดเต้าหู้",
        groups: { veg: 1.5, starch: 1, protein: 1, fruit: index % 3 === 0 ? 1 : 0, dairy: 0 },
        flags: {}
      }));
    }
    if (index % 2 === 0) {
      day.meals.snack.push(normalizeEntry({
        name: "ผลไม้",
        groups: { veg: 0, starch: 0, protein: 0, fruit: 1, dairy: 0 },
        flags: {}
      }));
    }
    state.entries[date] = day;
  });

  persistEntries();
  state.dashboardDate = todayISO();
  renderDashboard();
  renderHistory();
  switchRoute("history");
  showToast("เพิ่มข้อมูลตัวอย่างแล้ว");
}

async function clearAllData() {
  const confirmed = await askConfirm(
    "ล้างข้อมูลทั้งหมด",
    "รายการอาหาร รูปภาพ โปรไฟล์ และเป้าหมายทั้งหมดในอุปกรณ์นี้จะถูกลบ การกระทำนี้ย้อนกลับไม่ได้"
  );
  if (!confirmed) return;

  state.entries = {};
  state.profile = { ...DEFAULT_PROFILE };
  state.goals = { ...DEFAULT_GOALS };
  state.dashboardDate = todayISO();
  Object.values(STORAGE_KEYS).forEach((key) => storageRemoveItem(key));
  resetMealForm({ keepDate: false });
  updateHeaderGreeting();
  populateSettings();
  renderDashboard();
  renderHistory();
  showToast("ล้างข้อมูลทั้งหมดแล้ว");
}

function showToast(message) {
  clearTimeout(state.toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  state.toastTimer = setTimeout(() => elements.toast.classList.remove("show"), 3200);
}

function askConfirm(title, message) {
  if (!elements.confirmDialog?.showModal) {
    return Promise.resolve(window.confirm(message));
  }

  elements.confirmTitle.textContent = title;
  elements.confirmMessage.textContent = message;
  elements.confirmDialog.returnValue = "";
  elements.confirmDialog.showModal();

  return new Promise((resolve) => {
    elements.confirmDialog.addEventListener("close", () => {
      resolve(elements.confirmDialog.returnValue === "confirm");
    }, { once: true });
  });
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => switchRoute(button.dataset.route));
  });

  $$('[data-go-record]').forEach((button) => {
    button.addEventListener("click", () => startNewMeal());
  });

  elements.dashboardDate.addEventListener("change", () => {
    state.dashboardDate = elements.dashboardDate.value || todayISO();
    renderDashboard();
  });

  elements.waterCups.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cup]");
    if (button) setWater(button.dataset.cup);
  });

  elements.mealBoard.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-meal-type]");
    if (add) {
      startNewMeal(add.dataset.addMealType);
      return;
    }

    const edit = event.target.closest("[data-edit-entry]");
    if (edit) {
      editEntry(state.dashboardDate, edit.dataset.mealType, edit.dataset.editEntry);
      return;
    }

    const remove = event.target.closest("[data-delete-entry]");
    if (remove) deleteEntry(state.dashboardDate, remove.dataset.mealType, remove.dataset.deleteEntry);
  });

  elements.templateButtons.addEventListener("click", (event) => {
    const button = event.target.closest("[data-template-index]");
    if (!button) return;
    applyTemplate(FOOD_TEMPLATES[Number(button.dataset.templateIndex)]);
  });

  elements.portionControls.addEventListener("click", (event) => {
    const button = event.target.closest("[data-step-group]");
    if (!button) return;
    const output = $(`[data-portion-value="${button.dataset.stepGroup}"]`);
    const current = Number(output.dataset.value || 0);
    setPortion(button.dataset.stepGroup, current + Number(button.dataset.step));
  });

  elements.mealPhoto.addEventListener("change", async () => {
    const file = elements.mealPhoto.files?.[0];
    if (!file) return;
    try {
      showToast("กำลังย่อรูปเพื่อประหยัดพื้นที่...");
      state.currentPhoto = await compressImage(file);
      renderPhotoPreview();
      showToast("เพิ่มรูปอาหารแล้ว");
    } catch (error) {
      showToast(error.message);
    } finally {
      elements.mealPhoto.value = "";
    }
  });

  elements.removePhotoButton.addEventListener("click", () => {
    state.currentPhoto = "";
    renderPhotoPreview();
  });

  elements.mealForm.addEventListener("submit", saveMeal);
  elements.resetMealButton.addEventListener("click", () => resetMealForm({ keepDate: true, keepMealType: true }));
  elements.exportCsvButton.addEventListener("click", exportCsv);
  elements.exportJsonButton.addEventListener("click", exportJson);
  elements.printButton.addEventListener("click", () => window.print());
  elements.profileForm.addEventListener("submit", saveProfile);
  elements.goalsForm.addEventListener("submit", saveGoals);
  elements.demoDataButton.addEventListener("click", addDemoData);
  elements.clearDataButton.addEventListener("click", clearAllData);
  elements.importJsonInput.addEventListener("change", () => importJson(elements.importJsonInput.files?.[0]));

  window.addEventListener("resize", () => {
    const active = $(".nav-button.active")?.dataset.route;
    if (active === "history") renderHistory();
  });

  window.addEventListener("hashchange", () => {
    const route = location.hash.replace("#", "");
    switchRoute(route, { updateHash: false, scroll: false });
  });

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    state.deferredInstallPrompt = event;
    elements.installButton.classList.remove("hidden");
  });

  elements.installButton.addEventListener("click", async () => {
    if (!state.deferredInstallPrompt) return;
    state.deferredInstallPrompt.prompt();
    await state.deferredInstallPrompt.userChoice;
    state.deferredInstallPrompt = null;
    elements.installButton.classList.add("hidden");
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    navigator.serviceWorker.register("./sw.js").catch((error) => {
      console.warn("ลงทะเบียนโหมดออฟไลน์ไม่สำเร็จ", error);
    });
  }
}

function init() {
  // ทำความสะอาดข้อมูลเดิมให้เข้ารูปแบบล่าสุด
  const normalizedEntries = {};
  Object.entries(state.entries || {}).forEach(([date, day]) => {
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) normalizedEntries[date] = normalizeDay(day);
  });
  state.entries = normalizedEntries;

  buildTemplateButtons();
  buildPortionControls();
  elements.dashboardDate.value = state.dashboardDate;
  elements.mealDate.value = state.dashboardDate;
  setAllPortions({});
  renderPhotoPreview();
  populateSettings();
  updateHeaderGreeting();
  bindEvents();
  renderDashboard();
  renderHistory();

  const initialRoute = location.hash.replace("#", "") || "today";
  switchRoute(initialRoute, { updateHash: false, scroll: false });
  registerServiceWorker();
}

init();
