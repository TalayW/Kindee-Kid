# วิธีเปิด AI ให้ใช้งานจริงด้วย Vercel

## ก่อนเริ่ม

ต้องมี:

- GitHub Repository ของแอป `kindee-kids`
- บัญชี Vercel ซึ่งเชื่อมกับ GitHub ได้
- บัญชี OpenAI API ของผู้ปกครอง ครู หรือผู้รับผิดชอบโครงการ
- การเปิด Billing ของ API ตามการใช้งานจริง

**ChatGPT แบบชำระเงินและ OpenAI API คิดค่าบริการแยกกัน** และห้ามส่ง API key ในแชตหรือใส่ไว้ใน GitHub

## ขั้นตอนที่ 1 อัปโหลดโค้ดชุด AI ไป GitHub

1. สำรอง Repository เดิมก่อน
2. แตกไฟล์ ZIP ของโค้ดชุดนี้
3. อัปโหลดไฟล์ทั้งหมดไปที่ Repository `kindee-kids`
4. ตรวจว่ามีไฟล์ต่อไปนี้อยู่ที่หน้าแรกของ Repository

```text
index.html
styles.css
app.js
ai.js
config.js
api/analyze-food.js
vercel.json
package.json
```

5. Commit changes

## ขั้นตอนที่ 2 Import เข้า Vercel

1. เข้าสู่ระบบ Vercel ด้วย GitHub
2. เลือก **Add New → Project**
3. เลือก Repository `kindee-kids`
4. Framework Preset เลือก **Other** หรือปล่อยให้ตรวจอัตโนมัติ
5. Root Directory ใช้ค่าเริ่มต้น
6. ยังไม่ต้องกด Deploy จนกว่าจะตั้ง Environment Variables

## ขั้นตอนที่ 3 ตั้งค่า Environment Variables

ในหัวข้อ Environment Variables เพิ่ม:

| Name | Value |
|---|---|
| `OPENAI_API_KEY` | API key จริง ใส่เฉพาะใน Vercel |
| `OPENAI_MODEL` | `gpt-5.6-terra` |
| `OPENAI_IMAGE_DETAIL` | `auto` |
| `ALLOWED_ORIGINS` | `https://khunweew.github.io` |

กด Deploy แล้วรอจนได้ลิงก์ เช่น:

```text
https://kindee-kids-ai.vercel.app
```

## ขั้นตอนที่ 4 ทดสอบ

1. เปิดลิงก์ Vercel บนมือถือ
2. ไปหน้า “บันทึก”
3. ถ่ายรูปอาหารที่เห็นเฉพาะจาน
4. ติ๊กยืนยันว่าไม่มีข้อมูลส่วนตัว
5. กด “วิเคราะห์ภาพด้วย AI”
6. ตรวจว่ามีชื่ออาหาร รายการอาหาร 5 กลุ่ม ช่วงสารอาหาร และปุ่มใช้ผล AI
7. กดใช้ผล แล้วแก้จำนวนส่วนให้ตรงกับจานจริง
8. บันทึกและดูหน้า “วันนี้”

ตรวจสถานะ backend ได้จาก:

```text
https://ชื่อโปรเจกต์.vercel.app/api/health
```

ควรเห็น `"ok": true` และ `"aiConfigured": true`

## ขั้นตอนที่ 5 ใช้ GitHub Pages เดิมต่อ

ถ้าต้องการคงลิงก์เดิม `https://khunweew.github.io/kindee-kids/` ให้แก้ไฟล์ `config.js` ใน GitHub เป็น:

```js
window.KINDEE_CONFIG = Object.freeze({
  aiEndpoint: "https://ชื่อโปรเจกต์.vercel.app/api/analyze-food",
  aiRequestTimeoutMs: 45000
});
```

Commit แล้วรอ GitHub Pages อัปเดต จากนั้นเปิดหน้าเดิมและทดสอบอีกครั้ง

## ข้อผิดพลาดที่พบบ่อย

### ขึ้นว่า “ยังไม่ได้เชื่อม AI backend”

หน้าเว็บอยู่ GitHub Pages แต่ `config.js` ยังไม่ได้ใส่ลิงก์ Vercel หรือเปิดไฟล์แบบ `file://`

### ขึ้น `OPENAI_API_KEY`

ยังไม่ได้เพิ่ม Environment Variable ใน Vercel หรือเพิ่มแล้วแต่ยังไม่ได้ Redeploy

### ขึ้น 403 โดเมนไม่ได้รับอนุญาต

เพิ่มโดเมนหน้าเว็บใน `ALLOWED_ORIGINS` เช่น:

```text
https://khunweew.github.io,https://โดเมนอื่น.example
```

### หน้าเว็บยังเป็นเวอร์ชันเก่า

Service Worker อาจเก็บ cache เก่า ให้ปิดแท็บ เปิดใหม่ หรือล้างข้อมูลเว็บไซต์หนึ่งครั้ง

### AI ทายผิด

ถือเป็นพฤติกรรมที่เป็นไปได้ของระบบภาพ ผู้ใช้ต้องตรวจแก้ และควรบันทึกความผิดพลาดไว้ในผลการทดลอง ไม่ควรแก้ตัวเลขผลทดลองให้ดูดี
