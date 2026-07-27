"use strict";

/*
  กินดี Kids — โมดูล AI ช่วยอ่านภาพอาหาร
  ---------------------------------------
  - AI เสนอชื่ออาหารและจำนวนส่วนของอาหาร 5 กลุ่ม
  - ผู้ใช้ต้องตรวจ/แก้ก่อนบันทึก
  - สารอาหารคำนวณเป็น “ช่วงประมาณ” จากหน่วยส่วนอาหารในเบราว์เซอร์
  - ไม่ส่งข้อมูลโปรไฟล์ ชื่อ ระดับชั้น หรือโรงเรียนไปยัง API
*/

(() => {
  const GROUP_KEYS = ["veg", "starch", "protein", "fruit", "dairy"];
  const GROUP_META = {
    veg: { label: "ผัก", icon: "🥬" },
    starch: { label: "ข้าว/แป้ง", icon: "🍚" },
    protein: { label: "โปรตีน", icon: "🥚" },
    fruit: { label: "ผลไม้", icon: "🍊" },
    dairy: { label: "นม", icon: "🥛" },
    other: { label: "อื่น ๆ", icon: "🍽️" }
  };

  /*
    ช่วงสารอาหารต่อ 1 “ส่วน” เป็นค่ากว้างเพื่อการเรียนรู้
    จุดประสงค์คือหลีกเลี่ยงความแม่นยำลวงจากภาพเพียงภาพเดียว
  */
  const EXCHANGE_RANGES = {
    veg: {
      kcal: [15, 35], carbs: [3, 7], protein: [1, 3], fat: [0, 1], fiber: [1, 3.5]
    },
    starch: {
      kcal: [70, 105], carbs: [15, 22], protein: [1, 4], fat: [0, 3], fiber: [0.5, 2.5]
    },
    protein: {
      kcal: [55, 135], carbs: [0, 5], protein: [7, 13], fat: [1, 10], fiber: [0, 1]
    },
    fruit: {
      kcal: [40, 90], carbs: [10, 22], protein: [0, 2], fat: [0, 1], fiber: [1, 4]
    },
    dairy: {
      kcal: [80, 170], carbs: [8, 18], protein: [5, 10], fat: [0, 10], fiber: [0, 0]
    }
  };

  const CONFIDENCE_LABELS = {
    low: "ต่ำ — ควรตรวจละเอียด",
    medium: "ปานกลาง — ตรวจและแก้ได้",
    high: "สูง — ยังต้องตรวจซ้ำ"
  };

  const elements = {
    photoPreview: document.querySelector("#photoPreview"),
    consent: document.querySelector("#aiPrivacyConsent"),
    analyzeButton: document.querySelector("#analyzePhotoButton"),
    clearButton: document.querySelector("#clearAiButton"),
    status: document.querySelector("#aiStatus"),
    result: document.querySelector("#aiResult"),
    aiMeta: document.querySelector("#aiMeta"),
    mealType: document.querySelector("#mealType"),
    mealName: document.querySelector("#mealName"),
    flagSweetDrink: document.querySelector("#flagSweetDrink"),
    flagFried: document.querySelector("#flagFried"),
    flagSweetSnack: document.querySelector("#flagSweetSnack")
  };

  let currentAnalysis = null;
  let isBusy = false;
  let lastPhotoSource = "";

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(value, min, max) {
    const number = Number(value);
    if (!Number.isFinite(number)) return min;
    return Math.min(max, Math.max(min, number));
  }

  function roundHalf(value) {
    return Math.round(clamp(value, 0, 6) * 2) / 2;
  }

  function formatNumber(value, digits = 0) {
    return new Intl.NumberFormat("th-TH", {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0
    }).format(value);
  }

  function getPhotoSource() {
    const image = elements.photoPreview?.querySelector("img");
    const source = image?.src || "";
    return /^data:image\/(?:jpeg|png|webp);base64,/i.test(source) ? source : "";
  }

  function getAiEndpoint() {
    const configured = String(window.KINDEE_CONFIG?.aiEndpoint || "").trim();
    if (configured && !configured.includes("YOUR-PROJECT")) return configured;

    if (location.protocol === "file:") return "";
    if (location.hostname.endsWith("github.io")) return "";
    return `${location.origin}/api/analyze-food`;
  }

  function setStatus(message, tone = "neutral") {
    if (!elements.status) return;
    elements.status.textContent = message;
    elements.status.dataset.tone = tone;
  }

  function updateButtonState() {
    const hasPhoto = Boolean(getPhotoSource());
    const consented = Boolean(elements.consent?.checked);
    if (elements.analyzeButton) {
      elements.analyzeButton.disabled = isBusy || !hasPhoto || !consented;
      elements.analyzeButton.setAttribute("aria-busy", isBusy ? "true" : "false");
    }
  }

  function clearAnalysis({ keepStatus = false, clearMeta = true } = {}) {
    currentAnalysis = null;
    if (elements.result) {
      elements.result.innerHTML = "";
      elements.result.classList.add("hidden");
    }
    elements.clearButton?.classList.add("hidden");
    if (clearMeta && elements.aiMeta) elements.aiMeta.value = "";

    if (!keepStatus) {
      const hasPhoto = Boolean(getPhotoSource());
      setStatus(
        hasPhoto
          ? "ยืนยันว่ารูปมีเฉพาะอาหาร แล้วกดวิเคราะห์ด้วย AI"
          : "เพิ่มรูปอาหารและยืนยันความเป็นส่วนตัวก่อนเริ่มวิเคราะห์",
        "neutral"
      );
    }
    updateButtonState();
  }

  function handlePhotoMutation() {
    const source = getPhotoSource();
    if (source !== lastPhotoSource) {
      lastPhotoSource = source;
      clearAnalysis();
    } else {
      updateButtonState();
    }
  }

  function normalizeGroups(groups) {
    const normalized = {};
    GROUP_KEYS.forEach((key) => {
      normalized[key] = roundHalf(groups?.[key] || 0);
    });
    return normalized;
  }

  function normalizeAnalysis(raw) {
    if (!raw || typeof raw !== "object") throw new Error("รูปแบบผลวิเคราะห์ไม่ถูกต้อง");

    const confidence = ["low", "medium", "high"].includes(raw.overall_confidence)
      ? raw.overall_confidence
      : "low";

    const visibleItems = Array.isArray(raw.visible_items)
      ? raw.visible_items.slice(0, 12).map((item) => ({
          name: String(item?.name_th || "อาหารที่มองเห็น").slice(0, 70),
          group: GROUP_META[item?.group] ? item.group : "other",
          portion: roundHalf(item?.portion || 0),
          confidence: ["low", "medium", "high"].includes(item?.confidence)
            ? item.confidence
            : "low"
        }))
      : [];

    return {
      isFood: Boolean(raw.is_food),
      mealName: String(raw.meal_name_th || "อาหารจากภาพ").slice(0, 80),
      visibleItems,
      groups: normalizeGroups(raw.groups),
      flags: {
        sweetDrink: Boolean(raw.flags?.sweet_drink),
        fried: Boolean(raw.flags?.fried),
        sweetSnack: Boolean(raw.flags?.sweet_snack)
      },
      confidence,
      uncertainties: Array.isArray(raw.uncertainties)
        ? raw.uncertainties.slice(0, 6).map((item) => String(item || "").slice(0, 150)).filter(Boolean)
        : [],
      childMessage: String(raw.child_message_th || "ตรวจผล AI แล้วปรับให้ตรงกับจานจริงก่อนบันทึก").slice(0, 220),
      model: String(raw._meta?.model || "").slice(0, 50),
      analyzedAt: String(raw._meta?.generatedAt || new Date().toISOString())
    };
  }

  function estimateNutrition(groups) {
    const totals = {
      kcal: [0, 0],
      carbs: [0, 0],
      protein: [0, 0],
      fat: [0, 0],
      fiber: [0, 0]
    };

    GROUP_KEYS.forEach((groupKey) => {
      const portion = clamp(groups[groupKey], 0, 6);
      const range = EXCHANGE_RANGES[groupKey];
      Object.keys(totals).forEach((nutrient) => {
        totals[nutrient][0] += range[nutrient][0] * portion;
        totals[nutrient][1] += range[nutrient][1] * portion;
      });
    });

    Object.values(totals).forEach((range) => {
      range[0] = Math.max(0, Math.round(range[0]));
      range[1] = Math.max(range[0], Math.round(range[1]));
    });
    return totals;
  }

  function nutrientHighlights(groups) {
    const highlights = [];
    if (groups.starch > 0) highlights.push("คาร์โบไฮเดรตและพลังงาน");
    if (groups.protein > 0) highlights.push("โปรตีน");
    if (groups.veg > 0 || groups.fruit > 0) highlights.push("ใยอาหาร วิตามิน และแร่ธาตุ");
    if (groups.dairy > 0) highlights.push("แคลเซียมและโปรตีนจากนม");
    return highlights.length ? highlights.join(" • ") : "ยังประเมินสารอาหารเด่นไม่ได้จากภาพนี้";
  }

  function confidenceBadge(confidence) {
    const label = CONFIDENCE_LABELS[confidence] || CONFIDENCE_LABELS.low;
    return `<span class="ai-confidence ai-confidence-${escapeHtml(confidence)}">ความมั่นใจ ${escapeHtml(label)}</span>`;
  }

  function renderAnalysis(analysis, { saved = false } = {}) {
    currentAnalysis = analysis;
    if (!elements.result) return;

    if (!analysis.isFood) {
      elements.result.innerHTML = `
        <div class="ai-empty-result">
          <span aria-hidden="true">🔎</span>
          <div>
            <strong>AI ยังไม่เห็นอาหารชัดพอ</strong>
            <p>ลองถ่ายใหม่ให้เห็นจานเต็ม ภาพสว่าง และไม่มีสิ่งอื่นบังอาหาร แล้ววิเคราะห์อีกครั้ง</p>
          </div>
        </div>
      `;
      elements.result.classList.remove("hidden");
      elements.clearButton?.classList.remove("hidden");
      setStatus("ยังไม่พบอาหารที่วิเคราะห์ได้อย่างน่าเชื่อถือ", "warning");
      return;
    }

    const nutrition = estimateNutrition(analysis.groups);
    const itemRows = analysis.visibleItems.length
      ? analysis.visibleItems.map((item) => {
          const group = GROUP_META[item.group] || GROUP_META.other;
          return `
            <li>
              <span>${group.icon}</span>
              <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(group.label)} • ประมาณ ${formatNumber(item.portion, 1)} ส่วน</small></div>
              <span class="ai-item-confidence">${escapeHtml(item.confidence === "high" ? "สูง" : item.confidence === "medium" ? "กลาง" : "ต่ำ")}</span>
            </li>
          `;
        }).join("")
      : `<li><span>🍽️</span><div><strong>ไม่มีรายการอาหารแยกชิ้น</strong><small>ตรวจจากภาพด้วยตนเองก่อนบันทึก</small></div></li>`;

    const groupChips = GROUP_KEYS.map((key) => {
      const meta = GROUP_META[key];
      return `<span class="ai-group-chip">${meta.icon} ${escapeHtml(meta.label)} <strong>${formatNumber(analysis.groups[key], 1)}</strong> ส่วน</span>`;
    }).join("");

    const uncertaintyHtml = analysis.uncertainties.length
      ? `<ul class="ai-uncertainty-list">${analysis.uncertainties.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
      : `<p class="muted small-text">ยังควรตรวจปริมาณและวิธีปรุงจากอาหารจริง</p>`;

    const flagTags = [
      analysis.flags.sweetDrink ? "🧋 อาจมีน้ำหวาน" : "",
      analysis.flags.fried ? "🍟 อาจเป็นของทอด" : "",
      analysis.flags.sweetSnack ? "🍰 อาจมีขนมหวาน" : ""
    ].filter(Boolean);

    elements.result.innerHTML = `
      <div class="ai-result-header">
        <div>
          <p class="eyebrow">ผลประเมินจากภาพ</p>
          <h4>${escapeHtml(analysis.mealName)}</h4>
        </div>
        ${confidenceBadge(analysis.confidence)}
      </div>

      <div class="ai-message-box"><span aria-hidden="true">💡</span><p>${escapeHtml(analysis.childMessage)}</p></div>

      <div class="ai-result-section">
        <h5>AI มองเห็นอะไรบ้าง</h5>
        <ul class="ai-item-list">${itemRows}</ul>
      </div>

      <div class="ai-result-section">
        <h5>อาหาร 5 กลุ่มที่ AI ประเมิน</h5>
        <div class="ai-group-grid">${groupChips}</div>
        ${flagTags.length ? `<div class="ai-flag-row">${flagTags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      </div>

      <div class="ai-result-section">
        <div class="ai-section-title-row">
          <h5>ช่วงสารอาหารโดยประมาณ</h5>
          <span>คำนวณจากหน่วยส่วนอาหาร</span>
        </div>
        <div class="ai-nutrition-grid">
          <div><span>พลังงาน</span><strong>${nutrition.kcal[0]}–${nutrition.kcal[1]}</strong><small>กิโลแคลอรี</small></div>
          <div><span>คาร์โบไฮเดรต</span><strong>${nutrition.carbs[0]}–${nutrition.carbs[1]}</strong><small>กรัม</small></div>
          <div><span>โปรตีน</span><strong>${nutrition.protein[0]}–${nutrition.protein[1]}</strong><small>กรัม</small></div>
          <div><span>ไขมัน</span><strong>${nutrition.fat[0]}–${nutrition.fat[1]}</strong><small>กรัม</small></div>
          <div><span>ใยอาหาร</span><strong>${nutrition.fiber[0]}–${nutrition.fiber[1]}</strong><small>กรัม</small></div>
        </div>
        <p class="ai-highlight"><strong>สารอาหารเด่น:</strong> ${escapeHtml(nutrientHighlights(analysis.groups))}</p>
        <p class="tiny muted">ช่วงนี้อาจคลาดเคลื่อนจากปริมาณจริง น้ำมัน น้ำตาล ซอส สูตรอาหาร และส่วนที่ถูกบังในภาพ</p>
      </div>

      <div class="ai-result-section">
        <h5>สิ่งที่ AI ยังไม่แน่ใจ</h5>
        ${uncertaintyHtml}
      </div>

      <div class="ai-confirm-box">
        <div>
          <strong>${saved ? "ผล AI ที่เคยยืนยันไว้" : "ขั้นตอนสำคัญก่อนบันทึก"}</strong>
          <p>${saved ? "ตรวจอีกครั้งได้เมื่อแก้ไขรายการ" : "กดใช้ผล AI แล้วตรวจชื่ออาหารและจำนวนส่วนให้ตรงกับจานจริง"}</p>
        </div>
        <button class="button button-primary" id="applyAiResultButton" type="button">${saved ? "ใช้ผลนี้อีกครั้ง" : "ใช้ผล AI แล้วตรวจต่อ"}</button>
      </div>
    `;

    elements.result.classList.remove("hidden");
    elements.clearButton?.classList.remove("hidden");
    setStatus(saved ? "โหลดผล AI ที่เคยยืนยันไว้แล้ว" : "วิเคราะห์เสร็จแล้ว กรุณาตรวจและแก้ผลก่อนบันทึก", "success");

    elements.result.querySelector("#applyAiResultButton")?.addEventListener("click", applyCurrentAnalysis);
  }

  function setPortions(groups) {
    if (typeof window.setAllPortions === "function") {
      window.setAllPortions(groups);
      return;
    }

    GROUP_KEYS.forEach((key) => {
      const output = document.querySelector(`[data-portion-value="${key}"]`);
      if (!output) return;
      const value = roundHalf(groups[key] || 0);
      output.dataset.value = String(value);
      output.textContent = Number.isInteger(value) ? String(value) : value.toFixed(1);
    });
    if (typeof window.renderPlatePreview === "function") window.renderPlatePreview();
  }

  function applyCurrentAnalysis() {
    if (!currentAnalysis?.isFood) return;

    if (elements.mealName) elements.mealName.value = currentAnalysis.mealName;
    setPortions(currentAnalysis.groups);
    if (elements.flagSweetDrink) elements.flagSweetDrink.checked = currentAnalysis.flags.sweetDrink;
    if (elements.flagFried) elements.flagFried.checked = currentAnalysis.flags.fried;
    if (elements.flagSweetSnack) elements.flagSweetSnack.checked = currentAnalysis.flags.sweetSnack;

    if (elements.aiMeta) {
      elements.aiMeta.value = JSON.stringify({
        assisted: true,
        userConfirmed: true,
        confidence: currentAnalysis.confidence,
        mealName: currentAnalysis.mealName,
        items: currentAnalysis.visibleItems.map((item) => item.name),
        groups: currentAnalysis.groups,
        analyzedAt: currentAnalysis.analyzedAt,
        model: currentAnalysis.model
      });
    }

    if (typeof window.showToast === "function") {
      window.showToast("เติมผล AI แล้ว กรุณาตรวจและแก้ให้ตรงกับจานจริง");
    }
    elements.mealName?.focus();
  }

  function setBusy(busy) {
    isBusy = busy;
    if (elements.analyzeButton) {
      elements.analyzeButton.innerHTML = busy
        ? '<span class="ai-spinner" aria-hidden="true"></span> กำลังวิเคราะห์...'
        : '<span aria-hidden="true">✨</span> วิเคราะห์ภาพด้วย AI';
    }
    updateButtonState();
  }

  async function parseErrorResponse(response) {
    try {
      const data = await response.json();
      return data?.error || data?.message || `ระบบตอบกลับรหัส ${response.status}`;
    } catch {
      return `ระบบตอบกลับรหัส ${response.status}`;
    }
  }

  async function analyzePhoto() {
    const image = getPhotoSource();
    if (!image) {
      setStatus("กรุณาถ่ายหรือเลือกรูปอาหารก่อน", "warning");
      return;
    }
    if (!elements.consent?.checked) {
      setStatus("กรุณายืนยันว่ารูปไม่มีข้อมูลส่วนตัวของเด็ก", "warning");
      return;
    }

    const endpoint = getAiEndpoint();
    if (!endpoint) {
      setStatus("ยังไม่ได้เชื่อม AI backend กรุณา Deploy โฟลเดอร์นี้บน Vercel หรือใส่ลิงก์ backend ใน config.js", "error");
      return;
    }

    clearAnalysis({ keepStatus: true, clearMeta: true });
    setBusy(true);
    setStatus("กำลังให้ AI ดูเฉพาะภาพจานอาหาร ใช้เวลาประมาณ 5–30 วินาที", "working");

    const controller = new AbortController();
    const timeoutMs = clamp(window.KINDEE_CONFIG?.aiRequestTimeoutMs || 45000, 10000, 90000);
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image,
          mealType: elements.mealType?.value || ""
        }),
        signal: controller.signal,
        cache: "no-store"
      });

      if (!response.ok) throw new Error(await parseErrorResponse(response));
      const data = await response.json();
      const analysis = normalizeAnalysis(data.analysis);
      renderAnalysis(analysis);
    } catch (error) {
      const message = error?.name === "AbortError"
        ? "วิเคราะห์นานเกินกำหนด ลองใหม่ด้วยรูปที่เล็กลงหรืออินเทอร์เน็ตที่เสถียร"
        : String(error?.message || "วิเคราะห์ภาพไม่สำเร็จ");
      setStatus(message, "error");
      if (typeof window.showToast === "function") window.showToast(message);
    } finally {
      clearTimeout(timeout);
      setBusy(false);
    }
  }

  function loadSavedAi(detail) {
    if (!detail?.assisted) {
      clearAnalysis();
      return;
    }

    lastPhotoSource = getPhotoSource();
    const flags = {
      sweetDrink: Boolean(elements.flagSweetDrink?.checked),
      fried: Boolean(elements.flagFried?.checked),
      sweetSnack: Boolean(elements.flagSweetSnack?.checked)
    };
    const analysis = {
      isFood: true,
      mealName: String(detail.mealName || elements.mealName?.value || "อาหารจากภาพ"),
      visibleItems: Array.isArray(detail.items)
        ? detail.items.map((name) => ({ name: String(name), group: "other", portion: 0, confidence: detail.confidence || "low" }))
        : [],
      groups: normalizeGroups(detail.groups),
      flags,
      confidence: ["low", "medium", "high"].includes(detail.confidence) ? detail.confidence : "low",
      uncertainties: ["ผลนี้เป็นข้อมูลที่บันทึกไว้เดิม ควรตรวจเทียบกับรูปอีกครั้ง"],
      childMessage: "นี่คือผล AI ที่เคยยืนยันไว้ สามารถแก้จำนวนส่วนให้ตรงกับจานจริงได้",
      model: String(detail.model || ""),
      analyzedAt: String(detail.analyzedAt || "")
    };
    renderAnalysis(analysis, { saved: true });
  }

  function init() {
    if (!elements.analyzeButton || !elements.photoPreview) return;

    elements.analyzeButton.addEventListener("click", analyzePhoto);
    elements.clearButton?.addEventListener("click", () => clearAnalysis());
    elements.consent?.addEventListener("change", updateButtonState);

    const observer = new MutationObserver(handlePhotoMutation);
    observer.observe(elements.photoPreview, { childList: true, subtree: true, attributes: true, attributeFilter: ["src"] });

    window.addEventListener("kindee:ai-reset", () => {
      lastPhotoSource = getPhotoSource();
      clearAnalysis();
    });
    window.addEventListener("kindee:ai-load", (event) => loadSavedAi(event.detail));

    lastPhotoSource = getPhotoSource();
    clearAnalysis();
  }

  init();
})();
