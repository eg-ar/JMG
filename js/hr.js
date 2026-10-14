/* JMG HR Portal — hr.js */
(function () {
'use strict';
const A = App;
const { $, $$, esc, t, call, icon, toast, errMsg, setBusy, fmtNum } = A;

let me, data = null;

/* ---------- render ---------- */
function renderStats() {
  const u = data.users;
  A.countUp($('#hTotal'), u.length);
  A.countUp($('#hActive'), u.filter(x => x.status === 'Active').length);
  A.countUp($('#hFrozen'), u.filter(x => x.status === 'Frozen').length);
  A.countUp($('#hPend'), data.requests.filter(r => r.status === 'Pending').length);
}

function renderManagerSelect() {
  const sel = $('#aMgr'), cur = sel.value;
  sel.innerHTML = `<option value="">${esc(t('none_opt'))}</option>` + data.managers.map(m => `<option value="${esc(m.id)}">${esc(m.name)}</option>`).join('');
  sel.value = cur;
}

function renderUsers() {
  const rows = data.users;
  $('#uBody').innerHTML = rows.length ? rows.map((u, i) => {
    const self = u.id === me.id;
    const frozen = u.status === 'Frozen';
    const acts = `<div class="acts">
      <button class="btn btn-soft btn-xs" data-bal="${esc(u.id)}">${icon('edit', 14)}${esc(t('btn_edit_bal'))}</button>
      ${self ? '' : `<button class="btn ${frozen ? 'btn-ok' : 'btn-soft'} btn-xs" data-freeze="${esc(u.id)}">${icon(frozen ? 'play' : 'snow', 14)}${esc(t(frozen ? 'btn_unfreeze' : 'btn_freeze'))}</button>`}
      ${self ? '' : `<button class="btn btn-bad btn-xs" data-del="${esc(u.id)}">${icon('trash', 14)}${esc(t('btn_delete'))}</button>`}
      <button class="btn btn-soft btn-xs" data-pw="${esc(u.id)}" title="${esc(t('btn_reset_pw'))}" aria-label="${esc(t('btn_reset_pw'))}">${icon('key', 14)}</button>
    </div>`;
    return `<tr style="--i:${i}">
      <td><span class="nm">${esc(u.name)}</span><span class="sm">${esc(u.id)} - ${esc(t('role_' + u.role))}</span></td>
      <td>${esc(u.department || '-')}</td>
      <td>${esc(u.managerName || '-')}</td>
      <td>${esc(t('left_of', { r: fmtNum(u.leaveRemaining), t: fmtNum(u.annualBalance) }))}</td>
      <td>${A.badge(u.status)}</td>
      <td>${acts}</td></tr>`;
  }).join('') : `<tr><td colspan="6"><div class="empty">${esc(t('empty_users'))}</div></td></tr>`;
}

function renderRequests() {
  const rows = data.requests.slice(0, 150);
  $('#rBody').innerHTML = rows.length ? rows.map((r, i) => {
    const act = r.status === 'Pending'
      ? `<div class="acts"><button class="btn btn-ok btn-xs" data-ok="${esc(r.reqId)}">${icon('check', 14)}${esc(t('btn_approve'))}</button><button class="btn btn-bad btn-xs" data-no="${esc(r.reqId)}">${icon('x', 14)}${esc(t('btn_reject'))}</button></div>`
      : A.lockedCell();
    const note = r.status === 'Rejected' && r.note ? `<div class="mnote">${esc(t('mgr_note', { note: r.note }))}</div>` : '';
    return `<tr style="--i:${Math.min(i, 12)}"><td><span class="nm">${esc(r.userName)}</span><span class="sm">${esc(r.reqId)}</span></td><td>${A.typeCell(r.type)}</td><td class="dt">${A.describe(r)}${note}</td><td>${A.badge(r.status)}</td><td>${act}</td></tr>`;
  }).join('') : `<tr><td colspan="5"><div class="empty">${esc(t('empty_team'))}</div></td></tr>`;
}

function renderAll() {
  if (!data) return;
  renderStats(); renderManagerSelect(); renderUsers(); renderRequests();
  $('#exportBtn').innerHTML = icon('download', 18) + esc(t('btn_export'));
}

async function load() {
  const key = 'hr_' + me.id, cached = A.cache.get(key);
  if (cached) { data = cached; renderAll(); }
  try { data = await call('hrOverview'); A.cache.set(key, data); renderAll(); } catch (e) { toast(errMsg(e), 'err'); }
}

/* ---------- user actions ---------- */
const findUser = id => data.users.find(u => u.id === id);

function showCreds(title, id, password) {
  A.modal({
    title,
    body: `<p>${esc(t('emp_created_body'))}</p><div class="cred">${id ? `<div><span>${esc(t('cred_id'))}</span><code>${esc(id)}</code></div>` : ''}<div><span>${esc(t('cred_pass'))}</span><code>${esc(password)}</code></div></div>`,
    actions: [
      { label: t('btn_copy'), cls: 'btn-soft', close: false, onClick: async () => { try { await navigator.clipboard.writeText(password); toast(t('copied')); } catch (e) { /* clipboard blocked */ } return false; } },
      { label: t('btn_close'), cls: 'btn-gold' }
    ]
  });
}

async function onUserClick(e) {
  const b = e.target.closest('button'); if (!b) return;
  const id = b.dataset.bal || b.dataset.freeze || b.dataset.del || b.dataset.pw;
  const u = id && findUser(id); if (!u) return;

  if (b.dataset.bal) {
    A.modal({
      title: t('edit_bal_title', { name: u.name }),
      body: `<div class="field"><label for="nBal">${esc(t('f_new_balance'))}</label><input class="input" id="nBal" type="number" min="0" max="365" step="0.5" value="${esc(u.annualBalance)}"></div>`,
      actions: [
        { label: t('btn_no'), cls: 'btn-soft' },
        { label: t('btn_save'), cls: 'btn-gold', onClick: async ov => {
          try { await call('hrUpdateBalance', { id: u.id, annualBalance: Number($('#nBal', ov).value) }); toast(t('toast_saved')); await load(); } catch (ex) { toast(errMsg(ex), 'err'); return false; }
        } }
      ]
    });
  } else if (b.dataset.freeze) {
    const frozen = u.status === 'Frozen';
    if (!(await A.confirmDialog(t(frozen ? 'confirm_unfreeze' : 'confirm_freeze', { name: u.name })))) return;
    try { await call('hrSetStatus', { id: u.id, status: frozen ? 'Active' : 'Frozen' }); toast(t(frozen ? 'toast_unfrozen' : 'toast_frozen')); await load(); } catch (ex) { toast(errMsg(ex), 'err'); }
  } else if (b.dataset.del) {
    if (!(await A.confirmDialog(t('confirm_delete', { name: u.name }), { danger: true }))) return;
    try { await call('hrDeleteUser', { id: u.id }); toast(t('toast_deleted')); await load(); } catch (ex) { toast(errMsg(ex), 'err'); }
  } else if (b.dataset.pw) {
    try { const d = await call('hrResetPassword', { id: u.id }); showCreds(t('reset_done_title'), u.id, d.password); } catch (ex) { toast(errMsg(ex), 'err'); }
  }
}

function onReqClick(e) {
  const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
  if (ok) {
    call('decide', { reqId: ok.dataset.ok, decision: 'Approved' }).then(() => { toast(t('toast_approved')); load(); A.loadNotifs(); }).catch(ex => toast(errMsg(ex), 'err'));
  } else if (no) {
    A.modal({
      title: t('reject_title'),
      body: `<p>${esc(t('reject_hint'))}</p><div class="field"><textarea class="input" id="rejNote" maxlength="300" placeholder="${esc(t('reject_ph'))}" aria-label="${esc(t('reject_ph'))}"></textarea></div>`,
      actions: [
        { label: t('btn_no'), cls: 'btn-soft' },
        { label: t('btn_confirm_reject'), cls: 'btn-bad', onClick: async ov => {
          try { await call('decide', { reqId: no.dataset.no, decision: 'Rejected', note: $('#rejNote', ov).value.trim() }); toast(t('toast_rejected')); load(); A.loadNotifs(); } catch (ex) { toast(errMsg(ex), 'err'); return false; }
        } }
      ]
    });
  }
}

/* ---------- add employee ---------- */
function initAddForm() {
  $('#addForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#aErr'), btn = $('#aBtn'); err.textContent = '';
    const p = {
      name: $('#aName').value.trim(), email: $('#aEmail').value.trim(), annualBalance: Number($('#aBal').value),
      manager: $('#aMgr').value, department: $('#aDept').value.trim(), role: $('#aRole').value, password: $('#aPass').value
    };
    if (!p.name || !p.email) { err.textContent = t('err_MISSING'); return; }
    setBusy(btn, true);
    try {
      const d = await call('hrAddUser', p);
      $('#addForm').reset(); $('#aBal').value = 21;
      await load();
      showCreds(t('emp_created_title'), d.id, d.password);
    } catch (ex) { err.textContent = errMsg(ex); }
    setBusy(btn, false);
  });
}

