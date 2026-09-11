/**
 * ============================================================================
 * Application Name: Jarvis AI Backend Server
 * Description: Node.js Express server configured for deployment on Render.
 * Supports: Cross-Origin Resource Sharing (CORS), Health Check, Chat API.
 * ============================================================================
 */

// 1. استدعاء المكتبات الأساسية واللازمة للتشغيل
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// 2. تهيئة تطبيق Express
const app = express();

// 3. تحديد المنافذ ومتغيرات البيئة
const PORT = process.env.PORT || 3000;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

// 4. إعداد البرامج الوسيطة (Middlewares)
// السماح لجميع المصادر بالاتصال (CORS) لمنع مشاكل الطلبات من المتصفح
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// تحليل البيانات القادمة بترميز JSON وقبول أحجام تصل إلى 10 ميجابايت
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 5. تهيئة العميل الخاص بـ Gemini AI بأمان
let genAI = null;
let aiModel = null;

if (GEMINI_API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    // استخدام موديل gemini-1.5-flash الأسرع والأكثر استقراراً
    aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    console.log("Successfully initialized Gemini AI Client.");
  } catch (initError) {
    console.error("Failed to initialize Gemini AI API:", initError.message);
  }
} else {
  console.warn("WARNING: GEMINI_API_KEY is not defined in Environment Variables!");
}

// 6. تسجيل وقت الطلبات (Request Logger Middleware)
app.use((req, res, next) => {
  const currentTime = new Date().toISOString();
  console.log(`[${currentTime}] ${req.method} request sent to: ${req.url}`);
  next();
});

// ============================================================================
// 7. تعريف المسارات (Routes)
// ============================================================================

/**
 * @route   GET /
 * @desc    الصفحة الرئيسية لفحص حالة السيرفر (Health Check)
 * @access  Public
 */
app.get('/', (req, res) => {
  return res.status(200).json({
    status: "success",
    message: "Server is running successfully!",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    api_status: GEMINI_API_KEY ? "Configured" : "Missing API Key"
  });
});

/**
 * @route   POST /chat
 * @desc    مسار معالجة المحادثة والتواصل مع الـ AI
 * @access  Public
 */
app.post('/chat', async (req, res) => {
  try {
    const { message, prompt, history } = req.body;
    
    // استخلاص النص المطلوب إرساله
    const userPrompt = message || prompt;

    // التحقق من وجود نص الرسالة
    if (!userPrompt || typeof userPrompt !== 'string' || userPrompt.trim() === '') {
      return res.status(400).json({
        status: "error",
        error: "Bad Request",
        message: "Message content cannot be empty. Please provide 'message' or 'prompt'."
      });
    }

    // التحقق من إعداد مفتاح الـ API
    if (!aiModel) {
      return res.status(500).json({
        status: "error",
        error: "Configuration Error",
        message: "Gemini API key is not configured properly on the server environment."
      });
    }

    console.log(`Processing chat query: "${userPrompt.substring(0, 50)}..."`);

    // إرسال الطلب لنموذج الذكاء الاصطناعي
    const result = await aiModel.generateContent(userPrompt);
    const response = await result.response;
    const responseText = response.text();

    // إرسال الرد الناجح
    return res.status(200).json({
      status: "success",
      reply: responseText,
      response: responseText,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    // التقاط أي خطأ قد يحدث أثناء طلب الـ API دون إسقاط السيرفر
    console.error("Error inside /chat route handler:", error);

    return res.status(500).json({
      status: "error",
      error: "Internal Server Error",
      message: error.message || "An unexpected error occurred while processing your request."
    });
  }
});

// ============================================================================
// 8. المعالجة الاحتياطية للمسارات المفقودة والأخطاء العامة (Error Handlers)
// ============================================================================

// معالجة طلب أي مسار غير موجود (404 Not Found)
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    error: "Not Found",
    message: `The requested endpoint '${req.originalUrl}' does not exist on this server.`
  });
});

// معالجة الأخطاء العالمية غير المتوقعة (Global Error Handler)
app.use((err, req, res, next) => {
  console.error("Unhandled Application Error:", err.stack);
  res.status(500).json({
    status: "error",
    error: "Fatal Server Error",
    message: "A critical server error occurred."
  });
});

// ============================================================================
// 9. تشغيل الخادم والبدء في الاستماع للطلبات
// ============================================================================
const server = app.listen(PORT, () => {
  console.log("============================================");
  console.log(`Server listening on port: ${PORT}`);
  console.log(`Health Check: http://localhost:${PORT}/`);
  console.log(`Chat Endpoint: http://localhost:${PORT}/chat`);
  console.log("============================================");
});

// معالجة إشارات الإغلاق النظيف للسيرفر (Graceful Shutdown)
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server...');
  server.close(() => {
    console.log('HTTP server closed cleanly.');
  });
});
