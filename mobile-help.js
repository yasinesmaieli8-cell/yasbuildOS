(() => {
  'use strict';
  const dashboard=document.getElementById('dashboard');
  const panel=document.createElement('details');panel.className='card mobile-help';
  const title=document.createElement('summary');title.textContent='استفاده در موبایل اندروید';
  const guide=document.createElement('p');guide.className='notice';guide.textContent='در کروم اندروید، منوی سه‌نقطه را باز کنید و گزینه «نصب یا افزودن به صفحه اصلی» را انتخاب کنید. نام و نمایش گزینه به مرورگر و دستگاه بستگی دارد.';
  const limitation=document.createElement('p');limitation.className='notice';limitation.textContent='این نسخه وب است و برنامه مستقل اندروید نیست. برای باز کردن سایت و استفاده از حساب ابری به اینترنت نیاز دارید. پروژه‌های محلی روی این دستگاه و مرورگر ذخیره می‌شوند؛ از آن‌ها پشتیبان بگیرید.';
  panel.append(title,guide,limitation);dashboard.prepend(panel);
})();