/* ---------- Excel export (SheetJS) ---------- */
const HDR = {
  ar: {
    users: ['الكود', 'الاسم', 'الإيميل', 'الدور', 'القسم', 'المدير', 'الرصيد السنوي', 'المستهلك', 'المتبقي', 'الحالة'],
    reqs: ['رقم الطلب', 'الموظف', 'النوع', 'من تاريخ', 'إلى تاريخ', 'من ساعة', 'إلى ساعة', 'جهة المأمورية', 'سلفة / بدل', 'الحالة', 'المدة', 'ملاحظة المدير', 'تاريخ التقديم'],
    perms: ['كود الموظف', 'الاسم', 'الشهر', 'الساعات المستهلكة', 'الساعات المتبقية'],
    att: ['التاريخ', 'كود الموظف', 'الموظف', 'النوع', 'التفاصيل']
  },
  en: {
    users: ['ID', 'Name', 'Email', 'Role', 'Department', 'Manager', 'Annual balance', 'Used', 'Remaining', 'Status'],
    reqs: ['Request #', 'Employee', 'Type', 'Start date', 'End date', 'Start time', 'End time', 'Mission destination', 'Needs expenses', 'Status', 'Duration', 'Manager note', 'Submitted'],
    perms: ['User ID', 'Name', 'Month', 'Used hours', 'Remaining hours'],
    att: ['Date', 'User ID', 'Employee', 'Type', 'Details']
  }
};

