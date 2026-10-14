/* JMG HR Portal — settings.js */
(function () {
'use strict';
const A = App;
const { $, t, call, icon, toast, errMsg, setBusy } = A;

A.boot({
  page: 'settings',
  roles: ['Employee', 'Manager', 'HR'],
  async onReady(user) {
    $('#icoPw').innerHTML = icon('lock', 22);
    $('#icoMail').innerHTML = icon('bell', 22);
    $('#mgrDesc').hidden = user.role !== 'Manager';

    /* ----- change password ----- */
    $('#pwForm').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#pErr'), btn = $('#pBtn'); err.textContent = '';
      const cur = $('#pCur').value, nw = $('#pNew').value, conf = $('#pConf').value;
      if (!cur || !nw || !conf) { err.textContent = t('err_MISSING'); return; }
      if (nw.length < 8) { err.textContent = t('err_WEAK_PASSWORD'); return; }
      if (nw !== conf) { err.textContent = t('pw_mismatch'); return; }
      setBusy(btn, true);
      try {
        await call('changePassword', { current: cur, next: nw });
        $('#pwForm').reset();
        toast(t('toast_pw'));
      } catch (ex) { err.textContent = errMsg(ex); }
      setBusy(btn, false);
    });

    /* ----- email opt-in ----- */
    try {
      const me = await call('me');
      $('#mAddr').value = me.email || '';
      $('#mOn').checked = !!me.emailOptIn;
    } catch (ex) { toast(errMsg(ex), 'err'); }

    $('#mailForm').addEventListener('submit', async e => {
      e.preventDefault();
      const err = $('#mErr'), btn = $('#mBtn'); err.textContent = '';
      const email = $('#mAddr').value.trim(), optIn = $('#mOn').checked;
      if (optIn && !email) { err.textContent = t('err_BAD_EMAIL'); return; }
      setBusy(btn, true);
      try {
        const u = await call('saveEmail', { email, optIn });
        A.Session.patch({ email: u.email, emailOptIn: u.emailOptIn });
        $('#mOn').checked = !!u.emailOptIn;
        toast(t('toast_mail'));
      } catch (ex) { err.textContent = errMsg(ex); }
      setBusy(btn, false);
    });
  }
});
})();
