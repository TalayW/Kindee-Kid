"use strict";

const MAX_IMAGE_DATA_URL_LENGTH = 1_600_000;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;
const rateBuckets = new Map();

const FOOD_ANALYSIS_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "is_food",
    "meal_name_th",
    "visible_items",
    "groups",
    "flags",
    "overall_confidence",
    "uncertainties",
    "child_message_th"
  ],
  properties: {
    is_food: { type: "boolean" },
    meal_name_th: { type: "string" },
    visible_items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["name_th", "group", "portion", "confidence"],
        properties: {
          name_th: { type: "string" },
          group: {
            type: "string",
            enum: ["veg", "starch", "protein", "fruit", "dairy", "other"]
          },
          portion: { type: "number" },
          confidence: { type: "string", enum: ["low", "medium", "high"] }
        }
      }
    },
    groups: {
      type: "object",
      additionalProperties: false,
      required: ["veg", "starch", "protein", "fruit", "dairy"],
      properties: {
        veg: { type: "number" },
        starch: { type: "number" },
        protein: { type: "number" },
        fruit: { type: "number" },
        dairy: { type: "number" }
      }
    },
    flags: {
      type: "object",
      additionalProperties: false,
      required: ["sweet_drink", "fried", "sweet_snack"],
      properties: {
        sweet_drink: { type: "boolean" },
        fried: { type: "boolean" },
        sweet_snack: { type: "boolean" }
      }
    },
    overall_confidence: { type: "string", enum: ["low", "medium", "high"] },
    uncertainties: {
      type: "array",
      items: { type: "string" }
    },
    child_message_th: { type: "string" }
  }
};

const SYSTEM_INSTRUCTIONS = `
คุณเป็นผู้ช่วยวิเคราะห์ภาพอาหารอย่างระมัดระวังสำหรับเว็บแอปการเรียนรู้โภชนาการของเด็กประถมในประเทศไทย

กติกา:
1. วิเคราะห์เฉพาะอาหารและเครื่องดื่มที่มองเห็นในภาพ ห้ามอนุมานตัวตน อายุ สุขภาพ รูปร่าง น้ำหนัก โรค หรือความต้องการพลังงานของผู้ใช้
2. ผลทั้งหมดเป็นการประเมินเบื้องต้น ไม่ใช่การวินิจฉัย ไม่ใช่ใบสั่งอาหาร และไม่ใช่การวัดสารอาหารที่แน่นอน
3. พิจารณาอาหารไทยและอาหารผสม เช่น ข้าวราดแกง ก๋วยเตี๋ยว ข้าวผัด แกงจืด ส้มตำ ไข่เจียว โดยหลีกเลี่ยงการนับวัตถุดิบซ้ำซ้อน
4. จำแนกอาหารที่มองเห็นเป็น 5 กลุ่มเพื่อการเรียนรู้: veg, starch, protein, fruit, dairy; ใช้ other เมื่อไม่เข้ากลุ่ม
5. portion เป็น “ส่วนแบบสังเกตจากภาพ” ใช้ค่าตั้งแต่ 0 ถึง 6 และควรปัดเป็นช่วงละ 0.5
6. groups ต้องเป็นผลรวมที่ไม่ซ้ำซ้อนของ 5 กลุ่มจากอาหารทั้งหมดในภาพ
7. ถ้ามองไม่ชัด ถูกบัง ภาพมืด หรือไม่แน่ใจวิธีปรุง ให้ลด confidence และบอกใน uncertainties อย่างตรงไปตรงมา
8. ถ้าไม่ใช่รูปอาหารหรือไม่เห็นอาหารชัด ให้ is_food=false และใส่ค่ากลุ่มเป็น 0
9. child_message_th ต้องเป็นภาษาไทยเชิงบวก ไม่ชวนอดอาหาร ไม่ตำหนิรูปร่าง และเตือนให้เด็ก/ผู้ปกครองตรวจผลก่อนบันทึก
10. ห้ามให้ตัวเลขแคลอรีหรือสารอาหาร เพราะแอปจะคำนวณเป็นช่วงประมาณจากหน่วยส่วนอาหารเอง
`;

function getRequestOrigin(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "https").split(",")[0].trim();
  const host = String(req.headers.host || "").trim();
  return host ? `${forwardedProto}://${host}` : "";
}

