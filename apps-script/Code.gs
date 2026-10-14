/**
 * JMG HR Portal — Google Apps Script backend
 * -------------------------------------------------------------
 * 1) Create a Google Sheet, then Extensions > Apps Script and paste this file.
 * 2) Project Settings > Script properties > add ADMIN_EMAIL and ADMIN_PASSWORD (min 8 chars), optional ADMIN_NAME.
 *    Then run setup() once (authorize when asked). It creates the sheets and the first HR admin,
 *    then DELETES ADMIN_PASSWORD from the properties, so the password is never stored in plain text anywhere.
 * 3) Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).
 * 4) Paste the Web App URL into js/config.js on the frontend.
 */

const CONFIG = {
  SENDER_NAME: 'إدارة الموارد البشرية JMG',
  TZ: 'Africa/Cairo',
  PERMISSION_HOURS: 4,          // monthly permission allowance (hours)
  WEEKEND: [5, 6],              // 0=Sun ... 5=Fri, 6=Sat (not counted as leave days)
  SESSION_TTL: 21600,           // seconds (6 hours)
  PORTAL_URL: '',               // e.g. https://USERNAME.github.io/REPO/  (used for the email button)
  LOGO_URL: ''                  // public https URL of logo.png (shown in emails; optional)
  // NOTE: no credentials live in this file. The first HR admin comes from Script Properties (see setup()).
};

const SCHEMA = {
  Users: ['ID', 'Name', 'Email', 'Password', 'Role', 'Manager', 'AnnualBalance', 'Status', 'EmailOptIn', 'Department'],
  Requests: ['ReqID', 'UserID', 'Type', 'StartDate', 'EndDate', 'StartTime', 'EndTime', 'MissionDestination', 'NeedsExpenses', 'Status', 'Duration', 'ManagerNote', 'CreatedAt', 'DecidedAt', 'DecidedBy'],
  Permissions: ['UserID', 'MonthYear', 'UsedHours', 'RemainingHours']
};
const TEXT_COLS = {
  Users: ['ID', 'Email', 'Manager', 'Password'],
  Requests: ['ReqID', 'UserID', 'StartDate', 'EndDate', 'StartTime', 'EndTime', 'CreatedAt', 'DecidedAt', 'DecidedBy'],
  Permissions: ['UserID', 'MonthYear']
};

/* ============================================================ setup */
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(SCHEMA).forEach(function (name) {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    const cols = SCHEMA[name];
    sh.getRange(1, 1, 1, cols.length).setValues([cols])
      .setFontWeight('bold').setBackground('#E8B754').setFontColor('#0E0C09');
    sh.setFrozenRows(1);
    TEXT_COLS[name].forEach(function (c) {
      sh.getRange(2, cols.indexOf(c) + 1, sh.getMaxRows() - 1, 1).setNumberFormat('@');
    });
    sh.autoResizeColumns(1, cols.length);
  });
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1 && def.getLastRow() === 0) ss.deleteSheet(def);

  if (readAll_('Users').length === 0) {
    const props = PropertiesService.getScriptProperties();
    const email = String(props.getProperty('ADMIN_EMAIL') || '').trim(), pw = String(props.getProperty('ADMIN_PASSWORD') || '');
    if (!validEmail_(email) || pw.length < 8) {
      throw new Error('Add Script properties ADMIN_EMAIL (valid email) and ADMIN_PASSWORD (8+ chars) in Project Settings, then run setup() again.');
    }
    append_('Users', {
      ID: 'HR001', Name: props.getProperty('ADMIN_NAME') || 'مسؤول الموارد البشرية', Email: email, Password: makePw_(pw),
      Role: 'HR', Manager: '', AnnualBalance: 21, Status: 'Active', EmailOptIn: false, Department: 'الموارد البشرية'
    });
    props.deleteProperty('ADMIN_PASSWORD');
    Logger.log('Setup done. Sign in with ID HR001 or ' + email);
  } else {
    Logger.log('Setup done. Users already exist, no admin created.');
  }
}

