/* JMG HR Portal — manager.js */
(function () {
'use strict';
const A = App;
const { $, $$, esc, t, call, icon, toast, errMsg } = A;

let user, data = null, tab = 'pending';

function render() {
  if (!data) return;
  const all = data.requests, pend = all.filter(r => r.status === 'Pending');
  const mk = A.monthKey();
  const okMonth = all.filter(r => r.status === 'Approved' && String(r.decidedAt || '').slice(0, 7) === mk).length;
  A.countUp($('#sPend'), pend.length); A.countUp($('#sOk'), okMonth); A.countUp($('#sTeam'), data.teamSize);
  $('#accTitle').textContent = pend.length ? t('mgr_hero_n', { n: pend.length }) : t('mgr_hero_0');

  const rows = tab === 'pending' ? pend : all;
  $('#body').innerHTML = rows.length ? rows.map((r, i) => {
    const act = r.status === 'Pending'
      ? `<div class="acts"><button class="btn btn-ok btn-xs" data-ok="${esc(r.reqId)}">${icon('check', 14)}${esc(t('btn_approve'))}</button><button class="btn btn-bad btn-xs" data-no="${esc(r.reqId)}">${icon('x', 14)}${esc(t('btn_reject'))}</button></div>`
      : A.lockedCell();
    const note = r.status === 'Rejected' && r.note ? `<div class="mnote">${esc(t('mgr_note', { note: r.note }))}</div>` : '';
    return `<tr style="--i:${i}"><td><span class="nm">${esc(r.userName)}</span><span class="sm">${esc(r.reqId)}</span></td><td>${A.typeCell(r.type)}</td><td class="dt">${A.describe(r)}${note}</td><td>${A.badge(r.status)}</td><td>${act}</td></tr>`;
  }).join('') : `<tr><td colspan="5"><div class="empty">${esc(t('empty_team'))}</div></td></tr>`;
}

async function load() {
  const key = 'mgr_' + user.id, cached = A.cache.get(key);
  if (cached) { data = cached; render(); }
  try { data = await call('teamRequests'); A.cache.set(key, data); render(); } catch (e) { toast(errMsg(e), 'err'); }
}

async function approve(reqId) {
  try { await call('decide', { reqId, decision: 'Approved' }); toast(t('toast_approved')); await load(); A.loadNotifs(); } catch (e) { toast(errMsg(e), 'err'); }
}

function reject(reqId) {
  A.modal({
    title: t('reject_title'),
    body: `<p>${esc(t('reject_hint'))}</p><div class="field"><textarea class="input" id="rejNote" maxlength="300" placeholder="${esc(t('reject_ph'))}" aria-label="${esc(t('reject_ph'))}"></textarea></div>`,
    actions: [
      { label: t('btn_no'), cls: 'btn-soft' },
      {
        label: t('btn_confirm_reject'), cls: 'btn-bad',
        onClick: async ov => {
          const note = $('#rejNote', ov).value.trim();   // optional: may be empty
          try { await call('decide', { reqId, decision: 'Rejected', note }); toast(t('toast_rejected')); await load(); A.loadNotifs(); } catch (e) { toast(errMsg(e), 'err'); return false; }
        }
      }
    ]
  });
}

A.boot({
  page: 'manager',
  roles: ['Manager'],
  onReady(u) {
    user = u;
    $('#icoPend').innerHTML = icon('clock', 22); $('#icoOk').innerHTML = icon('check', 22);
    $$('.tabs button').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab; $$('.tabs button').forEach(x => x.classList.toggle('on', x === b)); render();
    }));
    $('#body').addEventListener('click', e => {
      const ok = e.target.closest('[data-ok]'), no = e.target.closest('[data-no]');
      if (ok) approve(ok.dataset.ok); else if (no) reject(no.dataset.no);
    });
    A.onLang(render);
    load();
  }
});
})();
