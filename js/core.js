/* =========================================================
   JMG HR Portal — core.js
   i18n · API client · UI helpers · particles · shell
   ========================================================= */
(function () {
'use strict';

const CFG = Object.assign({ API_URL: '', LOGO: 'logo.png', PERMISSION_HOURS: 4, WEEKEND: [5, 6] }, window.JMG_CONFIG || {});
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const r2 = n => Math.round(n * 100) / 100;
const fmtNum = n => (Number.isInteger(n) ? n : r2(n));

/* ------------------------------------------------ icons */
const ICONS = {
  home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7"/><path d="M18 14a6.5 6.5 0 0 1 3.5 6"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  logout: '<path d="M9 4H5v16h4"/><path d="M16 8l4 4-4 4M20 12H9"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 21h4"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  x: '<path d="M6 6l12 12M18 6L6 18"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
  snow: '<path d="M12 2v20M4 7l16 10M20 7L4 17"/>',
  play: '<path d="M7 5l12 7-12 7z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/>',
  download: '<path d="M12 3v12M7 11l5 5 5-5M4 20h16"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  pin: '<path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  wallet: '<path d="M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a1 1 0 0 1-1-1z"/><path d="M4 7l11-3v3"/><circle cx="16" cy="13.5" r="1.2"/>'
};
const icon = (n, s = 18) => `<svg class="ic" width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ''}</svg>`;
const TYPE_ICON = { Leave: 'calendar', Permission: 'clock', Mission: 'pin' };

/* ------------------------------------------------ i18n */
const I18N = {
  ar: {
    app_name: 'بوابة الموارد البشرية', app_sub: 'خدمة الموظفين الذاتية',
    nav_employee: 'حسابي', nav_manager: 'طلبات الفريق', nav_hr: 'الموارد البشرية', nav_settings: 'الإعدادات',
    logout: 'تسجيل الخروج', theme_toggle: 'تبديل الوضع الليلي / النهاري', lang_label: 'English',
    notifications: 'الإشعارات', no_notifs: 'مفيش إشعارات جديدة',
    notif_new: '{who} قدّم طلب ({type}) جديد', notif_approved: 'طلبك ({type}) اتوافق عليه', notif_rejected: 'طلبك ({type}) اترفض',
    greet_m: 'صباح الخير يا {name}', greet_a: 'نهارك سعيد يا {name}', greet_e: 'مساء الخير يا {name}',
    role_Employee: 'موظف', role_Manager: 'مدير مباشر', role_HR: 'موارد بشرية',
    loading: 'جارٍ التحميل…', btn_close: 'إغلاق', btn_no: 'لأ، رجوع', btn_yes: 'أيوه، كمّل', btn_save: 'حفظ', btn_copy: 'نسخ', copied: 'اتنسخ',

    login_h: 'أهلاً بيك في بوابة JMG', login_p: 'سجّل دخولك بالإيميل أو الكود الوظيفي وكمّل شغلك.', login_card: 'تسجيل الدخول',
    f_login: 'الإيميل أو الكود الوظيفي', f_password: 'كلمة المرور', btn_login: 'دخول',

    err_BAD_LOGIN: 'البيانات دي مش مظبوطة، راجعها وجرّب تاني', err_FROZEN: 'الحساب ده متجمّد دلوقتي، كلّم الموارد البشرية',
    err_AUTH: 'الجلسة خلصت، سجّل دخولك تاني', err_FORBIDDEN: 'مش مسموحلك تعمل العملية دي',
    err_NO_LEAVE_BALANCE: 'رصيد الإجازات مش كفاية للمدة دي', err_NO_PERM_HOURS: 'رصيد الأذونات الشهري مش كفاية للمدة دي',
    err_BAD_RANGE: 'راجع التواريخ أو الساعات، البداية لازم تيجي قبل النهاية', err_MISSING: 'كمّل البيانات المطلوبة الأول',
    err_LOCKED: 'الطلب ده اتقفل ومينفعش يتعدّل', err_NOT_FOUND: 'مش لاقيين العنصر ده',
    err_EMAIL_EXISTS: 'الإيميل ده مسجّل قبل كده', err_WRONG_PASSWORD: 'كلمة المرور الحالية مش صح',
    err_WEAK_PASSWORD: 'كلمة المرور لازم تكون ٨ حروف على الأقل', err_BAD_EMAIL: 'الإيميل مش مكتوب صح',
    err_SELF: 'مينفعش تعمل كده على حسابك أنت', err_NETWORK: 'في مشكلة في الاتصال، جرّب تاني', err_NO_API: 'الموقع لسه مش متوصّل بالـ Backend. حط رابط الـ API في js/config.js', err_UNKNOWN: 'حصلت مشكلة غير متوقعة، جرّب تاني',

    t_Leave: 'إجازة', t_Permission: 'إذن', t_Mission: 'مأمورية',
    st_Pending: 'قيد الانتظار', st_Approved: 'تمت الموافقة', st_Rejected: 'مرفوض', st_Cancelled: 'ملغي', st_Active: 'شغّال', st_Frozen: 'متجمّد',
    th_no: 'رقم الطلب', th_type: 'النوع', th_details: 'التفاصيل', th_status: 'الحالة', th_action: 'الإجراء', th_emp: 'الموظف',
    th_name: 'الاسم', th_dept: 'القسم', th_manager: 'المدير', th_balance: 'رصيد الإجازات',
    det_leave: 'من {from} إلى {to} ({n} يوم عمل)', det_perm: 'يوم {date} من {from} إلى {to} ({n} ساعة)', det_mission: 'مأمورية إلى {dest} يوم {date}',
    exp_yes: 'محتاجة سلفة / بدل انتقال', exp_no: 'من غير سلفة', mgr_note: 'ملاحظة المدير: {note}',
    u_days: 'يوم', u_hours: 'ساعة',

    emp_sub: 'ده ملخص رصيدك وطلباتك. كل حاجة قدامك في مكان واحد.',
    btn_new_req: 'تقديم طلب جديد', btn_my_reqs: 'طلباتي',
    c_leave: 'الإجازات السنوية', c_total: 'الإجمالي', c_used: 'المستهلك', c_left: 'المتبقي', c_pending_n: 'منهم {n} قيد الانتظار',
    c_perm: 'رصيد الأذونات الشهري', perm_note: '٤ ساعات كل شهر، بتتجدد أول الشهر ومبتتنقلش للشهر اللي بعده.',
    acc_title: 'عندك {n} طلب قيد الانتظار', acc_none: 'مفيش طلبات معلّقة دلوقتي',
    acc_p: 'هنبلغك أول ما مديرك يرد.', acc_p0: 'تقدر تقدّم طلب جديد في أي وقت من هنا.',
    form_title: 'تقديم طلب جديد', f_type: 'نوع الطلب',
    f_from_date: 'من تاريخ', f_to_date: 'إلى تاريخ', f_perm_date: 'تاريخ اليوم', f_from_time: 'من الساعة', f_to_time: 'إلى الساعة',
    f_mission_date: 'تاريخ المأمورية', f_dest: 'جهة المأمورية / المكان', ph_dest: 'مثلاً: التجمع الخامس', f_exp: 'المأمورية محتاجة سلفة أو بدل انتقال؟',
    btn_submit: 'إرسال الطلب', calc_days: 'المدة: {n} يوم عمل', calc_hours: 'المدة: {n} ساعة',
    toast_sent: 'الطلب اتبعت لمديرك', tbl_title: 'طلباتي', btn_cancel_req: 'إلغاء الطلب',
    locked: 'للقراءة فقط / غير قابل للتعديل', confirm_cancel: 'متأكد إنك عايز تلغي الطلب ده؟', toast_cancelled: 'الطلب اتلغى',
    empty_reqs: 'لسه مقدّمتش أي طلبات. أول طلب هيظهر هنا.',
    chart_title: 'الإجازات شهر بشهر', chart_sub: 'أيام الإجازة المعتمدة السنة دي',

    mgr_sub: 'راجع طلبات فريقك وخد قرارك بسرعة.', m_pending: 'مستنية قرارك', m_team: 'عدد أفراد الفريق', m_approved: 'اتوافق عليها الشهر ده',
    mgr_card: 'طلبات الفريق', tab_pending: 'مستنية قرارك', tab_all: 'كل الطلبات',
    btn_approve: 'موافق', btn_reject: 'رفض', reject_title: 'رفض الطلب', reject_ph: 'سبب الرفض (اختياري)',
    reject_hint: 'تقدر تسيب الخانة فاضية لو مش عايز تكتب سبب.', btn_confirm_reject: 'تأكيد الرفض',
    toast_approved: 'تمت الموافقة على الطلب', toast_rejected: 'تم رفض الطلب', empty_team: 'مفيش طلبات مستنية. خلصت كل حاجة.',
    mgr_hero_n: 'عندك {n} طلب مستني قرارك', mgr_hero_0: 'مفيش طلبات مستنية دلوقتي',

    hr_sub: 'إدارة الموظفين والأرصدة والتقارير من مكان واحد.', btn_export: 'تصدير Excel', btn_add_emp: 'إضافة موظف',
    h_total: 'إجمالي الموظفين', h_active: 'حسابات شغّالة', h_frozen: 'حسابات متجمّدة', h_pending: 'طلبات معلّقة',
    add_title: 'إضافة موظف جديد', f_name: 'اسم الموظف', f_email: 'الإيميل', f_balance: 'رصيد الإجازات السنوي (يوم)', f_manager: 'المدير المباشر',
    f_dept: 'القسم', f_role: 'الدور الوظيفي', f_temp_pass: 'كلمة مرور مؤقتة', ph_temp: 'سيبها فاضية وهنولّد واحدة', none_opt: 'من غير مدير', btn_save_emp: 'حفظ الموظف',
    emp_created_title: 'الموظف اتضاف', emp_created_body: 'ادّي الموظف بيانات الدخول دي. كلمة المرور مش هتظهر تاني.', cred_id: 'الكود الوظيفي', cred_pass: 'كلمة المرور المؤقتة',
    users_title: 'الموظفين', btn_freeze: 'تجميد الحساب', btn_unfreeze: 'إلغاء التجميد', btn_delete: 'مسح الموظف', btn_edit_bal: 'تعديل الرصيد', btn_reset_pw: 'إعادة تعيين كلمة المرور',
    confirm_delete: 'هتمسح {name} نهائياً. متأكد؟', confirm_freeze: 'تجمّد حساب {name}؟', confirm_unfreeze: 'ترجّع حساب {name} شغّال؟',
    edit_bal_title: 'تعديل رصيد {name}', f_new_balance: 'الرصيد السنوي الجديد (يوم)', toast_saved: 'اتحفظ', toast_deleted: 'الموظف اتمسح', toast_frozen: 'الحساب اتجمّد', toast_unfrozen: 'الحساب رجع شغّال',
    reset_done_title: 'كلمة مرور جديدة', all_reqs_title: 'كل الطلبات', export_done: 'الملف اتنزّل',
    sheet_users: 'الموظفين', sheet_reqs: 'الطلبات', sheet_perms: 'الأذونات', sheet_att: 'الحضور والغياب', col_date: 'التاريخ', col_hours: 'الساعات', col_days: 'الأيام',
    empty_users: 'مفيش موظفين لسه. ابدأ بإضافة أول موظف.', left_of: '{r} من {t}',

    set_sub: 'غيّر كلمة المرور وظبّط تنبيهات الإيميل.', pw_title: 'تغيير كلمة المرور',
    f_cur_pw: 'كلمة المرور الحالية', f_new_pw: 'كلمة المرور الجديدة', f_conf_pw: 'تأكيد كلمة المرور الجديدة', btn_change_pw: 'تغيير كلمة المرور',
    pw_mismatch: 'كلمتين المرور مش زي بعض', toast_pw: 'كلمة المرور اتغيّرت',
    mail_title: 'تنبيهات الإيميل', mail_desc_emp: 'هيوصلك إيميل لما طلبك يتوافق عليه أو يترفض.', mail_desc_mgr: 'وكمان هيوصلك إيميل لما حد من فريقك يقدّم طلب جديد.',
    mail_toggle: 'فعّل تنبيهات الإيميل', f_notify_email: 'إيميل التنبيهات', btn_save_mail: 'حفظ إعدادات الإيميل', toast_mail: 'إعدادات الإيميل اتحفظت'
  },
  en: {
    app_name: 'HR Portal', app_sub: 'Employee Self-Service',
    nav_employee: 'My account', nav_manager: 'Team requests', nav_hr: 'HR admin', nav_settings: 'Settings',
    logout: 'Sign out', theme_toggle: 'Toggle dark / light mode', lang_label: 'عربي',
    notifications: 'Notifications', no_notifs: "You're all caught up",
    notif_new: '{who} submitted a new {type} request', notif_approved: 'Your {type} request was approved', notif_rejected: 'Your {type} request was declined',
    greet_m: 'Good morning, {name}', greet_a: 'Good afternoon, {name}', greet_e: 'Good evening, {name}',
    role_Employee: 'Employee', role_Manager: 'Line manager', role_HR: 'HR',
    loading: 'Loading…', btn_close: 'Close', btn_no: 'No, go back', btn_yes: 'Yes, continue', btn_save: 'Save', btn_copy: 'Copy', copied: 'Copied',

    login_h: 'Welcome to the JMG Portal', login_p: 'Sign in with your email or employee ID to pick up where you left off.', login_card: 'Sign in',
    f_login: 'Email or employee ID', f_password: 'Password', btn_login: 'Sign in',

    err_BAD_LOGIN: "Those details don't match. Check and try again.", err_FROZEN: 'This account is frozen. Please contact HR.',
    err_AUTH: 'Your session expired. Please sign in again.', err_FORBIDDEN: "You don't have permission for this action.",
    err_NO_LEAVE_BALANCE: 'Not enough leave balance for these dates.', err_NO_PERM_HOURS: 'Not enough permission hours left this month.',
    err_BAD_RANGE: 'Check the dates or times: start must come before end.', err_MISSING: 'Please fill in the required fields.',
    err_LOCKED: "This request is locked and can't be changed.", err_NOT_FOUND: 'Item not found.',
    err_EMAIL_EXISTS: 'This email is already registered.', err_WRONG_PASSWORD: 'Current password is incorrect.',
    err_WEAK_PASSWORD: 'Password must be at least 8 characters.', err_BAD_EMAIL: "That email doesn't look right.",
    err_SELF: "You can't do that to your own account.", err_NETWORK: 'Connection problem. Try again.', err_NO_API: 'The site is not connected to the backend yet. Set API_URL in js/config.js.', err_UNKNOWN: 'Something went wrong. Try again.',

    t_Leave: 'Leave', t_Permission: 'Permission', t_Mission: 'Mission',
    st_Pending: 'Pending', st_Approved: 'Approved', st_Rejected: 'Rejected', st_Cancelled: 'Cancelled', st_Active: 'Active', st_Frozen: 'Frozen',
    th_no: 'Request #', th_type: 'Type', th_details: 'Details', th_status: 'Status', th_action: 'Action', th_emp: 'Employee',
    th_name: 'Name', th_dept: 'Department', th_manager: 'Manager', th_balance: 'Leave balance',
    det_leave: '{from} to {to} ({n} working days)', det_perm: '{date}, {from} to {to} ({n} h)', det_mission: 'Mission to {dest} on {date}',
    exp_yes: 'Needs advance / transport allowance', exp_no: 'No advance needed', mgr_note: "Manager's note: {note}",
    u_days: 'days', u_hours: 'h',

    emp_sub: "Here's your balance and requests, all in one place.",
    btn_new_req: 'New request', btn_my_reqs: 'My requests',
    c_leave: 'Annual leave', c_total: 'Total', c_used: 'Used', c_left: 'Remaining', c_pending_n: '{n} of them pending',
    c_perm: 'Monthly permission hours', perm_note: '4 hours a month. Resets on the 1st and does not carry over.',
    acc_title: 'You have {n} pending request(s)', acc_none: 'No pending requests right now',
    acc_p: "We'll let you know as soon as your manager responds.", acc_p0: 'You can submit a new request any time from here.',
    form_title: 'New request', f_type: 'Request type',
    f_from_date: 'From', f_to_date: 'To', f_perm_date: "Today's date", f_from_time: 'From time', f_to_time: 'To time',
    f_mission_date: 'Mission date', f_dest: 'Mission destination', ph_dest: 'e.g. New Cairo', f_exp: 'Does this mission need an advance or transport allowance?',
    btn_submit: 'Send request', calc_days: 'Duration: {n} working day(s)', calc_hours: 'Duration: {n} hour(s)',
    toast_sent: 'Request sent to your manager', tbl_title: 'My requests', btn_cancel_req: 'Cancel request',
    locked: "Read-only / can't be edited", confirm_cancel: 'Cancel this request?', toast_cancelled: 'Request cancelled',
    empty_reqs: 'No requests yet. Your first one will show up here.',
    chart_title: 'Leave by month', chart_sub: 'Approved leave days this year',

    mgr_sub: "Review your team's requests and decide quickly.", m_pending: 'Awaiting your decision', m_team: 'Team size', m_approved: 'Approved this month',
    mgr_card: 'Team requests', tab_pending: 'Awaiting decision', tab_all: 'All requests',
    btn_approve: 'Approve', btn_reject: 'Reject', reject_title: 'Reject request', reject_ph: 'Reason for rejection (optional)',
    reject_hint: 'You can leave this empty if you prefer not to give a reason.', btn_confirm_reject: 'Confirm rejection',
    toast_approved: 'Request approved', toast_rejected: 'Request rejected', empty_team: "Nothing waiting. You're all caught up.",
    mgr_hero_n: '{n} request(s) waiting for your decision', mgr_hero_0: 'Nothing waiting right now',

    hr_sub: 'Manage people, balances and reports in one place.', btn_export: 'Export Excel', btn_add_emp: 'Add employee',
    h_total: 'Total employees', h_active: 'Active accounts', h_frozen: 'Frozen accounts', h_pending: 'Pending requests',
    add_title: 'Add a new employee', f_name: 'Employee name', f_email: 'Email', f_balance: 'Annual leave balance (days)', f_manager: 'Line manager',
    f_dept: 'Department', f_role: 'Role', f_temp_pass: 'Temporary password', ph_temp: "Leave empty and we'll generate one", none_opt: 'No manager', btn_save_emp: 'Save employee',
    emp_created_title: 'Employee added', emp_created_body: "Share these sign-in details with the employee. The password won't be shown again.", cred_id: 'Employee ID', cred_pass: 'Temporary password',
    users_title: 'Employees', btn_freeze: 'Freeze account', btn_unfreeze: 'Unfreeze', btn_delete: 'Delete employee', btn_edit_bal: 'Edit balance', btn_reset_pw: 'Reset password',
    confirm_delete: 'Delete {name} permanently?', confirm_freeze: 'Freeze the account of {name}?', confirm_unfreeze: 'Reactivate the account of {name}?',
    edit_bal_title: 'Edit balance for {name}', f_new_balance: 'New annual balance (days)', toast_saved: 'Saved', toast_deleted: 'Employee deleted', toast_frozen: 'Account frozen', toast_unfrozen: 'Account reactivated',
    reset_done_title: 'New password', all_reqs_title: 'All requests', export_done: 'File downloaded',
    sheet_users: 'Employees', sheet_reqs: 'Requests', sheet_perms: 'Permissions', sheet_att: 'Attendance', col_date: 'Date', col_hours: 'Hours', col_days: 'Days',
    empty_users: 'No employees yet. Start by adding the first one.', left_of: '{r} of {t}',

    set_sub: 'Change your password and set up email alerts.', pw_title: 'Change password',
    f_cur_pw: 'Current password', f_new_pw: 'New password', f_conf_pw: 'Confirm new password', btn_change_pw: 'Change password',
    pw_mismatch: "The two passwords don't match", toast_pw: 'Password changed',
    mail_title: 'Email alerts', mail_desc_emp: "You'll get an email when your request is approved or rejected.", mail_desc_mgr: "You'll also get an email when someone on your team submits a request.",
    mail_toggle: 'Turn on email alerts', f_notify_email: 'Alert email', btn_save_mail: 'Save email settings', toast_mail: 'Email settings saved'
  }
};

const State = {
  lang: localStorage.getItem('jmg_lang') || 'ar',
  theme: localStorage.getItem('jmg_theme') || 'light',
  notifs: null
};
const langListeners = [];

function t(key, vars) {
  let s = I18N[State.lang] && I18N[State.lang][key];
  if (s == null) s = I18N.ar[key];
  if (s == null) return key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ''));
  return s;
}
const errMsg = e => (I18N[State.lang]['err_' + (e && e.code)] || t('err_UNKNOWN'));
const locale = () => (State.lang === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB');

function applyI18n(root = document) {
  $$('[data-i18n]', root).forEach(el => { el.textContent = t(el.dataset.i18n); });
  $$('[data-i18n-ph]', root).forEach(el => { el.placeholder = t(el.dataset.i18nPh); });
  $$('[data-i18n-title]', root).forEach(el => { el.title = t(el.dataset.i18nTitle); el.setAttribute('aria-label', t(el.dataset.i18nTitle)); });
  document.title = t('app_name') + ' | JMG';
}
function setLang(l) {
  State.lang = l;
  localStorage.setItem('jmg_lang', l);
  document.documentElement.lang = l;
  document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr';
  applyI18n();
  refreshShellText();
  langListeners.forEach(f => f());
}
function setTheme(th) {
  State.theme = th;
  localStorage.setItem('jmg_theme', th);
  document.documentElement.setAttribute('data-theme', th);
  const b = $('#themeBtn');
  if (b) b.innerHTML = icon(th === 'dark' ? 'sun' : 'moon', 20);
}

/* ------------------------------------------------ date helpers */
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseD = s => new Date(s + 'T12:00:00');
function workingDays(s, e) {
  if (!s || !e) return 0;
  const a = parseD(s), b = parseD(e);
  if (isNaN(a) || isNaN(b) || b < a) return 0;
  let n = 0;
  for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) if (!CFG.WEEKEND.includes(d.getDay())) n++;
  return n;
}
function hoursBetween(a, b) {
  if (!a || !b) return 0;
  const [h1, m1] = a.split(':').map(Number), [h2, m2] = b.split(':').map(Number);
  return r2(((h2 * 60 + m2) - (h1 * 60 + m1)) / 60);
}
const monthKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;

