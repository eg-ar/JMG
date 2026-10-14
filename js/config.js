/* =========================================================
   JMG HR Portal — config.js
   الصق رابط الـ Web App الخاص بـ Google Apps Script في API_URL.
   من غيره الموقع مش هيشتغل.
   ========================================================= */
window.JMG_CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycby3L0VvUSi_vJGvOgInr1mmvepPmiwKSuOFx7j1M3hg9pPItrNhnFDS_ytPwiRQ-jrB/exec",          // مثال: "https://script.google.com/macros/s/AKfycb.../exec"
  LOGO: "logo.png",     // لوجو الشركة (ارفعه في نفس فولدر index.html)
  PERMISSION_HOURS: 4,  // رصيد الأذونات الشهري بالساعات
  WEEKEND: [5, 6]       // أيام الويك إند (0 = الأحد ... 5 = الجمعة، 6 = السبت)
};
