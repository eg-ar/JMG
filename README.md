# بوابة الموارد البشرية – JMG Real Estate

Frontend ثابت (HTML/CSS/JS) على GitHub Pages، والـ Backend على Google Apps Script + Google Sheets.

## هيكل الملفات

```
index.html  employee.html  manager.html  hr.html  settings.html
logo.png            <- لوجو JMG بالكتابة البيضا (للخلفيات الغامقة: السايدبار وصفحة الدخول والإيميل)
logo-dark.png       <- نفس اللوجو بالكتابة السودا (للخلفيات الفاتحة)
logo-icon.png       <- الأيقونة لوحدها (favicon)
css/style.css
js/config.js        <- هنا تحط رابط الـ API
js/core.js          <- الترجمة، الـ API، الجزيئات، الـ 3D tilt، الشل
js/login.js  employee.js  manager.js  hr.js  settings.js
apps-script/Code.gs  appsscript.json
```

## التشغيل

1. **الـ Backend:**
   - اعمل Google Sheet جديد، افتح `Extensions > Apps Script`.
   - الصق محتوى `apps-script/Code.gs`. ولو عايز تظبط التايم زون، فعّل عرض `appsscript.json` من Project Settings والصق محتواه.
   - من `Project Settings > Script properties` ضيف `ADMIN_EMAIL` و`ADMIN_PASSWORD` (٨ حروف على الأقل) واختياري `ADMIN_NAME`. مفيش أي بيانات دخول مكتوبة في الكود. وعدّل `PORTAL_URL` و`LOGO_URL` (رابط `logo.png` بعد رفعه على GitHub Pages، مثال: `https://USERNAME.github.io/REPO/logo.png`) عشان اللوجو والزرار يظهروا في الإيميل.
   - شغّل الدالة `setup()` مرة واحدة ووافق على الصلاحيات. هتتعمل الشيتات `Users` و`Requests` و`Permissions`.
   - `Deploy > New deployment > Web app` (Execute as: **Me**، Who has access: **Anyone**) وانسخ الرابط.
2. **الربط:** الصق الرابط في `API_URL` داخل `js/config.js`.
3. **النشر:** ارفع المحتوى كله (مع `logo.png`) على GitHub، وفعّل Pages من `Settings > Pages`.
4. سجّل دخول بـ `HR001` وكلمة المرور اللي حطيتها في `ADMIN_PASSWORD` (الكود بيمسحها من الـ Properties بعد إنشاء الحساب)، وغيّرها من الإعدادات.

> بعد أي تعديل في `Code.gs` لازم تعمل `Deploy > Manage deployments > Edit > New version`.

## الروابط من غير `.html`

الروابط بتظهر نضيفة (`/employee` بدل `/employee.html`)، وده بيشتغل تلقائي على GitHub Pages. لو فتحت المشروع على جهازك بسيرفر عادي (زي `python -m http.server`) الصفحات من غير `.html` مش هتفتح، استخدم سيرفر بيدعم ده أو جرّب على GitHub Pages مباشرة.

## قرارات تنفيذ لازم تعرفها

- **أعمدة إضافية:** `Users.Department` (القسم مطلوب في نموذج HR)، و`Requests`: `Duration, ManagerNote, CreatedAt, DecidedAt, DecidedBy`. الأعمدة الأصلية زي ما طلبتها بنفس الترتيب.
- **المأمورية** ليها حقل تاريخ كمان (من غيره الطلب مش هيبقى له معنى).
- **حساب الإجازة** بيستثني الجمعة والسبت (`WEEKEND` في `config.js` و`Code.gs`). الاتنين لازم يتغيروا مع بعض.
- **الأذونات:** بتتخصم من الـ 4 ساعات عند **موافقة** المدير. وقت التقديم النظام بيتأكد إن الساعات المعلّقة + المطلوبة ما تعدّيش الرصيد. صف الشهر الجديد في `Permissions` بيتكوّن تلقائي أول ما الموظف يفتح حسابه، فالرصيد بيتجدد أول كل شهر ومبيترحّلش.
- **إلغاء الطلب** بيغيّر حالته إلى `Cancelled` (بتفضل في السجل) وبعدها بتتقفل زي المعتمد والمرفوض.
- **HR** تقدر توافق أو ترفض أي طلب من جدول "كل الطلبات"، ومفيش حد بيوافق على طلب نفسه.
- **كلمات المرور** متخزنة Salt + SHA-256، مش نص عادي. والجلسات توكن عشوائي صلاحيته 6 ساعات. لو كتبت كلمة مرور نص عادي في الشيت للطوارئ، هتتحوّل لهاش أول تسجيل دخول.
- **الإيميلات** بتتبعت بس لمن فعّل الـ Opt-In، باسم "إدارة الموارد البشرية JMG". حدود Gmail اليومية للإرسال من Apps Script بتنطبق.