/* ------------------------------------------------ session */
const Session = {
  get() { try { const s = JSON.parse(localStorage.getItem('jmg_session')); if (s && s.exp > Date.now()) return s; } catch (e) { /* ignore */ } return null; },
  set(token, user) { localStorage.setItem('jmg_session', JSON.stringify({ token, user, exp: Date.now() + 6 * 3600e3 })); },
  patch(p) { const s = this.get(); if (s) { s.user = Object.assign(s.user, p); localStorage.setItem('jmg_session', JSON.stringify(s)); } },
  clear() { localStorage.removeItem('jmg_session'); }
};
const homeFor = role => (role === 'HR' ? 'hr' : role === 'Manager' ? 'manager' : 'employee');
const makeErr = code => { const e = new Error(code); e.code = code; return e; };

/* ------------------------------------------------ API */
async function call(action, payload) {
  if (!CFG.API_URL) throw makeErr('NO_API');
  let res, j;
  try {
    res = await fetch(CFG.API_URL, {
      method: 'POST', redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, payload: payload || {}, token: (Session.get() || {}).token || '' })
    });
  } catch (e) { throw makeErr('NETWORK'); }
  try { j = await res.json(); } catch (e) { throw makeErr('UNKNOWN'); }
  if (!j.ok) {
    if (j.code === 'AUTH') { Session.clear(); if (document.body.dataset.page !== 'login') location.replace('./'); }
    throw makeErr(j.code || 'UNKNOWN');
  }
  return j.data;
}
const cache = {
  get(k) { try { return JSON.parse(localStorage.getItem('jmg_c_' + k)); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('jmg_c_' + k, JSON.stringify(v)); } catch (e) { /* quota */ } }
};

