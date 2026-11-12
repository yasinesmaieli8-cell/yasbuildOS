(() => {
  'use strict';
  const nav = document.querySelector('.nav');
  const initial = new URLSearchParams(location.search).get('view') === 'signup' ? 'account' : 'open';
  let stage = initial;
  const styles = document.createElement('style');
  styles.textContent = 'body[data-signup-stage="account"] .nav button:not([data-tab="auth"]),body[data-signup-stage="plan"] .nav button:not([data-tab="auth"]):not([data-tab="plans"]){opacity:.48}';
  document.head.appendChild(styles);
  const notice = document.createElement('p');
  notice.setAttribute('role', 'status'); notice.style.cssText = 'color:inherit;font-size:12px;line-height:1.8';
  nav.insertAdjacentElement('afterend', notice);
  function allowed(tab) {
    return stage === 'open' || tab === 'auth' || (stage === 'plan' && tab === 'plans');
  }
  function setStage(next) {
    stage = next;
    notice.textContent = '';
    document.body.dataset.signupStage = next;
    for (const button of nav.querySelectorAll('button[data-tab]')) button.setAttribute('aria-disabled', String(!allowed(button.dataset.tab)));
  }
  nav.addEventListener('click', event => {
    const button = event.target.closest('button[data-tab]');
    if (!button || allowed(button.dataset.tab)) return;
    event.preventDefault(); event.stopImmediatePropagation();
    notice.textContent = stage === 'account' ? 'برای دسترسی به بخش‌های دیگر، ابتدا ثبت‌نام یا ورود و تکمیل مشخصات را انجام دهید.' : 'ابتدا یک طرح انتخاب کنید.';
  }, true);
  window.yasSignupGate = {setStage, isActive:() => stage !== 'open'};
  setStage(initial);
})();
