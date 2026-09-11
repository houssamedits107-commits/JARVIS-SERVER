const express = require('express');
const cors = require('cors');

const app = express();

// إعدادات CORS الشاملة للسماح بجميع الطلبات
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 1. المسار الرئيسي
app.get('/', (req, res) => {
  res.send('Server is running successfully!');
});

// 2. مسار المحادثة المرن جداً
app.post('/chat', (req, res) => {
  try {
    // قراءة النص بغض النظر عن الاسم المرسل من الواجهة الأمامية
    const userMessage = req.body?.message || req.body?.prompt || req.body?.text || 'مرحباً';

    // إرجاع الرد بكافة المسميات الشائعة لتوافق الواجهة الأمامية
    res.status(200).json({
      reply: `أهلاً بك! تم استلام رسالتك بنجاح: "${userMessage}"`,
      response: `أهلاً بك! تم استلام رسالتك بنجاح: "${userMessage}"`,
      message: `أهلاً بك! تم استلام رسالتك بنجاح: "${userMessage}"`
    });
  } catch (error) {
    console.error("Chat Route Error:", error);
    res.status(200).json({ 
      reply: "حدث خطأ غير متوقع، لكن السيرفر يعمل.",
      error: error.message 
    });
  }
});

// 3. تحديد المنفذ
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
