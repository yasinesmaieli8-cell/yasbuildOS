// Kept disabled until the SMS hook has passed end-to-end verification.
(() => {
  'use strict';
  function normalizePhone(input) {
    const digits = String(input).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).replace(/[\s()-]/g, '');
    const local = digits.replace(/^\+?98/, '0');
    return /^09\d{9}$/.test(local) ? '+98' + local.slice(1) : null;
  }
  function normalizeCode(input) {
    const digits = String(input).replace(/[۰-۹]/g, c => String(c.charCodeAt(0) - 1776)).replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 1632)).trim();
    return /^\d{6}$/.test(digits) ? digits : null;
  }
  function mount(client, host, enabled = false) {
    if (!enabled) return;
    const section = document.createElement('section');
    section.className = 'project-item';
    section.innerHTML = '<h3>ورود یا ثبت‌نام با شماره موبایل</h3><p class="notice">کد یک‌بارمصرف به شماره شما پیامک می‌شود.</p><div class="field"><label for="otpPhone">شماره موبایل</label><input id="otpPhone" type="tel" inputmode="tel" autocomplete="tel" placeholder="۰۹۱۲۱۲۳۴۵۶۷"></div><button type="button" class="btn secondary" id="otpSend">ارسال کد</button><div class="field"><label for="otpCode">کد پیامکی</label><input id="otpCode" inputmode="numeric" autocomplete="one-time-code" maxlength="6"></div><button type="button" class="btn" id="otpVerify">تأیید و ورود</button><p id="otpMessage" class="project-message" role="status" aria-live="polite"></p>';
    host.prepend(section);
    const phoneInput = section.querySelector('#otpPhone'), codeInput = section.querySelector('#otpCode');
    const send = section.querySelector('#otpSend'), verify = section.querySelector('#otpVerify'), message = section.querySelector('#otpMessage');
    let pending = false, sentPhone = null;
    phoneInput.addEventListener('input', () => { sentPhone = null; codeInput.value = ''; });
    async function run(operation) {
      if (pending) return;
      pending = true; send.disabled = true; verify.disabled = true;
      try { await operation(); } catch { message.textContent = 'ارتباط برقرار نشد؛ دوباره تلاش کنید.'; }
      finally { pending = false; send.disabled = false; verify.disabled = false; }
    }
    send.addEventListener('click', () => run(async () => {
      const phone = normalizePhone(phoneInput.value);
      if (!phone) { message.textContent = 'شماره موبایل معتبر ایران وارد کنید.'; return; }
      sentPhone = null;
      const {error} = await client.auth.signInWithOtp({phone});
      if (normalizePhone(phoneInput.value) !== phone) return;
      if (error) { message.textContent = 'ارسال کد انجام نشد؛ شماره و وضعیت سرویس را بررسی کنید.'; return; }
      sentPhone = phone; message.textContent = 'درخواست ثبت شد؛ دریافت پیامک ممکن است کمی زمان ببرد. اگر کد نرسید دوباره تلاش کنید.';
    }));
    verify.addEventListener('click', () => run(async () => {
      const phone = normalizePhone(phoneInput.value), token = normalizeCode(codeInput.value);
      if (!sentPhone || phone !== sentPhone || !token) { message.textContent = 'ابتدا کد را درخواست کنید و کد شش‌رقمی را وارد کنید.'; return; }
      const {error} = await client.auth.verifyOtp({phone, token, type:'sms'});
      codeInput.value = '';
      if (error) { message.textContent = 'کد نادرست یا منقضی است؛ دوباره تلاش کنید.'; return; }
      sentPhone = null; message.textContent = 'ورود انجام شد.';
    }));
  }
  globalThis.YasPhoneAuth = {normalizePhone, normalizeCode, mount};
})();
