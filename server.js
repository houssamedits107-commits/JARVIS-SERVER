const express = require('express');
const cors = require('cors');

const app = express();

// السماح باستقبال البيانات وتجاوز حظر CORS
app.use(cors());
app.use(express.json());

// 1. المسار الرئيسي للتأكد من عمل السيرفر
app.get('/', (req, res) => {
  res.send('Server is running successfully!');
});

// 2. مسار المحادثة (Chat Route) - رد مباشر وسريع بدون أخطاء 500 أو 502
app.post('/chat', (req, res) => {
  try {
    const userMessage = req.body.message || req.body.prompt || 'مرحباً';

    // إرجاع رد تلقائي
    res.json({
      reply: `أهلاً بك! تم استلام رسالتك بنجاح: "${userMessage}"`
    });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "حدث خطأ في الخادم" });
  }
});

// 3. تحديد المنفذ المناسب للاستضافة (Render)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
