/* JMG HR Portal — login.js */
(function () {
'use strict';
const { $, t, call, Session, errMsg, setBusy, homeFor, boot, CFG } = App;

boot({
  page: 'login',
  onReady() {
    const form = $('#loginForm'), err = $('#err'), btn = $('#goBtn');

    form.addEventListener('submit', async e => {
      e.preventDefault();
      err.textContent = '';
      const login = $('#login').value.trim(), password = $('#password').value;
      if (!login || !password) { err.textContent = t('err_MISSING'); return; }
      setBusy(btn, true);
      try {
        const d = await call('login', { login, password });
        Session.set(d.token, d.user);
        location.replace(homeFor(d.user.role));
      } catch (ex) {
        err.textContent = errMsg(ex);
        setBusy(btn, false);
      }
    });

    if (!CFG.API_URL) err.textContent = t('err_NO_API');
  }
});
})();