function allowedOrigins(req) {
  const configured = String(process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set([
    getRequestOrigin(req),
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
    "https://khunweew.github.io",
    ...configured
  ].filter(Boolean));
}

function configureCors(req, res) {
  const origin = String(req.headers.origin || "");
  const allowed = allowedOrigins(req);
  if (origin && allowed.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");
  return !origin || allowed.has(origin);
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  return null;
}

function isValidImageDataUrl(value) {
  return typeof value === "string"
    && value.length <= MAX_IMAGE_DATA_URL_LENGTH
    && /^data:image\/(?:jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(value);
}

function clientIdentifier(req) {
  return String(req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown")
    .split(",")[0]
    .trim();
}

function isRateLimited(req) {
  const now = Date.now();
  const key = clientIdentifier(req);
  const current = rateBuckets.get(key);

  if (!current || now - current.startedAt >= RATE_LIMIT_WINDOW_MS) {
    rateBuckets.set(key, { startedAt: now, count: 1 });
    return false;
  }

  current.count += 1;
  rateBuckets.set(key, current);
  return current.count > RATE_LIMIT_MAX_REQUESTS;
}

function extractOutputText(response) {
  if (typeof response?.output_text === "string" && response.output_text.trim()) {
    return response.output_text.trim();
  }

  for (const item of response?.output || []) {
    for (const content of item?.content || []) {
      if (content?.type === "output_text" && typeof content.text === "string") {
        return content.text.trim();
      }
      if (content?.type === "refusal" && typeof content.refusal === "string") {
        throw new Error(content.refusal);
      }
    }
  }
  return "";
}

function normalizeHalf(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.round(Math.min(6, Math.max(0, number)) * 2) / 2;
}

function normalizeAnalysis(result) {
  const groups = {};
  for (const key of ["veg", "starch", "protein", "fruit", "dairy"]) {
    groups[key] = normalizeHalf(result?.groups?.[key]);
  }

  const allowedGroups = new Set(["veg", "starch", "protein", "fruit", "dairy", "other"]);
  const allowedConfidence = new Set(["low", "medium", "high"]);
  const visibleItems = Array.isArray(result?.visible_items)
    ? result.visible_items.slice(0, 12).map((item) => ({
        name_th: String(item?.name_th || "อาหารที่มองเห็น").slice(0, 70),
        group: allowedGroups.has(item?.group) ? item.group : "other",
        portion: normalizeHalf(item?.portion),
        confidence: allowedConfidence.has(item?.confidence) ? item.confidence : "low"
      }))
    : [];

  return {
    is_food: Boolean(result?.is_food),
    meal_name_th: String(result?.meal_name_th || "อาหารจากภาพ").slice(0, 80),
    visible_items: visibleItems,
    groups,
    flags: {
      sweet_drink: Boolean(result?.flags?.sweet_drink),
      fried: Boolean(result?.flags?.fried),
      sweet_snack: Boolean(result?.flags?.sweet_snack)
    },
    overall_confidence: allowedConfidence.has(result?.overall_confidence)
      ? result.overall_confidence
      : "low",
    uncertainties: Array.isArray(result?.uncertainties)
      ? result.uncertainties.slice(0, 6).map((item) => String(item || "").slice(0, 150)).filter(Boolean)
      : [],
    child_message_th: String(
      result?.child_message_th || "ตรวจผล AI แล้วปรับให้ตรงกับจานจริงก่อนบันทึกนะ"
    ).slice(0, 220)
  };
}

async function callOpenAI({ image, mealType }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    const error = new Error("AI backend ยังไม่ได้ตั้งค่า OPENAI_API_KEY");
    error.statusCode = 503;
    throw error;
  }

  const model = String(process.env.OPENAI_MODEL || "gpt-5.6-terra").trim();
  const detail = ["low", "high", "auto", "original"].includes(process.env.OPENAI_IMAGE_DETAIL)
    ? process.env.OPENAI_IMAGE_DETAIL
    : "auto";

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 1600,
      instructions: SYSTEM_INSTRUCTIONS,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `ช่วยวิเคราะห์ภาพอาหารนี้สำหรับมื้อ ${String(mealType || "ไม่ระบุ")} และตอบตาม JSON schema เท่านั้น`
            },
            {
              type: "input_image",
              image_url: image,
              detail
            }
          ]
        }
      ],
      text: {
        format: {
          type: "json_schema",
          name: "kindee_food_analysis",
          strict: true,
          schema: FOOD_ANALYSIS_SCHEMA
        }
      }
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || `OpenAI API ตอบกลับรหัส ${response.status}`;
    const error = new Error(message);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }

  const outputText = extractOutputText(payload);
  if (!outputText) {
    const error = new Error("AI ไม่ส่งผลวิเคราะห์กลับมา");
    error.statusCode = 502;
    throw error;
  }

  let parsed;
  try {
    parsed = JSON.parse(outputText);
  } catch {
    const error = new Error("อ่านผล JSON จาก AI ไม่สำเร็จ");
    error.statusCode = 502;
    throw error;
  }

  const analysis = normalizeAnalysis(parsed);
  analysis._meta = {
    model,
    generatedAt: new Date().toISOString(),
    storageRequested: false
  };
  return analysis;
}

async function handler(req, res) {
  const originAllowed = configureCors(req, res);
  if (req.method === "OPTIONS") {
    res.statusCode = originAllowed ? 204 : 403;
    res.end();
    return;
  }

  if (!originAllowed) {
    sendJson(res, 403, { error: "โดเมนนี้ไม่ได้รับอนุญาตให้เรียก AI backend" });
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "รองรับเฉพาะคำขอ POST" });
    return;
  }

  if (isRateLimited(req)) {
    sendJson(res, 429, { error: "ทดลองวิเคราะห์ครบจำนวนชั่วคราวแล้ว กรุณารอและลองใหม่ภายหลัง" });
    return;
  }

  const body = readJsonBody(req);
  if (!body || !isValidImageDataUrl(body.image)) {
    sendJson(res, 400, {
      error: "รูปภาพไม่ถูกต้องหรือมีขนาดใหญ่เกินไป กรุณาถ่ายใหม่ให้เห็นเฉพาะจานอาหาร"
    });
    return;
  }

  try {
    const analysis = await callOpenAI({
      image: body.image,
      mealType: String(body.mealType || "").slice(0, 30)
    });
    sendJson(res, 200, { analysis });
  } catch (error) {
    console.error("analyze-food error", error);
    const statusCode = Number(error?.statusCode) || 500;
    sendJson(res, statusCode, {
      error: statusCode === 500 ? "ระบบวิเคราะห์ขัดข้อง กรุณาลองใหม่" : String(error.message || "วิเคราะห์ไม่สำเร็จ")
    });
  }
}

module.exports = handler;
module.exports._private = {
  FOOD_ANALYSIS_SCHEMA,
  extractOutputText,
  normalizeAnalysis,
  isValidImageDataUrl,
  callOpenAI
};
