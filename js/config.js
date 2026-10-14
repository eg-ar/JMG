/* =========================================================
   JMG HR Portal — config.js
   الصق رابط الـ Web App الخاص بـ Google Apps Script في API_URL.
   من غيره الموقع مش هيشتغل.
   ========================================================= */
window.JMG_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbzJlrvYl-iIOtVYrmJZwiOXHLGi7FQ6t4sE3bRcRb2QZpG3zniem8J6h9jkvQMMVXW8/exec",          // مثال: "https://script.google.com/macros/s/AKfycb.../exec"
  LOGO: "logo.png",     // لوجو الشركة (ارفعه في نفس فولدر index.html)
  PERMISSION_HOURS: 4,  // رصيد الأذونات الشهري بالساعات
  WEEKEND: [5, 6]       // أيام الويك إند (0 = الأحد ... 5 = الجمعة، 6 = السبت)
};
