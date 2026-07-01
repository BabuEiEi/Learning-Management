# Learning Design Encyclopedia

คลังความรู้การออกแบบการจัดการเรียนรู้เชิงลึกสำหรับครูและบุคลากรทางการศึกษา สร้างเป็น Single Page Application ด้วย HTML, CSS, Vanilla JavaScript และ Node.js + Express เพื่อ deploy บน Hugging Face Spaces และนำ URL ไปฝังใน Google Sites ได้

## สรุปข้อมูลจาก Google Doc

แหล่งข้อมูลหลัก: https://docs.google.com/document/d/10W6fG4S-PF4x2_Fe25XlciVc7nwWEIe2q-Mr2QixETw/edit?usp=sharing

ชื่อเอกสารที่อ่านได้จาก export: `รายงานการวิจัยเชิงวิเคราะห์: การออกแบบการจัดการเรียนรู้เชิงลึกผ่านรูปแบบและเทคนิค 54 รายการ`

ผลการสกัดข้อมูล:

- จำนวนรายการจริงที่พบ: 54 รายการ
- จำนวนกลุ่มจริงที่พบ: 6 กลุ่ม
- กลุ่มที่พบในเอกสาร:
  - กลุ่มที่ 1: เน้นพัฒนาด้านพุทธิพิสัย (Cognitive Domain) จำนวน 12 รายการ
  - กลุ่มที่ 2: เน้นพัฒนาด้านจิตพิสัย (Affective Domain) จำนวน 2 รายการ
  - กลุ่มที่ 3: เน้นพัฒนาด้านทักษะพิสัย (Psychomotor Domain) จำนวน 3 รายการ
  - กลุ่มที่ 4: เน้นพัฒนาทักษะกระบวนการ (Process Skills) จำนวน 11 รายการ
  - กลุ่มที่ 5: เน้นการบูรณาการ (Integration) จำนวน 14 รายการ
  - กลุ่มที่ 6: เน้นการให้เหตุผลและการแก้ปัญหา (Reasoning & Problem-Solving) จำนวน 12 รายการ

ข้อมูลที่ขาดหรือไม่ชัดเจน:

- ไม่พบรายการที่ขาดแนวคิด วัตถุประสงค์ ขั้นตอน หรือแหล่งที่มา
- ตัวเลขเชิงอรรถในเอกสารต้นทางบางส่วนถูก export ติดท้ายข้อความ เช่น `เดิม1` หรือ `ง่ายขึ้น2` จึงเก็บไว้ตามต้นฉบับ ไม่ปรับแต่งหรือสร้างข้อมูลเพิ่ม
- ลำดับหัวข้อในเอกสารจัดกลุ่มตามโดเมน ทำให้เลขรายการไม่ได้เรียง 1-54 ในหน้าเอกสาร แต่ไฟล์ JSON เก็บ `id` ตามเลขรายการเดิมของเอกสาร

## โครงสร้างโปรเจกต์

```text
project-root/
├── package.json
├── server.js
├── Dockerfile
├── README.md
├── .gitignore
├── public/
│   ├── index.html
│   ├── style.css
│   ├── app.js
│   └── assets/
└── data/
    └── learningData.json
```

## วิธีติดตั้งและรันในเครื่อง

```bash
npm install
npm start
```

จากนั้นเปิด:

```text
http://localhost:7860
```

หากต้องการทดสอบ Gemini AI ให้ตั้งค่า environment variables ก่อนรัน:

```bash
export GEMINI_API_KEY="your_api_key"
export GEMINI_MODEL="gemini-2.5-flash"
npm start
```

## วิธี Deploy บน Hugging Face Spaces

1. สร้าง Space ใหม่บน Hugging Face
2. เลือก Space SDK เป็น `Docker`
3. อัปโหลดไฟล์ทั้งหมดในโปรเจกต์นี้ขึ้น repository ของ Space
4. Hugging Face จะ build จาก `Dockerfile`
5. แอปจะรันที่ port `7860` หรือค่าจาก `process.env.PORT`

## วิธีเพิ่ม Secrets บน Hugging Face

ไปที่หน้า Space แล้วเปิด:

`Settings` → `Repository secrets`

เพิ่มค่า:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` เช่น `gemini-2.5-flash`

ระบบ backend จะอ่านค่าเหล่านี้จาก environment variables เท่านั้น

## ความปลอดภัยของ Gemini API Key

ห้ามใส่ Gemini API key ในไฟล์ต่อไปนี้:

- `public/index.html`
- `public/app.js`
- JavaScript ฝั่ง browser
- GitHub repository
- README ที่เผยแพร่สาธารณะ

เส้นทางการทำงานที่ถูกต้องคือ:

```text
Browser
→ POST /api/generate-lesson-plan
→ Node.js Express Backend
→ Gemini API
→ Browser
```

หากไม่ได้ตั้งค่า `GEMINI_API_KEY` ระบบจะตอบกลับด้วยข้อความ:

```text
ยังไม่ได้ตั้งค่า Gemini API Key ใน Hugging Face Secrets
```

## วิธีเปลี่ยนข้อมูลรูปแบบการจัดการเรียนรู้

แก้ไฟล์:

```text
data/learningData.json
```

โครงสร้างหลักคือ:

```json
{
  "groupMetadata": [],
  "models": []
}
```

แต่ละรายการใน `models` ควรมี:

```json
{
  "id": 1,
  "group": 1,
  "groupName": "ชื่อกลุ่ม",
  "name": "ชื่อรูปแบบการจัดการเรียนรู้",
  "concept": "แนวคิดพื้นฐาน",
  "objective": "วัตถุประสงค์",
  "steps": [
    {
      "step": 1,
      "name": "ชื่อขั้นตอน",
      "detail": "รายละเอียดกิจกรรม"
    }
  ],
  "source": "แหล่งอ้างอิง"
}
```

Dashboard, Tabs, Cards, ตาราง และกราฟจะคำนวณจำนวนจาก `learningData.json` อัตโนมัติ

## วิธีฝังใน Google Sites

1. Deploy Space ให้เรียบร้อย
2. เปิดหน้าเว็บของ Space และคัดลอก URL
3. ไปที่ Google Sites
4. เลือก `Insert` → `Embed`
5. วาง URL ของ Hugging Face Space
6. ปรับความสูงของ embed block ใน Google Sites ให้เหมาะกับหน้าเว็บ

โปรเจกต์นี้ไม่ได้ส่ง header `X-Frame-Options: DENY` และตั้งค่า `Content-Security-Policy` ให้รองรับการแสดงใน iframe ของ Google Sites

## API

### GET `/api/learning-models`

ส่งข้อมูลจาก `data/learningData.json`

### POST `/api/generate-lesson-plan`

รับข้อมูลจาก form ใน modal แล้วเรียก Gemini API ฝั่ง server เท่านั้น มีการตรวจสอบข้อมูล ความยาวข้อความ timeout และ basic rate limiting ตาม IP

ตัวอย่าง request body:

```json
{
  "topic": "การสังเคราะห์ด้วยแสง",
  "gradeLevel": "มัธยมศึกษาปีที่ 2",
  "subject": "วิทยาศาสตร์",
  "duration": "50 นาที",
  "learningOutcome": "อธิบายกระบวนการสังเคราะห์ด้วยแสงและเชื่อมโยงกับการดำรงชีวิตของพืช",
  "learningModel": {
    "name": "ชื่อรูปแบบ",
    "concept": "แนวคิด",
    "objective": "วัตถุประสงค์",
    "steps": []
  }
}
```