/* ------------------------------------------------ UI helpers */
function toast(msg, kind = 'ok') {
  let box = $('#toasts');
  if (!box) { box = document.createElement('div'); box.id = 'toasts'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
  const el = document.createElement('div');
  el.className = 'toast ' + kind;
  el.innerHTML = icon(kind === 'err' ? 'x' : 'check', 16) + '<span>' + esc(msg) + '</span>';
  box.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 3400);
}
function modal({ title, body, actions = [] }) {
  const ov = document.createElement('div');
  ov.className = 'overlay';
  ov.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><div class="modal-h"><h3>${esc(title)}</h3><button class="btn-icon" data-x aria-label="${esc(t('btn_close'))}">${icon('x')}</button></div><div class="modal-b">${body || ''}</div><div class="modal-f"></div></div>`;
  const foot = $('.modal-f', ov);
  const onKey = e => { if (e.key === 'Escape') close(); };
  function close() { document.removeEventListener('keydown', onKey); ov.classList.add('out'); setTimeout(() => ov.remove(), 200); }
  actions.forEach(a => {
    const b = document.createElement('button');
    b.className = 'btn ' + (a.cls || 'btn-soft'); b.textContent = a.label;
    b.onclick = async () => {
      if (a.onClick) { b.classList.add('busy'); let r; try { r = await a.onClick(ov); } finally { b.classList.remove('busy'); } if (r === false) return; }
      if (a.close !== false) close();
    };
    foot.appendChild(b);
  });
  $('[data-x]', ov).onclick = close;
  ov.addEventListener('mousedown', e => { if (e.target === ov) close(); });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(ov);
  const first = $('input,textarea,select', ov) || $('.modal-f .btn:last-child', ov);
  if (first) first.focus();
  return { el: ov, close };
}
function confirmDialog(message, { danger = false } = {}) {
  return new Promise(res => {
    let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    const m = modal({
      title: message, body: '',
      actions: [
        { label: t('btn_no'), cls: 'btn-soft', onClick: () => { fin(false); } },
        { label: t('btn_yes'), cls: danger ? 'btn-bad' : 'btn-gold', onClick: () => { fin(true); } }
      ]
    });
    m.el.addEventListener('transitionend', () => fin(false));
    $('[data-x]', m.el).addEventListener('click', () => fin(false));
  });
}
const typeLabel = ty => t('t_' + ty);
const badge = st => `<span class="badge ${esc(st)}">${esc(t('st_' + st))}</span>`;
function describe(r) {
  if (r.type === 'Leave') return esc(t('det_leave', { from: r.startDate, to: r.endDate, n: fmtNum(r.duration) }));
  if (r.type === 'Permission') return esc(t('det_perm', { date: r.startDate, from: r.startTime, to: r.endTime, n: fmtNum(r.duration) }));
  return esc(t('det_mission', { dest: r.mission, date: r.startDate })) + `<span class="sm">${esc(t(r.needsExpenses ? 'exp_yes' : 'exp_no'))}</span>`;
}
const typeCell = ty => `<span class="type-pill">${icon(TYPE_ICON[ty], 16)}${esc(typeLabel(ty))}</span>`;
const lockedCell = () => `<span class="locked">${icon('lock', 15)}${esc(t('locked'))}</span>`;
function greet(user) {
  const h = new Date().getHours();
  const k = h < 12 ? 'greet_m' : h < 17 ? 'greet_a' : 'greet_e';
  return t(k, { name: String(user.name || '').split(' ')[0] });
}
function countUp(el, to, dur = 900) {
  if (!el) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmtNum(to); return; }
  const dec = Number.isInteger(to) ? 0 : 1, t0 = performance.now();
  (function f(now) {
    const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = p < 1 ? (to * e).toFixed(dec) : String(fmtNum(to));
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
function stagger(root = document) { $$('.reveal', root).forEach((el, i) => el.style.setProperty('--i', i)); }
function setBusy(btn, on) { if (btn) { btn.classList.toggle('busy', on); btn.disabled = on; } }

/* ------------------------------------------------ 3D tilt */
function initTilt(root = document) {
  if (matchMedia('(hover: none)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  $$('[data-tilt]', root).forEach(el => {
    if (el._tilt) return; el._tilt = true;
    const max = parseFloat(el.dataset.tilt) || 7;
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.transform = `perspective(1000px) rotateX(${((0.5 - py) * max).toFixed(2)}deg) rotateY(${((px - 0.5) * max).toFixed(2)}deg) translateY(-3px)`;
      el.style.setProperty('--gx', (px * 100).toFixed(1) + '%'); el.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
    });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; });
  });
}

/* ------------------------------------------------ gold particles canvas */
function initParticles() {
  const cv = $('#bg');
  if (!cv || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const ctx = cv.getContext('2d');
  let W, H, P = [], raf;
  const m = { x: -1e4, y: -1e4 };
  const mk = () => ({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .3, vy: (Math.random() - .5) * .3, r: Math.random() * 1.8 + .8, a: Math.random() * .45 + .4, ph: Math.random() * 6.28 });
  function size() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.min(90, Math.round(W * H / 17000));
    while (P.length < n) P.push(mk()); P.length = n;
  }
  function frame(ts) {
    ctx.clearRect(0, 0, W, H);
    const dark = State.theme === 'dark';
    ctx.globalCompositeOperation = dark ? 'lighter' : 'source-over';
    const core = dark ? '246,214,140' : '190,134,34', glow = dark ? '232,183,84' : '201,154,53';
    for (const p of P) {
      const dx = m.x - p.x, dy = m.y - p.y, d = Math.hypot(dx, dy);
      if (d < 220) { const f = (1 - d / 220) * .06; p.vx += dx / d * f; p.vy += dy / d * f; }
      p.vx += Math.sin(ts / 2400 + p.ph) * .003; p.vy += Math.cos(ts / 2900 + p.ph) * .003;
      p.vx *= .985; p.vy *= .985;
      const sp = Math.hypot(p.vx, p.vy); if (sp > 1.8) { p.vx *= 1.8 / sp; p.vy *= 1.8 / sp; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < -10) p.x = W + 10; else if (p.x > W + 10) p.x = -10;
      if (p.y < -10) p.y = H + 10; else if (p.y > H + 10) p.y = -10;
      const al = p.a * (.7 + .3 * Math.sin(ts / 650 + p.ph));
      ctx.beginPath(); ctx.fillStyle = `rgba(${glow},${(al * .16).toFixed(3)})`; ctx.arc(p.x, p.y, p.r * 5, 0, 6.283); ctx.fill();
      ctx.beginPath(); ctx.fillStyle = `rgba(${core},${al.toFixed(3)})`; ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
      if (d < 160) { ctx.beginPath(); ctx.strokeStyle = `rgba(${core},${((1 - d / 160) * .35).toFixed(3)})`; ctx.lineWidth = .8; ctx.moveTo(p.x, p.y); ctx.lineTo(m.x, m.y); ctx.stroke(); }
    }
    raf = requestAnimationFrame(frame);
  }
  size();
  addEventListener('resize', size);
  addEventListener('mousemove', e => { m.x = e.clientX; m.y = e.clientY; }, { passive: true });
  addEventListener('touchmove', e => { const q = e.touches[0]; if (q) { m.x = q.clientX; m.y = q.clientY; } }, { passive: true });
  document.addEventListener('mouseleave', () => { m.x = m.y = -1e4; });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancelAnimationFrame(raf); else raf = requestAnimationFrame(frame); });
  raf = requestAnimationFrame(frame);
}

/* ------------------------------------------------ app shell (sidebar + topbar + bell) */
const logoHTML = () => `<a class="logo-full" href="${homeFor((Session.get()||{user:{}}).user.role)}"><img src="${esc(CFG.LOGO)}" alt="JMG Real Estate" onerror="this.style.display='none';this.nextElementSibling.style.display='block'"><span class="logo-text">JMG Real Estate</span></a>`;
function navItems(role) {
  const a = [];
  if (role === 'HR') a.push(['hr', 'shield', 'nav_hr']);
  if (role === 'Manager') a.push(['manager', 'users', 'nav_manager']);
  a.push(['employee', 'home', 'nav_employee']);
  a.push(['settings', 'sliders', 'nav_settings']);
  return a;
}
function buildShell(user, page) {
  const side = $('#sidebar'), top = $('#topbar');
  const cur = location.pathname.split('/').pop().replace(/\.html$/, '');
  if (side) {
    side.innerHTML = `
      <div class="side-top">${logoHTML()}</div>
      <nav class="side-nav">${navItems(user.role).map(([href, ic, key]) => `<a class="side-link ${cur === href ? 'active' : ''}" href="${href}">${icon(ic, 20)}<span data-i18n="${key}">${esc(t(key))}</span></a>`).join('')}</nav>
      <div class="side-bottom">
        <div class="me"><div class="av">${esc((user.name || '?').trim().charAt(0))}</div><div><b>${esc(user.name)}</b><span data-i18n="role_${esc(user.role)}">${esc(t('role_' + user.role))}</span></div></div>
        <button class="side-link" id="logoutBtn">${icon('logout', 20)}<span data-i18n="logout">${esc(t('logout'))}</span></button>
      </div>`;
    const bd = document.createElement('div'); bd.className = 'drawer-backdrop'; bd.id = 'backdrop'; document.body.appendChild(bd);
    bd.onclick = () => toggleDrawer(false);
    $('#logoutBtn').onclick = async () => { try { await call('logout'); } catch (e) { /* ignore */ } Session.clear(); location.replace('./'); };
  }
  if (top) {
    top.innerHTML = `
      <button class="btn-icon menu-btn" id="menuBtn" data-i18n-title="app_name" title="">${icon('menu', 20)}</button>
      <span class="grow"></span>
      <button class="btn-icon" id="themeBtn" data-i18n-title="theme_toggle"></button>
      <button class="btn-icon lang" id="langBtn">${icon('globe', 18)}<span></span></button>
      <div class="bell-wrap">
        <button class="btn-icon bell" id="bellBtn" data-i18n-title="notifications" aria-haspopup="true">${icon('bell', 20)}<span class="count" id="bellCount" hidden>0</span></button>
        <div class="panel" id="bellPanel" hidden></div>
      </div>
      <div class="av" title="${esc(user.name)}">${esc((user.name || '?').trim().charAt(0))}</div>`;
    $('#menuBtn').onclick = () => toggleDrawer(true);
    wireToggles();
    const bell = $('#bellBtn'), panel = $('#bellPanel');
    bell.onclick = e => { e.stopPropagation(); const open = panel.hidden; panel.hidden = !open; if (open) { renderBell(true); localStorage.setItem('jmg_seen_' + user.id, String(Date.now())); $('#bellCount').hidden = true; } };
    document.addEventListener('click', e => { if (!panel.contains(e.target)) panel.hidden = true; });
  }
  const hero = $('.hero');
  if (hero && !$('.hero-bg', hero)) hero.insertAdjacentHTML('afterbegin', '<div class="hero-bg"></div>');
  refreshShellText();
}
function toggleDrawer(on) { const s = $('#sidebar'), b = $('#backdrop'); if (s) s.classList.toggle('open', on); if (b) b.classList.toggle('show', on); }
function refreshShellText() {
  const lb = $('#langBtn span'); if (lb) lb.textContent = t('lang_label');
  const tb = $('#themeBtn'); if (tb) tb.innerHTML = icon(State.theme === 'dark' ? 'sun' : 'moon', 20);
  if (State.notifs) renderBell(false);
}
function wireToggles() {
  const tb = $('#themeBtn'), lb = $('#langBtn');
  if (tb) { tb.innerHTML = icon(State.theme === 'dark' ? 'sun' : 'moon', 20); tb.onclick = () => setTheme(State.theme === 'dark' ? 'light' : 'dark'); }
  if (lb) { const sp = $('span', lb); if (sp) sp.textContent = t('lang_label'); lb.onclick = () => setLang(State.lang === 'ar' ? 'en' : 'ar'); }
}
async function loadNotifs() {
  try { State.notifs = await call('notifications'); renderBell(false); } catch (e) { /* silent */ }
}
function renderBell(panelOpen) {
  const s = Session.get(), n = State.notifs; if (!s || !n) return;
  const seen = Number(localStorage.getItem('jmg_seen_' + s.user.id) || 0);
  const unread = n.pendingTotal + n.items.filter(i => i.kind !== 'new_request' && new Date(i.at).getTime() > seen).length;
  const c = $('#bellCount'); if (c) { c.textContent = unread > 9 ? '9+' : unread; c.hidden = unread === 0 || !!panelOpen; }
  const p = $('#bellPanel'); if (!p) return;
  const dest = k => (k === 'new_request' ? (s.user.role === 'HR' ? 'hr' : 'manager') : 'employee');
  p.innerHTML = `<h4>${esc(t('notifications'))}</h4>` + (n.items.length ? n.items.map(i => {
    const txt = t('notif_' + i.kind, { who: i.who, type: typeLabel(i.type) });
    const when = new Date(i.at).toLocaleString(locale(), { dateStyle: 'medium', timeStyle: 'short' });
    return `<a class="notif" href="${dest(i.kind)}"><span class="ni ${esc(i.kind)}">${icon(i.kind === 'rejected' ? 'x' : i.kind === 'approved' ? 'check' : 'bell', 16)}</span><span>${esc(txt)}<small>${esc(when)}</small></span></a>`;
  }).join('') : `<div class="none">${esc(t('no_notifs'))}</div>`);
}

/* ------------------------------------------------ boot */
function boot(opts) {
  if (/\.html$/.test(location.pathname) && history.replaceState) {
    history.replaceState(null, '', location.pathname.replace(/(^|\/)index\.html$/, '$1').replace(/\.html$/, '') + location.search + location.hash);
  }
  document.documentElement.setAttribute('data-theme', State.theme);
  document.documentElement.lang = State.lang;
  document.documentElement.dir = State.lang === 'ar' ? 'rtl' : 'ltr';
  document.body.dataset.page = opts.page;
  const s = Session.get();
  if (opts.page === 'login') {
    if (s) { location.replace(homeFor(s.user.role)); return; }
    applyI18n(); wireToggles();
    const hero = $('.login-hero'); if (hero && !$('.hero-bg', hero)) hero.insertAdjacentHTML('afterbegin', '<div class="hero-bg"></div>');
    initParticles(); stagger(); initTilt();
    if (opts.onReady) opts.onReady();
    return;
  }
  if (!s) { location.replace('./'); return; }
  if (opts.roles && !opts.roles.includes(s.user.role)) { location.replace(homeFor(s.user.role)); return; }
  buildShell(s.user, opts.page);
  applyI18n(); initParticles(); stagger(); initTilt();
  const g = $('#greet'); if (g) { g.textContent = greet(s.user); langListeners.push(() => { g.textContent = greet(s.user); }); }
  loadNotifs();
  if (opts.onReady) opts.onReady(s.user);
}

window.App = {
  CFG, $, $$, esc, icon, t, call, cache, Session, State, boot, toast, modal, confirmDialog, errMsg, applyI18n, setBusy,
  badge, describe, typeCell, typeLabel, lockedCell, countUp, stagger, initTilt, fmtNum, r2, homeFor, loadNotifs, logoHTML, locale,
  workingDays, hoursBetween, monthKey, isoDate, parseD,
  onLang: f => langListeners.push(f)
};
})();
