const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 7860;
const HOST = "0.0.0.0";
const DATA_PATH = path.join(__dirname, "data", "learningData.json");

const limiterStore = new Map();
const LIMIT_WINDOW_MS = 60 * 1000;
const LIMIT_MAX_REQUESTS = 8;

app.disable("x-powered-by");
app.use(express.json({ limit: "120kb" }));

app.use((req, res, next) => {
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' https://cdn.jsdelivr.net",
      "style-src 'self' https://fonts.googleapis.com",
      "font-src https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'self' https://huggingface.co https://*.huggingface.co https://sites.google.com https://*.google.com https://*.googleusercontent.com https://mesaplut.ac.th https://*.mesaplut.ac.th https://mesa39.in.th https://*.mesa39.in.th"
    ].join("; ")
  );
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.use(express.static(path.join(__dirname, "public")));

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || req.socket.remoteAddress || "unknown";
}

function rateLimitLessonPlanner(req, res, next) {
  const now = Date.now();
  const ip = getClientIp(req);
  const record = limiterStore.get(ip) || { count: 0, resetAt: now + LIMIT_WINDOW_MS };

  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + LIMIT_WINDOW_MS;
  }

  record.count += 1;
  limiterStore.set(ip, record);

  if (record.count > LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      success: false,
      message: "มีการใช้งานถี่เกินไป กรุณารอสักครู่แล้วลองใหม่"
    });
  }

  next();
}

setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of limiterStore.entries()) {
    if (now > record.resetAt) {
      limiterStore.delete(ip);
    }
  }
}, LIMIT_WINDOW_MS).unref();

function requireText(value, fieldName, maxLength) {
  if (typeof value !== "string" || !value.trim()) {
    throw new Error(`${fieldName} is required`);
  }
  const trimmed = value.trim();
  if (trimmed.length > maxLength) {
    throw new Error(`${fieldName} is too long`);
  }
  return trimmed;
}

function normalizeLearningModel(input) {
  if (!input || typeof input !== "object") {
    throw new Error("learningModel is required");
  }

  const steps = Array.isArray(input.steps) ? input.steps.slice(0, 12).map((step, index) => ({
    step: Number.isFinite(Number(step.step)) ? Number(step.step) : index + 1,
    name: requireText(String(step.name || ""), "step.name", 180),
    detail: requireText(String(step.detail || ""), "step.detail", 900)
  })) : [];

  if (!steps.length) {
    throw new Error("learningModel.steps is required");
  }

  return {
    name: requireText(input.name, "learningModel.name", 220),
    concept: requireText(input.concept, "learningModel.concept", 1200),
    objective: requireText(input.objective, "learningModel.objective", 900),
    steps
  };
}

function buildPrompt(payload) {
  const stepText = payload.learningModel.steps
    .map((step) => `${step.step}. ${step.name}: ${step.detail}`)
    .join("\n");

  return `
คุณเป็นผู้เชี่ยวชาญด้านการออกแบบการจัดการเรียนรู้ การวัดและประเมินผล และการจัดการเรียนรู้ตามบริบทการศึกษาไทย

จงสร้างแนวคิดแผนการสอนภาษาไทยที่นำไปปรับใช้ได้จริง โดยยึดรูปแบบการจัดการเรียนรู้ที่กำหนด ห้ามสร้างข้อมูลอ้างอิงปลอม ห้ามแนะนำกิจกรรมที่อันตราย ห้ามส่ง HTML ห้ามส่ง JavaScript และห้ามส่ง Markdown Table

ข้อมูลบริบท
- หัวข้อ/เนื้อหา: ${payload.topic}
- ระดับชั้น: ${payload.gradeLevel}
- รายวิชา: ${payload.subject}
- เวลาเรียนโดยประมาณ: ${payload.duration}
- ผลลัพธ์การเรียนรู้หรือสมรรถนะที่ต้องการ: ${payload.learningOutcome}

รูปแบบการจัดการเรียนรู้ที่เลือก
- ชื่อรูปแบบ: ${payload.learningModel.name}
- แนวคิด: ${payload.learningModel.concept}
- วัตถุประสงค์: ${payload.learningModel.objective}
- ขั้นตอน:
${stepText}

กรุณาตอบเป็นข้อความธรรมดาภาษาไทย โดยจัดหัวข้อต่อไปนี้:
1. ชื่อหน่วยหรือชื่อกิจกรรม
2. สาระสำคัญ
3. จุดประสงค์การเรียนรู้
4. สื่อ/อุปกรณ์
5. กิจกรรมการเรียนรู้ตามขั้นตอนของรูปแบบที่เลือก โดยแต่ละขั้นต้องระบุบทบาทครูและบทบาทผู้เรียน และเชื่อมโยงกับหัวข้อ ระดับชั้น รายวิชา และเวลาเรียน
6. คำถามกระตุ้นคิดอย่างน้อย 3 ข้อ
7. แนวทางวัดและประเมินผล
8. ข้อเสนอแนะสำหรับการปรับใช้ในชั้นเรียนจริง
`.trim();
}

async function callGemini(prompt) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      status: 500,
      body: {
        success: false,
        message: "ยังไม่ได้ตั้งค่า Gemini API Key ใน Hugging Face Secrets"
      }
    };
  }

  const rawModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const model = /^[a-zA-Z0-9._-]+$/.test(rawModel) ? rawModel : "gemini-2.5-flash";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        signal: controller.signal,
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.55,
            topP: 0.9,
            maxOutputTokens: 4096
          },
          safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" }
          ]
        })
      }
    );

    if (!response.ok) {
      return {
        status: 502,
        body: {
          success: false,
          message: "ไม่สามารถสร้างแนวคิดแผนการสอนได้ในขณะนี้"
        }
      };
    }

    const data = await response.json();
    const result = (data.candidates?.[0]?.content?.parts || [])
      .map((part) => part.text || "")
      .join("\n")
      .trim();

    if (!result) {
      return {
        status: 502,
        body: {
          success: false,
          message: "ไม่สามารถสร้างแนวคิดแผนการสอนได้ในขณะนี้"
        }
      };
    }

    return { status: 200, body: { success: true, result } };
  } catch (error) {
    return {
      status: 502,
      body: {
        success: false,
        message: "ไม่สามารถสร้างแนวคิดแผนการสอนได้ในขณะนี้"
      }
    };
  } finally {
    clearTimeout(timeout);
  }
}

app.get("/api/learning-models", async (req, res) => {
  try {
    const content = await fs.readFile(DATA_PATH, "utf8");
    res.type("application/json").send(content);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "ไม่สามารถโหลดข้อมูลรูปแบบการจัดการเรียนรู้ได้"
    });
  }
});

app.post("/api/generate-lesson-plan", rateLimitLessonPlanner, async (req, res) => {
  try {
    const payload = {
      topic: requireText(req.body.topic, "topic", 180),
      gradeLevel: requireText(req.body.gradeLevel, "gradeLevel", 120),
      subject: requireText(req.body.subject, "subject", 120),
      duration: requireText(req.body.duration, "duration", 80),
      learningOutcome: requireText(req.body.learningOutcome, "learningOutcome", 700),
      learningModel: normalizeLearningModel(req.body.learningModel)
    };

    const prompt = buildPrompt(payload);
    const result = await callGemini(prompt);
    res.status(result.status).json(result.body);
  } catch (error) {
    res.status(400).json({
      success: false,
      message: "กรุณากรอกข้อมูลให้ครบถ้วนและไม่ยาวเกินกำหนด"
    });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, HOST, () => {
  console.log(`Learning Design Encyclopedia is running on http://${HOST}:${PORT}`);
});
