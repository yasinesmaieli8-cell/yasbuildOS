(() => {
  function setup(prefix, result) {
  const select = document.getElementById(prefix + 'CloudProject');
  const status = document.getElementById(prefix + 'CloudMessage');
  const load = document.getElementById(prefix + 'CloudLoad');
  const save = document.getElementById(prefix + 'CloudSave');
  let revision=0,loadRequest=0,saveRequest=0;
  window.addEventListener('yasbuildos-auth-changed',()=>{revision++;loadRequest++;saveRequest++;load.disabled=false;save.disabled=false;select.replaceChildren();status.textContent='';});
  load.addEventListener('click', async () => {
    if(load.disabled)return;
    if (!window.yasCloud) { status.textContent = 'سرویس ابری در دسترس نیست.'; return; }
    const token=revision,request=++loadRequest;load.disabled = true;
    try {
      const projects = await window.yasCloud.projects();
      if(token!==revision||request!==loadRequest)return;
      select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'انتخاب پروژه ابری'; select.appendChild(placeholder);
      for (const project of projects) { const option = document.createElement('option'); option.value = project.id; option.textContent = project.name; select.appendChild(option); }
      status.textContent = projects.length ? 'پروژه را انتخاب و سپس محاسبه را ذخیره کنید.' : 'ابتدا یک پروژه ابری در حساب کاربری بسازید.';
    } catch (_) { if(token===revision&&request===loadRequest){select.replaceChildren(); status.textContent = 'ابتدا از بخش حساب کاربری وارد شوید و اتصال اینترنت را بررسی کنید.';} }
    finally { if(request===loadRequest)load.disabled = false; }
  });
  save.addEventListener('click', async () => {
    if(save.disabled)return;
    if (!select.value) { status.textContent = 'ابتدا پروژه‌های ابری را بارگیری و یک پروژه انتخاب کنید.'; return; }
    const record = result();
    if (!record) { status.textContent = 'ابتدا ورودی‌های معتبر وارد کنید.'; return; }
    const token=revision,request=++saveRequest,projectId=select.value;save.disabled = true;
    try { await window.yasCloud.saveCalculation(projectId, record); if(token===revision&&request===saveRequest)status.textContent = select.value===projectId?'محاسبه زمان ارسال در پروژه ابری ذخیره شد.':'محاسبه در پروژه انتخاب‌شده هنگام ارسال ذخیره شد؛ انتخاب فعلی تغییر کرده است.'; }
    catch (_) { if(token===revision&&request===saveRequest)status.textContent = 'ذخیره تأیید نشد؛ اتصال و پروژه را بررسی کنید. پیش از تلاش دوباره، فهرست محاسبات پروژه را بررسی کنید.'; }
    finally { if(request===saveRequest)save.disabled = false; }
  });
  }
  setup('runner', () => window.ybCurrentResult);
  setup('stair', () => window.ybStairResult);
})();
