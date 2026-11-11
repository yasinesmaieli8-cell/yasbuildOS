(() => {
  'use strict';
  const dashboard=document.getElementById('dashboard');
  const panel=document.createElement('details');panel.className='card mobile-help';
  const title=document.createElement('summary');title.textContent='استفاده در موبایل اندروید';
  const guide=document.createElement('p');guide.className='notice';guide.textContent='در کروم اندروید، منوی سه‌نقطه را باز کنید و گزینه «نصب یا افزودن به صفحه اصلی» را انتخاب کنید. نام و نمایش گزینه به مرورگر و دستگاه بستگی دارد.';
  const install=document.createElement('button');install.type='button';install.className='btn';install.textContent='افزودن به صفحه اصلی';install.hidden=true;
  const status=document.createElement('p');status.className='project-message';status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const limitation=document.createElement('p');limitation.className='notice';limitation.textContent='این نسخه وب است و برنامه مستقل اندروید نیست. برای باز کردن سایت و استفاده از حساب ابری به اینترنت نیاز دارید. پروژه‌های محلی روی این دستگاه و مرورگر ذخیره می‌شوند؛ از آن‌ها پشتیبان بگیرید.';
  panel.append(title,guide,install,status,limitation);dashboard.prepend(panel);
  let promptEvent=null;
  window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();promptEvent=event;install.hidden=false;status.textContent='در صورت تمایل می‌توانید میانبر وب‌اپ را به صفحه اصلی اضافه کنید.';});
  install.addEventListener('click',async()=>{
    if(!promptEvent)return;
    const current=promptEvent;promptEvent=null;install.hidden=true;install.disabled=true;
    try { await current.prompt(); const choice=await current.userChoice;status.textContent=choice?.outcome==='accepted'?'درخواست افزودن تأیید شد.':'افزودن انجام نشد؛ می‌توانید از منوی مرورگر دوباره تلاش کنید.'; }
    catch (_) { status.textContent='پنجره افزودن باز نشد؛ از منوی مرورگر استفاده کنید.'; }
    finally { install.disabled=false; }
  });
  window.addEventListener('appinstalled',()=>{promptEvent=null;install.hidden=true;status.textContent='وب‌اپ به دستگاه اضافه شد.';});
})();
