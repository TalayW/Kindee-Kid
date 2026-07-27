# Prompt สำหรับใช้กับ Codex

```text
โปรเจกต์นี้คือ “กินดี Kids AI” เว็บแอปภาษาไทยสำหรับเด็กประถม ป.4–ป.6
Frontend ใช้ HTML/CSS/JavaScript แบบไม่ใช้ framework และเก็บประวัติด้วย localStorage
Backend อยู่ที่ api/analyze-food.js เป็น Vercel Serverless Function และเรียก OpenAI Responses API ด้วยภาพอาหาร

กติกาสำคัญ:
1. ห้ามใส่ OPENAI_API_KEY ในไฟล์ frontend, config.js หรือ GitHub ให้ใช้ Environment Variable ฝั่ง Vercel เท่านั้น
2. AI เป็นผู้ช่วยเสนอผล ผู้ใช้ต้องตรวจและแก้ก่อนบันทึกเสมอ
3. ห้ามอ้างว่ารูปเดียวให้แคลอรีหรือสารอาหารที่แน่นอน ให้แสดงเป็นช่วงประมาณ
4. ห้ามเพิ่มการลดน้ำหนัก เป้าหมายน้ำหนัก การจำกัดแคลอรี หรือข้อความตำหนิรูปร่างเด็ก
5. ห้ามส่งชื่อ ระดับชั้น โรงเรียน หรือข้อมูลส่วนตัวไป API
6. ต้องคงโหมดกรอกเองไว้เมื่อ AI ใช้งานไม่ได้
7. ทุกปุ่มต้องใช้ได้บนมือถือและมี accessibility label
8. หลังแก้โค้ด ให้รัน npm test และ npm run check
9. ห้ามเปลี่ยนผลทดลองหรือสร้างข้อมูลความแม่นยำปลอม

ไฟล์หลัก:
- index.html / styles.css: หน้าจอ
- app.js: บันทึก คะแนน กราฟ export/import
- ai.js: AI UI การยืนยันผล และช่วงสารอาหาร
- config.js: URL backend ที่เปิดเผยได้ แต่ไม่มีคีย์
- api/analyze-food.js: backend และ JSON schema
- tests/api.test.cjs: แบบทดสอบไม่เรียก API จริง

งานที่ต้องการทำต่อ:
[ระบุงานตรงนี้]
```