function buildAttendance(d) {
  const out = [];
  d.requests.filter(r => r.status === 'Approved').forEach(r => {
    const base = [r.userId, r.userName, t('t_' + r.type)];
    if (r.type === 'Leave') {
      const a = A.parseD(r.startDate), b = A.parseD(r.endDate);
      for (const x = new Date(a); x <= b; x.setDate(x.getDate() + 1)) {
        if (!A.CFG.WEEKEND.includes(x.getDay())) out.push([A.isoDate(x), ...base, `1 ${t('u_days')}`]);
      }
    } else if (r.type === 'Permission') {
      out.push([r.startDate, ...base, `${r.startTime} - ${r.endTime} (${fmtNum(r.duration)} ${t('u_hours')})`]);
    } else {
      out.push([r.startDate, ...base, r.mission + (r.needsExpenses ? ` (${t('exp_yes')})` : '')]);
    }
  });
  return out.sort((x, y) => (x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : 0));
}

function sheetFrom(headers, rows, widths) {
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = widths.map(w => ({ wch: w }));
  return ws;
}

async function exportExcel() {
  if (typeof XLSX === 'undefined') { toast(t('err_NETWORK'), 'err'); return; }
  const btn = $('#exportBtn'); setBusy(btn, true);
  try {
    const d = await call('hrExport');
    const H = HDR[A.State.lang];
    const wb = XLSX.utils.book_new();
    wb.Workbook = { Views: [{ RTL: A.State.lang === 'ar' }] };
    XLSX.utils.book_append_sheet(wb, sheetFrom(H.users, d.users.map(u => [u.id, u.name, u.email, t('role_' + u.role), u.department, u.manager, u.annualBalance, u.leaveUsed, u.leaveRemaining, t('st_' + u.status)]), [10, 24, 28, 14, 16, 22, 14, 10, 10, 12]), t('sheet_users'));
    XLSX.utils.book_append_sheet(wb, sheetFrom(H.reqs, d.requests.map(r => [r.reqId, r.userName, t('t_' + r.type), r.startDate, r.endDate, r.startTime, r.endTime, r.mission, r.type === 'Mission' ? (r.needsExpenses ? (A.State.lang === 'ar' ? 'نعم' : 'Yes') : (A.State.lang === 'ar' ? 'لا' : 'No')) : '', t('st_' + r.status), r.duration, r.note, String(r.createdAt || '').slice(0, 16).replace('T', ' ')]), [10, 22, 12, 12, 12, 9, 9, 22, 12, 14, 8, 28, 18]), t('sheet_reqs'));
    XLSX.utils.book_append_sheet(wb, sheetFrom(H.perms, d.permissions.map(p => [p.userId, p.userName, p.monthYear, p.usedHours, p.remainingHours]), [12, 24, 10, 18, 18]), t('sheet_perms'));
    XLSX.utils.book_append_sheet(wb, sheetFrom(H.att, buildAttendance(d), [12, 12, 24, 12, 44]), t('sheet_att'));
    XLSX.writeFile(wb, `JMG-HR-Report-${A.isoDate(new Date())}.xlsx`);
    toast(t('export_done'));
  } catch (e) { toast(errMsg(e), 'err'); }
  setBusy(btn, false);
}

/* ---------- boot ---------- */
A.boot({
  page: 'hr',
  roles: ['HR'],
  onReady(u) {
    me = u;
    initAddForm();
    $('#exportBtn').addEventListener('click', exportExcel);
    $('#uBody').addEventListener('click', onUserClick);
    $('#rBody').addEventListener('click', onReqClick);
    A.onLang(renderAll);
    load();
  }
});
})();
