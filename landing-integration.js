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
  if (version) version.textContent = 'WORKSPACE · v0.14.29';

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
    login.addEventListener('click', () => document.getElementById('phonePasswordNumber')?.focus());
    info.append(privacy, login);
    signedOut.appendChild(info);
  }
  const params = new URLSearchParams(location.search);
  if (params.get('view') === 'signup' || params.get('view') === 'login') {
    document.querySelector('[data-tab="auth"]')?.click();
    if (params.get('view') === 'login') document.getElementById('phonePasswordNumber')?.focus();
  }
})();
