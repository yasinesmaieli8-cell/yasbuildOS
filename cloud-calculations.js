(() => {
  function setup(prefix, result) {
  const select = document.getElementById(prefix + 'CloudProject');
  const status = document.getElementById(prefix + 'CloudMessage');
  const load = document.getElementById(prefix + 'CloudLoad');
  const save = document.getElementById(prefix + 'CloudSave');
  load.addEventListener('click', async () => {
    if (!window.yasCloud) { status.textContent = 'سرویس ابری در دسترس نیست.'; return; }
    load.disabled = true;
    try {
      const projects = await window.yasCloud.projects();
      select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'انتخاب پروژه ابری'; select.appendChild(placeholder);
      for (const project of projects) { const option = document.createElement('option'); option.value = project.id; option.textContent = project.name; select.appendChild(option); }
      status.textContent = projects.length ? 'پروژه را انتخاب و سپس محاسبه را ذخیره کنید.' : 'ابتدا یک پروژه ابری در حساب کاربری بسازید.';
    } catch (_) { select.replaceChildren(); status.textContent = 'ابتدا از بخش حساب کاربری وارد شوید و اتصال اینترنت را بررسی کنید.'; }
    finally { load.disabled = false; }
  });
  save.addEventListener('click', async () => {
    if (!select.value) { status.textContent = 'ابتدا پروژه‌های ابری را بارگیری و یک پروژه انتخاب کنید.'; return; }
    const record = result();
    if (!record) { status.textContent = 'ابتدا ورودی‌های معتبر وارد کنید.'; return; }
    save.disabled = true;
    try { await window.yasCloud.saveCalculation(select.value, record); status.textContent = 'محاسبه در پروژه ابری ذخیره شد.'; }
    catch (_) { status.textContent = 'ذخیره انجام نشد؛ ورود و اتصال را بررسی کنید.'; }
    finally { save.disabled = false; }
  });
  }
  setup('runner', () => window.ybCurrentResult);
  setup('stair', () => window.ybStairResult);
})();
