/* JMG HR Portal — employee.js */
(function () {
'use strict';
const A = App;
const { $, $$, esc, t, call, icon, toast, errMsg, setBusy, fmtNum } = A;

let user, data = null;

/* ---------- rendering ---------- */
function renderCards() {
  if (!data) return;
  const L = data.leave, P = data.perm, perm = P;
  A.countUp($('#lvLeft'), L.remaining); A.countUp($('#lvLeft2'), L.remaining);
  $('#lvTotal').textContent = fmtNum(L.total); $('#lvUsed').textContent = fmtNum(L.used);
  $('#lvPend').textContent = L.pending > 0 ? t('c_pending_n', { n: fmtNum(L.pending) }) : '';
  const frac = L.total > 0 ? Math.max(0, Math.min(1, L.remaining / L.total)) : 0;
  requestAnimationFrame(() => { $('#ringVal').style.strokeDashoffset = String(289 * (1 - frac)); });

  A.countUp($('#pmLeft'), perm.remaining); A.countUp($('#pmLeft2'), perm.remaining);
  $('#pmTotal').textContent = fmtNum(perm.total); $('#pmUsed').textContent = fmtNum(perm.used);
  const N = 8, step = perm.total / N;
  const pendSegs = Math.min(Math.round(perm.pending / step), Math.round(perm.remaining / step));
  const leftSegs = Math.max(0, Math.round(perm.remaining / step) - pendSegs);
  $('#segs').innerHTML = Array.from({ length: N }, (_, k) => `<i style="--k:${k}" class="${k < leftSegs ? 'left' : k < leftSegs + pendSegs ? 'pend' : ''}"></i>`).join('');

  const pend = data.requests.filter(r => r.status === 'Pending').length;
  $('#accTitle').textContent = pend ? t('acc_title', { n: pend }) : t('acc_none');
  $('#accText').textContent = pend ? t('acc_p') : t('acc_p0');
}

function renderTable() {
  if (!data) return;
  const rows = data.requests;
  $('#reqBody').innerHTML = rows.length ? rows.map((r, i) => {
    const act = r.status === 'Pending'
      ? `<button class="btn btn-bad btn-xs" data-cancel="${esc(r.reqId)}">${icon('x', 14)}${esc(t('btn_cancel_req'))}</button>`
      : A.lockedCell();
    const note = r.status === 'Rejected' && r.note ? `<div class="mnote">${esc(t('mgr_note', { note: r.note }))}</div>` : '';
    return `<tr style="--i:${i}"><td><span class="sm" style="font-size:13px;color:var(--muted)">${esc(r.reqId)}</span></td><td>${A.typeCell(r.type)}</td><td class="dt">${A.describe(r)}${note}</td><td>${A.badge(r.status)}</td><td>${act}</td></tr>`;
  }).join('') : `<tr><td colspan="5"><div class="empty">${esc(t('empty_reqs'))}</div></td></tr>`;
}

function renderChart() {
  if (!data) return;
  const yr = new Date().getFullYear(), per = Array(12).fill(0);
  data.requests.filter(r => r.type === 'Leave' && r.status === 'Approved').forEach(r => {
    const a = A.parseD(r.startDate), b = A.parseD(r.endDate);
    for (const d = new Date(a); d <= b; d.setDate(d.getDate() + 1)) {
      if (d.getFullYear() === yr && !A.CFG.WEEKEND.includes(d.getDay())) per[d.getMonth()]++;
    }
  });
  const ROWS = 8;
  $('#dots').innerHTML = per.map((n, c) => {
    const lab = new Date(yr, c, 1).toLocaleDateString(A.locale(), { month: 'short' });
    const dots = Array.from({ length: ROWS }, (_, r) => `<i class="${r < Math.min(n, ROWS) ? 'on' : ''}" style="--r:${r};--c:${c}"></i>`).join('');
    return `<div class="col" title="${esc(lab)}: ${n}">${dots}<label>${esc(lab)}</label></div>`;
  }).join('');
}

function renderAll() { renderCards(); renderTable(); renderChart(); syncForm(); }

/* ---------- data ---------- */
async function load() {
  const key = 'emp_' + user.id;
  const cached = A.cache.get(key);
  if (cached) { data = cached; renderAll(); }
  try {
    data = await call('dashboard');
    A.cache.set(key, data);
    renderAll();
    A.Session.patch(data.user);
  } catch (e) { toast(errMsg(e), 'err'); }
}

/* ---------- dynamic form ---------- */
function syncForm() {
  const ty = $('#fType').value;
  $('#gLeave').classList.toggle('show', ty === 'Leave');
  $('#gPerm').classList.toggle('show', ty === 'Permission');
  $('#gMission').classList.toggle('show', ty === 'Mission');
  const c = $('#calc');
  if (ty === 'Leave') {
    const n = A.workingDays($('#lFrom').value, $('#lTo').value);
    c.textContent = n ? t('calc_days', { n }) : '';
  } else if (ty === 'Permission') {
    const h = A.hoursBetween($('#pFrom').value, $('#pTo').value);
    c.textContent = h > 0 ? t('calc_hours', { n: fmtNum(h) }) : '';
  } else c.textContent = '';
}

function collect() {
  const ty = $('#fType').value;
  if (ty === 'Leave') return { type: ty, startDate: $('#lFrom').value, endDate: $('#lTo').value };
  if (ty === 'Permission') return { type: ty, startDate: $('#pDate').value, startTime: $('#pFrom').value, endTime: $('#pTo').value };
  return { type: ty, startDate: $('#mDate').value, mission: $('#mDest').value.trim(), needsExpenses: $('#mExp').checked };
}

function initForm() {
  const today = A.isoDate(new Date());
  ['lFrom', 'lTo', 'pDate', 'mDate'].forEach(id => { $('#' + id).min = today; });
  $('#pDate').value = today;
  $('#fType').addEventListener('change', syncForm);
  ['lFrom', 'lTo', 'pFrom', 'pTo'].forEach(id => $('#' + id).addEventListener('input', () => {
    if (id === 'lFrom' && $('#lTo').value && $('#lTo').value < $('#lFrom').value) $('#lTo').value = $('#lFrom').value;
    syncForm();
  }));
  $('#reqForm').addEventListener('submit', async e => {
    e.preventDefault();
    const err = $('#fErr'), btn = $('#subBtn'); err.textContent = '';
    const p = collect();
    const miss = p.type === 'Leave' ? !p.startDate || !p.endDate : p.type === 'Permission' ? !p.startDate || !p.startTime || !p.endTime : !p.startDate || !p.mission;
    if (miss) { err.textContent = t('err_MISSING'); return; }
    setBusy(btn, true);
    try {
      await call('submitRequest', p);
      toast(t('toast_sent'));
      $('#reqForm').reset(); $('#pDate').value = today; syncForm();
      await load(); A.loadNotifs();
    } catch (ex) { err.textContent = errMsg(ex); }
    setBusy(btn, false);
  });
}

/* ---------- boot ---------- */
A.boot({
  page: 'employee',
  roles: ['Employee', 'Manager', 'HR'],
  onReady(u) {
    user = u;
    $('#icoLeave').innerHTML = icon('calendar', 22); $('#icoPerm').innerHTML = icon('clock', 22);
    initForm();
    $('#reqBody').addEventListener('click', async e => {
      const b = e.target.closest('[data-cancel]'); if (!b) return;
      if (!(await A.confirmDialog(t('confirm_cancel'), { danger: true }))) return;
      try { await call('cancelRequest', { reqId: b.dataset.cancel }); toast(t('toast_cancelled')); await load(); } catch (ex) { toast(errMsg(ex), 'err'); }
    });
    A.onLang(renderAll);
    load();
  }
});
})();
