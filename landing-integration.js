(() => {
  'use strict';
  const sideFooter = document.querySelector('.sidefoot');
  if (sideFooter) {
    sideFooter.replaceChildren(document.createTextNode('اطلاعات محلی در همین مرورگر نگهداری می‌شوند.'));
    const landingLink = document.createElement('a');
    landingLink.href = 'landing.html';
    landingLink.textContent = 'صفحه معرفی YasBuildOS';
    landingLink.style.cssText = 'display:block;margin-top:10px;color:inherit;text-decoration:underline';
    sideFooter.appendChild(landingLink);
  }
  const version = document.querySelector('.brand small');
  if (version) version.textContent = 'WORKSPACE · v0.14.31';

  document.querySelector('.authwrap')?.remove();
  const avatar = document.querySelector('.avatar');
  if (avatar) avatar.textContent = 'ک';
  const signedOut = document.getElementById('cloudSignedOut');
  const params = new URLSearchParams(location.search);
  if (signedOut) {
    const modeStyles = document.createElement('style');
    modeStyles.textContent = '[data-auth-hidden],[data-auth-mode="login"] [data-auth-sms]{display:none!important}';
    document.head.appendChild(modeStyles);
    const phoneLogin = document.getElementById('phonePasswordNumber')?.closest('section');
    const emailLogin = document.createElement('details');
    emailLogin.className = 'project-item';
    const emailHeading = document.createElement('summary'); emailHeading.textContent = 'ورود با ایمیل';
    emailLogin.appendChild(emailHeading);
    for (const item of [document.getElementById('cloudEmail')?.closest('.field'), document.getElementById('cloudPassword')?.closest('.field'), document.getElementById('cloudPasswordToggle'), document.getElementById('cloudConfirmField'), document.getElementById('cloudActions')]) if (item) emailLogin.appendChild(item);
    signedOut.appendChild(emailLogin);
    document.getElementById('cloudSignup')?.setAttribute('data-auth-hidden', '');
    const codeLogin = document.createElement('button'); codeLogin.type = 'button'; codeLogin.className = 'btn secondary';
    codeLogin.textContent = 'ورود با کد پیامکی';
    function updateSmsText() {
      const section = signedOut.querySelector('[data-auth-sms]');
      if (!section) return;
      const login = signedOut.dataset.authMode === 'login-sms';
      section.querySelector('h3').textContent = login ? 'ورود با کد پیامکی' : 'ثبت‌نام با شماره موبایل';
      section.querySelector('p').textContent = login ? 'کد یک‌بارمصرف به شماره حساب شما پیامک می‌شود.' : 'کد یک‌بارمصرف برای ساخت حساب به شماره شما پیامک می‌شود.';
    }
    codeLogin.addEventListener('click', () => { signedOut.dataset.authMode = signedOut.dataset.authMode === 'login-sms' ? 'login' : 'login-sms'; codeLogin.textContent = signedOut.dataset.authMode === 'login-sms' ? 'ورود با گذرواژه' : 'ورود با کد پیامکی'; phoneLogin?.toggleAttribute('data-auth-hidden', signedOut.dataset.authMode === 'login-sms'); updateSmsText(); });
    signedOut.insertBefore(codeLogin, emailLogin);
    const info = document.createElement('p');
    info.className = 'project-message';
    const privacy = document.createElement('a');
    privacy.href = 'privacy.html';
    privacy.textContent = 'حریم خصوصی و اطلاعات حساب';
    privacy.style.cssText = 'color:var(--pri);text-decoration:underline';
    const switchMode = document.createElement('button');
    switchMode.type = 'button'; switchMode.className = 'btn secondary sm';
    switchMode.style.cssText = 'display:block;margin-top:12px';
    function setMode(mode) {
      signedOut.dataset.authMode = mode;
      phoneLogin?.toggleAttribute('data-auth-hidden', mode === 'signup');
      emailLogin.toggleAttribute('data-auth-hidden', mode === 'signup');
      codeLogin.toggleAttribute('data-auth-hidden', mode === 'signup');
      codeLogin.textContent = 'ورود با کد پیامکی';
      switchMode.textContent = mode === 'signup' ? 'قبلاً ثبت‌نام کرده‌اید؟ ورود' : 'حساب ندارید؟ ثبت‌نام';
      updateSmsText();
    }
    switchMode.addEventListener('click', () => {
      const mode = signedOut.dataset.authMode === 'signup' ? 'login' : 'signup';
      setMode(mode); window.yasCloud?.setAuthMode(mode);
    });
    setMode(params.get('view') === 'signup' ? 'signup' : 'login');
    info.append(privacy, switchMode);
    signedOut.appendChild(info);
  }
  if (params.get('view') === 'signup' || params.get('view') === 'login') {
    document.querySelector('[data-tab="auth"]')?.click();
    if (params.get('view') === 'login') document.getElementById('phonePasswordNumber')?.focus();
    if (params.get('view') === 'signup') {
      const currentAccount = document.getElementById('cloudSignedIn');
      if (currentAccount) {
        const prompt = document.createElement('div');
        prompt.className = 'project-notice';
        const description = document.createElement('p');
        description.textContent = 'شما قبلاً وارد این حساب شده‌اید. برای استفاده از همین حساب ادامه دهید؛ برای ثبت‌نام با شماره دیگر ابتدا از حساب خارج شوید.';
        const continueButton = document.createElement('button');
        continueButton.type = 'button'; continueButton.className = 'btn'; continueButton.textContent = 'ادامه با این حساب و انتخاب طرح';
        continueButton.addEventListener('click', () => window.yasCloud?.choosePlanScreen());
        prompt.append(description, continueButton); currentAccount.prepend(prompt);
      }
    }
  }
  const plans = document.querySelectorAll('#plans .project-item');
  if (plans.length) {
    const note = document.createElement('p'); note.className = 'notice';
    note.textContent = 'برای شروع، طرح رایگان را انتخاب کنید. خرید و فعال‌سازی طرح‌های پولی هنوز راه‌اندازی نشده است.';
    plans[0].parentElement.before(note);
    plans.forEach((plan, index) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'btn';
      button.textContent = index === 0 ? 'انتخاب طرح رایگان و ورود به داشبورد' : 'به‌زودی';
      button.disabled = index !== 0;
      if (index === 0) button.addEventListener('click', () => {
        if (!window.yasCloud?.chooseFreePlan()) {
          document.querySelector('[data-tab="auth"]')?.click();
          const msg = document.getElementById('cloudMessage'); if (msg) msg.textContent = 'برای انتخاب طرح ابتدا وارد حساب شوید و اطلاعات خود را تکمیل کنید.';
        }
      });
      plan.appendChild(button);
    });
  }
})();
