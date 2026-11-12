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
  if (version) version.textContent = 'WORKSPACE · v0.14.30';

  document.querySelector('.authwrap')?.remove();
  const avatar = document.querySelector('.avatar');
  if (avatar) avatar.textContent = 'ک';
  const signedOut = document.getElementById('cloudSignedOut');
  if (signedOut) {
    const info = document.createElement('p');
    info.className = 'project-message';
    const privacy = document.createElement('a');
    privacy.href = 'privacy.html';
    privacy.textContent = 'حریم خصوصی و اطلاعات حساب';
    privacy.style.cssText = 'color:var(--pri);text-decoration:underline';
    const login = document.createElement('a');
    login.href = '#phonePasswordNumber';
    login.textContent = 'قبلاً ثبت‌نام کرده‌اید؟ وارد شوید';
    login.style.cssText = 'display:block;margin-top:10px;color:var(--pri);text-decoration:underline';
    login.addEventListener('click', () => {
      for (const item of document.querySelectorAll('[data-signup-hidden]')) { item.hidden = false; item.removeAttribute('data-signup-hidden'); }
      document.getElementById('phonePasswordNumber')?.focus();
    });
    info.append(privacy, login);
    signedOut.appendChild(info);
  }
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'signup' || params.get('view') === 'login') {
    document.querySelector('[data-tab="auth"]')?.click();
    if (params.get('view') === 'login') document.getElementById('phonePasswordNumber')?.focus();
    if (params.get('view') === 'signup') {
      const signupStyles = document.createElement('style'); signupStyles.textContent = '[data-signup-hidden]{display:none!important}'; document.head.appendChild(signupStyles);
      for (const item of [document.getElementById('phonePasswordNumber')?.closest('section'), document.getElementById('cloudEmail')?.closest('.field'), document.getElementById('cloudPassword')?.closest('.field'), document.getElementById('cloudPasswordToggle'), document.getElementById('cloudConfirmField'), document.getElementById('cloudActions')]) {
        if (item && !item.hidden) { item.hidden = true; item.setAttribute('data-signup-hidden', ''); }
      }
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
