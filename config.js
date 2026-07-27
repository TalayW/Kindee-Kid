"use strict";

/*
  การตั้งค่า AI ของกินดี Kids
  --------------------------
  วิธีที่ง่ายที่สุด: นำทั้งโฟลเดอร์ไป Deploy บน Vercel แล้วปล่อย aiEndpoint ว่าง
  แอปจะเรียก /api/analyze-food จากโดเมนเดียวกันโดยอัตโนมัติ

  ถ้าหน้าเว็บยังอยู่ GitHub Pages แต่ backend อยู่ Vercel ให้ใส่ URL เต็ม เช่น
  aiEndpoint: "https://kindee-kids-ai.vercel.app/api/analyze-food"

  ห้ามใส่ OPENAI_API_KEY ในไฟล์นี้ เพราะไฟล์หน้าเว็บมองเห็นได้สาธารณะ
*/
window.KINDEE_CONFIG = Object.freeze({
  aiEndpoint: "",
  aiRequestTimeoutMs: 45000
});