/* ============================================================ web app entry */
function doGet() {
  return ContentService.createTextOutput('JMG HR API is running').setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  let out;
  try {
    const req = JSON.parse(e.postData.contents);
    out = { ok: true, data: route_(req) };
  } catch (err) {
    out = { ok: false, code: err.code || 'UNKNOWN', error: String(err.message || err) };
    if (!err.code) console.error(err);
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function fail_(code) { const e = new Error(code); e.code = code; throw e; }

const WRITES = { submitRequest: 1, cancelRequest: 1, decide: 1, changePassword: 1, saveEmail: 1, hrAddUser: 1, hrUpdateBalance: 1, hrSetStatus: 1, hrDeleteUser: 1, hrResetPassword: 1 };

function route_(req) {
  const a = req.action, p = req.payload || {};
  if (a === 'login') return login_(p);
  const me = auth_(req.token);
  const H = {
    logout: logout_, me: me_, dashboard: dashboard_, submitRequest: submitRequest_, cancelRequest: cancelRequest_,
    teamRequests: teamRequests_, decide: decide_, notifications: notifications_, changePassword: changePassword_, saveEmail: saveEmail_,
    hrOverview: hrOverview_, hrAddUser: hrAddUser_, hrUpdateBalance: hrUpdateBalance_, hrSetStatus: hrSetStatus_,
    hrDeleteUser: hrDeleteUser_, hrResetPassword: hrResetPassword_, hrExport: hrExport_
  };
  if (!H[a]) fail_('NOT_FOUND');
  if (WRITES[a]) {
    const lock = LockService.getScriptLock();
    lock.waitLock(20000);
    try { return H[a](me, p, req.token); } finally { lock.releaseLock(); }
  }
  return H[a](me, p, req.token);
}

/* ============================================================ db helpers */
function SS_() { return SpreadsheetApp.getActiveSpreadsheet(); }
function sheet_(n) { const s = SS_().getSheetByName(n); if (!s) fail_('UNKNOWN'); return s; }

function readAll_(name) {
  const sh = SS_().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  const vals = sh.getRange(1, 1, sh.getLastRow(), SCHEMA[name].length).getValues();
  const head = vals.shift();
  return vals.map(function (r, i) {
    const o = { _row: i + 2 };
    head.forEach(function (k, j) { o[k] = r[j]; });
    return o;
  }).filter(function (o) { return String(o[SCHEMA[name][0]]) !== ''; });
}
function append_(name, obj) {
  const sh = sheet_(name);
  const row = SCHEMA[name].map(function (k) { return obj[k] === undefined ? '' : obj[k]; });
  const r = sh.getLastRow() + 1;
  TEXT_COLS[name].forEach(function (c) { sh.getRange(r, SCHEMA[name].indexOf(c) + 1).setNumberFormat('@'); });
  sh.getRange(r, 1, 1, row.length).setValues([row]);
}
function update_(name, rowNum, obj) {
  const sh = sheet_(name), cols = SCHEMA[name];
  Object.keys(obj).forEach(function (k) {
    const c = cols.indexOf(k);
    if (c > -1) sh.getRange(rowNum, c + 1).setValue(obj[k]);
  });
}
function deleteRow_(name, rowNum) { sheet_(name).deleteRow(rowNum); }

function s_(v) { return v === null || v === undefined ? '' : String(v); }
function b_(v) { return v === true || String(v).toUpperCase() === 'TRUE'; }
function d_(v) { return v instanceof Date ? Utilities.formatDate(v, CONFIG.TZ, 'yyyy-MM-dd') : s_(v); }
function tm_(v) { return v instanceof Date ? Utilities.formatDate(v, CONFIG.TZ, 'HH:mm') : s_(v); }
function r2_(n) { return Math.round(n * 100) / 100; }
function nowIso_() { return new Date().toISOString(); }
function monthKey_(d) { return Utilities.formatDate(d || new Date(), CONFIG.TZ, 'yyyy-MM'); }

function userObj_(r) {
  return {
    id: s_(r.ID), name: s_(r.Name), email: s_(r.Email), role: s_(r.Role), manager: s_(r.Manager),
    annualBalance: Number(r.AnnualBalance) || 0, status: s_(r.Status) || 'Active', emailOptIn: b_(r.EmailOptIn),
    department: s_(r.Department), _row: r._row, _pw: s_(r.Password)
  };
}
function pub_(u) {
  return { id: u.id, name: u.name, email: u.email, role: u.role, manager: u.manager, annualBalance: u.annualBalance, status: u.status, emailOptIn: u.emailOptIn, department: u.department };
}
function reqObj_(r) {
  return {
    reqId: s_(r.ReqID), userId: s_(r.UserID), type: s_(r.Type), startDate: d_(r.StartDate), endDate: d_(r.EndDate),
    startTime: tm_(r.StartTime), endTime: tm_(r.EndTime), mission: s_(r.MissionDestination), needsExpenses: b_(r.NeedsExpenses),
    status: s_(r.Status), duration: Number(r.Duration) || 0, note: s_(r.ManagerNote), createdAt: s_(r.CreatedAt),
    decidedAt: s_(r.DecidedAt), decidedBy: s_(r.DecidedBy), _row: r._row
  };
}
function allUsers_() { return readAll_('Users').map(userObj_); }
function allReqs_() { return readAll_('Requests').map(reqObj_); }
function strip_(r) { const c = {}; Object.keys(r).forEach(function (k) { if (k !== '_row') c[k] = r[k]; }); return c; }
function byNew_(a, b) { return a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0; }
function named_(users, r) { const u = users.filter(function (x) { return x.id === r.userId; })[0]; const c = strip_(r); c.userName = u ? u.name : r.userId; return c; }

function nextId_(name, col, prefix, width) {
  let max = 0;
  readAll_(name).forEach(function (r) { const m = String(r[col]).match(/(\d+)$/); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  return prefix + String(max + 1).padStart(width, '0');
}
function nextUserId_(role) {
  const pre = role === 'HR' ? 'HR' : role === 'Manager' ? 'MGR' : 'EMP';
  let max = 0;
  readAll_('Users').forEach(function (r) { const m = String(r.ID).match(/(\d+)$/); if (m) max = Math.max(max, parseInt(m[1], 10)); });
  return pre + String(max + 1).padStart(3, '0');
}

/* ============================================================ passwords & sessions */
function hash_(pw, salt) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pw, Utilities.Charset.UTF_8);
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}
function makePw_(pw) { const salt = Utilities.getUuid().replace(/-/g, '').slice(0, 16); return salt + '$' + hash_(pw, salt); }
function checkPw_(pw, stored) {
  stored = String(stored);
  const i = stored.indexOf('$');
  if (i < 0) return stored !== '' && stored === pw;          // plain text typed by an admin directly in the sheet
  return hash_(pw, stored.slice(0, i)) === stored.slice(i + 1);
}
function randPw_(n) {
  const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let s = '';
  for (let i = 0; i < n; i++) s += c.charAt(Math.floor(Math.random() * c.length));
  return s;
}
function validEmail_(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

function login_(p) {
  const key = String(p.login || '').trim().toLowerCase(), pw = String(p.password || '');
  if (!key || !pw) fail_('BAD_LOGIN');
  const u = allUsers_().filter(function (x) { return x.id.toLowerCase() === key || x.email.toLowerCase() === key; })[0];
  if (!u || !checkPw_(pw, u._pw)) fail_('BAD_LOGIN');
  if (u.status !== 'Active') fail_('FROZEN');
  if (u._pw.indexOf('$') < 0) {                                // upgrade a plain-text password to a salted hash
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { update_('Users', u._row, { Password: makePw_(pw) }); } finally { lock.releaseLock(); }
  }
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  CacheService.getScriptCache().put('s_' + token, u.id, CONFIG.SESSION_TTL);
  return { token: token, user: pub_(u) };
}
function auth_(token) {
  if (!token) fail_('AUTH');
  const cache = CacheService.getScriptCache();
  const id = cache.get('s_' + token);
  if (!id) fail_('AUTH');
  const u = allUsers_().filter(function (x) { return x.id === id; })[0];
  if (!u || u.status !== 'Active') { cache.remove('s_' + token); fail_('AUTH'); }
  cache.put('s_' + token, id, CONFIG.SESSION_TTL);
  return u;
}
function logout_(me, p, token) { CacheService.getScriptCache().remove('s_' + token); return { ok: true }; }
function me_(me) { return pub_(me); }
function needHR_(me) { if (me.role !== 'HR') fail_('FORBIDDEN'); }

/* ============================================================ business rules */
function parseDate_(s) { const a = String(s).split('-'); return new Date(Number(a[0]), Number(a[1]) - 1, Number(a[2]), 12); }
function validDate_(s) { return /^\d{4}-\d{2}-\d{2}$/.test(String(s)) && !isNaN(parseDate_(s).getTime()); }
function validTime_(s) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(s)); }
function workingDays_(s, e) {
  const a = parseDate_(s), b = parseDate_(e);
  if (b < a) return 0;
  let n = 0;
  for (const d = new Date(a.getTime()); d <= b; d.setDate(d.getDate() + 1)) if (CONFIG.WEEKEND.indexOf(d.getDay()) < 0) n++;
  return n;
}
function hoursBetween_(a, b) {
  const x = a.split(':').map(Number), y = b.split(':').map(Number);
  return r2_(((y[0] * 60 + y[1]) - (x[0] * 60 + x[1])) / 60);
}
function leaveBal_(u, reqs) {
  const yr = String(new Date().getFullYear());
  let used = 0, pending = 0;
  reqs.forEach(function (r) {
    if (r.userId === u.id && r.type === 'Leave' && r.startDate.slice(0, 4) === yr) {
      if (r.status === 'Approved') used += r.duration; else if (r.status === 'Pending') pending += r.duration;
    }
  });
  return { total: u.annualBalance, used: used, pending: pending, remaining: Math.max(0, u.annualBalance - used) };
}
function permBal_(uid, mk, reqs) {
  let used = 0, pending = 0;
  reqs.forEach(function (r) {
    if (r.userId === uid && r.type === 'Permission' && r.startDate.slice(0, 7) === mk) {
      if (r.status === 'Approved') used += r.duration; else if (r.status === 'Pending') pending += r.duration;
    }
  });
  const total = CONFIG.PERMISSION_HOURS;
  return { monthYear: mk, total: total, used: r2_(used), pending: r2_(pending), remaining: r2_(Math.max(0, total - used)) };
}
function syncPermRow_(uid, mk, reqs) {
  const b = permBal_(uid, mk, reqs);
  const row = readAll_('Permissions').filter(function (r) { return s_(r.UserID) === uid && s_(r.MonthYear) === mk; })[0];
  if (row) update_('Permissions', row._row, { UsedHours: b.used, RemainingHours: b.remaining });
  else append_('Permissions', { UserID: uid, MonthYear: mk, UsedHours: b.used, RemainingHours: b.remaining });
  return b;
}

/* ============================================================ employee actions */
function dashboard_(me) {
  const reqs = allReqs_(), users = [me];
  const mk = monthKey_();
  const perm = permBal_(me.id, mk, reqs);
  const has = readAll_('Permissions').some(function (r) { return s_(r.UserID) === me.id && s_(r.MonthYear) === mk; });
  if (!has) {                                   // lazily create this month's row (auto-renewal on the 1st)
    const lock = LockService.getScriptLock(); lock.waitLock(10000);
    try { syncPermRow_(me.id, mk, reqs); } finally { lock.releaseLock(); }
  }
  return {
    user: pub_(me), leave: leaveBal_(me, reqs), perm: perm,
    requests: reqs.filter(function (r) { return r.userId === me.id; }).sort(byNew_).map(function (r) { return named_(users, r); })
  };
}

function submitRequest_(me, p) {
  const type = p.type;
  if (['Leave', 'Permission', 'Mission'].indexOf(type) < 0) fail_('MISSING');
  const reqs = allReqs_();
  const r = { ReqID: nextId_('Requests', 'ReqID', 'R', 5), UserID: me.id, Type: type, StartDate: '', EndDate: '', StartTime: '', EndTime: '', MissionDestination: '', NeedsExpenses: false, Status: 'Pending', Duration: 0, ManagerNote: '', CreatedAt: nowIso_(), DecidedAt: '', DecidedBy: '' };

  if (type === 'Leave') {
    if (!validDate_(p.startDate) || !validDate_(p.endDate)) fail_('MISSING');
    const n = workingDays_(p.startDate, p.endDate);
    if (n < 1) fail_('BAD_RANGE');
    const b = leaveBal_(me, reqs);
    if (b.remaining - b.pending < n) fail_('NO_LEAVE_BALANCE');
    r.StartDate = p.startDate; r.EndDate = p.endDate; r.Duration = n;
  } else if (type === 'Permission') {
    if (!validDate_(p.startDate) || !validTime_(p.startTime) || !validTime_(p.endTime)) fail_('MISSING');
    const h = hoursBetween_(p.startTime, p.endTime);
    if (h <= 0) fail_('BAD_RANGE');
    const b = permBal_(me.id, p.startDate.slice(0, 7), reqs);
    if (b.remaining - b.pending < h) fail_('NO_PERM_HOURS');
    r.StartDate = p.startDate; r.EndDate = p.startDate; r.StartTime = p.startTime; r.EndTime = p.endTime; r.Duration = h;
  } else {
    if (!validDate_(p.startDate) || !String(p.mission || '').trim()) fail_('MISSING');
    r.StartDate = p.startDate; r.EndDate = p.startDate; r.MissionDestination = String(p.mission).trim().slice(0, 120); r.NeedsExpenses = !!p.needsExpenses;
  }
  append_('Requests', r);

  const mgr = allUsers_().filter(function (u) { return u.id === me.manager; })[0];
  if (mgr) mail_(mgr, 'طلب ' + TYPE_AR[type] + ' جديد من ' + me.name, 'طلب جديد مستنيك', me.name + ' قدّم طلب ' + TYPE_AR[type] + ' ومحتاج قرارك.', detailRows_(reqObj_(Object.assign({ _row: 0 }, r)), me.name), 'gold');
  return { reqId: r.ReqID };
}

function cancelRequest_(me, p) {
  const r = allReqs_().filter(function (x) { return x.reqId === p.reqId; })[0];
  if (!r) fail_('NOT_FOUND');
  if (r.userId !== me.id) fail_('FORBIDDEN');
  if (r.status !== 'Pending') fail_('LOCKED');
  update_('Requests', r._row, { Status: 'Cancelled', DecidedAt: nowIso_(), DecidedBy: me.id });
  return { ok: true };
}

/* ============================================================ manager actions */
function teamRequests_(me) {
  if (me.role !== 'Manager' && me.role !== 'HR') fail_('FORBIDDEN');
  const users = allUsers_();
  const team = users.filter(function (u) { return me.role === 'HR' ? u.id !== me.id : u.manager === me.id; });
  const ids = {}; team.forEach(function (u) { ids[u.id] = 1; });
  return {
    teamSize: team.length,
    requests: allReqs_().filter(function (r) { return ids[r.userId]; }).sort(byNew_).map(function (r) { return named_(users, r); })
  };
}

function decide_(me, p) {
  if (['Approved', 'Rejected'].indexOf(p.decision) < 0) fail_('MISSING');
  const reqs = allReqs_(), users = allUsers_();
  const r = reqs.filter(function (x) { return x.reqId === p.reqId; })[0];
  if (!r) fail_('NOT_FOUND');
  const emp = users.filter(function (u) { return u.id === r.userId; })[0];
  if (!emp || emp.id === me.id || (me.role !== 'HR' && emp.manager !== me.id)) fail_('FORBIDDEN');
  if (r.status !== 'Pending') fail_('LOCKED');

  const mk = r.startDate.slice(0, 7);
  if (p.decision === 'Approved') {
    if (r.type === 'Leave' && leaveBal_(emp, reqs).remaining < r.duration) fail_('NO_LEAVE_BALANCE');
    if (r.type === 'Permission' && permBal_(emp.id, mk, reqs).remaining < r.duration) fail_('NO_PERM_HOURS');
  }
  const note = p.decision === 'Rejected' ? String(p.note || '').trim().slice(0, 300) : '';   // note is optional
  update_('Requests', r._row, { Status: p.decision, ManagerNote: note, DecidedAt: nowIso_(), DecidedBy: me.id });

  if (r.type === 'Permission' && p.decision === 'Approved') {
    r.status = 'Approved';
    syncPermRow_(emp.id, mk, reqs.map(function (x) { return x.reqId === r.reqId ? r : x; }));
  }
  const ok = p.decision === 'Approved';
  const after = Object.assign({}, r, { status: p.decision, note: note });
  mail_(emp, 'تم الرد على طلب (' + TYPE_AR[r.type] + ') بتاعك', ok ? 'تمت الموافقة على طلبك' : 'تم رفض طلبك',
    ok ? 'مديرك وافق على طلبك.' : 'للأسف الطلب اترفض.', detailRows_(after, emp.name), ok ? 'ok' : 'bad');
  return { ok: true };
}

function notifications_(me) {
  const reqs = allReqs_(), users = allUsers_();
  const items = []; let pendingTotal = 0;
  if (me.role === 'Manager' || me.role === 'HR') {
    const ids = {};
    users.filter(function (u) { return me.role === 'HR' ? u.id !== me.id : u.manager === me.id; }).forEach(function (u) { ids[u.id] = 1; });
    const pend = reqs.filter(function (r) { return ids[r.userId] && r.status === 'Pending'; }).sort(byNew_);
    pendingTotal = pend.length;
    pend.slice(0, 6).forEach(function (r) { items.push({ kind: 'new_request', reqId: r.reqId, who: named_(users, r).userName, type: r.type, at: r.createdAt }); });
  }
  const cut = Date.now() - 14 * 864e5;
  reqs.filter(function (r) { return r.userId === me.id && (r.status === 'Approved' || r.status === 'Rejected') && r.decidedAt && new Date(r.decidedAt).getTime() > cut; })
    .sort(function (a, b) { return a.decidedAt < b.decidedAt ? 1 : -1; }).slice(0, 6)
    .forEach(function (r) { items.push({ kind: r.status === 'Approved' ? 'approved' : 'rejected', reqId: r.reqId, who: me.name, type: r.type, at: r.decidedAt }); });
  return { items: items, pendingTotal: pendingTotal };
}

/* ============================================================ settings */
function changePassword_(me, p) {
  if (!checkPw_(String(p.current || ''), me._pw)) fail_('WRONG_PASSWORD');
  if (String(p.next || '').length < 8) fail_('WEAK_PASSWORD');
  update_('Users', me._row, { Password: makePw_(String(p.next)) });
  return { ok: true };
}
function saveEmail_(me, p) {
  const email = String(p.email || '').trim(), on = !!p.optIn;
  if ((on || email) && !validEmail_(email)) fail_('BAD_EMAIL');
  if (email && allUsers_().some(function (u) { return u.id !== me.id && u.email.toLowerCase() === email.toLowerCase(); })) fail_('EMAIL_EXISTS');
  const patch = { EmailOptIn: on && !!email };
  if (email) patch.Email = email;
  update_('Users', me._row, patch);
  const u = pub_(me);
  if (email) u.email = email;
  u.emailOptIn = patch.EmailOptIn;
  return u;
}

/* ============================================================ HR actions */
function hrOverview_(me) {
  needHR_(me);
  const users = allUsers_(), reqs = allReqs_();
  return {
    users: users.map(function (u) {
      const b = leaveBal_(u, reqs), m = users.filter(function (x) { return x.id === u.manager; })[0];
      const o = pub_(u); o.leaveUsed = b.used; o.leaveRemaining = b.remaining; o.managerName = m ? m.name : '';
      return o;
    }),
    requests: reqs.sort(byNew_).map(function (r) { return named_(users, r); }),
    managers: users.filter(function (u) { return u.role === 'Manager'; }).map(function (u) { return { id: u.id, name: u.name }; })
  };
}
function hrAddUser_(me, p) {
  needHR_(me);
  const name = String(p.name || '').trim(), email = String(p.email || '').trim();
  if (!name || !email) fail_('MISSING');
  if (!validEmail_(email)) fail_('BAD_EMAIL');
  const users = allUsers_();
  if (users.some(function (u) { return u.email.toLowerCase() === email.toLowerCase(); })) fail_('EMAIL_EXISTS');
  const role = ['Employee', 'Manager', 'HR'].indexOf(p.role) > -1 ? p.role : 'Employee';
  let pw = String(p.password || '');
  if (pw && pw.length < 8) fail_('WEAK_PASSWORD');
  if (!pw) pw = randPw_(10);
  const mgr = users.filter(function (u) { return u.id === p.manager; })[0];
  const id = nextUserId_(role);
  append_('Users', {
    ID: id, Name: name.slice(0, 80), Email: email, Password: makePw_(pw), Role: role, Manager: mgr ? mgr.id : '',
    AnnualBalance: Math.max(0, Number(p.annualBalance) || 0), Status: 'Active', EmailOptIn: false, Department: String(p.department || '').trim().slice(0, 60)
  });
  return { id: id, password: pw };
}
function findUserOrFail_(id) {
  const u = allUsers_().filter(function (x) { return x.id === id; })[0];
  if (!u) fail_('NOT_FOUND');
  return u;
}
function hrUpdateBalance_(me, p) {
  needHR_(me);
  const u = findUserOrFail_(p.id), v = Number(p.annualBalance);
  if (!isFinite(v) || v < 0) fail_('MISSING');
  update_('Users', u._row, { AnnualBalance: v });
  return { ok: true };
}
function hrSetStatus_(me, p) {
  needHR_(me);
  const u = findUserOrFail_(p.id);
  if (u.id === me.id) fail_('SELF');
  update_('Users', u._row, { Status: p.status === 'Frozen' ? 'Frozen' : 'Active' });
  return { ok: true };
}
function hrDeleteUser_(me, p) {
  needHR_(me);
  const u = findUserOrFail_(p.id);
  if (u.id === me.id) fail_('SELF');
  allUsers_().forEach(function (x) { if (x.manager === u.id) update_('Users', x._row, { Manager: '' }); });
  deleteRow_('Users', u._row);
  return { ok: true };
}
function hrResetPassword_(me, p) {
  needHR_(me);
  const u = findUserOrFail_(p.id), pw = randPw_(10);
  update_('Users', u._row, { Password: makePw_(pw) });
  return { password: pw };
}
function hrExport_(me) {
  needHR_(me);
  const users = allUsers_(), reqs = allReqs_(), mk = monthKey_();
  return {
    users: users.map(function (u) {
      const b = leaveBal_(u, reqs), m = users.filter(function (x) { return x.id === u.manager; })[0];
      return { id: u.id, name: u.name, email: u.email, role: u.role, department: u.department, manager: m ? m.name : '', annualBalance: u.annualBalance, leaveUsed: b.used, leaveRemaining: b.remaining, status: u.status };
    }),
    requests: reqs.sort(byNew_).map(function (r) { return named_(users, r); }),
    permissions: users.map(function (u) { const b = permBal_(u.id, mk, reqs); return { userId: u.id, userName: u.name, monthYear: mk, usedHours: b.used, remainingHours: b.remaining }; })
  };
}

/* ============================================================ emails (Opt-In, branded HTML) */
const TYPE_AR = { Leave: 'إجازة', Permission: 'إذن', Mission: 'مأمورية' };
const STATUS_AR = { Pending: 'قيد الانتظار', Approved: 'تمت الموافقة', Rejected: 'مرفوض', Cancelled: 'ملغي' };

function escHtml_(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

function detailRows_(r, who) {
  const rows = [['الموظف', who], ['نوع الطلب', TYPE_AR[r.type]]];
  const startDate = r.startDate || d_(r.StartDate), endDate = r.endDate || d_(r.EndDate);
  if (r.type === 'Leave') {
    rows.push(['المدة', 'من ' + startDate + ' إلى ' + endDate + ' (' + r.duration + ' يوم عمل)']);
  } else if (r.type === 'Permission') {
    rows.push(['التاريخ', startDate]); rows.push(['الوقت', 'من ' + r.startTime + ' إلى ' + r.endTime + ' (' + r.duration + ' ساعة)']);
  } else {
    rows.push(['التاريخ', startDate]); rows.push(['جهة المأمورية', r.mission]); rows.push(['سلفة / بدل انتقال', r.needsExpenses ? 'محتاجة' : 'مش محتاجة']);
  }
  if (r.status && r.status !== 'Pending') rows.push(['الحالة', STATUS_AR[r.status]]);
  if (r.note) rows.push(['ملاحظة المدير', r.note]);
  return rows;
}

function mail_(user, subject, title, intro, rows, tone) {
  if (!user || !user.emailOptIn || !validEmail_(user.email)) return;   // opt-in only
  try {
    MailApp.sendEmail({
      to: user.email, subject: subject, name: CONFIG.SENDER_NAME,
      body: title + '\n' + intro + '\n\n' + rows.map(function (x) { return x[0] + ': ' + x[1]; }).join('\n'),
      htmlBody: emailHtml_(title, intro, rows, tone)
    });
  } catch (e) { console.error('mail failed: ' + e); }
}

function emailHtml_(title, intro, rows, tone) {
  const accent = tone === 'ok' ? '#1D8A58' : tone === 'bad' ? '#C4352C' : '#E8B754';
  const logo = CONFIG.LOGO_URL
    ? '<img src="' + escHtml_(CONFIG.LOGO_URL) + '" alt="JMG" height="48" style="display:block;margin:0 auto;border:0;height:48px">'
    : '<div style="font-size:26px;font-weight:700;letter-spacing:2px;color:#E8B754;text-align:center">JMG</div>';
  const trs = rows.map(function (x) {
    return '<tr><td style="padding:12px 16px;background:#FAF6EA;border-radius:0 12px 12px 0;color:#7B7360;font-size:13px;width:34%">' + escHtml_(x[0]) +
      '</td><td style="padding:12px 16px;background:#FAF6EA;border-radius:12px 0 0 12px;color:#19140B;font-size:15px;font-weight:600">' + escHtml_(x[1]) + '</td></tr>' +
      '<tr><td colspan="2" style="height:6px;line-height:6px;font-size:0">&nbsp;</td></tr>';
  }).join('');
  const btn = CONFIG.PORTAL_URL
    ? '<div style="text-align:center;margin-top:26px"><a href="' + escHtml_(CONFIG.PORTAL_URL) + '" style="display:inline-block;padding:14px 34px;border-radius:999px;background:#E8B754;color:#0E0C09;font-weight:700;font-size:15px;text-decoration:none">فتح البوابة</a></div>'
    : '';
  return '<!doctype html><html lang="ar" dir="rtl"><body style="margin:0;padding:0;background:#EFEBE0">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFEBE0;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#FFFFFF;border-radius:28px;overflow:hidden;font-family:Tahoma,Arial,sans-serif;direction:rtl">' +
    '<tr><td style="background:#0E0C09;padding:28px 20px 22px;border-bottom:4px solid #E8B754">' + logo +
    '<div style="text-align:center;color:#F6DFA6;font-size:12px;margin-top:8px">JMG Real Estate</div></td></tr>' +
    '<tr><td style="padding:30px 28px 10px"><div style="width:44px;height:5px;border-radius:3px;background:' + accent + ';margin-bottom:14px"></div>' +
    '<h1 style="margin:0 0 8px;font-size:22px;color:#19140B">' + escHtml_(title) + '</h1>' +
    '<p style="margin:0 0 22px;font-size:15px;color:#5C5444;line-height:1.7">' + escHtml_(intro) + '</p>' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0">' + trs + '</table>' + btn + '</td></tr>' +
    '<tr><td style="padding:22px 28px 28px;text-align:center;color:#9A917C;font-size:12px;line-height:1.7">' +
    'الإيميل ده اتبعت من بوابة الموارد البشرية لأنك فعّلت التنبيهات.<br>تقدر توقفها في أي وقت من صفحة الإعدادات.</td></tr>' +
    '</table></td></tr></table></body></html>';
}
